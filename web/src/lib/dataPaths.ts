import fs from "fs";
import path from "path";

/**
 * Directory containing leaderboard.json and countries.json.
 * Tries: ./data (when `next dev` cwd is `web/`), ./web/data (when cwd is repo root), ../output.
 */
export function resolveDataDir(): string {
  const candidates = [
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "web", "data"),
    path.join(process.cwd(), "..", "output"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "leaderboard.json"))) {
      return dir;
    }
  }
  throw new Error(
    `leaderboard.json not found. Tried:\n${candidates.join("\n")}`,
  );
}
