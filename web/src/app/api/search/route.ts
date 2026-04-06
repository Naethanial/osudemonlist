import { NextRequest, NextResponse } from "next/server";
import { getPlayers, getMaps } from "@/lib/data";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ players: [], maps: [] });
  }

  const allPlayers = getPlayers();
  const players = allPlayers
    .reduce<
      Array<{
        userId: number;
        username: string;
        totalPoints: number;
        clearCount: number;
        rank: number;
      }>
    >((acc, p, i) => {
      if (p.username.toLowerCase().includes(q)) {
        acc.push({
          userId: p.userId,
          username: p.username,
          totalPoints: p.totalPoints,
          clearCount: p.maps.length,
          rank: i + 1,
        });
      }
      return acc;
    }, [])
    .slice(0, 5);

  const maps = getMaps()
    .filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.artist.toLowerCase().includes(q) ||
        m.difficultyName.toLowerCase().includes(q)
    )
    .slice(0, 5)
    .map((m) => ({
      beatmapId: m.beatmapId,
      beatmapsetId: m.beatmapsetId,
      title: m.title,
      artist: m.artist,
      difficultyName: m.difficultyName,
      rank: m.rank,
      points: m.points,
    }));

  return NextResponse.json({ players, maps });
}
