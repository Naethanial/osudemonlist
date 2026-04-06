import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allowedModAcronymsForExport, scoreQualifies } from "./filters.js";
import { OsuClient } from "./osuClient.js";
import { pointsForDemonRank, scoreMultiplierForMods } from "./scoring.js";
import type {
  DemonMapEntry,
  LeaderboardOutput,
  LeaderboardPlayer,
  OsuBeatmap,
  OsuBeatmapset,
  OsuScore,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

interface CliOptions {
  targetCount: number;
  maxSearchPages: number;
  delayMs: number;
  outputDir: string;
  sampleOnly: number | null;
  lenientFc: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  let targetCount = 1000;
  let maxSearchPages = 1200;
  let delayMs = 120;
  let outputDir = join(ROOT, "output");
  let sampleOnly: number | null = null;
  let lenientFc = true;

  for (const arg of argv) {
    if (arg.startsWith("--target=")) {
      targetCount = Math.max(1, parseInt(arg.slice("--target=".length), 10) || 1000);
    } else if (arg.startsWith("--max-pages=")) {
      maxSearchPages = Math.max(1, parseInt(arg.slice("--max-pages=".length), 10) || 1200);
    } else if (arg.startsWith("--delay-ms=")) {
      delayMs = Math.max(0, parseInt(arg.slice("--delay-ms=".length), 10) || 0);
    } else if (arg.startsWith("--out=")) {
      outputDir = arg.slice("--out=".length);
    } else if (arg.startsWith("--sample=")) {
      sampleOnly = Math.max(1, parseInt(arg.slice("--sample=".length), 10) || 5);
    } else if (arg === "--strict-fc") {
      lenientFc = false;
    } else if (arg === "--lenient-fc") {
      lenientFc = true;
    }
  }

  return { targetCount, maxSearchPages, delayMs, outputDir, sampleOnly, lenientFc };
}

function isAllowedStatus(status: string | undefined): boolean {
  if (!status) {
    return false;
  }
  const s = status.toLowerCase();
  return s === "ranked" || s === "1";
}

function collectAllowedOsuBeatmaps(
  beatmapsets: OsuBeatmapset[],
): { beatmap: OsuBeatmap; set: OsuBeatmapset }[] {
  const out: { beatmap: OsuBeatmap; set: OsuBeatmapset }[] = [];
  for (const set of beatmapsets) {
    for (const bm of set.beatmaps ?? []) {
      if (bm.mode === "osu" && isAllowedStatus(bm.status)) {
        out.push({ beatmap: bm, set });
      }
    }
  }
  return out;
}

function sortByDifficulty(
  items: { beatmap: OsuBeatmap; set: OsuBeatmapset }[],
): { beatmap: OsuBeatmap; set: OsuBeatmapset }[] {
  return [...items].sort(
    (a, b) => b.beatmap.difficulty_rating - a.beatmap.difficulty_rating,
  );
}

function uniqueByBeatmapId(
  items: { beatmap: OsuBeatmap; set: OsuBeatmapset }[],
): Map<number, { beatmap: OsuBeatmap; set: OsuBeatmapset }> {
  const map = new Map<number, { beatmap: OsuBeatmap; set: OsuBeatmapset }>();
  for (const it of items) {
    if (!map.has(it.beatmap.id)) {
      map.set(it.beatmap.id, it);
    }
  }
  return map;
}

type QualifiedMapCandidate = Omit<DemonMapEntry, "rank" | "points">;

// Manual exclusions for specific beatmaps that should never appear on the demon list.
// Keep this list very small and explicit.
const EXCLUDED_BEATMAP_IDS = new Set<number>([
  2844649, // t+pazolite - Oshama Scramble! (IOException Edit) [Special]
]);

function extractPlayers(
  scores: OsuScore[],
): {
  userId: number;
  username: string;
  scoreId: number;
  pointsMultiplier: number;
  clearedAt: string | null;
}[] {
  const seen = new Map<
    number,
    {
      userId: number;
      username: string;
      scoreId: number;
      pointsMultiplier: number;
      clearedAt: string | null;
    }
  >();
  for (const s of scores) {
    const pointsMultiplier = scoreMultiplierForMods(s.mods);
    const existing = seen.get(s.user_id);
    const clearedAt = s.ended_at ?? s.started_at ?? null;

    if (
      !existing ||
      pointsMultiplier > existing.pointsMultiplier ||
      (pointsMultiplier === existing.pointsMultiplier && isEarlierClearedAt(clearedAt, existing.clearedAt))
    ) {
      seen.set(s.user_id, {
        userId: s.user_id,
        username: s.user?.username ?? `user_${s.user_id}`,
        scoreId: s.id,
        pointsMultiplier,
        clearedAt,
      });
    }
  }
  return [...seen.values()];
}

function isEarlierClearedAt(candidate: string | null, current: string | null): boolean {
  if (candidate == null) {
    return false;
  }
  if (current == null) {
    return true;
  }
  return Date.parse(candidate) < Date.parse(current);
}

function sortQualifyingPlayers(
  players: {
    userId: number;
    username: string;
    scoreId: number;
    pointsMultiplier: number;
    clearedAt: string | null;
  }[],
): {
  userId: number;
  username: string;
  scoreId: number;
  pointsMultiplier: number;
  clearedAt: string | null;
  clearRole: "verified" | "victor";
  victorNumber: number | null;
}[] {
  return [...players]
    .sort((a, b) => {
      const aTime = a.clearedAt ? Date.parse(a.clearedAt) : Number.POSITIVE_INFINITY;
      const bTime = b.clearedAt ? Date.parse(b.clearedAt) : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return a.scoreId - b.scoreId;
    })
    .map((player, index) => ({
      ...player,
      clearRole: index === 0 ? "verified" : "victor",
      victorNumber: index === 0 ? null : index,
    }));
}

function buildLeaderboard(maps: DemonMapEntry[]): LeaderboardPlayer[] {
  const byUser = new Map<number, LeaderboardPlayer>();

  for (const m of maps) {
    for (const p of m.qualifyingPlayers) {
      let row = byUser.get(p.userId);
      if (!row) {
        row = { userId: p.userId, username: p.username, totalPoints: 0, maps: [] };
        byUser.set(p.userId, row);
      }
      row.maps.push({ beatmapId: m.beatmapId, demonRank: m.rank, points: m.points });
      row.totalPoints += m.points * p.pointsMultiplier;
    }
  }

  for (const row of byUser.values()) {
    if (row.username.startsWith("user_")) {
      /* keep placeholder if API omitted user */
    }
  }

  return [...byUser.values()].sort((a, b) => b.totalPoints - a.totalPoints);
}

async function ensureMaxCombo(client: OsuClient, bm: OsuBeatmap): Promise<OsuBeatmap> {
  if (bm.max_combo != null && bm.max_combo > 0) {
    return bm;
  }
  const full = await client.getBeatmap(bm.id);
  return { ...bm, max_combo: full.max_combo };
}

async function writeExports(outputDir: string, data: LeaderboardOutput): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  const jsonPath = join(outputDir, "leaderboard.json");
  await writeFile(jsonPath, JSON.stringify(data, null, 2), "utf8");

  const mdLines: string[] = [
    `# osu demon list leaderboard`,
    ``,
    `Generated: ${data.generatedAt}`,
    ``,
    `## Maps (${data.maps.length})`,
    ``,
    `| Rank | Stars | Map | Players (FC, NM/CL) |`,
    `| --- | --- | --- | --- |`,
  ];

  for (const m of data.maps) {
    const title = `${m.artist} — ${m.title} [${m.difficultyName}]`;
    const names = m.qualifyingPlayers
      .map((p) => {
        const role = p.clearRole === "verified" ? "verified" : `victor #${p.victorNumber}`;
        const multiplier = p.pointsMultiplier === 1 ? "" : ` x${p.pointsMultiplier.toFixed(1)}`;
        return `${p.username} (${role}${multiplier})`;
      })
      .join(", ");
    mdLines.push(`| ${m.rank} | ${m.difficultyRating.toFixed(2)} | ${title} | ${names} |`);
  }

  mdLines.push(``, `## Points leaderboard`, ``, `| Rank | Player | Points |`, `| --- | --- | --- |`);
  data.leaderboard.forEach((p, i) => {
    mdLines.push(`| ${i + 1} | ${p.username} | ${p.totalPoints.toFixed(3)} |`);
  });

  await writeFile(join(outputDir, "leaderboard.md"), mdLines.join("\n"), "utf8");

  const csv = ["userId,username,totalPoints"];
  for (const p of data.leaderboard) {
    csv.push(`${p.userId},"${p.username.replace(/"/g, '""')}",${p.totalPoints.toFixed(6)}`);
  }
  await writeFile(join(outputDir, "leaderboard.csv"), csv.join("\n"), "utf8");
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const clientId = process.env.OSU_CLIENT_ID;
  const clientSecret = process.env.OSU_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Set OSU_CLIENT_ID and OSU_CLIENT_SECRET (osu OAuth application).");
    process.exit(1);
  }

  const effectiveTarget = opts.sampleOnly ?? opts.targetCount;

  const client = new OsuClient({
    clientId,
    clientSecret,
    delayMs: opts.delayMs,
  });

  const pool = new Map<number, { beatmap: OsuBeatmap; set: OsuBeatmapset }>();
  const scoreChecked = new Set<number>();
  const candidates: QualifiedMapCandidate[] = [];

  let pages = 0;

  const fcMode = opts.lenientFc
    ? "lenient (>=95% combo, max_combo allowed)"
    : "strict (>=95% combo, perfect-combo flags + no miss stats)";
  console.error(
    `Building demon list: ${effectiveTarget} hardest ranked osu! maps that have ≥1 qualifying FC (NM or CL only, ${fcMode}).`,
  );

  const statuses: Array<"ranked"> = ["ranked"];
  for (const status of statuses) {
    let cursor: string | undefined;
    while (pages < opts.maxSearchPages) {
      const search = await client.searchBeatmapsets(status, cursor);
      pages += 1;

      const flat = collectAllowedOsuBeatmaps(search.beatmapsets ?? []);
      for (const it of flat) {
        pool.set(it.beatmap.id, it);
      }

      cursor = search.cursor_string ?? undefined;

      if (!cursor) {
        break;
      }
    }
  }

  const ordered = sortByDifficulty([...uniqueByBeatmapId([...pool.values()]).values()]);
  for (const { beatmap, set } of ordered) {
    if (candidates.length >= effectiveTarget) {
      break;
    }
    if (EXCLUDED_BEATMAP_IDS.has(beatmap.id)) {
      continue;
    }
    if (scoreChecked.has(beatmap.id)) {
      continue;
    }
    scoreChecked.add(beatmap.id);

    let bm = beatmap;
    try {
      bm = await ensureMaxCombo(client, bm);
      const { scores } = await client.getBeatmapScores(bm.id);
      const qualifying = (scores ?? []).filter((s) =>
        scoreQualifies(s, bm, { lenientFc: opts.lenientFc }),
      );
      if (qualifying.length === 0) {
        continue;
      }

      const players = sortQualifyingPlayers(extractPlayers(qualifying));
      candidates.push({
        beatmapId: bm.id,
        beatmapsetId: set.id,
        title: set.title,
        artist: set.artist,
        difficultyName: bm.version,
        difficultyRating: bm.difficulty_rating,
        qualifyingPlayers: players,
      });

      const rank = candidates.length;
      const points = pointsForDemonRank(rank);
      console.error(
        `[${rank}/${effectiveTarget}] ★${bm.difficulty_rating.toFixed(2)} ${set.artist} - ${set.title} [${bm.version}] — ${players.length} FC player(s) (+${points.toFixed(3)} pp each)`,
      );
    } catch (e) {
      console.error(`Beatmap ${beatmap.id} skipped:`, e instanceof Error ? e.message : e);
    }
  }

  if (candidates.length < effectiveTarget) {
    console.error(
      `Warning: only found ${candidates.length} maps with qualifying FCs (wanted ${effectiveTarget}).`,
    );
  }

  const demonMaps: DemonMapEntry[] = candidates.map((candidate, index) => {
    const rank = index + 1;
    return {
      ...candidate,
      rank,
      points: pointsForDemonRank(rank),
    };
  });

  const output: LeaderboardOutput = {
    generatedAt: new Date().toISOString(),
    criteria: {
      ruleset: "osu",
      rankedOnly: true,
      requireFullCombo: true,
      strictPerfectCombo: !opts.lenientFc,
      allowedModAcronyms: allowedModAcronymsForExport(),
      allowedModPolicy: "NM/CL/HD/HR only; Hidden is 1x, HardRock is 1.2x, and combinations of those mods are allowed.",
      includeLegacyAndLazerScores: true,
      demonListSize: demonMaps.length,
      selection:
        "hardest_ranked_beatmaps_first_until_N_each_with_at_least_one_qualifying_fc_nm_cl_hd_hr",
      note:
        "Per-map scores are whatever the osu API returns for the global leaderboard; very deep FCs may be omitted if not in that payload. Scores must reach at least 95% of map max combo.",
    },
    maps: demonMaps,
    leaderboard: buildLeaderboard(demonMaps),
  };

  await writeExports(opts.outputDir, output);
  console.error(`Wrote ${join(opts.outputDir, "leaderboard.json")} and .md / .csv`);

  for (const p of output.leaderboard.slice(0, 20)) {
    console.log(`${p.username}\t${p.totalPoints.toFixed(3)}`);
  }
  if (output.leaderboard.length > 20) {
    console.log(`… and ${output.leaderboard.length - 20} more (see output files)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
