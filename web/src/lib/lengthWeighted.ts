import type { DemonMap, Player } from "./types";

/**
 * Length-weighted scoring.
 *
 * Combined difficulty = stars × (hitLength / REF_SECONDS)^LENGTH_ALPHA
 *
 * Calibrated so that an 8.3★ 5-minute map scores ≈ the same as a 9.1★ 90-second map.
 * Only the top LENGTH_POINTS_CUTOFF maps by combined difficulty award points.
 */

const REF_SECONDS = 90;
const LENGTH_ALPHA = 0.075;
export const LENGTH_POINTS_CUTOFF = 500;

// Same piecewise curve + affine boost used in src/scoring.ts
function rawPoints(x: number): number {
  if (x > 55) return 56.559857 * Math.exp(-0.005 * (x - 55));
  if (x > 35) return 212.61 * 1.036 ** (1 - x) + 25.071;
  if (x > 20) return (250 - 83.389) * 1.0099685 ** (2 - x) - 31.152;
  return (250 - 100.39) * 1.168 ** (1 - x) + 100.39;
}

const TAIL_RAW = rawPoints(1000);
const RANK1_RAW = rawPoints(1);
const RANK1_TARGET = 350;
const SCALE = (RANK1_TARGET - TAIL_RAW) / (RANK1_RAW - TAIL_RAW);
const OFFSET = TAIL_RAW * (1 - SCALE);

export function pointsForLengthRank(rank: number): number {
  return rawPoints(rank) * SCALE + OFFSET;
}

/** Combined difficulty score used to re-rank maps. */
export function mapCombinedScore(stars: number, hitLength: number): number {
  return stars * Math.pow(Math.max(hitLength, 1) / REF_SECONDS, LENGTH_ALPHA);
}

export interface LengthRankInfo {
  lengthRank: number;
  /** 0 for maps ranked > LENGTH_POINTS_CUTOFF */
  lengthPoints: number;
}

/**
 * Re-ranks all provided maps by combined difficulty score and returns a lookup
 * from beatmapId → { lengthRank, lengthPoints }.
 */
export function computeLengthRanks(maps: DemonMap[]): Map<number, LengthRankInfo> {
  const sorted = [...maps]
    .map((m) => ({
      beatmapId: m.beatmapId,
      score: mapCombinedScore(m.difficultyRating, m.hitLength ?? REF_SECONDS),
    }))
    .sort((a, b) => b.score - a.score);

  const result = new Map<number, LengthRankInfo>();
  for (let i = 0; i < sorted.length; i++) {
    const lengthRank = i + 1;
    result.set(sorted[i].beatmapId, {
      lengthRank,
      lengthPoints:
        lengthRank <= LENGTH_POINTS_CUTOFF ? pointsForLengthRank(lengthRank) : 0,
    });
  }
  return result;
}

/**
 * Computes a player's length-weighted stats, filtered to maps whose original
 * demon rank is in [minDemonRank, maxDemonRank].
 */
export function playerLengthStats(
  player: Player,
  lengthRanks: Map<number, LengthRankInfo>,
  minDemonRank: number,
  maxDemonRank: number
): { points: number; clears: number } {
  let points = 0;
  let clears = 0;
  for (const pm of player.maps) {
    if (pm.demonRank < minDemonRank || pm.demonRank > maxDemonRank) continue;
    const info = lengthRanks.get(pm.beatmapId);
    if (info) {
      points += info.lengthPoints;
      clears++;
    }
  }
  return { points, clears };
}
