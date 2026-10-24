import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Acedle",
  description: "Roll a random tennis season every day and score its real results.",
  // Absolute base for link previews. Without it, Next uses the Vercel deployment URL.
  ...(process.env.NEXT_PUBLIC_SITE_URL && { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) }),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="mx-auto flex w-full max-w-2xl items-center gap-5 px-4 py-3 text-sm">
            <Link href="/" className="mr-auto text-base font-bold tracking-tight">
              Acedle
            </Link>
            <Link href="/leaderboard" className="text-zinc-600 hover:text-foreground dark:text-zinc-400">
              Leaderboards
            </Link>
            <Link href="/sandbox" className="text-zinc-600 hover:text-foreground dark:text-zinc-400">
              Sandbox
            </Link>
            <Link href="/profile" className="text-zinc-600 hover:text-foreground dark:text-zinc-400">
              Profile
            </Link>
          </nav>
        </header>
        {children}
        <footer className="mx-auto mt-auto w-full max-w-2xl px-4 pt-16 pb-8 text-xs text-zinc-500">
          Data by Jeff Sackmann / Tennis Abstract (CC BY-NC-SA 4.0) and Tennis My Life. Not affiliated with the ATP
          Tour.{" "}
          <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
            About &amp; data
          </Link>
        </footer>
      </body>
    </html>
  );
}
