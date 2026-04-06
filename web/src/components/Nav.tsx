"use client";

import Image from "next/image";
import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/rankings", label: "rankings" },
  { href: "/demon-list", label: "demon list" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header
      style={{ backgroundColor: "rgba(18,19,24,0.92)" }}
      className="sticky top-0 z-50 border-b"
      aria-label="Site header"
    >
      <div
        className="max-w-6xl mx-auto px-6 flex items-center gap-8 h-14"
        style={{ borderColor: "#2a2d3a" }}
      >
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
      </div>
    </header>
  );
}

function OsuLogo() {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/osu-logo.png"
        alt="osu!"
        width={32}
        height={32}
        className="rounded-full"
        priority
      />
      <span
        className="text-sm hidden sm:block"
        style={{ color: "#9da0b0", fontFamily: "Torus, sans-serif", fontWeight: 600 }}
      >
        demon list
      </span>
    </div>
  );
}
