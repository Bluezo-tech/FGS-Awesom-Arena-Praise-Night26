import { getDriveVideos } from "@/lib/google-drive";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Server-only helper that merges Google Drive files with optional Supabase
 * metadata (titles, descriptions, thumbnails, playback URLs, featured flags),
 * plus view/like counts. Used by both the public API and the watch page's
 * server-rendered Open Graph metadata so the social preview always reflects
 * CMS overrides, not just raw Drive data.
 *
 * Supabase is optional: when its env vars are missing, the helper returns
 * Drive-only data exactly like the previous /api/videos implementation.
 */

export type MergedVideo = {
  id: string;
  name: string;
  createdTime: string;
  thumbnailLink?: string;
  webViewLink?: string;
  width?: number;
  height?: number;
  meta?: Record<string, any> | null;
  views?: number;
  likes?: number;
};

export async function getMergedVideos(): Promise<MergedVideo[]> {
  const driveVideos = await getDriveVideos();
  let metadata: Record<string, any> = {};
  let views: Record<string, number> = {};
  let likes: Record<string, number> = {};

  try {
    const db = getSupabaseAdmin();
    const [metaRes, viewRes, likeRes] = await Promise.all([
      db.from("video_metadata").select("*"),
      db.from("video_views").select("drive_file_id"),
      db.from("video_likes").select("drive_file_id"),
    ]);
    if (!metaRes.error) metadata = Object.fromEntries((metaRes.data ?? []).map((m: any) => [m.drive_file_id, m]));
    if (!viewRes.error)
      views = (viewRes.data ?? []).reduce((acc: Record<string, number>, v: any) => {
        acc[v.drive_file_id] = (acc[v.drive_file_id] ?? 0) + 1;
        return acc;
      }, {});
    if (!likeRes.error)
      likes = (likeRes.data ?? []).reduce((acc: Record<string, number>, l: any) => {
        acc[l.drive_file_id] = (acc[l.drive_file_id] ?? 0) + 1;
        return acc;
      }, {});
  } catch {
    // Supabase optional; gallery still works with Drive-only data.
  }

  const videos = driveVideos.map((video) => ({
    ...video,
    meta: metadata[video.id] ?? null,
    views: views[video.id] ?? 0,
    likes: likes[video.id] ?? 0,
  }));

  // Apply CMS display_order: videos with an explicit order appear first
  // (ascending), then everything else by newest first (Drive default).
  return videos.sort((a, b) => {
    const ao = a.meta?.display_order;
    const bo = b.meta?.display_order;
    const aHas = ao !== undefined && ao !== null;
    const bHas = bo !== undefined && bo !== null;
    if (aHas && bHas) return Number(ao) - Number(bo);
    if (aHas) return -1;
    if (bHas) return 1;
    return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime();
  });
}

export async function getMergedVideo(id: string): Promise<MergedVideo | null> {
  const videos = await getMergedVideos();
  return videos.find((v) => v.id === id) ?? null;
}
