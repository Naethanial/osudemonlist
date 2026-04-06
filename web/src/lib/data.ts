import fs from "fs";
import path from "path";
import type { LeaderboardData, Player, DemonMap } from "./types";
import { resolveDataDir } from "./dataPaths";

let cachedData: LeaderboardData | null = null;
let cachedLeaderboardMtimeMs: number | null = null;
let cachedLeaderboardPath: string | null = null;

export function getLeaderboardData(): LeaderboardData {
  const filePath = path.join(resolveDataDir(), "leaderboard.json");
  const stat = fs.statSync(filePath);
  const mtime = stat.mtimeMs;

  const isProd = process.env.NODE_ENV === "production";
  if (isProd && cachedData) {
    return cachedData;
  }
  if (
    !isProd &&
    cachedData &&
    cachedLeaderboardPath === filePath &&
    cachedLeaderboardMtimeMs === mtime
  ) {
    return cachedData;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  cachedData = JSON.parse(raw) as LeaderboardData;
  cachedLeaderboardPath = filePath;
  cachedLeaderboardMtimeMs = mtime;
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

export function getDemonListSize(): number {
  return getLeaderboardData().criteria.demonListSize;
}

/** Verification counts (verified clears only) for maps whose demon list rank is in [minRank, maxRank]. */
export function getPlayerVerificationCountsInRange(
  minRank: number,
  maxRank: number
): Map<number, number> {
  const maps = getMaps().filter(
    (m) => m.rank >= minRank && m.rank <= maxRank
  );
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

/** beatmapId → userId → pointsMultiplier, built from the maps qualifyingPlayers list. */
export function getMultiplierLookup(): Map<number, Map<number, number>> {
  const maps = getMaps();
  const lookup = new Map<number, Map<number, number>>();
  for (const m of maps) {
    const inner = new Map<number, number>();
    for (const qp of m.qualifyingPlayers) {
      inner.set(qp.userId, qp.pointsMultiplier);
    }
    lookup.set(m.beatmapId, inner);
  }
  return lookup;
}

/**
 * Computes a player's stored points (pm.points × mod multiplier) and clear count,
 * filtered to maps whose demon rank is in [minRank, maxRank].
 * Consistent with leaderboard.json totalPoints.
 */
export function playerStoredStats(
  player: Player,
  multiplierLookup: Map<number, Map<number, number>>,
  minRank: number,
  maxRank: number
): { points: number; clears: number } {
  let points = 0;
  let clears = 0;
  for (const pm of player.maps) {
    if (pm.demonRank < minRank || pm.demonRank > maxRank) continue;
    const multiplier = multiplierLookup.get(pm.beatmapId)?.get(player.userId) ?? 1;
    points += pm.points * multiplier;
    clears++;
  }
  return { points, clears };
}
