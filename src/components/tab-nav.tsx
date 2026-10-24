"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Row of links styled as tabs; the one matching the current path is active. */
export function TabNav({ tabs }: { tabs: readonly { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="mt-4 mb-6 flex gap-1 border-b border-line text-sm">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 font-medium ${
              active
                ? "border-accent text-fg"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
