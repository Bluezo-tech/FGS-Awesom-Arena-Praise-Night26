import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try { const db = await requireAdmin(request); const { data, error } = await db.from("video_metadata").select("*").order("display_order", { ascending: true, nullsFirst: false }); if (error) throw error; return NextResponse.json({ videos: data }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load videos." }, { status: 401 }); }
}

export async function PATCH(request: Request) {
  try { const db = await requireAdmin(request); const updates = await request.json(); if (!updates.drive_file_id) throw new Error("A Drive file ID is required."); const { data, error } = await db.from("video_metadata").upsert({ ...updates, updated_at: new Date().toISOString() }).select().single(); if (error) throw error; return NextResponse.json({ video: data }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save video." }, { status: 400 }); }
}
