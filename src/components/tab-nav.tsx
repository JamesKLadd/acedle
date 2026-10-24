"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Segmented control of links; the one matching the current path is active. Render inside <Suspense>. */
export function TabNav({ tabs }: { tabs: readonly { href: string; label: string }[] }) {
  return <TabLinks tabs={tabs} pathname={usePathname()} />;
}

/** The tabs themselves; with no pathname (e.g. a Suspense fallback) none is active. */
export function TabLinks({ tabs, pathname }: { tabs: readonly { href: string; label: string }[]; pathname: string | null }) {
  return (
    <nav className="my-6 flex gap-1 rounded-xl border border-line bg-surface p-1 text-sm">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 rounded-lg px-3 py-2 text-center font-semibold transition ${
              active ? "bg-accent text-accent-ink shadow-sm" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
