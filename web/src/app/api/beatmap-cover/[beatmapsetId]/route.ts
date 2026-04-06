import { NextResponse } from "next/server";

const COVER_BASE = "https://assets.ppy.sh/beatmaps";

export async function GET(
  _request: Request,
  context: { params: Promise<{ beatmapsetId: string }> }
) {
  const { beatmapsetId: raw } = await context.params;
  if (!/^\d+$/.test(raw)) {
    return NextResponse.json({ error: "Invalid beatmapset id" }, { status: 400 });
  }
  const beatmapsetId = parseInt(raw, 10);
  if (!Number.isFinite(beatmapsetId) || beatmapsetId < 1) {
    return NextResponse.json({ error: "Invalid beatmapset id" }, { status: 400 });
  }

  const url = `${COVER_BASE}/${beatmapsetId}/covers/cover.jpg`;
  const upstream = await fetch(url, { next: { revalidate: 86400 } });
  if (!upstream.ok) {
    return NextResponse.json({ error: "Cover not found" }, { status: upstream.status === 404 ? 404 : 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
