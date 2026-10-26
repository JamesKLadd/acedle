"use client";

import { Check, Copy, Share2, X } from "lucide-react";
import { useId, useState, useSyncExternalStore } from "react";

import { buttonClass } from "./ui";

const noSubscribe = () => () => {};

/**
 * Opens a preview of the share text with Copy (and the system share sheet
 * where there is one). `path` is appended to this site's origin as the last
 * line, so links point wherever the app is deployed.
 */
export function ShareButton({ text, path, title = "Share your roll" }: { text: string; path: string; title?: string }) {
  const id = useId();
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const full = `${text}\n${origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("failed");
    }
  }

  async function share() {
    try {
      await navigator.share({ text: full });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setStatus("failed");
    }
  }

  return (
    <>
      <button popoverTarget={id} className={buttonClass()}>
        <Share2 className="size-4" aria-hidden />
        Share
      </button>
      <div
        id={id}
        popover="auto"
        role="dialog"
        aria-labelledby={`${id}-title`}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] animate-pop rounded-lg border-2 border-fg bg-surface p-5 text-fg shadow-[6px_6px_0_0_var(--blue)] backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={`${id}-title`} className="font-display text-xl font-bold tracking-wide uppercase">
            {title}
          </h2>
          <button
            popoverTarget={id}
            popoverTargetAction="hide"
            aria-label="Close"
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <pre className="mt-3 rounded-md border-2 border-dashed border-line bg-surface-2 p-3 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap select-all">
          {full}
        </pre>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={copy} className={buttonClass()}>
            {status === "copied" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {status === "copied" ? "Copied!" : "Copy"}
          </button>
          {canShare && (
            <button onClick={share} className={buttonClass({ variant: "secondary" })}>
              <Share2 className="size-4" aria-hidden />
              Share…
            </button>
          )}
          {status === "failed" && <p className="text-sm text-muted">Couldn&apos;t copy. Select the text above instead.</p>}
        </div>
      </div>
    </>
  );
}
