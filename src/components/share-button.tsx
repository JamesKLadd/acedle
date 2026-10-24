"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import { buttonClass } from "./ui";

/**
 * Shares a roll: the system share sheet on touch devices, otherwise copies
 * the text to the clipboard. `path` is appended to this site's origin as the
 * last line, so links point wherever the app is deployed.
 */
export function ShareButton({ text, path }: { text: string; path: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function share() {
    const full = `${text}\n${window.location.origin}${path}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text: full });
        return;
      }
      await navigator.clipboard.writeText(full);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setStatus("failed");
    }
  }

  return (
    <button onClick={share} className={buttonClass()}>
      {status === "copied" ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      {status === "copied" ? "Copied!" : status === "failed" ? "Couldn't copy" : "Share"}
    </button>
  );
}
