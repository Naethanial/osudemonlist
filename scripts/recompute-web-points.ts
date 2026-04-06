/**
 * Re-applies `pointsForDemonRank` to web/data/leaderboard.json using the
 * current demon-list ordering and regenerates .csv / .md
 * (same shapes as src/index.ts writeExports).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pointsForDemonRank } from "../src/scoring.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "web/data/leaderboard.json");

function mapCombinedScore(stars: number, hitLength: number): number {
  const refSeconds = 90;
  const lengthAlpha = 0.075;
  return stars * Math.pow(Math.max(hitLength, 1) / refSeconds, lengthAlpha);
}

type Json = {
  generatedAt: string;
  maps: Array<{
    beatmapId: number;
    rank: number;
    points: number;
    artist: string;
    title: string;
    difficultyName: string;
    difficultyRating: number;
    hitLength?: number;
    qualifyingPlayers: Array<{
      userId: number;
      username: string;
      clearRole: string;
      victorNumber: number | null;
      pointsMultiplier: number;
    }>;
  }>;
  leaderboard: {
    userId: number;
    username: string;
    totalPoints: number;
    maps: { beatmapId: number; demonRank: number; points: number }[];
  }[];
};

const raw = readFileSync(dataPath, "utf8");
const data = JSON.parse(raw) as Json;

const orderedMaps = [...data.maps].sort((a, b) => {
  const sa = mapCombinedScore(a.difficultyRating, a.hitLength ?? 90);
  const sb = mapCombinedScore(b.difficultyRating, b.hitLength ?? 90);
  return sb !== sa ? sb - sa : a.rank - b.rank;
});

const mapById = new Map<number, { oldBase: number; newBase: number; newRank: number }>();
const multiplierByMapId = new Map<number, Map<number, number>>();
data.maps = orderedMaps.map((m, index) => {
  const oldBase = m.points;
  const newRank = index + 1;
  const newBase = pointsForDemonRank(newRank);
  mapById.set(m.beatmapId, { oldBase, newBase, newRank });
  multiplierByMapId.set(
    m.beatmapId,
    new Map(m.qualifyingPlayers.map((p) => [p.userId, p.pointsMultiplier])),
  );
  return {
    ...m,
    rank: newRank,
    points: newBase,
  };
});

for (const p of data.leaderboard) {
  let total = 0;
  for (const pm of p.maps) {
    const e = mapById.get(pm.beatmapId);
    if (!e) {
      throw new Error(`beatmap ${pm.beatmapId} missing from maps`);
    }
    pm.demonRank = e.newRank;
    pm.points = pm.points * (e.newBase / e.oldBase);
    const multiplier = multiplierByMapId.get(pm.beatmapId)?.get(p.userId);
    if (multiplier == null) {
      throw new Error(`player ${p.userId} missing multiplier for beatmap ${pm.beatmapId}`);
    }
    total += pm.points * multiplier;
  }
  p.totalPoints = total;
}

data.leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
data.generatedAt = new Date().toISOString();

writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");

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
      const mult = p.pointsMultiplier === 1 ? "" : ` x${p.pointsMultiplier.toFixed(1)}`;
      return `${p.username} (${role}${mult})`;
    })
    .join(", ");
  mdLines.push(
    `| ${m.rank} | ${Number(m.difficultyRating).toFixed(2)} | ${title} | ${names} |`,
  );
}

mdLines.push(``, `## Points leaderboard`, ``, `| Rank | Player | Points |`, `| --- | --- | --- |`);
data.leaderboard.forEach((p, i) => {
  mdLines.push(`| ${i + 1} | ${p.username} | ${p.totalPoints.toFixed(3)} |`);
});

writeFileSync(join(root, "web/data/leaderboard.md"), mdLines.join("\n"), "utf8");

const csv = ["userId,username,totalPoints"];
for (const p of data.leaderboard) {
  csv.push(`${p.userId},"${p.username.replace(/"/g, '""')}",${p.totalPoints.toFixed(6)}`);
}
writeFileSync(join(root, "web/data/leaderboard.csv"), csv.join("\n"), "utf8");

console.error(`Updated web/data/leaderboard.json, .md, .csv (${data.leaderboard.length} players)`);
