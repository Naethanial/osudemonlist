import type { DemonMap, Player } from "./types";

/**
 * Length-weighted scoring.
 *
 * Combined difficulty = stars × (hitLength / REF_SECONDS)^LENGTH_ALPHA
 *
 * Calibrated so that an 8.3★ 5-minute map scores ≈ the same as a 9.1★ 90-second map.
 * Every map gets points from its position in the combined-difficulty ordering.
 */

const REF_SECONDS = 90;
// Slightly soften the length contribution while keeping the same overall shape.
const LENGTH_ALPHA = 0.075;

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

const PRESTIGE_BOOST = 0.45;
const PRESTIGE_DECAY = 45;

export function pointsForLengthRank(rank: number): number {
  const base = rawPoints(rank) * SCALE + OFFSET;
  return base * (1 + PRESTIGE_BOOST * Math.exp(-(rank - 1) / PRESTIGE_DECAY));
}

/** Combined difficulty score used to re-rank maps. */
export function mapCombinedScore(stars: number, hitLength: number): number {
  return stars * Math.pow(Math.max(hitLength, 1) / REF_SECONDS, LENGTH_ALPHA);
}

export interface LengthRankInfo {
  lengthRank: number;
  lengthPoints: number;
}

export interface LengthWeightedStats {
  points: number;
  clears: number;
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
      lengthPoints: pointsForLengthRank(lengthRank),
    });
  }
  return result;
}

/**
 * Computes a player's length-weighted stats, filtered to maps whose display
 * rank is in [minLengthRank, maxLengthRank].
 */
export function playerLengthStats(
  player: Player,
  lengthRanks: Map<number, LengthRankInfo>,
  multiplierLookup: Map<number, Map<number, number>>,
  minLengthRank: number,
  maxLengthRank: number
): LengthWeightedStats {
  let points = 0;
  let clears = 0;
  for (const pm of player.maps) {
    const info = lengthRanks.get(pm.beatmapId);
    if (!info) continue;
    if (info.lengthRank < minLengthRank || info.lengthRank > maxLengthRank) continue;
    const multiplier = multiplierLookup.get(pm.beatmapId)?.get(player.userId) ?? 1;
    points += info.lengthPoints * multiplier;
    clears++;
  }
  return { points, clears };
}
