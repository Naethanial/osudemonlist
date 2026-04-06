/**
 * Re-applies `pointsForDemonRank` to web/data/leaderboard.json and regenerates
 * .csv / .md (same shapes as src/index.ts writeExports).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pointsForDemonRank } from "../src/scoring.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "web/data/leaderboard.json");

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
    qualifyingPlayers: Array<{
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

const mapById = new Map<number, { oldBase: number; newBase: number }>();
for (const m of data.maps) {
  const oldBase = m.points;
  const newBase = pointsForDemonRank(m.rank);
  mapById.set(m.beatmapId, { oldBase, newBase });
  m.points = newBase;
}

for (const p of data.leaderboard) {
  let total = 0;
  for (const pm of p.maps) {
    const e = mapById.get(pm.beatmapId);
    if (!e) {
      throw new Error(`beatmap ${pm.beatmapId} missing from maps`);
    }
    pm.points = pm.points * (e.newBase / e.oldBase);
    total += pm.points;
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
