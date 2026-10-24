# Acedle — Product & Technical Spec

> A daily tennis roll game inspired by RNGdle. Once per day you roll a random
> season (1980–2026), then a random top-100 player from that season. That
> player-season's real stats earn badges, and the badges add up to your score.

Status: **draft v0.1**. Decisions below came from the kickoff Q&A. Badge point
values are starting numbers that we'll tune against real data in Milestone 1.

---

## 1. Core decisions (locked)

| Topic | Decision |
|---|---|
| Name | **Acedle** (repo to be renamed from `atpdle`) |
| Roll model | Individual: each user gets their own roll once per day |
| Odds | Uniform year (1980–2026), then uniform player in that year's top 100. That's 4,700 player-seasons, each equally likely |
| Player pool | **Year-end** top 100. 2026 uses the current ranking until the season ends |
| 2026 | Included, with the stats **frozen at roll time** (a snapshot is stored with the roll) |
| Score math | Additive base points, then a few rare **multiplier** badges |
| Randomness | **Pure stats**: the same player-season always scores the same (except live 2026) |
| Agency | One roll per day, no rerolls, no choices |
| Sandbox | Unlimited rolls with a "luck" slider that biases toward better players. Never counts toward profile or leaderboards |
| Reveal | Animated slot-machine reveal: year, then player, then badges one by one with a running total |
| Profile | Badge collection/achievements, player-dex, full roll history |
| Share | Wordle-style text/emoji block plus an OG image card |
| Accounts | Guest play plus optional OAuth (Google / Discord / GitHub). A guest can claim today's roll by signing in |
| Reset | UTC midnight. The week runs Monday–Sunday (UTC) |
| Points era problem | Normalize ranking points to the era (see §4.3) |
| Data | Jeff Sackmann `tennis_atp` (CC BY-NC-SA 4.0), with attribution. Non-commercial hobby project |
| Stack | Next.js (App Router, TypeScript) + Supabase (Postgres, Auth) on Vercel |
| First milestone | Data pipeline + scoring engine + a bare roll page |

---

## 2. Game loop

1. User opens the site. If they haven't rolled today (UTC day), they see the **Roll** button.
2. The server picks `year ∈ [1980, 2026]` uniformly, then picks a player uniformly from that year's top 100.
3. The server loads the player-season stats (for 2026, the latest snapshot), runs the scoring engine, and stores the roll with:
   - the stats snapshot
   - the badge breakdown
   - the final score
   - the `scoring_version`
4. Client plays the reveal animation from the stored result. The server does all the math, so it can't be cheated.
5. Result screen: player card, badge list, score, today's leaderboard position, share button.
6. Come back tomorrow. Sandbox mode is always available.

**Score freezing:** a roll's score never changes after it's made, even if we
retune badges later. Every roll records the `scoring_version` that produced it.

**Guests:** use Supabase **anonymous sign-in**. A guest has a real (anonymous)
user row, so one roll per day is enforced the same way for guests and accounts.
Linking an OAuth identity upgrades the same user in place, so today's roll and
history carry over automatically. Only linked (non-anonymous) accounts appear on
leaderboards, because clearing cookies would give a guest a fresh roll.

---

## 3. Leaderboards

| Board | Ranks | Window |
|---|---|---|
| Daily | Top 100 **rolls** | Current UTC day |
| Weekly | Top 100 **rolls** (one user can appear up to 7 times) | Mon 00:00 – Sun 23:59 UTC |
| All-time | Top 100 **accounts** by total points | Forever |

All three can also show the viewer's own position even when they're outside the
top 100. Possible later: all-time "best single roll", and per-country boards.

---

## 4. Scoring engine

### 4.1 Shape

```
base  = Σ additive badge points
mult  = Π multiplier badges   (capped, e.g. ≤ ×10)
score = round(base × mult)
```

Badges are **declarative definitions** in `src/lib/scoring/badges/*.ts`. Each one has:
`id`, `name`, `description`, `category`, `rarity` (for display), an `eligible(season)` check,
and an `award(season) → { points | multiplier, detail }` function. The engine is a pure
function `score(season, version) → { badges[], base, mult, total }` with unit tests.

Badges whose data doesn't exist for a season (e.g. serve stats before 1991) are
**ineligible**: they don't show up and don't count as zero.

### 4.2 Badge catalogue (draft, for tuning)

Point values are placeholders. The M1 balance report (§7) will set the real ones.
"Per X" badges show the count, e.g. *"Titlist ×6 — +300"*.

#### Titles
| Badge | Rule | Draft value |
|---|---|---|
| Titlist | Per tour-level title | +50 each |
| Grand Slam Champion | Per major title | +400 each |
| Masters Champion | Per Masters 1000 title (1990+). Pre-1990 uses Grand Prix "Super Series" equivalents if the data marks them | +150 each |
| Year-End Champion | Won the Tour Finals | +250 |
| Olympic Gold | Won Olympic singles (1988+) | +250 |
| Finalist | Per final reached and lost | +15 each |
| Slam Finalist | Per major final lost | +120 each |
| Deep Runs | Per major semifinal (not final) | +60 each |
| Maiden Voyage | First career tour title came this season | +75 |
| Title Defense | Won a tournament he also won the year before | +40 each |
| Qualifier Champion | Won a title after coming through qualifying | +150 |
| Wildcard Wonder | Won a title as a wildcard | +100 |
| Lucky Loser Champ | Won a title as a lucky loser (very rare) | +250 |

