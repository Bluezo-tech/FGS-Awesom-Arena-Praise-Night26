import { NextResponse } from "next/server";
import { getMergedVideos } from "@/lib/videos";

export async function GET() {
  try {
    const videos = await getMergedVideos();
    return NextResponse.json({ videos });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load videos." }, { status: 502 });
  }
}
