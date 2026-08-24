import { NextRequest } from "next/server";
import { GoogleAuth } from "google-auth-library";

export const runtime = "nodejs";

let cachedAuth: GoogleAuth | null = null;

function getAuth() {
  if (!cachedAuth) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!email || !privateKey) throw new Error("Missing Google service account credentials.");
    cachedAuth = new GoogleAuth({
      credentials: { client_email: email, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
  }
  return cachedAuth;
}

async function getAccessToken(): Promise<string> {
  const client = await getAuth().getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Google service account authentication failed.");
  return token.token;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  if (!fileId) return new Response("Missing fileId", { status: 400 });

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch {
    return new Response("Drive auth failed", { status: 502 });
  }

  const range = req.headers.get("range");
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;

  const driveRes = await fetch(driveUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(range ? { Range: range } : {}),
    },
    cache: "no-store",
  });

  if (!driveRes.ok && driveRes.status !== 206) {
    return new Response("Failed to fetch video from Drive", { status: driveRes.status });
  }

  const headers = new Headers();
  ["content-type", "content-length", "content-range", "accept-ranges", "etag"].forEach((h) => {
    const v = driveRes.headers.get(h);
    if (v) headers.set(h, v);
  });
  if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
  if (!headers.has("content-type")) headers.set("content-type", "video/mp4");
  if (req.nextUrl.searchParams.get("download") === "1") {
    headers.set("content-disposition", `attachment; filename="video-${fileId}.mp4"`);
  }
  headers.set("cache-control", "private, max-age=3600");

  return new Response(driveRes.body, { status: driveRes.status, headers });
}

export async function HEAD(req: NextRequest, ctx: { params: Promise<{ fileId: string }> }) {
  const res = await GET(req, ctx);
  return new Response(null, { status: res.status, headers: res.headers });
}