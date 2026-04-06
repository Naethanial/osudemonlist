import fs from "fs";
import path from "path";
import type { LeaderboardData, Player, DemonMap } from "./types";

let cachedData: LeaderboardData | null = null;

export function getLeaderboardData(): LeaderboardData {
  if (cachedData) return cachedData;

  const filePath = path.join(process.cwd(), "..", "output", "leaderboard.json");
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
