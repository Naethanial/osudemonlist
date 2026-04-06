import type { OsuScore } from "./types.js";

/**
 * Piecewise base points before the global rank-1 boost (see `pointsForDemonRank`).
 */
function rawPointsForDemonRank(x: number): number {
  if (x < 1) {
    throw new RangeError(`demon rank x must be >= 1, got ${x}`);
  }

  if (x > 55) {
    const start = 56.559857;
    return start * Math.exp(-0.005 * (x - 55));
  }

  if (x > 35) {
    return 212.61 * 1.036 ** (1 - x) + 25.071;
  }

  if (x > 20) {
    return (250 - 83.389) * 1.0099685 ** (2 - x) - 31.152;
  }

  return (250 - 100.39) * 1.168 ** (1 - x) + 100.39;
}

/** Target base points for rank 1 (before mod multiplier). Lowest rank keeps the raw tail value. */
const RANK1_TARGET_POINTS = 350;

const TAIL_RAW = rawPointsForDemonRank(1000);
const RANK1_RAW = rawPointsForDemonRank(1);
const POINTS_SCALE = (RANK1_TARGET_POINTS - TAIL_RAW) / (RANK1_RAW - TAIL_RAW);
const POINTS_OFFSET = TAIL_RAW * (1 - POINTS_SCALE);

/**
 * Points y for demon list map position x (1..1000). Affine boost vs the legacy curve:
 * rank 1 → ~350 base, rank 1000 unchanged, everything in between scaled consistently.
 */
export function pointsForDemonRank(x: number): number {
  if (x < 1) {
    throw new RangeError(`demon rank x must be >= 1, got ${x}`);
  }

  return rawPointsForDemonRank(x) * POINTS_SCALE + POINTS_OFFSET;
}

function normalizeMods(mods: OsuScore["mods"]): string[] {
  if (Array.isArray(mods)) {
    return mods.map((mod) => mod.acronym);
  }

  if (typeof mods === "string" && mods.trim() !== "") {
    return mods.split(/[,+]/).map((s) => s.trim()).filter(Boolean);
  }

  return [];
}

export function scoreMultiplierForMods(mods: OsuScore["mods"]): number {
  const list = normalizeMods(mods);
  if (list.includes("HR")) {
    return 1.2;
  }

  return 1;
}
