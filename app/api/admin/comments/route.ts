import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const db = await requireAdmin(request);
    const { data, error } = await db.from("comments").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ comments: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load comments." }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const db = await requireAdmin(request);
    const updates = await request.json();
    if (!updates.id) throw new Error("A comment ID is required.");
    const { data, error } = await db.from("comments").update({ approved: updates.approved }).eq("id", updates.id).select().single();
    if (error) throw error;
    return NextResponse.json({ comment: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update comment." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = await requireAdmin(request);
    const updates = await request.json();
    if (!updates.id) throw new Error("A comment ID is required.");
    const { error } = await db.from("comments").delete().eq("id", updates.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete comment." }, { status: 400 });
  }
}