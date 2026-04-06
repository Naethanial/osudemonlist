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

const countryCache = new Map<number, string>();

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
    return user.country_code;
  } catch {
    return null;
  }
}

async function fetchOneCountry(
  userId: number,
  token: string
): Promise<[number, string] | null> {
  if (countryCache.has(userId)) return [userId, countryCache.get(userId)!];
  try {
    const res = await fetch(`https://osu.ppy.sh/api/v2/users/${userId}/osu`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const user = (await res.json()) as OsuUser;
    countryCache.set(userId, user.country_code);
    return [userId, user.country_code];
  } catch {
    return null;
  }
}

export async function fetchCountriesForPlayers(
  userIds: number[]
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const token = await getAccessToken();
  if (!token) return result;

  // Fetch in parallel, 10 at a time
  const CONCURRENCY = 10;
  for (let i = 0; i < userIds.length; i += CONCURRENCY) {
    const batch = userIds.slice(i, i + CONCURRENCY);
    const entries = await Promise.all(
      batch.map((id) => fetchOneCountry(id, token))
    );
    for (const entry of entries) {
      if (entry) result.set(entry[0], entry[1]);
    }
  }

  return result;
}
