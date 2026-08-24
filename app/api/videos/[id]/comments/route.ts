import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("comments")
      .select("id, display_name, body, created_at")
      .eq("drive_file_id", id)
      .eq("approved", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ comments: data ?? [] });
  } catch (error) {
    // Supabase is optional; return empty comments when not configured.
    return NextResponse.json({ comments: [], error: error instanceof Error ? error.message : (error as { message?: string })?.message || "Unable to load comments." }, { status: 200 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const displayName = String(body.display_name ?? "").trim();
    const commentBody = String(body.body ?? "").trim();
    if (displayName.length < 2 || displayName.length > 80) throw new Error("Name must be between 2 and 80 characters.");
    if (commentBody.length < 2 || commentBody.length > 2000) throw new Error("Comment must be between 2 and 2000 characters.");
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("comments")
      .insert({ drive_file_id: id, display_name: displayName, body: commentBody, approved: true })
      .select("id, display_name, body, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : (error as { message?: string })?.message || "Unable to submit comment." }, { status: 400 });
  }
}