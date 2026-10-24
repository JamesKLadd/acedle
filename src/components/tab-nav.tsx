"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Row of links styled as tabs; the one matching the current path is active. */
export function TabNav({ tabs }: { tabs: readonly { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="mt-4 mb-6 flex gap-1 border-b border-zinc-200 text-sm dark:border-zinc-800">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 font-medium ${
              active
                ? "border-lime-500 text-foreground"
                : "border-transparent text-zinc-500 hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
