import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Read whether the current device already liked this video + the total count.
// Lets the frontend restore like state across page refreshes.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getSupabaseAdmin();
    const likerKey = request.headers.get("x-liker-key") ?? "anon";
    const { data } = await db
      .from("video_likes")
      .select("liker_key")
      .eq("drive_file_id", id)
      .eq("liker_key", likerKey)
      .maybeSingle();
    const { count } = await db.from("video_likes").select("*", { count: "exact", head: true }).eq("drive_file_id", id);
    return NextResponse.json({ likes: count ?? 0, liked: !!data });
  } catch (error) {
    // Supabase is optional; return a graceful response when not configured.
    return NextResponse.json({ likes: 0, liked: false, error: error instanceof Error ? error.message : "Unable to load like state." }, { status: 200 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getSupabaseAdmin();
    const likerKey = request.headers.get("x-liker-key") ?? "anon";
    const { error } = await db.from("video_likes").insert({ drive_file_id: id, liker_key: likerKey });
    if (error) throw error;
    const { count } = await db.from("video_likes").select("*", { count: "exact", head: true }).eq("drive_file_id", id);
    return NextResponse.json({ likes: count ?? 0, liked: true });
  } catch (error) {
    // Supabase is optional; return a graceful response when not configured.
    return NextResponse.json({ likes: 0, liked: false, error: error instanceof Error ? error.message : "Unable to like video." }, { status: 200 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getSupabaseAdmin();
    const likerKey = request.headers.get("x-liker-key") ?? "anon";
    const { error } = await db.from("video_likes").delete().eq("drive_file_id", id).eq("liker_key", likerKey);
    if (error) throw error;
    const { count } = await db.from("video_likes").select("*", { count: "exact", head: true }).eq("drive_file_id", id);
    return NextResponse.json({ likes: count ?? 0, liked: false });
  } catch (error) {
    // Supabase is optional; return a graceful response when not configured.
    return NextResponse.json({ likes: 0, liked: false, error: error instanceof Error ? error.message : "Unable to unlike video." }, { status: 200 });
  }
}