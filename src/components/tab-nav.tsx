"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Segmented control of links; the one matching the current path is active. Render inside <Suspense>. */
export function TabNav({ tabs }: { tabs: readonly { href: string; label: string }[] }) {
  return <TabLinks tabs={tabs} pathname={usePathname()} />;
}

/** Scrolls a tab bar sideways so its active tab is in view (narrow screens). */
function showActive(link: HTMLAnchorElement | null) {
  const bar = link?.parentElement;
  if (!link || !bar || bar.scrollWidth <= bar.clientWidth) return;
  bar.scrollLeft = link.offsetLeft + link.offsetWidth / 2 - bar.clientWidth / 2;
}

/**
 * The tabs themselves; with no pathname (e.g. a Suspense fallback) none is
 * active. They share the width, and scroll sideways when they don't fit.
 */
export function TabLinks({ tabs, pathname }: { tabs: readonly { href: string; label: string }[]; pathname: string | null }) {
  return (
    <nav className="my-6 flex gap-1 overflow-x-auto rounded-md border-2 border-fg bg-surface p-1 text-xs shadow-[3px_3px_0_0_var(--line)] [scrollbar-width:none]">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            ref={active ? showActive : undefined}
            aria-current={active ? "page" : undefined}
            className={`min-w-max flex-1 rounded-[4px] px-2 py-2 text-center text-[11px] font-bold tracking-wide whitespace-nowrap uppercase transition sm:px-3 sm:text-xs sm:tracking-wider ${
              active ? "bg-blue text-panel-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
