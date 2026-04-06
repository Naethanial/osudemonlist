import { NextRequest, NextResponse } from "next/server";
import { getPlayers, getMaps } from "@/lib/data";
import { lookupOsuUserByUsername } from "@/lib/osuAuth";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const qLower = q.toLowerCase();

  if (q.length < 2) {
    return NextResponse.json({ players: [], maps: [] });
  }

  const allPlayers = getPlayers();
  const leaderboardResults = allPlayers
    .reduce<
      Array<{
        userId: number;
        username: string;
        totalPoints: number;
        clearCount: number;
        rank: number | null;
      }>
    >((acc, p, i) => {
      if (p.username.toLowerCase().includes(qLower)) {
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

  const players = [...leaderboardResults];

  // If we have room and the query is long enough, try exact osu! username lookup
  // so users who haven't cleared a demon are still discoverable.
  if (players.length < 5 && q.length >= 3) {
    const osuUser = await lookupOsuUserByUsername(q);
    if (osuUser) {
      const alreadyIncluded = players.some((p) => p.userId === osuUser.userId);
      if (!alreadyIncluded) {
        // Check if this user is actually on the leaderboard (just not fuzzy-matched)
        const leaderboardIdx = allPlayers.findIndex((p) => p.userId === osuUser.userId);
        if (leaderboardIdx !== -1) {
          const p = allPlayers[leaderboardIdx];
          players.push({
            userId: p.userId,
            username: p.username,
            totalPoints: p.totalPoints,
            clearCount: p.maps.length,
            rank: leaderboardIdx + 1,
          });
        } else {
          players.push({
            userId: osuUser.userId,
            username: osuUser.username,
            totalPoints: 0,
            clearCount: 0,
            rank: null,
          });
        }
      }
    }
  }

  const maps = getMaps()
    .filter(
      (m) =>
        m.title.toLowerCase().includes(qLower) ||
        m.artist.toLowerCase().includes(qLower) ||
        m.difficultyName.toLowerCase().includes(qLower)
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
