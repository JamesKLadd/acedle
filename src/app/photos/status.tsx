import type { Tables } from "@/lib/supabase/database.types";

const STATUS = {
  pending: ["Waiting for review", "border-subtle text-muted"],
  approved: ["On the card", "border-cat-surface text-cat-surface"],
  rejected: ["Not used", "border-accent text-accent-text"],
} as const;

/** A suggestion's review status as a rubber stamp. */
export function StatusStamp({ status }: { status: Tables<"photo_submissions">["status"] }) {
  const [label, style] = STATUS[status];
  return (
    <span className={`rounded-[4px] border-2 px-1.5 py-px text-[10px] font-bold tracking-wider whitespace-nowrap uppercase ${style}`}>
      {label}
    </span>
  );
}
