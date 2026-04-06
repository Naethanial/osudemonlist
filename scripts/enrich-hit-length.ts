/**
 * Fetches hit_length for every map in web/data/leaderboard.json using the osu API
 * (batched, 50 beatmaps per request) and writes the enriched JSON back in-place.
 *
 * Usage:
 *   OSU_CLIENT_ID=... OSU_CLIENT_SECRET=... npx tsx scripts/enrich-hit-length.ts
 * or (if .env is exported in your shell):
 *   npx tsx scripts/enrich-hit-length.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── .env loader (minimal, no dependency) ──────────────────────────────────────
function loadDotEnv(): void {
  const envPath = join(root, ".env");
  try {
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env not found — rely on environment variables already set
  }
}

loadDotEnv();

const CLIENT_ID = process.env.OSU_CLIENT_ID;
const CLIENT_SECRET = process.env.OSU_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set OSU_CLIENT_ID and OSU_CLIENT_SECRET before running this script.");
  process.exit(1);
}

// ── osu API helpers ────────────────────────────────────────────────────────────
const API_BASE = "https://osu.ppy.sh/api/v2";
const API_VERSION = "20220705";
const BATCH_SIZE = 50;
const DELAY_MS = 150;

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() / 1000 < tokenExpiresAt - 60) return cachedToken;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    scope: "public",
  });

  const res = await fetch("https://osu.ppy.sh/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) throw new Error(`OAuth failed ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() / 1000 + data.expires_in;
  return cachedToken;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHitLengths(ids: number[]): Promise<Map<number, number>> {
  const token = await getToken();
  const url = new URL(`${API_BASE}/beatmaps`);
  for (const id of ids) url.searchParams.append("ids[]", String(id));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "x-api-version": API_VERSION,
    },
  });

  if (!res.ok) throw new Error(`/beatmaps batch failed ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { beatmaps: Array<{ id: number; hit_length: number }> };

  const result = new Map<number, number>();
  for (const bm of data.beatmaps ?? []) {
    if (bm.hit_length != null) result.set(bm.id, bm.hit_length);
  }
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────
type LeaderboardJson = {
  maps: Array<{ beatmapId: number; hitLength?: number; [key: string]: unknown }>;
  [key: string]: unknown;
};

const dataPath = join(root, "web/data/leaderboard.json");
const data = JSON.parse(readFileSync(dataPath, "utf8")) as LeaderboardJson;

const allIds = data.maps.map((m) => m.beatmapId);
const missingIds = data.maps
  .filter((m) => m.hitLength == null)
  .map((m) => m.beatmapId);

console.error(
  `Found ${allIds.length} maps total; ${missingIds.length} missing hitLength — fetching…`
);

const hitLengthMap = new Map<number, number>();

for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
  const batch = missingIds.slice(i, i + BATCH_SIZE);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(missingIds.length / BATCH_SIZE);
  process.stderr.write(
    `  Batch ${batchNum}/${totalBatches} (ids ${batch[0]}…${batch[batch.length - 1]})… `
  );
  try {
    const lengths = await fetchHitLengths(batch);
    for (const [id, len] of lengths) hitLengthMap.set(id, len);
    process.stderr.write(`got ${lengths.size}/${batch.length}\n`);
  } catch (e) {
    process.stderr.write(`ERROR: ${e instanceof Error ? e.message : e}\n`);
  }
  if (i + BATCH_SIZE < missingIds.length) await sleep(DELAY_MS);
}

let updated = 0;
let missing = 0;
for (const m of data.maps) {
  if (m.hitLength != null) continue; // already present
  const len = hitLengthMap.get(m.beatmapId);
  if (len != null) {
    m.hitLength = len;
    updated++;
  } else {
    missing++;
    console.error(`  Warning: no hit_length returned for beatmapId ${m.beatmapId}`);
  }
}

writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
console.error(`Done. Updated ${updated} maps; ${missing} still missing hitLength.`);
