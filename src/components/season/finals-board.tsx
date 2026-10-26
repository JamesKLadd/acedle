import { Trophy } from "lucide-react";

import { flag } from "@/lib/flags";
import type { FinalsGroup, FinalsMatch, FinalsView, GroupStanding } from "@/lib/season/season";

/**
 * How much of the Finals can be shown: matches happen alongside the
 * player's, so each round shows once their match in it is decided. With the
 * player out (or not in it), everything shows.
 */
function revealed(finals: FinalsView) {
  const you = finals.you;
  if (you === null || finals.status !== "current") return { rounds: 3, semis: true, final: true };
  const mine = finals.groups.flatMap((g) => g.matches.flat()).filter((m) => m.a === you || m.b === you);
  const rounds = mine.filter((m) => m.winner !== null).length;
  const yourSemi = finals.semifinals.find((m) => m.a === you || m.b === you);
  return { rounds, semis: !!yourSemi && yourSemi.winner !== null, final: false };
}

function Name({ finals, place, tag = true }: { finals: FinalsView; place: number; tag?: boolean }) {
  const r = finals.field[place];
  const you = place === finals.you;
  return (
    <span className={`min-w-0 truncate ${you ? "font-semibold" : ""}`}>
      <span className="tabular mr-1 font-mono text-[10px] text-subtle">{place + 1}</span>
      <span aria-hidden>{flag(r.country)}</span> <span className="text-subtle">&apos;{String(r.year).slice(2)}</span> {r.name}
      {you && tag && <span className="ml-1 text-[10px] font-bold text-accent-text">YOU</span>}
    </span>
  );
}

function MatchRow({ finals, m, show }: { finals: FinalsView; m: FinalsMatch; show: boolean }) {
  const decided = show && m.winner !== null && m.score;
  return (
    <div className="flex items-center gap-2 border-t border-line/60 px-3 py-1.5 text-xs first:border-t-0">
      <span className={`flex min-w-0 flex-1 ${decided && m.winner !== m.a ? "text-subtle" : ""}`}>
        <Name finals={finals} place={m.a} tag={false} />
      </span>
      <span className="tabular shrink-0 font-mono text-muted">{decided ? `${m.score![0]}–${m.score![1]}` : "vs"}</span>
      <span className={`flex min-w-0 flex-1 justify-end text-right ${decided && m.winner !== m.b ? "text-subtle" : ""}`}>
        <Name finals={finals} place={m.b} tag={false} />
      </span>
    </div>
  );
}

/** A group's table from the matches shown so far. */
function tableOf(group: FinalsGroup, rounds: number, complete: boolean): GroupStanding[] {
  if (complete && rounds >= 3) return group.standings;
  const rows = group.players.map((player) => ({ player, wins: 0, losses: 0, setsWon: 0, setsLost: 0 }));
  for (const m of group.matches.slice(0, rounds).flat()) {
    if (m.winner === null || !m.score) continue;
    const a = rows.find((r) => r.player === m.a)!;
    const b = rows.find((r) => r.player === m.b)!;
    a.setsWon += m.score[0];
    a.setsLost += m.score[1];
    b.setsWon += m.score[1];
    b.setsLost += m.score[0];
    (m.winner === m.a ? a : b).wins++;
    (m.winner === m.a ? b : a).losses++;
  }
  return rows.sort((x, y) => y.wins - x.wins || y.setsWon - y.setsLost - (x.setsWon - x.setsLost));
}

/** The ATP Finals: two round-robin groups, then the semifinals and final. */
export function FinalsBoard({ finals }: { finals: FinalsView }) {
  const show = revealed(finals);
  const groupsDone = finals.groups.every((g) => g.matches.flat().every((m) => m.winner !== null));
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        {finals.groups.map((group) => {
          const table = tableOf(group, show.rounds, groupsDone);
          return (
            <section key={group.name} className="overflow-hidden rounded-md border-2 border-line bg-surface">
              <p className="bg-surface-2 px-3 py-1.5 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
                Group {group.name}
              </p>
              <ol>
                {table.map((row, i) => (
                  <li
                    key={row.player}
                    className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-line/60 px-3 py-1.5 text-sm ${
                      groupsDone && show.rounds >= 3 && i < 2 ? "bg-cat-matches/10" : ""
                    }`}
                  >
                    <Name finals={finals} place={row.player} />
                    <span className="tabular font-mono text-xs">
                      {row.wins}–{row.losses}
                    </span>
                    <span className="tabular text-right font-mono text-[11px] whitespace-nowrap text-subtle">
                      sets {row.setsWon}–{row.setsLost}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="border-t-2 border-line">
                {group.matches.map((round, r) => (
                  <div key={r}>
                    <p className="bg-surface-2/60 px-3 py-0.5 text-[10px] font-semibold tracking-wider text-subtle uppercase">
                      Day {r + 1}
                    </p>
                    {round.map((m, k) => (
                      <MatchRow key={k} finals={finals} m={m} show={r < show.rounds} />
                    ))}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {finals.semifinals.length > 0 && (
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <section className="overflow-hidden rounded-md border-2 border-line bg-surface">
            <p className="bg-surface-2 px-3 py-1.5 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
              Semifinals
            </p>
            {finals.semifinals.map((m, k) => {
              const yours = m.a === finals.you || m.b === finals.you;
              return <MatchRow key={k} finals={finals} m={m} show={show.semis || yours} />;
            })}
          </section>
          <section className="overflow-hidden rounded-md border-2 border-line bg-surface">
            <p className="bg-surface-2 px-3 py-1.5 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Final</p>
            {finals.final && (show.semis || finals.final.a === finals.you || finals.final.b === finals.you) ? (
              <MatchRow finals={finals} m={finals.final} show={show.final || finals.final.sets !== null} />
            ) : (
              <p className="px-3 py-1.5 text-xs text-subtle">To be decided</p>
            )}
            {finals.champion !== null && (show.final || finals.status !== "current") && (
              <p className="flex items-center gap-1.5 border-t border-line/60 px-3 py-2 text-sm font-semibold">
                <Trophy className="size-4 text-legendary" aria-hidden />
                <Name finals={finals} place={finals.champion} />
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
