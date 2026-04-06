import type { OsuBeatmap, OsuMod, OsuScore } from "./types.js";

/** Only NM, Classic (CL), Hidden (HD), and HardRock (HR); combinations of those are allowed. */
const ALLOWED_MOD_ACRONYMS = new Set<string>(["CL", "HD", "HR"]);

const MIN_COMBO_RATIO = 0.95;

/** Hit results that should disqualify an FC in this tool. */
const MISS_STATISTIC_KEYS = new Set([
  "miss",
  "combo_break",
]);

export interface FullComboOptions {
  /**
   * When false (default), scores that include `is_perfect_combo` / `legacy_perfect` must have at least one true;
   * matching `max_combo` alone is not enough if those fields exist (filters missed slider tails that still padded combo).
   * When true, any passed score without a disqualifying miss/combo-break statistic can qualify even if it is not marked perfect.
   */
  lenientFc?: boolean;
}

function normalizeMods(mods: OsuScore["mods"]): OsuMod[] {
  if (Array.isArray(mods)) {
    return mods;
  }
  if (typeof mods === "string" && mods.trim() !== "") {
    const parts = mods.split(/[,+]/).map((s) => s.trim()).filter(Boolean);
    return parts.map((acronym) => ({ acronym }));
  }
  return [];
}

export function hasOnlyAllowedMods(score: OsuScore): boolean {
  const list = normalizeMods(score.mods);
  if (list.length === 0) {
    return true;
  }
  return list.every((m) => ALLOWED_MOD_ACRONYMS.has(m.acronym));
}

function hasMinimumCombo(score: OsuScore, beatmap: OsuBeatmap): boolean {
  const mapMax = beatmap.max_combo;
  if (mapMax == null || mapMax <= 0) {
    return false;
  }

  return score.max_combo / mapMax >= MIN_COMBO_RATIO;
}

function statisticsHasAnyMiss(statistics: OsuScore["statistics"]): boolean {
  if (!statistics || typeof statistics !== "object") {
    return false;
  }
  for (const [key, value] of Object.entries(statistics)) {
    if (typeof value !== "number" || value <= 0) {
      continue;
    }
    if (MISS_STATISTIC_KEYS.has(key)) {
      return true;
    }
  }
  return false;
}

function hasLazerPerfectComboFields(score: OsuScore): boolean {
  return score.is_perfect_combo !== undefined || score.legacy_perfect !== undefined;
}

function lazerPerfectComboTrue(score: OsuScore): boolean {
  return score.is_perfect_combo === true || score.legacy_perfect === true;
}

function legacyMaxComboMatch(score: OsuScore, beatmap: OsuBeatmap): boolean {
  const mapMax = beatmap.max_combo;
  return mapMax != null && mapMax > 0 && score.max_combo === mapMax;
}

/**
 * Full combo for demon list purposes.
 *
 * Strict (default): rejects plays with any miss-class `statistics` count, and when the API exposes
 * `is_perfect_combo` / `legacy_perfect`, requires at least one to be true (so “max combo only” rows
 * that still missed a slider tail are dropped).
 */
export function isFullCombo(
  score: OsuScore,
  beatmap: OsuBeatmap,
  options: FullComboOptions = {},
): boolean {
  if (score.passed === false) {
    return false;
  }

  if (statisticsHasAnyMiss(score.statistics)) {
    return false;
  }

  if (!hasMinimumCombo(score, beatmap)) {
    return false;
  }

  if (score.perfect === true) {
    return true;
  }

  const lenient = options.lenientFc === true;

  if (lenient) {
    return true;
  }

  if (hasLazerPerfectComboFields(score)) {
    return lazerPerfectComboTrue(score);
  }

  return legacyMaxComboMatch(score, beatmap);
}

export function scoreQualifies(
  score: OsuScore,
  beatmap: OsuBeatmap,
  options: FullComboOptions = {},
): boolean {
  return hasOnlyAllowedMods(score) && isFullCombo(score, beatmap, options);
}

export function allowedModAcronymsForExport(): string[] {
  return ["(none)", "CL", "HD", "HR"];
}
