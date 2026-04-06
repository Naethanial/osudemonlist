"use client";

import { useState, useEffect, useTransition } from "react";
import type { QueueData } from "@/app/api/queue/route";

const requiresSecret = process.env.NEXT_PUBLIC_QUEUE_HAS_SECRET === "true";

export default function MapQueueForm() {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [queuedIds, setQueuedIds] = useState<number[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "success"; id: number }
    | { type: "already" }
    | { type: "error"; message: string }
  >({ type: "idle" });
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/queue")
      .then((r) => r.json())
      .then((data: QueueData) => setQueuedIds(data.beatmapIds ?? []))
      .catch(() => {});
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    startTransition(async () => {
      try {
        const resp = await fetch("/api/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmedUrl, secret: secret || undefined }),
        });
        const data = await resp.json();

        if (!resp.ok) {
          setStatus({ type: "error", message: data.error ?? "Unknown error" });
          return;
        }

        if (data.message === "Already in queue") {
          setStatus({ type: "already" });
        } else {
          setStatus({ type: "success", id: data.beatmapId as number });
          setUrl("");
          setSecret("");
        }
        setQueuedIds((data.beatmapIds as number[]) ?? []);
      } catch {
        setStatus({ type: "error", message: "Network error. Please try again." });
      }
    });
  }

  return (
    <section
      className="border-t mt-12"
      style={{ borderColor: "#2a2d3a", backgroundColor: "#0e0f14" }}
    >
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-sm font-semibold uppercase tracking-widest"
              style={{ color: "#ffffff", fontFamily: "Venera, Torus, sans-serif" }}
            >
              Request a Map
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#5a5d6e" }}>
              Submit an osu! beatmap URL to be included on the next leaderboard refresh.
            </p>
          </div>
          {queuedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "rgba(255,102,170,0.1)",
                color: "#ff66aa",
                border: "1px solid rgba(255,102,170,0.25)",
              }}
            >
              {queuedIds.length} queued{expanded ? " ▲" : " ▼"}
            </button>
          )}
        </div>

        {/* Queued IDs list */}
        {expanded && queuedIds.length > 0 && (
          <div
            className="mb-4 p-3 rounded-lg text-xs flex flex-wrap gap-2"
            style={{ backgroundColor: "#1a1b22", color: "#9da0b0" }}
          >
            {queuedIds.map((id) => (
              <a
                key={id}
                href={`https://osu.ppy.sh/beatmaps/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline transition-opacity hover:opacity-80"
                style={{ color: "#ff66aa" }}
              >
                #{id}
              </a>
            ))}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setStatus({ type: "idle" });
            }}
            placeholder="https://osu.ppy.sh/beatmapsets/…#osu/… or bare beatmap ID"
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            style={{
              backgroundColor: "#1a1b22",
              color: "#ffffff",
              border: "1px solid #2a2d3a",
            }}
            disabled={isPending}
            autoComplete="off"
            spellCheck={false}
          />
          {requiresSecret && (
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Secret key"
              className="w-36 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{
                backgroundColor: "#1a1b22",
                color: "#ffffff",
                border: "1px solid #2a2d3a",
              }}
              disabled={isPending}
            />
          )}
          <button
            type="submit"
            disabled={isPending || !url.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#ff66aa", color: "#ffffff" }}
          >
            {isPending ? "Queuing…" : "Queue Map"}
          </button>
        </form>

        {/* Feedback */}
        {status.type === "success" && (
          <p className="text-xs mt-2" style={{ color: "#b6e534" }}>
            Beatmap {status.id} queued — it will be included on the next leaderboard refresh.
          </p>
        )}
        {status.type === "already" && (
          <p className="text-xs mt-2" style={{ color: "#9da0b0" }}>
            That map is already in the queue.
          </p>
        )}
        {status.type === "error" && (
          <p className="text-xs mt-2" style={{ color: "#ff6060" }}>
            {status.message}
          </p>
        )}
      </div>
    </section>
  );
}
