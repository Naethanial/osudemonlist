import { NextRequest, NextResponse } from "next/server";
import { getPlayers, getMaps, getMultiplierLookup } from "@/lib/data";
import { computeLengthRanks, playerLengthStats } from "@/lib/lengthWeighted";
import { difficultyDisplayByBeatmapId } from "@/lib/demonListOrder";
import { lookupOsuUserByUsername } from "@/lib/osuAuth";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const qLower = q.toLowerCase();

  if (q.length < 2) {
    return NextResponse.json({ players: [], maps: [] });
  }

  const allPlayers = getPlayers();
  const lengthRanks = computeLengthRanks(getMaps());
  const multiplierLookup = getMultiplierLookup();
  const leaderboardStats = allPlayers.map((player) => ({
    player,
    stats: playerLengthStats(player, lengthRanks, multiplierLookup, 1, lengthRanks.size),
  }));
  const sortedLeaderboard = [...leaderboardStats].sort((a, b) =>
    b.stats.points !== a.stats.points ? b.stats.points - a.stats.points : a.player.userId - b.player.userId
  );
  const displayByBeatmapId = difficultyDisplayByBeatmapId(getMaps());
  const leaderboardResults = sortedLeaderboard
    .reduce<
      Array<{
        userId: number;
        username: string;
        totalPoints: number;
        clearCount: number;
        rank: number | null;
      }>
    >((acc, entry, i) => {
      if (entry.player.username.toLowerCase().includes(qLower)) {
        acc.push({
          userId: entry.player.userId,
          username: entry.player.username,
          totalPoints: entry.stats.points,
          clearCount: entry.stats.clears,
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
        const leaderboardIdx = sortedLeaderboard.findIndex((entry) => entry.player.userId === osuUser.userId);
        if (leaderboardIdx !== -1) {
          const p = sortedLeaderboard[leaderboardIdx];
          players.push({
            userId: p.player.userId,
            username: p.player.username,
            totalPoints: p.stats.points,
            clearCount: p.stats.clears,
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
      rank: displayByBeatmapId.get(m.beatmapId)?.displayRank ?? m.rank,
      points: displayByBeatmapId.get(m.beatmapId)?.displayPoints ?? m.points,
    }));

  return NextResponse.json({ players, maps });
}
