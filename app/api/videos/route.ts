import { NextResponse } from "next/server";
import { getDriveVideos } from "@/lib/google-drive";

export async function GET() {
  try { return NextResponse.json({ videos: await getDriveVideos() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load videos." }, { status: 502 }); }
}
