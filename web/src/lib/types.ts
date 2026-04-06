export interface PlayerMap {
  beatmapId: number;
  demonRank: number;
  points: number;
}

export interface Player {
  userId: number;
  username: string;
  totalPoints: number;
  maps: PlayerMap[];
  countryCode?: string;
}

export interface QualifyingPlayer {
  userId: number;
  username: string;
  scoreId: number;
  pointsMultiplier: number;
  clearedAt: string;
  clearRole: string;
  victorNumber: number | null;
}

export interface DemonMap {
  beatmapId: number;
  beatmapsetId: number;
  title: string;
  artist: string;
  difficultyName: string;
  difficultyRating: number;
  hitLength?: number;
  qualifyingPlayers: QualifyingPlayer[];
  rank: number;
  points: number;
}

export interface LeaderboardData {
  generatedAt: string;
  criteria: {
    ruleset: string;
    demonListSize: number;
    allowedModPolicy: string;
    note: string;
  };
  maps: DemonMap[];
  leaderboard: Player[];
}
