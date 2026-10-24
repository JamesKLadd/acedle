import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Sign-in failed · Acedle" };

export default function AuthErrorPage({ searchParams }: PageProps<"/auth/error">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold uppercase">Sign-in didn&apos;t work</h1>
      <Suspense fallback={null}>
        <Reason searchParams={searchParams} />
      </Suspense>
      <p className="mt-8">
        <Link href="/" className={buttonClass({ variant: "secondary" })}>
          ← Back to Acedle
        </Link>
      </p>
    </main>
  );
}

async function Reason({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { message } = await searchParams;
  if (typeof message !== "string") return null;
  return <p className="mt-3 text-muted">{message}</p>;
}
