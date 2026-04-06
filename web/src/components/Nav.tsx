"use client";

import { useMemo, useState, useCallback, type ReactNode } from "react";
import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import SearchBar from "./SearchBar";

const GITHUB_REPO_URL = "https://github.com/Naethanial/osudemonlist";

const navLinks = [
  { href: "/rankings", label: "rankings" },
  { href: "/demon-list", label: "demon list" },
];

/**
 * Matches React Bits GradualBlur defaults from their demo:
 * position top, strength 2, divCount 10, exponential on, opacity 1, curve linear.
 * Each layer is full-size with a feathered band mask (not hard horizontal strips), so no obvious seams.
 * @see https://github.com/DavidHDev/react-bits/blob/main/src/ts-tailwind/Animations/GradualBlur/GradualBlur.tsx
 */
function GradualBlurHeaderBackdrop() {
  /** Taller than the bar so blur + tint fade into the page (no hard line). */
  const zoneClass = "h-[calc(3.5rem+1.75rem)]";

  const blurLayers = useMemo(() => {
    const divCount = 10;
    const strength = 2;
    const exponential = true;
    const opacity = 1;
    const increment = 100 / divCount;
    const direction = "to top";

    const layers: ReactNode[] = [];
    for (let i = 1; i <= divCount; i++) {
      const progress = i / divCount;
      const blurValue = exponential
        ? Math.pow(2, progress * 4) * 0.0625 * strength
        : 0.0625 * (progress * divCount + 1) * strength;

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      const mask = `linear-gradient(${direction}, ${gradient})`;
      layers.push(
        <div
          key={i}
          className="absolute inset-0"
          style={{
            WebkitMaskImage: mask,
            maskImage: mask,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
            backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
            opacity,
          }}
        />
      );
    }
    return layers;
  }, []);

  return (
    <div
      className={`gradual-blur-header-zone pointer-events-none absolute inset-x-0 top-0 ${zoneClass} overflow-hidden isolate`}
      aria-hidden
    >
      <div className="relative h-full w-full">{blurLayers}</div>
      <div className="gradual-blur-header-tint absolute inset-0" />
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const githubSpring = reduceMotion
    ? { duration: 0.08 }
    : { type: "spring" as const, stiffness: 780, damping: 44, mass: 0.45 };

  const onSearchExpanded = useCallback((expanded: boolean) => {
    setSearchExpanded(expanded);
  }, []);

  return (
    <header className="site-header sticky top-0 z-50 relative" aria-label="Site header">
      <GradualBlurHeaderBackdrop />
      <div className="relative z-10 max-w-6xl mx-auto px-6 flex items-center gap-8 h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <OsuLogo />
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3 py-1 text-sm font-medium transition-colors"
                style={{ color: active ? "#ffffff" : "#9da0b0" }}
              >
                {link.label}
                {active && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                    style={{ backgroundColor: "#ff66aa" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center ml-auto min-w-0">
          <motion.div
            initial={false}
            aria-hidden={searchExpanded}
            className="overflow-hidden shrink-0 flex items-center"
            animate={{
              maxWidth: searchExpanded ? 0 : 48,
              opacity: searchExpanded ? 0 : 1,
              marginRight: searchExpanded ? 0 : 12,
            }}
            transition={githubSpring}
            style={{
              transformOrigin: "right center",
              pointerEvents: searchExpanded ? "none" : "auto",
            }}
          >
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={searchExpanded ? -1 : undefined}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#9da0b0] transition-colors hover:text-white"
              aria-label="View source on GitHub"
            >
              <GitHubMarkIcon />
            </a>
          </motion.div>
          <SearchBar onExpandedChange={onSearchExpanded} />
        </div>
      </div>
    </header>
  );
}

function GitHubMarkIcon() {
  return (
    <svg
      viewBox="0 0 98 96"
      width={22}
      height={22}
      aria-hidden
      className="shrink-0"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
      />
    </svg>
  );
}

function OsuLogo() {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-sm"
        style={{ color: "#ffffff", fontFamily: "Torus, sans-serif", fontWeight: 600 }}
      >
        osu!
      </span>
      <span
        className="text-sm hidden sm:block"
        style={{ color: "#9da0b0", fontFamily: "Torus, sans-serif", fontWeight: 600 }}
      >
        demon list
      </span>
    </div>
  );
}
