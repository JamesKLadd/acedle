import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";

import { Wordmark } from "@/components/brand";
import { HeaderControls } from "@/components/header-controls";
import { NavLinks, SiteNav } from "@/components/site-nav";
import { THEME_SCRIPT } from "@/lib/theme-script";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Scoreboard-style display face for titles, names and big numbers. */
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Acedle",
  description: "Roll a random tennis season every day and score its real results.",
  // Absolute base for link previews. Without it, Next uses the Vercel deployment URL.
  ...(process.env.NEXT_PUBLIC_SITE_URL && { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) }),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1428" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${barlow.variable} h-full antialiased`}
      // The theme script sets data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-2.5">
            <Link href="/" className="mr-auto rounded-lg focus-visible:outline-2 focus-visible:outline-accent">
              <Wordmark />
            </Link>
            <Suspense fallback={<NavLinks pathname={null} />}>
              <SiteNav />
            </Suspense>
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
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
