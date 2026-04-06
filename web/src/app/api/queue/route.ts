import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { resolveDataDir } from "@/lib/dataPaths";

export interface QueueData {
  beatmapIds: number[];
}

function readQueue(): QueueData {
  try {
    const filePath = path.join(resolveDataDir(), "queue.json");
    if (!fs.existsSync(filePath)) return { beatmapIds: [] };
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<QueueData>;
    if (!Array.isArray(parsed.beatmapIds)) return { beatmapIds: [] };
    return {
      beatmapIds: parsed.beatmapIds.filter(
        (id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0
      ),
    };
  } catch {
    return { beatmapIds: [] };
  }
}

/**
 * Parses an osu! beatmap URL or bare numeric ID.
 * Supports:
 *   https://osu.ppy.sh/beatmapsets/{setId}#osu/{mapId}
 *   https://osu.ppy.sh/beatmaps/{mapId}
 *   https://osu.ppy.sh/b/{mapId}
 *   bare numeric ID
 */
function parseOsuBeatmapId(input: string): number | null {
  const s = input.trim();
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const patterns = [
    /osu\.ppy\.sh\/beatmapsets\/\d+#osu\/(\d+)/,
    /osu\.ppy\.sh\/beatmaps\/(\d+)/,
    /osu\.ppy\.sh\/b\/(\d+)/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
  }
  return null;
}

export async function GET() {
  return NextResponse.json(readQueue());
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Optional secret gate — set QUEUE_SECRET in your environment to require a key
  const secret = process.env.QUEUE_SECRET;
  if (secret) {
    if (typeof body.secret !== "string" || body.secret !== secret) {
      return NextResponse.json({ error: "Invalid secret key" }, { status: 401 });
    }
  }

  const beatmapId = parseOsuBeatmapId(String(body.url ?? ""));
  if (!beatmapId) {
    return NextResponse.json(
      {
        error:
          "Could not parse a beatmap ID. Accepted formats: osu.ppy.sh/beatmapsets/{set}#osu/{id}, osu.ppy.sh/beatmaps/{id}, or a bare numeric ID.",
      },
      { status: 400 }
    );
  }

  const current = readQueue();
  if (current.beatmapIds.includes(beatmapId)) {
    return NextResponse.json({
      message: "Already in queue",
      beatmapId,
      beatmapIds: current.beatmapIds,
    });
  }

  const newIds = [...current.beatmapIds, beatmapId];
  const newContent = JSON.stringify({ beatmapIds: newIds }, null, 2) + "\n";

  const token = process.env.QUEUE_GITHUB_TOKEN;
  const repo = process.env.QUEUE_GITHUB_REPO; // "owner/repo"

  if (!token || !repo) {
    return NextResponse.json(
      {
        error:
          "Queue submissions are not configured on this deployment (missing QUEUE_GITHUB_TOKEN / QUEUE_GITHUB_REPO).",
      },
      { status: 503 }
    );
  }

  const filePath = "web/data/queue.json";
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  // Fetch current file SHA (required by GitHub API for updates)
  const getResp = await fetch(apiUrl, { headers: { ...headers } });
  if (!getResp.ok && getResp.status !== 404) {
    return NextResponse.json(
      { error: "Failed to read queue file from GitHub." },
      { status: 502 }
    );
  }

  let sha: string | undefined;
  if (getResp.ok) {
    const getBody = (await getResp.json()) as { sha?: string };
    sha = getBody.sha;
  }

  const putPayload: Record<string, unknown> = {
    message: `feat: queue beatmap ${beatmapId}`,
    content: Buffer.from(newContent).toString("base64"),
  };
  if (sha) putPayload.sha = sha;

  const putResp = await fetch(apiUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify(putPayload),
  });

  if (!putResp.ok) {
    const errText = await putResp.text();
    console.error("GitHub Contents API error:", errText);
    return NextResponse.json(
      { error: "Failed to write queue to GitHub. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ message: "Queued", beatmapId, beatmapIds: newIds });
}
