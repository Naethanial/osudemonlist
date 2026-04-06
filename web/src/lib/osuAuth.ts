import fs from "fs";
import path from "path";
import { resolveDataDir } from "./dataPaths";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface OsuUser {
  id: number;
  username: string;
  country_code: string;
}

interface CachedUserInfo {
  username: string;
  countryCode: string;
}

const userInfoCache = new Map<number, CachedUserInfo>();

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.OSU_CLIENT_ID;
  const clientSecret = process.env.OSU_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  try {
    const res = await fetch("https://osu.ppy.sh/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: Number(clientId),
        client_secret: clientSecret,
        grant_type: "client_credentials",
        scope: "public",
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as TokenResponse;
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return cachedToken;
  } catch {
    return null;
  }
}

const COUNTRY_CACHE_FILE = path.join(resolveDataDir(), "countries.json");

const countryCache = new Map<number, string>();

function loadCountryCacheFromFile(): void {
  try {
    const raw = fs.readFileSync(COUNTRY_CACHE_FILE, "utf-8");
    const data = JSON.parse(raw) as Record<string, string>;
    for (const [id, code] of Object.entries(data)) {
      countryCache.set(Number(id), code);
    }
  } catch {
    // File doesn't exist yet — populated on first full fetch
  }
}

function saveCountryCacheToFile(): void {
  try {
    const data: Record<string, string> = {};
    for (const [id, code] of countryCache) {
      data[String(id)] = code;
    }
    fs.writeFileSync(COUNTRY_CACHE_FILE, JSON.stringify(data));
  } catch {
    // Ignore write errors (e.g. read-only filesystem)
  }
}

// Hydrate in-process cache from disk on module load
loadCountryCacheFromFile();

/**
 * Returns country codes that are already stored (file + in-process cache).
 * Never makes live API calls — safe to call in server components.
 */
export function getStoredCountries(): Map<number, string> {
  return new Map(countryCache);
}

export async function fetchUserCountry(userId: number): Promise<string | null> {
  if (countryCache.has(userId)) return countryCache.get(userId)!;

  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://osu.ppy.sh/api/v2/users/${userId}/osu`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) return null;

    const user = (await res.json()) as OsuUser;
    countryCache.set(userId, user.country_code);
    userInfoCache.set(userId, { username: user.username, countryCode: user.country_code });
    return user.country_code;
  } catch {
    return null;
  }
}

/**
 * Returns username + country code for any osu! user (leaderboard or not).
 * Uses in-process cache; falls back to the osu! API if not cached.
 */
export async function fetchOsuUserInfo(
  userId: number
): Promise<{ username: string; countryCode: string } | null> {
  const cached = userInfoCache.get(userId);
  if (cached) return cached;

  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://osu.ppy.sh/api/v2/users/${userId}/osu`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const user = (await res.json()) as OsuUser;
    const info: CachedUserInfo = { username: user.username, countryCode: user.country_code };
    userInfoCache.set(userId, info);
    countryCache.set(userId, user.country_code);
    return info;
  } catch {
    return null;
  }
}

/**
 * Looks up an osu! user by exact username. Returns basic user info or null if not found.
 * Used by the search API to find players who haven't cleared any demons.
 */
export async function lookupOsuUserByUsername(
  username: string
): Promise<{ userId: number; username: string; countryCode: string } | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(
      `https://osu.ppy.sh/api/v2/users/${encodeURIComponent(username)}/osu?key=username`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) return null;

    const user = (await res.json()) as OsuUser;
    const info: CachedUserInfo = { username: user.username, countryCode: user.country_code };
    userInfoCache.set(user.id, info);
    countryCache.set(user.id, user.country_code);
    return { userId: user.id, username: user.username, countryCode: user.country_code };
  } catch {
    return null;
  }
}

// Fetch up to 50 users in one request using the bulk endpoint
async function fetchBulkCountries(
  userIds: number[],
  token: string
): Promise<void> {
  const uncached = userIds.filter((id) => !countryCache.has(id));
  if (uncached.length === 0) return;

  try {
    const qs = uncached.map((id) => `ids[]=${id}`).join("&");
    const res = await fetch(`https://osu.ppy.sh/api/v2/users?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return;
    const data: unknown = await res.json();
    const users: OsuUser[] = Array.isArray(data)
      ? (data as OsuUser[])
      : ((data as { users?: OsuUser[] }).users ?? []);
    let anyNew = false;
    for (const user of users) {
      if (!countryCache.has(user.id)) anyNew = true;
      countryCache.set(user.id, user.country_code);
    }
    if (anyNew) saveCountryCacheToFile();
  } catch {
    // ignore — cached entries are still usable
  }
}

export async function fetchCountriesForPlayers(
  userIds: number[]
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const token = await getAccessToken();
  if (!token) return result;

  // Use bulk endpoint — 50 users per request instead of 1 each
  const BATCH_SIZE = 50;
  const batches: Promise<void>[] = [];
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    batches.push(fetchBulkCountries(userIds.slice(i, i + BATCH_SIZE), token));
  }
  await Promise.all(batches);

  for (const id of userIds) {
    const code = countryCache.get(id);
    if (code) result.set(id, code);
  }

  return result;
}
