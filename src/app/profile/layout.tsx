import type { Metadata } from "next";
import { Suspense } from "react";

import { TabNav } from "@/components/tab-nav";

import { ProfileHeader, ProfileHeaderSkeleton } from "./header";

export const metadata: Metadata = { title: "Profile · Acedle" };

const TABS = [
  { href: "/profile", label: "History" },
  { href: "/profile/badges", label: "Badges" },
  { href: "/profile/dex", label: "Player-dex" },
];

export default function ProfileLayout({ children }: LayoutProps<"/profile">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Suspense fallback={<ProfileHeaderSkeleton />}>
        <ProfileHeader />
      </Suspense>
      <TabNav tabs={TABS} />
      {children}
    </main>
  );
}
