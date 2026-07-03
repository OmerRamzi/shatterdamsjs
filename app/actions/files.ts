"use server";

import { db } from "@/db";
import { files, fileComments, activityLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { generateUploadUrl, generateDownloadUrl, deleteFileFromR2 } from "@/lib/storage";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const session = await auth();
  if (!session || !session.user) throw new Error("Unauthorized");
  return session.user;
}

// 1. Get a Presigned Upload URL for the client to upload to R2 directly
export async function getPresignedUploadUrl(projectId: number, filename: string, mimeType: string) {
  const user = await requireAuth();
  
  // Create a unique key: tenantId/projectId/timestamp_filename
  const key = `t${user.tenantId}/p${projectId}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  const uploadUrl = await generateUploadUrl(key, mimeType);
  return { uploadUrl, key };
}

// 2. Register the uploaded file in the database
export async function registerUploadedFile(data: {
  projectId: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}) {
  const user = await requireAuth();

  await db.insert(files).values({
    tenantId: user.tenantId,
    projectId: data.projectId,
    uploadedBy: parseInt(user.id),
    filename: data.filename,
    originalFilename: data.originalFilename,
    filePath: data.filePath,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    status: "internal_review", // Default workflow state
    version: 1,
  });

  await db.insert(activityLogs).values({
    tenantId: user.tenantId,
    userId: parseInt(user.id),
    action: `File '${data.originalFilename}' uploaded to project ID ${data.projectId}.`,
  });

  revalidatePath(`/admin/projects/${data.projectId}`);
  return { success: true };
}

// 3. Get Project Files
export async function getProjectFiles(projectId: number) {
  const user = await requireAuth();
  
  const projectFiles = await db
    .select()
    .from(files)
    .where(eq(files.projectId, projectId))
    .orderBy(desc(files.uploadedAt));
    
  return projectFiles;
}

// 4. Generate Download URL for a specific file
export async function getDownloadUrl(fileId: number) {
  const user = await requireAuth();
  
  const fileList = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
  const file = fileList[0];
  
  if (!file) throw new Error("File not found");
  if (file.tenantId !== user.tenantId) throw new Error("Unauthorized");
  
  return await generateDownloadUrl(file.filePath, file.originalFilename);
}

// 5. Update File Status (Workflow)
export async function updateFileStatus(fileId: number, status: string) {
  const user = await requireAuth();
  
  const fileList = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
  const file = fileList[0];
  
  if (!file || file.tenantId !== user.tenantId) throw new Error("Unauthorized");

  // RLS for clients: clients can ONLY transition from 'client_review' to 'approved'
  if (user.role === "client") {
    if (file.status !== "client_review" || status !== "approved") {
      throw new Error("Clients can only approve files pending their review");
    }
  }
  
  await db.update(files).set({ 
    status,
    ...(status === "approved" ? { approvedBy: parseInt(user.id), approvedAt: new Date() } : {})
  }).where(eq(files.id, fileId));

  await db.insert(activityLogs).values({
    tenantId: user.tenantId,
    userId: parseInt(user.id),
    action: `File '${file.originalFilename}' status changed to '${status}'.`,
  });

  revalidatePath(`/admin/projects/${file.projectId}`);
  return { success: true };
}

// 6. Delete File (from R2 and DB)
export async function deleteFile(fileId: number) {
  const user = await requireAuth();
  if (user.role === "client") throw new Error("Clients cannot delete files");
  
  const fileList = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
  const file = fileList[0];
  
  if (!file || file.tenantId !== user.tenantId) throw new Error("Unauthorized");

  // Delete from R2
  await deleteFileFromR2(file.filePath);
  
  // Delete from DB (Comments will cascade due to schema)
  await db.delete(files).where(eq(files.id, fileId));

  await db.insert(activityLogs).values({
    tenantId: user.tenantId,
    userId: parseInt(user.id),
    action: `File '${file.originalFilename}' deleted.`,
  });

  revalidatePath(`/admin/projects/${file.projectId}`);
  return { success: true };
}

// 7. Add File Comment
export async function addFileComment(fileId: number, comment: string) {
  const user = await requireAuth();
  
  const fileList = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
  if (!fileList[0] || fileList[0].tenantId !== user.tenantId) throw new Error("Unauthorized");

  await db.insert(fileComments).values({
    fileId,
    userId: parseInt(user.id),
    comment,
  });

  revalidatePath(`/admin/projects/${fileList[0].projectId}`);
  return { success: true };
}

// 8. Get File Comments
export async function getFileComments(fileId: number) {
  const user = await requireAuth();
  return await db.select().from(fileComments).where(eq(fileComments.fileId, fileId)).orderBy(desc(fileComments.createdAt));
}
