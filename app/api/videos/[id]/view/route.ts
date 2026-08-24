import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getSupabaseAdmin();
    const viewerKey = request.headers.get("x-viewer-key") ?? "anon";
    // Respect the viewer_key system: a given browser (viewer_key) counts once
    // per video. Refreshing the page must not inflate the count, so we only
    // insert when this viewer has not already registered a view.
    const { data: existing } = await db
      .from("video_views")
      .select("id")
      .eq("drive_file_id", id)
      .eq("viewer_key", viewerKey)
      .limit(1);
    if (!existing || existing.length === 0) {
      const { error } = await db.from("video_views").insert({ drive_file_id: id, viewer_key: viewerKey });
      if (error) throw error;
    }
    const { count } = await db.from("video_views").select("*", { count: "exact", head: true }).eq("drive_file_id", id);
    return NextResponse.json({ views: count ?? 0 });
  } catch (error) {
    // Supabase is optional; return a graceful response when not configured.
    return NextResponse.json({ views: 0, error: error instanceof Error ? error.message : (error as { message?: string })?.message || "Unable to register view." }, { status: 200 });
  }
}
