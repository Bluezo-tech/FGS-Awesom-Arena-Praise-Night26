import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("comments")
      .select("id, display_name, body, created_at, parent_id")
      .eq("drive_file_id", id)
      .eq("approved", true)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ comments: data ?? [] });
  } catch (error) {
    return NextResponse.json({ comments: [], error: error instanceof Error ? error.message : (error as { message?: string })?.message || "Unable to load comments." }, { status: 200 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const displayName = String(body.display_name ?? "").trim();
    const commentBody = String(body.body ?? "").trim();
    const parentId = body.parent_id ? String(body.parent_id) : null;
    if (displayName.length < 2 || displayName.length > 80) throw new Error("Name must be between 2 and 80 characters.");
    if (commentBody.length < 2 || commentBody.length > 2000) throw new Error("Comment must be between 2 and 2000 characters.");
    const db = getSupabaseAdmin();

    if (parentId) {
      // Replies are one level deep only: the parent must be a top-level comment on this video.
      const { data: parent, error: parentError } = await db
        .from("comments")
        .select("id")
        .eq("id", parentId)
        .eq("drive_file_id", id)
        .is("parent_id", null)
        .maybeSingle();
      if (parentError) throw parentError;
      if (!parent) throw new Error("Cannot reply to that comment.");
    }

    const { data, error } = await db
      .from("comments")
      .insert({ drive_file_id: id, display_name: displayName, body: commentBody, approved: true, parent_id: parentId })
      .select("id, display_name, body, created_at, parent_id")
      .single();
    if (error) throw error;
    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : (error as { message?: string })?.message || "Unable to submit comment." }, { status: 400 });
  }
}
