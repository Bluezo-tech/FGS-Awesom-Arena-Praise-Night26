import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Public read of site settings (church name, media name, hero copy, footer,
// social links). Uses the service role server-side; never exposes the key to
// the client. Returns null gracefully when Supabase is not configured so the
// frontend can fall back to its built-in defaults.
export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("site_settings").select("*").eq("id", true).single();
    if (error) throw error;
    return NextResponse.json({ settings: data });
  } catch {
    return NextResponse.json({ settings: null });
  }
}
