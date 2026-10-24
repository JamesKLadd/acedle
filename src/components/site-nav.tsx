"use client";

import { Dices, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/leaderboard", label: "Leaderboards", icon: Trophy },
  { href: "/sandbox", label: "Sandbox", icon: Dices },
  { href: "/profile", label: "Profile", icon: User },
] as const;

/** Main navigation with the current section highlighted. Render inside <Suspense> (reads the URL). */
export function SiteNav() {
  return <NavLinks pathname={usePathname()} />;
}

/** The links themselves; labels hide on narrow screens. Without a pathname nothing is highlighted. */
export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="flex items-center gap-1" aria-label="Main">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            title={label}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition ${
              active ? "bg-accent-soft text-accent-text" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
