import type {
  BeatmapSearchResponse,
  OsuBeatmap,
  OsuBeatmapset,
  BeatmapScoresResponse,
} from "./types.js";

const API_BASE = "https://osu.ppy.sh/api/v2";
const API_VERSION = "20220705";

export interface OsuClientOptions {
  clientId: string;
  clientSecret: string;
  delayMs: number;
}

export class OsuClient {
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly opts: OsuClientOptions) {}

  private async sleep(): Promise<void> {
    if (this.opts.delayMs > 0) {
      await new Promise((r) => setTimeout(r, this.opts.delayMs));
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now() / 1000;
    if (this.token && now < this.tokenExpiresAt - 60) {
      return this.token;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.opts.clientId,
      client_secret: this.opts.clientSecret,
      scope: "public",
    });

    const res = await fetch("https://osu.ppy.sh/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OAuth token failed ${res.status}: ${text}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.token = data.access_token;
    this.tokenExpiresAt = Date.now() / 1000 + data.expires_in;
    return this.token;
  }

  async requestJson<T>(path: string, query?: Record<string, string | undefined>): Promise<T> {
    await this.sleep();
    const token = await this.getAccessToken();
    const url = new URL(`${API_BASE}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== "") {
          url.searchParams.set(k, v);
        }
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-api-version": API_VERSION,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${path} failed ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  async searchBeatmapsets(status: "ranked" | "loved", cursor?: string): Promise<BeatmapSearchResponse> {
    return this.requestJson<BeatmapSearchResponse>("/beatmapsets/search", {
      s: status,
      m: "0",
      sort: "difficulty_desc",
      cursor_string: cursor,
    });
  }

  async getBeatmap(beatmapId: number): Promise<OsuBeatmap> {
    return this.requestJson<OsuBeatmap>(`/beatmaps/${beatmapId}`);
  }

  async getBeatmapset(beatmapsetId: number): Promise<OsuBeatmapset> {
    return this.requestJson<OsuBeatmapset>(`/beatmapsets/${beatmapsetId}`);
  }

  async getBeatmapScores(beatmapId: number): Promise<BeatmapScoresResponse> {
    return this.requestJson<BeatmapScoresResponse>(`/beatmaps/${beatmapId}/scores`, {
      legacy_only: "0",
      mode: "osu",
    });
  }
}
