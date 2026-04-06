import fs from "fs";
import path from "path";
import type { LeaderboardData, Player, DemonMap } from "./types";
import { resolveDataDir } from "./dataPaths";

let cachedData: LeaderboardData | null = null;

export function getLeaderboardData(): LeaderboardData {
  if (cachedData) return cachedData;

  const filePath = path.join(resolveDataDir(), "leaderboard.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  cachedData = JSON.parse(raw) as LeaderboardData;
  return cachedData;
}

export function getPlayers(): Player[] {
  return getLeaderboardData().leaderboard;
}

export function getMaps(): DemonMap[] {
  return getLeaderboardData().maps;
}

export function getGeneratedAt(): string {
  return getLeaderboardData().generatedAt;
}

export function getMapById(beatmapId: number): DemonMap | undefined {
  return getLeaderboardData().maps.find((m) => m.beatmapId === beatmapId);
}

export function getPlayerById(userId: number): Player | undefined {
  return getLeaderboardData().leaderboard.find((p) => p.userId === userId);
}

export function getPlayerRank(userId: number): number {
  const idx = getLeaderboardData().leaderboard.findIndex(
    (p) => p.userId === userId
  );
  return idx === -1 ? -1 : idx + 1;
}

export const PLAYERS_PER_PAGE = 50;
export const MAPS_PER_PAGE = 50;

export function getPlayerVerificationCounts(): Map<number, number> {
  const maps = getMaps();
  const counts = new Map<number, number>();
  for (const map of maps) {
    for (const qp of map.qualifyingPlayers) {
      if (qp.clearRole === "verified") {
        counts.set(qp.userId, (counts.get(qp.userId) ?? 0) + 1);
      }
    }
  }
  return counts;
}
