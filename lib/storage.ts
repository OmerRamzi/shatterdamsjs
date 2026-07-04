import { supabase } from "@/db/supabase";

const STORAGE_BUCKET = "shatter-dams-files";

export async function generateUploadUrl(key: string, contentType: string) {
  // Use Supabase createSignedUploadUrl
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(key);

  if (error || !data) {
    throw new Error(error?.message || "Could not generate upload URL");
  }

  // data.signedUrl is the URL you can PUT the file to
  return data.signedUrl;
}

export async function generateDownloadUrl(key: string, originalFilename?: string) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(key, 3600, {
      download: originalFilename || true,
    });

  if (error || !data) {
    throw new Error(error?.message || "Could not generate download URL");
  }

  return data.signedUrl;
}

export async function deleteFileFromR2(key: string) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([key]);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
