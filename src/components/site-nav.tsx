"use client";

import { Dices, Swords, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/challenge", label: "Challenge", icon: Swords },
  { href: "/leaderboard", label: "Leaderboards", icon: Trophy },
  { href: "/sandbox", label: "Sandbox", icon: Dices },
  { href: "/profile", label: "Profile", icon: User },
] as const;

/** Main navigation with the current section highlighted. Render inside <Suspense> (reads the URL). */
export function SiteNav() {
  return <NavLinks pathname={usePathname()} />;
}

/** The links themselves; labels show from lg up (the header is full below that). Without a pathname nothing is highlighted. */
export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            title={label}
            className={`flex h-9 items-center gap-1.5 rounded-md px-2 text-xs sm:px-2.5 font-bold tracking-wider uppercase transition ${
              active ? "bg-fg text-surface" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            <span className="hidden lg:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
