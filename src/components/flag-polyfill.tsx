"use client";

import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";
import { useEffect } from "react";

/**
 * Windows has no flag emoji ("🇷🇸" shows as "RS"). Where they're missing,
 * this adds a self-hosted font with just the flags (Twemoji, CC BY 4.0),
 * which globals.css lists first in every font stack.
 */
export function FlagPolyfill() {
  useEffect(() => {
    polyfillCountryFlagEmojis("Twemoji Country Flags", "/fonts/TwemojiCountryFlags.woff2");
  }, []);
  return null;
}
