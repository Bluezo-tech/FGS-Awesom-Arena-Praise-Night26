import { NextResponse } from "next/server";
import { getDownloadUrl, getEmbedUrl } from "@/lib/google-drive";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ id, embedUrl: getEmbedUrl(id), downloadUrl: getDownloadUrl(id) });
}
