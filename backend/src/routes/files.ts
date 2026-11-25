import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import * as schema from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateUploadUrl, generateDownloadUrl, deleteFileFromR2 } from '../lib/storage';
import { AuthUser } from '../lib/permissions';
import { canAccessProject } from '../lib/projectAccess';

type Env = {
  DATABASE_URL: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
};

const filesRoutes = new Hono<{ Bindings: Env, Variables: { user: AuthUser, db: any } }>();

filesRoutes.use('*', requireAuth);

filesRoutes.post('/upload-url', async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Forbidden' }, 403);
  const { projectId, filename, mimeType } = await c.req.json();
  const db = c.get('db');

  const access = await canAccessProject(db, user, parseInt(projectId), 'manage');
  if (!access.isAssigned && !access.allowed) return c.json({ error: 'Forbidden' }, 403);
  
  const key = `t${user.tenantId}/p${projectId}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  const uploadUrl = await generateUploadUrl(key, mimeType, c.env);
  return c.json({ uploadUrl, key });
});

filesRoutes.post('/register', async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Forbidden' }, 403);
  const data = await c.req.json();
  const db = c.get('db');

  try {
    const access = await canAccessProject(db, user, parseInt(data.projectId), 'manage');
    if (!access.isAssigned && !access.allowed) return c.json({ error: 'Forbidden' }, 403);

    await db.insert(schema.files).values({
      tenantId: user.tenantId,
      projectId: data.projectId,
      uploadedBy: parseInt(user.sub as string),
      filename: data.filename,
      originalFilename: data.originalFilename,
      filePath: data.filePath,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      status: 'internal_review',
      version: 1,
    });

    await db.insert(schema.activityLogs).values({
      tenantId: user.tenantId,
      userId: parseInt(user.sub as string),
      action: `File '${data.originalFilename}' uploaded to project ID ${data.projectId}.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

filesRoutes.get('/project/:projectId', async (c) => {
  const user = c.get('user');
  const projectId = parseInt(c.req.param('projectId'));
  const db = c.get('db');

  if (isNaN(projectId)) return c.json({ error: 'Invalid project ID' }, 400);
  
  try {
    const access = await canAccessProject(db, user, projectId, 'view');
    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403);

    const data = await db.select().from(schema.files)
      .where(and(eq(schema.files.projectId, projectId), eq(schema.files.tenantId, user.tenantId)))
      .orderBy(desc(schema.files.uploadedAt));
      
    return c.json(data);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

filesRoutes.get('/:id/download-url', async (c) => {
  const user = c.get('user');
  const fileId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    const [file] = await db.select().from(schema.files).where(eq(schema.files.id, fileId)).limit(1);
      
    if (!file) return c.json({ error: 'File not found' }, 404);
    if (file.tenantId !== user.tenantId) return c.json({ error: 'Unauthorized' }, 403);

    const access = await canAccessProject(db, user, file.projectId, 'view');
    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403);
    
    const downloadUrl = await generateDownloadUrl(file.filePath, c.env as any);
    return c.json({ downloadUrl });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

filesRoutes.patch('/:id/status', async (c) => {
  const user = c.get('user');
  const fileId = parseInt(c.req.param('id'));
  const { status } = await c.req.json();
  const db = c.get('db');
  
  try {
    const [file] = await db.select().from(schema.files).where(eq(schema.files.id, fileId)).limit(1);
    
    if (!file) return c.json({ error: 'File not found' }, 404);
    if (file.tenantId !== user.tenantId) return c.json({ error: 'Unauthorized' }, 403);

    const access = await canAccessProject(db, user, file.projectId, 'manage');
    if (user.role === 'client') {
      if (!access.isClientOwner) return c.json({ error: 'Forbidden' }, 403);
      if (file.status !== 'client_review' || status !== 'approved') {
        return c.json({ error: 'Clients can only approve files pending their review' }, 403);
      }
    } else if (!access.isAssigned && !access.allowed) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    await db.update(schema.files).set({ 
      status,
      ...(status === 'approved' ? { approvedBy: parseInt(user.sub as string), approvedAt: new Date().toISOString() } : {})
    }).where(eq(schema.files.id, fileId));

    await db.insert(schema.activityLogs).values({
      tenantId: user.tenantId,
      userId: parseInt(user.sub as string),
      action: `File '${file.originalFilename}' status changed to '${status}'.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

filesRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const fileId = parseInt(c.req.param('id'));
  const db = c.get('db');

  if (user.role === 'client') return c.json({ error: 'Clients cannot delete files' }, 403);
  
  try {
    const [file] = await db.select().from(schema.files).where(eq(schema.files.id, fileId)).limit(1);
    
    if (!file) return c.json({ error: 'File not found' }, 404);
    if (file.tenantId !== user.tenantId) return c.json({ error: 'Unauthorized' }, 403);

    const access = await canAccessProject(db, user, file.projectId, 'full');
    if (!access.isAssigned && !access.allowed) return c.json({ error: 'Forbidden' }, 403);

    await deleteFileFromR2(file.filePath, c.env as any);
    
    await db.delete(schema.files).where(eq(schema.files.id, fileId));

    await db.insert(schema.activityLogs).values({
      tenantId: user.tenantId,
      userId: parseInt(user.sub as string),
      action: `File '${file.originalFilename}' deleted.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default filesRoutes;
