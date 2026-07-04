import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import { createClient } from '@supabase/supabase-js';
import { generateUploadUrl, generateDownloadUrl, deleteFileFromR2 } from '../lib/storage';

type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
};

const filesRoutes = new Hono<{ Bindings: Env, Variables: { user: any } }>();

filesRoutes.use('*', requireAuth);

filesRoutes.post('/upload-url', async (c) => {
  const user = c.get('user');
  const { projectId, filename, mimeType } = await c.req.json();
  
  const key = `t${user.tenantId}/p${projectId}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  const uploadUrl = await generateUploadUrl(key, mimeType, c.env);
  return c.json({ uploadUrl, key });
});

filesRoutes.post('/register', async (c) => {
  const user = c.get('user');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  const data = await c.req.json();

  const { error } = await supabase.from('files').insert({
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

  if (error) return c.json({ error: error.message }, 500);

  await supabase.from('activity_logs').insert({
    tenantId: user.tenantId,
    userId: parseInt(user.sub as string),
    action: `File '${data.originalFilename}' uploaded to project ID ${data.projectId}.`,
  });

  return c.json({ success: true });
});

filesRoutes.get('/project/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data } = await supabase
    .from('files')
    .select('*')
    .eq('projectId', projectId)
    .order('uploadedAt', { ascending: false });
    
  return c.json(data || []);
});

filesRoutes.get('/:id/download-url', async (c) => {
  const user = c.get('user');
  const fileId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data: fileList } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .limit(1);
    
  if (!fileList || fileList.length === 0) return c.json({ error: 'File not found' }, 404);
  const file = fileList[0];
  
  if (file.tenantId !== user.tenantId) return c.json({ error: 'Unauthorized' }, 403);
  
  const downloadUrl = await generateDownloadUrl(file.filePath, c.env);
  return c.json({ downloadUrl });
});

filesRoutes.patch('/:id/status', async (c) => {
  const user = c.get('user');
  const fileId = c.req.param('id');
  const { status } = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data: fileList } = await supabase.from('files').select('*').eq('id', fileId).limit(1);
  if (!fileList || fileList.length === 0) return c.json({ error: 'File not found' }, 404);
  const file = fileList[0];
  
  if (file.tenantId !== user.tenantId) return c.json({ error: 'Unauthorized' }, 403);

  if (user.role === 'client') {
    if (file.status !== 'client_review' || status !== 'approved') {
      return c.json({ error: 'Clients can only approve files pending their review' }, 403);
    }
  }
  
  await supabase.from('files').update({ 
    status,
    ...(status === 'approved' ? { approvedBy: parseInt(user.sub as string), approvedAt: new Date().toISOString() } : {})
  }).eq('id', fileId);

  await supabase.from('activity_logs').insert({
    tenantId: user.tenantId,
    userId: parseInt(user.sub as string),
    action: `File '${file.originalFilename}' status changed to '${status}'.`,
  });

  return c.json({ success: true });
});

filesRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const fileId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  if (user.role === 'client') return c.json({ error: 'Clients cannot delete files' }, 403);
  
  const { data: fileList } = await supabase.from('files').select('*').eq('id', fileId).limit(1);
  if (!fileList || fileList.length === 0) return c.json({ error: 'File not found' }, 404);
  const file = fileList[0];
  
  if (file.tenantId !== user.tenantId) return c.json({ error: 'Unauthorized' }, 403);

  await deleteFileFromR2(file.filePath, c.env);
  
  await supabase.from('files').delete().eq('id', fileId);

  await supabase.from('activity_logs').insert({
    tenantId: user.tenantId,
    userId: parseInt(user.sub as string),
    action: `File '${file.originalFilename}' deleted.`,
  });

  return c.json({ success: true });
});

export default filesRoutes;
