export interface OsuMod {
  acronym: string;
  settings?: Record<string, unknown>;
}

export interface OsuScoreUser {
  id: number;
  username: string;
}

export interface OsuScore {
  id: number;
  user_id: number;
  beatmap_id?: number;
  max_combo: number;
  mods: OsuMod[] | string;
  passed?: boolean;
  ended_at?: string;
  started_at?: string;
  /** API v20220705+ — lazer hit-result counts (snake_case keys) */
  statistics?: Record<string, number>;
  /** API v20220705+ */
  is_perfect_combo?: boolean;
  legacy_perfect?: boolean;
  /** Older score shape */
  perfect?: boolean;
  user?: OsuScoreUser;
}

export interface BeatmapScoresResponse {
  scores: OsuScore[];
  /** May include user_score etc. */
  [key: string]: unknown;
}

export interface OsuBeatmap {
  id: number;
  beatmapset_id: number;
  difficulty_rating: number;
  mode: string;
  status: string;
  version: string;
  max_combo?: number;
}

export interface OsuBeatmapset {
  id: number;
  title: string;
  artist: string;
  creator: string;
  beatmaps: OsuBeatmap[];
}

export interface BeatmapSearchResponse {
  beatmapsets: OsuBeatmapset[];
  cursor_string?: string | null;
}

export interface DemonMapEntry {
  rank: number;
  beatmapId: number;
  beatmapsetId: number;
  title: string;
  artist: string;
  difficultyName: string;
  difficultyRating: number;
  points: number;
  qualifyingPlayers: {
    userId: number;
    username: string;
    scoreId: number;
    pointsMultiplier: number;
    clearedAt: string | null;
    clearRole: "verified" | "victor";
    victorNumber: number | null;
  }[];
}

export interface LeaderboardPlayer {
  userId: number;
  username: string;
  totalPoints: number;
  maps: { beatmapId: number; demonRank: number; points: number }[];
}

export interface LeaderboardOutput {
  generatedAt: string;
  criteria: {
    ruleset: "osu";
    rankedOnly: true;
    requireFullCombo: true;
    /** When true, require API perfect-combo flags (or legacy shape); max_combo alone is not enough if lazer fields exist. */
    strictPerfectCombo: boolean;
    allowedModAcronyms: string[];
    allowedModPolicy: string;
    includeLegacyAndLazerScores: true;
    demonListSize: number;
    selection: string;
    note?: string;
  };
  maps: DemonMapEntry[];
  leaderboard: LeaderboardPlayer[];
}
