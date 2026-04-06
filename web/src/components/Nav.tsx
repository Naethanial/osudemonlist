"use client";

import { useMemo, type ReactNode } from "react";
import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import SearchBar from "./SearchBar";

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

        {/* Search */}
        <SearchBar />
      </div>
    </header>
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
