import fs from "fs";
import path from "path";

/**
 * Directory containing leaderboard.json and countries.json.
 * Prefers web/data (Vercel + CI); falls back to ../output for local monorepo dev.
 */
export function resolveDataDir(): string {
  const webData = path.join(process.cwd(), "data");
  if (fs.existsSync(path.join(webData, "leaderboard.json"))) {
    return webData;
  }
  const legacy = path.join(process.cwd(), "..", "output");
  if (fs.existsSync(path.join(legacy, "leaderboard.json"))) {
    return legacy;
  }
  throw new Error(
    `leaderboard.json not found under ${webData} or ${legacy}`,
  );
}
