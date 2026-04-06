import type { OsuScore } from "./types.js";

/**
 * Points y for demon list map position x (1..1000) from the piecewise formula.
 */
export function pointsForDemonRank(x: number): number {
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
