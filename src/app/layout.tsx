import type { Metadata, Viewport } from "next";
import { Alfa_Slab_One, Courier_Prime, Libre_Franklin, Yellowtail } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";

import { Wordmark } from "@/components/brand";
import { NextRollPill, RollReadyDot } from "@/components/countdown";
import { FlagPolyfill } from "@/components/flag-polyfill";
import { HeaderControls } from "@/components/header-controls";
import { NavLinks, SiteNav } from "@/components/site-nav";
import { THEME_SCRIPT } from "@/lib/theme-script";

import "./globals.css";

/** Body text and labels: a Franklin Gothic, like the backs of old cards. */
const franklin = Libre_Franklin({
  variable: "--font-franklin",
  subsets: ["latin"],
});

/** Stats and numbers: typewriter, like a card's stat table. */
const courier = Courier_Prime({
  variable: "--font-courier",
  subsets: ["latin"],
  weight: ["400", "700"],
});

/** Display face for names, titles and big numbers. */
const slab = Alfa_Slab_One({
  variable: "--font-slab",
  subsets: ["latin"],
  weight: "400",
});

/** The facsimile autograph on a card's photo. */
const yellowtail = Yellowtail({
  variable: "--font-yellowtail",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Acedle",
  description: "Roll a random tennis season every day and score its real results.",
  // Absolute base for link previews. Without it, Next uses the Vercel deployment URL.
  ...(process.env.NEXT_PUBLIC_SITE_URL && { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) }),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ebe1cb" },
    { media: "(prefers-color-scheme: dark)", color: "#16130e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${franklin.variable} ${courier.variable} ${slab.variable} ${yellowtail.variable} h-full antialiased`}
      // The theme script sets data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <FlagPolyfill />
        {/* An ink rule with a red stripe under it, like a card's top band. */}
        <header className="sticky top-0 z-30 border-b-2 border-fg bg-surface/95 shadow-[0_3px_0_0_var(--accent)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-2.5">
            <Link
              href="/"
              aria-label="Acedle home"
              className="relative rounded-lg py-1 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Wordmark />
              <RollReadyDot />
            </Link>
            <span className="mr-auto pl-2">
              <NextRollPill />
            </span>
            <Suspense fallback={<NavLinks pathname={null} />}>
              <SiteNav />
            </Suspense>
            <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />
            <HeaderControls />
          </div>
        </header>
        {children}
        <footer className="mx-auto mt-auto w-full max-w-2xl px-4 pt-16 pb-8 text-xs text-muted">
          Data by Jeff Sackmann / Tennis Abstract (CC BY-NC-SA 4.0) and Tennis My Life. Not affiliated with the ATP
          Tour.{" "}
          <Link href="/about" className="underline underline-offset-2 hover:text-fg">
            About &amp; data
          </Link>
        </footer>
      </body>
    </html>
  );
}
