import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try { const db = await requireAdmin(request); const { data, error } = await db.from("site_settings").select("*").eq("id", true).single(); if (error) throw error; return NextResponse.json({ settings: data }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load settings." }, { status: 401 }); }
}

export async function PATCH(request: Request) {
  try { const db = await requireAdmin(request); const updates = await request.json(); const { data, error } = await db.from("site_settings").upsert({ id: true, ...updates, updated_at: new Date().toISOString() }).select().single(); if (error) throw error; return NextResponse.json({ settings: data }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save settings." }, { status: 401 }); }
}
