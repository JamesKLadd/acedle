import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign-in failed · Acedle" };

export default function AuthErrorPage({ searchParams }: PageProps<"/auth/error">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">Sign-in didn&apos;t work</h1>
      <Suspense fallback={null}>
        <Reason searchParams={searchParams} />
      </Suspense>
      <p className="mt-8">
        <Link href="/" className="font-medium text-accent-text underline decoration-2 underline-offset-4">
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
