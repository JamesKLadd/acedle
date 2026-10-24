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
            <Link href="/profile" className="text-zinc-600 hover:text-foreground dark:text-zinc-400">
              Profile
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
