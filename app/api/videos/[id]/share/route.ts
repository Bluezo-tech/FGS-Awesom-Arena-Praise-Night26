import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Record a share action for a video and return the updated share count.
// Unlike views, there is no uniqueness constraint: a person can share the
// same video many times and each action should count.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getSupabaseAdmin();
    const { error } = await db.from("video_shares").insert({ drive_file_id: id });
    if (error) throw error;
    const { count } = await db.from("video_shares").select("*", { count: "exact", head: true }).eq("drive_file_id", id);
    return NextResponse.json({ shares: count ?? 0 });
  } catch (error) {
    // Supabase is optional; return a graceful response when not configured.
    return NextResponse.json({ shares: 0, error: error instanceof Error ? error.message : (error as { message?: string })?.message || "Unable to record share." }, { status: 200 });
  }
}
