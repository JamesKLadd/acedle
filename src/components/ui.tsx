// Shared building blocks for the trading-card theme. Plain components (no
// hooks), so they work in Server and Client Components alike.

import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

// Printed buttons: an ink outline and a hard offset shadow that the button
// presses into.
const VARIANTS: Record<Variant, string> = {
  primary:
    "border-2 border-fg bg-accent text-accent-ink shadow-[3px_3px_0_0_var(--blue)] hover:-translate-y-px hover:shadow-[4px_4px_0_0_var(--blue)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--blue)]",
  secondary:
    "border-2 border-fg bg-surface text-fg shadow-[3px_3px_0_0_var(--line)] hover:bg-surface-2 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
  md: "h-10 gap-2 rounded-md px-4 text-sm",
  lg: "h-12 gap-2.5 rounded-lg px-5 text-sm sm:h-14 sm:px-7 sm:text-base",
};

/** Button styles, for <button> and <Link> alike. */
export function buttonClass({ variant = "primary", size = "md" }: { variant?: Variant; size?: Size } = {}) {
  return `inline-flex items-center justify-center font-bold tracking-wide uppercase transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${VARIANTS[variant]} ${SIZES[size]}`;
}

export const linkClass = "font-semibold text-accent-text underline decoration-2 underline-offset-4 hover:no-underline";

/** A panel of card stock with a printed offset shadow. */
export function Card({ className = "", ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={`rounded-lg border-2 border-line bg-surface p-5 shadow-[4px_4px_0_0_var(--line)] ${className}`}
      {...props}
    />
  );
}

/** Small uppercase label above a heading or value. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs font-semibold tracking-[0.14em] text-muted uppercase ${className}`}>{children}</p>;
}

/** Page title in the display face. */
export function PageTitle({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-[1.7rem] leading-tight tracking-wide uppercase [text-shadow:3px_3px_0_var(--accent-soft)] min-[400px]:text-3xl sm:text-5xl">
        {children}
      </h1>
      {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
    </div>
  );
}

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`font-display text-lg tracking-wide text-fg uppercase sm:text-xl ${className}`}>{children}</h2>
  );
}

export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

/** A labelled number tile, e.g. on the profile. */
export function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border-2 border-line bg-surface px-3 py-3 shadow-[3px_3px_0_0_var(--line)]">
      <span className="hidden size-9 shrink-0 place-items-center rounded-md bg-blue text-panel-fg min-[480px]:grid">
        <Icon className="size-4.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] leading-tight font-semibold tracking-wider text-muted uppercase">{label}</dt>
        <dd className="tabular truncate font-mono text-lg font-bold">{value}</dd>
      </div>
    </div>
  );
}
