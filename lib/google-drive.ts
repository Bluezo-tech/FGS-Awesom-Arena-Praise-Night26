import { GoogleAuth } from "google-auth-library";

export type DriveVideo = {
  id: string;
  name: string;
  createdTime: string;
  thumbnailLink?: string;
  webViewLink?: string;
  /** Natural pixel dimensions from Drive's videoMediaMetadata (when available). */
  width?: number;
  height?: number;
};

const fields =
  "files(id,name,mimeType,createdTime,thumbnailLink,webViewLink,description,videoMediaMetadata(width,height,durationMillis))";
const getFolderId = (value: string) => value.match(/folders\/([^/?]+)/)?.[1] ?? value.trim();

export async function getDriveVideos(): Promise<DriveVideo[]> {
  const folderValue = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const folderId = folderValue ? getFolderId(folderValue) : undefined;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!folderId || !email || !privateKey) return [];

  const auth = new GoogleAuth({ credentials: { client_email: email, private_key: privateKey }, scopes: ["https://www.googleapis.com/auth/drive.readonly"] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Google service account authentication failed.");
  const query = new URLSearchParams({
    q: `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
    orderBy: "createdTime desc", fields, pageSize: "100",
  });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${query}`, { headers: { Authorization: `Bearer ${token.token}` }, next: { revalidate: 300 } });
  if (!response.ok) {
    const details = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(details?.error?.message ?? "Google Drive could not be reached. Check that the folder is shared with the service account.");
  }
  const data = await response.json() as { files?: (DriveVideo & { videoMediaMetadata?: { width?: number; height?: number } })[] };
  return (data.files ?? []).map((file) => {
    const { videoMediaMetadata, ...rest } = file;
    return {
      ...rest,
      width: videoMediaMetadata?.width,
      height: videoMediaMetadata?.height,
    };
  });
}

export const getEmbedUrl = (fileId: string) => `https://drive.google.com/file/d/${fileId}/preview`;
export const getDownloadUrl = (fileId: string) => `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
export const getStreamUrl = (fileId: string) => `/api/drive-stream/${fileId}`;
