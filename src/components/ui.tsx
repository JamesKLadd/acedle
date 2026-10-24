// Shared building blocks for the scoreboard theme. Plain components (no
// hooks), so they work in Server and Client Components alike.

import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink shadow-sm hover:brightness-105 active:brightness-95",
  secondary: "border border-line bg-surface text-fg hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-sm",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-14 gap-2.5 rounded-2xl px-7 text-lg",
};

/** Button styles, for <button> and <Link> alike. */
export function buttonClass({ variant = "primary", size = "md" }: { variant?: Variant; size?: Size } = {}) {
  return `inline-flex items-center justify-center font-semibold transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${VARIANTS[variant]} ${SIZES[size]}`;
}

export const linkClass = "font-medium text-accent-text underline decoration-2 underline-offset-4 hover:no-underline";

export function Card({ className = "", ...props }: ComponentPropsWithoutRef<"section">) {
  return <section className={`rounded-2xl border border-line bg-surface p-5 shadow-sm ${className}`} {...props} />;
}

/** Small uppercase label above a heading or value. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs font-semibold tracking-[0.14em] text-muted uppercase ${className}`}>{children}</p>;
}

/** Page title in the display face. */
export function PageTitle({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-4xl font-bold tracking-tight uppercase sm:text-5xl">{children}</h1>
      {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
    </div>
  );
}

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`font-display text-xl font-bold tracking-wide text-fg uppercase ${className}`}>{children}</h2>
  );
}

export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

/** A labelled number tile, e.g. on the profile. */
export function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3">
      <span className="hidden size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text min-[480px]:grid">
        <Icon className="size-4.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] leading-tight font-semibold tracking-wider text-muted uppercase">{label}</dt>
        <dd className="tabular truncate font-mono text-lg font-semibold">{value}</dd>
      </div>
    </div>
  );
}
