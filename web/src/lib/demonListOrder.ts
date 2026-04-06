import type { DemonMap } from "./types";
import { computeLengthRanks, mapCombinedScore } from "./lengthWeighted";

const HIT_LEN_DEFAULT = 90;

export type DemonMapWithDisplay = DemonMap & {
  displayRank: number;
  displayPoints: number;
};

/**
 * Default demon list order: length-weighted combined difficulty (same as /demon-list with
 * "Difficulty" sort). `displayRank` 1 = top row on that page; `displayPoints` matches the
 * list's own descending display curve.
 */
export function getDifficultySortedMaps(maps: DemonMap[]): DemonMapWithDisplay[] {
  const lengthRanks = computeLengthRanks(maps);
  return [...maps]
    .sort((a, b) => {
      const sa = mapCombinedScore(a.difficultyRating, a.hitLength ?? HIT_LEN_DEFAULT);
      const sb = mapCombinedScore(b.difficultyRating, b.hitLength ?? HIT_LEN_DEFAULT);
      return sb !== sa ? sb - sa : a.rank - b.rank;
    })
    .map((m, i) => {
      const info = lengthRanks.get(m.beatmapId);
      return {
        ...m,
        displayRank: i + 1,
        displayPoints: info?.lengthPoints ?? 0,
      };
    });
}

/** Lookup for aligning profile rows with demon list rank / points. */
export function difficultyDisplayByBeatmapId(
  maps: DemonMap[]
): Map<number, { displayRank: number; displayPoints: number }> {
  const sorted = getDifficultySortedMaps(maps);
  const out = new Map<number, { displayRank: number; displayPoints: number }>();
  for (const row of sorted) {
    out.set(row.beatmapId, {
      displayRank: row.displayRank,
      displayPoints: row.displayPoints,
    });
  }
  return out;
}