#### Surface
| Badge | Rule | Draft value |
|---|---|---|
| Clay Court King | Per clay title | +20 each (on top of Titlist) |
| Grass Master | Per grass title | +30 each (grass titles are scarcer) |
| Hard Court Hero | Per hard title | +15 each |
| Carpet Era | Won a carpet title (pre-2010 only) | +40 |
| All-Surface | Titles on 3+ different surfaces this season | +150 |
| Channel Slam | Roland Garros + Wimbledon in the same year | **×1.5** |
| Sunshine Double | Indian Wells + Miami in the same year | +200 |

#### Ranking (era-normalized, see §4.3)
| Badge | Rule | Draft value |
|---|---|---|
| Year-End #1 | Finished the year at #1 | **×2** |
| Year-End Tier | Top 3 / 5 / 10 / 20 / 50 / 100 | +300 / 200 / 120 / 60 / 25 / 5 (highest tier only) |
| Summit | Peak rank reached that season (if better than the year-end rank) | Same tiers at half value |
| King of the Hill | Per week ranked #1 during the season | +8 per week |
| Point Haul | Year-end points as % of the #1's points. Stacks at milestones 10 / 25 / 50 / 75 / 100% | +20 / +40 / +80 / +120 / +200 (cumulative) |
| Breakthrough | First season finishing inside the top 10 | +150 |
| Rookie | First season finishing inside the top 100 | +50 |
| Rocket | Ranking spots climbed from the first ranking of the year to year-end | +1 per spot, cap +150 |
| Flag Bearer | Highest-ranked player from his country at year-end | +40 |

#### Match record
| Badge | Rule | Draft value |
|---|---|---|
| Match Winner | Per tour-level match win | +3 each |
| Win Rate | 70% / 80% / 90%+ (min. 20 matches) | +50 / +150 / +400 (highest only) |
| Streak | Longest win streak in the season, milestones 10 / 20 / 30 / 40 | +30 / +80 / +200 / +400 (cumulative) |
| Giant Killer | Per win over a top-10 player | +25 each |
| Dethroner | Beat the world #1 | +100 per win |
| Upset Artist | Beat someone ranked 50+ spots higher | +15 each |
| Iron Man | Played 80+ matches | +75 |
| Five-Set Warrior | Per five-set match won | +10 each |
| Escape Artist | Won a match after losing the first two sets | +40 each |
| Baker | Per 6–0 set won ("bagel") | +5 each |
| Tiebreak Titan | Tiebreak win rate ≥ 65% (min. 15 played) | +60 |
| Marathon Man | Won a match lasting 4h+ (where the data has duration) | +50 |

#### Serve & return (1991+ only, where stats exist)
| Badge | Rule | Draft value |
|---|---|---|
| Ace Machine | Per 100 aces in the season (fits the name!) | +40 per 100 |
| Big Server | Season ace rate ≥ 10% of service points | +60 |
| Clutch | Break points saved ≥ 65% | +50 |
| Hold Steady | Service games won ≥ 88% | +60 |

#### Player profile (cosmetic, small)
| Badge | Rule | Draft value |
|---|---|---|
| Teen Phenom | Under 20 at year-end | +80 |
| Wily Veteran | 33+ at year-end | +60 |
| Lefty | Left-handed | +10 |
| Skyscraper | 6'6" (198 cm) or taller | +15 |

