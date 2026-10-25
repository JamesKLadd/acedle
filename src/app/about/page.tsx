import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card, linkClass, PageTitle, SectionTitle } from "@/components/ui";
import { POOL_SIZE } from "@/lib/data/years";
import { fmtYmd } from "@/lib/format";

import meta from "../../../data/seasons/meta.json";

export const metadata: Metadata = {
  title: "About & data · Acedle",
  description: "How Acedle works, where its tennis data comes from, and what it stores about you.",
};


function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={linkClass} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="mt-6">
      <SectionTitle>{title}</SectionTitle>
      <div className="mt-3 flex flex-col gap-3 text-fg/85">{children}</div>
    </Card>
  );
}

export default function AboutPage() {
  const resultsThrough = "resultsThrough" in meta ? (meta.resultsThrough as number) : null;
  const estimated = "rankingsEstimated" in meta && meta.rankingsEstimated === true;
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <PageTitle subtitle="How it works, where the data comes from, and what's stored.">About</PageTitle>

      <Section title="How it works">
        <p>
          Once a day you roll a random season from {meta.firstYear} to {meta.lastYear}, then a random player from that
          season&apos;s top {POOL_SIZE}. Every one of the{" "}
          {((meta.lastYear - meta.firstYear + 1) * POOL_SIZE).toLocaleString("en-US")} player-seasons is equally likely.
          The player&apos;s real results earn badges: points for titles, wins, big matches and more, and multipliers
          for the rare stuff (majors, finishing #1, Masters titles). The same season always scores the same, so the
          luck is all in the roll.
        </p>
        <p>
          Rolls reset at midnight UTC. Guests can play straight away; signing in keeps your rolls and puts you on the{" "}
          <Link href="/leaderboard" className={linkClass}>
            leaderboards
          </Link>
          . The <Link href="/sandbox" className={linkClass}>sandbox</Link> rolls as often as you like and never counts.
        </p>
        <p>
          After a roll you can take your player into a tournament: a 16-player draw of random player-seasons, seeded by
          score. Your odds in each match are your share of the two scores; you play your matches by tapping when the
          ball is in the green (better odds give you a bigger zone and a slower ball), and the rest are decided by the
          odds. One tournament per daily roll, just for bragging rights: it doesn&apos;t change your score.
        </p>
      </Section>

      <Section title="Data">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            Match results and ranking lists from 1968 to June 2026 were collected and compiled by{" "}
            <strong>Jeff Sackmann</strong> (originally github.com/JeffSackmann/tennis_atp, now preserved at{" "}
            <A href="https://github.com/Aneeshers/tennis-sackmann-archive">tennis-sackmann-archive</A>), licensed{" "}
            <A href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</A>.
          </li>
          <li>
            {meta.lastYear} results since June come from <strong>Tennis My Life</strong> (
            <A href="https://stats.tennismylife.org/tennis-match-database">stats.tennismylife.org</A>).
          </li>
          <li>
            The current ATP ranking list comes from <strong>Tennis Abstract</strong> (
            <A href="https://www.tennisabstract.com/reports/atpRankings.html">tennisabstract.com</A>), also by Jeff
            Sackmann. Weeks between the lists we&apos;ve fetched are estimated from the ranks players had at each
            tournament.
          </li>
        </ul>
        <p>
          The {meta.lastYear} season is live: rankings as of <strong>{fmtYmd(meta.dataAsOf)}</strong>
          {estimated && " (estimated from the ranks players entered tournaments with, until the next published list)"}
          {resultsThrough && (
            <>
              , results through <strong>{fmtYmd(resultsThrough)}</strong>
            </>
          )}
          , refreshed daily. A roll keeps the stats it was scored from, so later updates never change it.
        </p>
        <p>
          The season data built from these sources is in the{" "}
          <A href="https://github.com/JamesKLadd/acedle">Acedle repository</A> under the same CC BY-NC-SA 4.0 license.
          Acedle is a non-commercial fan project and isn&apos;t affiliated with the ATP Tour or any player.
        </p>
        <p>
          Player photos come from <A href="https://commons.wikimedia.org/">Wikimedia Commons</A>, freely licensed by
          their photographers; each card credits its photo&apos;s author and license and links to its Commons page.
          A photo from the same season is used where there is one, otherwise the nearest year&apos;s (the card says
          which year). Players without one get a plain card.
        </p>
        <p>
          On systems without flag emoji (like Windows), flags are drawn with{" "}
          <A href="https://github.com/jdecked/twemoji">Twemoji</A> art (
          <A href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</A>) via the{" "}
          <A href="https://github.com/talkjs/country-flag-emoji-polyfill">country-flag-emoji-polyfill</A> font.
        </p>
      </Section>

      <Section title="What we store">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            As a guest you get an anonymous account that lives in your browser&apos;s cookies, plus your rolls. A guest
            with no roll in 30 days is deleted along with its rolls.
          </li>
          <li>
            Signing in with Google, Discord or GitHub stores a display name and avatar from that account. Your display
            name appears on the leaderboards; your email is never shown.
          </li>
          <li>
            Each roll has its own page. Its link is unlisted (a random id), but anyone you share it with can see the
            roll and your display name.
          </li>
          <li>
            If you take a daily roll into a tournament, its draw and your set results are stored with the roll, and
            anyone with the roll&apos;s link can see how it went.
          </li>
        </ul>
      </Section>
    </main>
  );
}
