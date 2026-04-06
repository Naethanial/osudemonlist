"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

interface PlayerResult {
  userId: number;
  username: string;
  totalPoints: number;
  clearCount: number;
  rank: number;
}

interface MapResult {
  beatmapId: number;
  beatmapsetId: number;
  title: string;
  artist: string;
  difficultyName: string;
  rank: number;
  points: number;
}

interface SearchResults {
  players: PlayerResult[];
  maps: MapResult[];
}

interface SearchBarProps {
  /** Fires when the search field opens or closes (for coordinated header UI). */
  onExpandedChange?: (expanded: boolean) => void;
}

export default function SearchBar({ onExpandedChange }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  /** Stays true until the search-field exit animation finishes so layout/github don’t jump. */
  const [layoutExpanded, setLayoutExpanded] = useState(false);
  const expandedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  const uiSpring = reduceMotion
    ? { duration: 0.08 }
    : { type: "spring" as const, stiffness: 780, damping: 44, mass: 0.45 };
  const uiEase = reduceMotion
    ? { duration: 0.08 }
    : { duration: 0.14, ease: [0.22, 1, 0.36, 1] as const };

  expandedRef.current = expanded;

  useEffect(() => {
    onExpandedChange?.(layoutExpanded);
  }, [layoutExpanded, onExpandedChange]);

  function handlePresenceExitComplete() {
    if (!expandedRef.current) {
      setLayoutExpanded(false);
    }
  }

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as SearchResults;
      setResults(data);
      setOpen(true);
    } catch {
      // ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults(null);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => search(query), 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function close() {
    setOpen(false);
    setExpanded(false);
    setQuery("");
    setResults(null);
  }

  function handleExpand() {
    setExpanded(true);
    setLayoutExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  const hasResults = results && (results.players.length > 0 || results.maps.length > 0);
  const showDropdown = open && expanded && query.length >= 2;

  const fieldStyle = {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  } as const;

  return (
    <div
      ref={containerRef}
      className={`flex items-center ${
        layoutExpanded
          ? "absolute inset-0 px-4 z-20 bg-transparent sm:relative sm:inset-auto sm:px-0"
          : "relative"
      }`}
    >
      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={handlePresenceExitComplete}
      >
        {!expanded ? (
          <motion.button
            key="search-trigger"
            type="button"
            onClick={handleExpand}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              color: "#9da0b0",
              ...fieldStyle,
              border: "1px solid #2a2d3a",
              transformOrigin: "right center",
            }}
            aria-label="Open search"
            initial={{ opacity: 0, scale: 0.94, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.94, x: 8 }}
            transition={uiSpring}
          >
            <SearchIcon />
            <span className="hidden sm:block" style={{ color: "#5a5d6e" }}>
              search...
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="search-field"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full w-full sm:w-auto sm:min-w-[220px]"
            style={{
              ...fieldStyle,
              border: "1px solid #ff66aa",
              transformOrigin: "right center",
            }}
            initial={{ opacity: 0, scale: 0.94, x: 14 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.94, x: 10 }}
            transition={uiSpring}
          >
            <SearchIcon />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="search players or maps..."
              className="bg-transparent text-xs outline-none flex-1"
              style={{ color: "#ffffff" }}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            {loading && <Spinner />}
            {!loading && query && (
              <button
                type="button"
                onClick={close}
                className="text-xs transition-opacity hover:opacity-100 opacity-50"
                style={{ color: "#9da0b0" }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            key="search-dropdown"
            className="absolute left-0 right-0 sm:left-auto sm:right-0 top-14 w-full sm:w-80 rounded-xl shadow-2xl overflow-hidden z-50"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid #2a2d3a",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              transformOrigin: "top right",
            }}
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={uiEase}
          >
          {!hasResults && !loading && (
            <div
              className="px-4 py-8 text-center text-xs"
              style={{ color: "#5a5d6e" }}
            >
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {results && results.players.length > 0 && (
            <section>
              <div
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                style={{ color: "#ff66aa" }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
                Players
              </div>
              {results.players.map((p) => (
                <Link
                  key={p.userId}
                  href={`/users/${p.userId}`}
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor =
                      "rgba(255, 102, 170, 0.05)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                  }
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden relative shrink-0 ring-1 ring-white/10">
                    <Image
                      src={`https://a.ppy.sh/${p.userId}`}
                      alt={p.username}
                      fill
                      className="object-cover"
                      sizes="32px"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-semibold truncate"
                      style={{ color: "#ffffff" }}
                    >
                      {p.username}
                    </div>
                    <div className="text-[10px]" style={{ color: "#ffffff" }}>
                      #{p.rank} &middot; {p.totalPoints.toFixed(0)} pts &middot;{" "}
                      {p.clearCount} clears
                    </div>
                  </div>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#5a5d6e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </section>
          )}

          {results && results.maps.length > 0 && (
            <section>
              <div
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                style={{ color: "#ff66aa" }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                </svg>
                Maps
              </div>
              {results.maps.map((m) => (
                <Link
                  key={m.beatmapId}
                  href={`/demon-list/${m.beatmapId}`}
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor =
                      "rgba(255, 102, 170, 0.05)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                  }
                >
                  <div className="w-11 h-8 rounded overflow-hidden relative shrink-0">
                    <Image
                      src={`https://assets.ppy.sh/beatmaps/${m.beatmapsetId}/covers/list.jpg`}
                      alt={m.title}
                      fill
                      className="object-cover"
                      sizes="44px"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-semibold truncate"
                      style={{ color: "#ffffff" }}
                    >
                      {m.title}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: "#ffffff" }}>
                      {m.artist} &middot; #{m.rank}
                    </div>
                  </div>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#5a5d6e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </section>
          )}

          {/* Footer hint */}
          {hasResults && (
            <div
              className="px-4 py-2 text-[10px] text-center"
              style={{ color: "#5a5d6e" }}
            >
              press <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ backgroundColor: "#2a2d3a", color: "#9da0b0" }}>esc</kbd> to close
            </div>
          )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ff66aa"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function Spinner() {
  return (
    <div
      className="w-3 h-3 rounded-full border-2 animate-spin shrink-0"
      style={{ borderColor: "#ff66aa44", borderTopColor: "#ff66aa" }}
    />
  );
}