#### Rare multipliers (the jackpot layer)
| Badge | Rule | Draft value |
|---|---|---|
| Year-End #1 | (above) | ×2 |
| Triple Crown | 3+ majors in one season (e.g. Wilander '88, Federer '04/'06/'07, Nadal '10, Djokovic '11/'15/'21/'23) | ×2 |
| Calendar Slam | All 4 majors (nobody did it in 1980–2025; a "hidden" badge) | ×5 |
| Big Title Sweep | A major + a Masters + the Tour Finals in the same year | ×1.5 |
| Channel Slam | (above) | ×1.5 |
| Total multiplier cap | | ×10 |

#### Ideas parked for later (need extra data)
- **Home Hero**: won a title in his own country. Needs tournament→country mapping.
- **Davis Cup Champion**: needs reliable tie-winner data.
- **Farewell Tour**: final career season inside the top 100. Unstable for recent years.
- **Rivalry badges** (e.g. beat Federer, Nadal and Djokovic in one season).
- **Collection meta-achievements** on the profile (not score): "Rolled all 47 years", "Rolled every year-end #1", "Rolled 10 lefties"...

### 4.3 Era normalization

The ATP ranking system changed in 1990, 2000 and 2009 (2009 roughly doubled the
point values), so raw points can't be compared across eras. Points-based badges
use **share of that year's #1 year-end points** (`pts / pts_of_no1`). That ratio
has no units and works in every era. If points are missing for a season (possible
in the early 1980s data), the Point Haul badge is ineligible and the
rank-based badges carry the weight.

### 4.4 2026 (live season)

- Use the current top 100 instead of the year-end list until the season ends.
- A data refresh job (weekly at first) rebuilds the 2026 player-seasons.
- Each roll stores its own stats snapshot, so the score is frozen at roll time.
- "Year-end" badges use the *current* rank for 2026 rolls. Labeled e.g. "Ranked #3 (live)".

---

## 5. Sandbox mode

- Unlimited rolls, labeled **SANDBOX** everywhere. Never saved to profile or leaderboards (it may still keep a local list of recent sandbox rolls).
- **Luck slider** 1×–10×. Year stays uniform. Each player's weight within the year is
  `w = 1 / rank^k`, where `k` scales with luck (`k = 0` at 1×, which is uniform, up to about `k = 1.5` at 10×).
  An option to bias toward high-scoring seasons comes later.
- The scoring runs on the same engine as the daily roll, and can run client-side because nothing is at stake.

---

## 6. Architecture

```
acedle/
  data/raw/            # Sackmann CSVs (gitignored, fetched by script)
  data/build/          # generated player-season JSON (or loaded straight into Postgres)
  scripts/etl/         # fetch + transform + compute season stats
  scripts/balance/     # score distribution report for tuning
  src/app/             # Next.js routes: /, /sandbox, /leaderboard, /u/[handle]
  src/lib/scoring/     # pure scoring engine + badge definitions (unit-tested)
  src/lib/roll/        # server-side roll logic
  supabase/migrations/ # SQL schema
```

### Data model (Postgres)

- `players(id, name, country, hand, height_cm, birth_date)`
- `player_seasons(year, player_id, ye_rank, ye_points, stats jsonb, data_as_of)`, with primary key `(year, player_id)`
- `profiles(user_id, handle, avatar_url, created_at)`
- `rolls(id, user_id, day date, year, player_id, season_snapshot jsonb, badges jsonb, base, mult, score, scoring_version, created_at)`, with `UNIQUE(user_id, day)`
- `user_badges` (a view or materialized table over `rolls.badges`) for the collection page
- Leaderboards are indexed queries on `rolls(day, score desc)`, `rolls(week, score desc)`, and the per-user sum of score

### ETL outline

1. Download `atp_players.csv`, `atp_rankings_*.csv`, and `atp_matches_YYYY.csv` for 1980–present.
2. For each year: year-end top 100 (the last ranking week of the year) → player list.
3. From that year's matches: titles by level/surface, finals, major runs, W/L, streaks, wins vs. top 10, set scores (bagels, five-setters, comebacks, tiebreaks), entry type (Q/WC/LL), serve stats (1991+).
4. From weekly rankings: peak rank, weeks at #1, start-of-year rank, era-normalized points.
5. Career context (Rookie, Breakthrough, Maiden title) needs earlier years, so the ETL scans from the start of the dataset, not just from 1980.
6. Output one record per player-season, validated against known seasons (e.g. Djokovic 2015 = 11 titles, 3 majors).

---

## 7. Milestones

**M1 — Data + scoring engine** (next)
- Scaffold the Next.js + TypeScript project, lint, and tests (Vitest)
- ETL that produces all 4,600+ player-seasons (1980–2025, with 2026 to follow)
- Scoring engine plus the full draft badge set, unit tests on hand-checked seasons
- **Balance report**: score distribution (median, p90, p99, max), the 25 best and 25 worst seasons, and how often each badge fires. Tune until it feels right: a normal roll is a few hundred points, a top-10 season is a few thousand, and a historic season is a 5-digit jackpot
- Bare `/dev/roll` page: roll button, raw badge list, score

**M2 — Daily roll + accounts**
- Supabase schema, anonymous auth plus OAuth linking, server-side roll endpoint, one-per-day enforcement, guest → account claim

**M3 — Leaderboards + profile**
- Daily, weekly and all-time boards; roll history; badge collection; player-dex

**M4 — Fun layer**
- Reveal animation, share text plus OG image, sandbox mode with luck slider

**M5 — Live 2026 + launch**
- Scheduled 2026 data refresh, deploy to Vercel, attribution page, polish

---

## 8. Open items

1. **Data access:** this cloud session couldn't reach `JeffSackmann/tennis_atp`. Options: fork it into your GitHub account and add it to the session, or I write the ETL and you run the fetch step locally or in CI.
2. **2025/2026 coverage:** unconfirmed how up to date Sackmann's 2025/2026 files are. We may need a second source for recent data. That source must also allow non-commercial use.
3. **Repo rename:** rename `atpdle` → `acedle` in GitHub → Settings. Git remotes keep working through GitHub's redirect.
4. **Pre-1990 "Masters":** decide whether 1980s Super Series events count for the Masters badge, based on how the data tags them.
5. **Handles/moderation:** are display names chosen freely or taken from OAuth? A profanity filter?
6. **Anti-abuse:** multiple OAuth accounts per person can farm the all-time board. Accept this for v1?
