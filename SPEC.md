# Acedle — Product & Technical Spec

> A daily tennis roll game inspired by RNGdle. Once per day you roll a random
> season (1990–2026), then a random top-100 player from that season. That
> player-season's real stats earn badges, and the badges add up to your score.

Status: **v0.6**. Milestones 1–5 are built: data and scoring, daily roll and
accounts, leaderboards and profile, reveal and sharing, and the live 2026
season. What's left for launch is the deploy (section 7). Badge values are tuned against the real data, and
`docs/balance-report.md` shows the current numbers.

---

## 1. Core decisions (locked)

| Topic | Decision |
|---|---|
| Name | **Acedle** |
| Roll model | Individual: each user gets their own roll once per day |
| Years | **1990–2026**. 1990 is when ranking points and the modern Masters/Tour Finals structure begin |
| Odds | Uniform year, then uniform player in that year's top 100. That's 3,700 player-seasons, each equally likely (1 in 3,700) |
| Player pool | **Year-end** top 100. 2026 uses the latest ranking list until the season ends |
| 2026 | Included, with the stats **frozen at roll time** (a snapshot is stored with the roll) |
| Score math | Flat base points × stacking multipliers. Median roll is ~50k and the best seasons are ~100M |
| Randomness | **Pure stats**: the same player-season always scores the same (except live 2026) |
| Agency | One roll per day, no rerolls, no choices |
| Sandbox | Unlimited rolls with a 1×–10× luck slider that biases toward better-ranked players. Never counts toward profile or leaderboards |
| Reveal | Animated reveal: year, then player, then points badges with a running total, then multipliers |
| Profile | Badge collection/achievements, player-dex, full roll history |
| Share | Wordle-style text/emoji block plus an OG image card |
| Accounts | Guest play plus optional OAuth (Google / Discord / GitHub). A guest can claim today's roll by signing in |
| Reset | UTC midnight. The week runs Monday–Sunday (UTC) |
| Era fairness | Points badges use the share of that year's #1 points, not raw points |
| Data | Jeff Sackmann's ATP data (CC BY-NC-SA 4.0) via an archive mirror, plus the live 2026 season from Tennis My Life (results) and Tennis Abstract (rankings). Non-commercial hobby project |
| Stack | Next.js 16 (App Router, TypeScript, Tailwind) + Supabase (Postgres, Auth) on Vercel |

---

## 2. Game loop

1. User opens the site. If they haven't rolled today (UTC day), they see the **Roll** button.
2. The server picks `year ∈ [1990, 2026]` uniformly, then picks a player uniformly from that year's top 100.
3. The server scores the season and stores the roll with:
   - the stats snapshot
   - the badge breakdown
   - the final score
   - the `scoring_version`
4. Client plays the reveal animation from the stored result. The server does all the math, so it can't be cheated.
5. Result screen: player card, badge list, score, today's leaderboard position, share button.
6. Come back tomorrow. Sandbox mode is always available.

**Score freezing:** a roll's score never changes after it's made, even if we
retune badges later. Every roll records the `SCORING_VERSION` that produced it.

**Reveal:** the roll action returns the stored roll, and the browser plays it
(`src/lib/reveal.ts` is the timeline; `RollReveal` draws it):
1. The year spins for 1 s and lands, then the player appears.
2. Points badges drop in one by one (about 2.4 s in all) and the base counts up.
3. After a pause, each multiplier lands (0.7 s apart) and the total counts up.

A median reveal takes 4.5 s (90% finish within 5.7 s), and the longest, for
the best seasons, takes 11.8 s. Skip jumps to the
end. With `prefers-reduced-motion`, the result shows at once. When the reveal
ends, the page refreshes into the stored roll, with the rank and Share button.

**Sharing:** every roll has a page at `/rolls/[id]`. Anyone with the link can
open it (an unlisted link: ids are random UUIDs that appear only in links
people share). Its owner also gets a **Share** button, and everyone else gets a
"Roll your own" link. The page has a generated preview card
(`opengraph-image.tsx`) and a title like "2015 Novak Djokovic · 103,061,889
points". The share text, copied or sent through the system share sheet on
phones, looks like:

```
Acedle Oct 24, 2026
2015 Novak Djokovic (#1)
🏆🏆🏆🏆🟫🟫🟫🟫🟫📈📈📈🎾🎾🎾🎾🎾🎾🎾🎾🎾🎾🚀🚀🚀🏆🏆🏆💎📈💎💎 ×191.41
103,061,889 pts · top 0.03%
https://<site>/rolls/<id>
```

There's one emoji per badge, by category (🏆 titles, 🟫 surface, 📈 ranking,
🎾 matches, 🚀 serve, 🧬 profile, 💎 jackpots), then the total multiplier.
"Top X%" is the share of all 3,700 seasons scoring at least this much, which is
also the chance of rolling this well.

**Guests:** use Supabase **anonymous sign-in**. The browser signs in as a guest
the first time a visitor presses Roll (in the browser, so Supabase's per-IP
rate limit applies to each visitor rather than to our server). A guest has a
real (anonymous) user row, so one roll per day is enforced the same way for
guests and accounts.

**Claiming:** signing in with OAuth lands on `/auth/callback`, which knows the
guest the browser was signed in as.
- If the sign-in creates a **new** account, the guest's rolls (today's and any
  earlier ones) move into it.
- If the account **already existed**, it keeps its own rolls and the guest's
  are discarded. Otherwise someone could roll as several guests and claim the
  best one.
- Either way the guest user is deleted, since the browser has left it.

Only accounts (users with a profile) appear on leaderboards, because clearing
cookies would give a guest a fresh roll.

---

## 3. Leaderboards

| Board | Ranks | Window |
|---|---|---|
| Daily | Top 100 **rolls** | Current UTC day |
| Weekly | Top 100 **rolls** (one user can appear up to 7 times) | Mon 00:00 – Sun 23:59 UTC |
| All-time | Top 100 **accounts** by total points | Forever |

All three also show the viewer's own position, even outside the top 100 (their
rows follow the top 100 after a gap). Tied scores share a rank (1, 1, 3), and the
earlier roll (or older account) is listed first. Guests don't appear; a guest
viewing a board is asked to sign in.

Pages: `/leaderboard` (today), `/leaderboard/weekly`, `/leaderboard/all-time`.
The home page also shows "#N of M today" under an account's roll.

Possible later: past days and weeks, all-time "best single roll", and
per-country boards.

### Profile

`/profile` is the viewer's own page (accounts and guests): handle, rolls, total
points, best roll and all-time rank, with three tabs:
- **History:** every roll, newest first. Each opens its `/rolls/[id]` page with
  the full badge breakdown and the Share button.
- **Badges:** all 55 badges by category, with times earned and the first day.
  Hidden badges show as "???" until earned.
- **Player-dex:** players, player-seasons and years collected out of all that
  can be rolled, goals, a grid of the 37 years, and each player with the
  seasons rolled.

**Goals** (`src/lib/profile/goals.ts`) have bronze, silver and gold levels,
set so that at one roll a day a typical player reaches them in about two
weeks, three months and a year (simulated with uniform rolls). Collecting
goals count different countries, years and players rolled, and different
player-seasons that finished top 10 or No. 1, won a Slam, or were left-handed.
Playing goals count tournament-mode titles, tiers won, titles without a set
dropped, season-mode event titles and seasons finished. They're worked out
from the viewer's rolls and seasons on each visit (nothing stored), so rolls
from before goals count. The profile header shows the medals reached, and
the home page lists any that today's card brought (with its tournament and
seasons).

Public profiles (clicking a name on a board) are a possible later addition.

---

## 4. Scoring

### 4.1 Shape

```
base  = Σ points badges
mult  = Π multiplier badges      (safety cap ×1,000; the best real season is ~×191)
score = round(base × mult)
```

- Badges are declarative definitions in `src/lib/scoring/badges/*.ts` and are the source of truth.
- Each badge has an `id`, `name`, `category`, a `description`, and an `evaluate(season)` function. `evaluate` returns points or a multiplier, or `null`.
- Flat points are written in small units and scaled by one knob, `POINT_SCALE` (currently ×120). For example, `pts(50)` per title gives 6,000 points.
- Badges skip seasons that lack their data (e.g. serve stats before 1991): they don't show up rather than counting as zero.
- The reveal order is points badges first, then multipliers.

### 4.2 Current distribution (scoring v1)

| | median | top 10% | top 1% | max |
|---|---|---|---|---|
| All rolls | ~49k | ~449k | ~7.4M | ~103M |

| Final rank | median score |
|---|---|
| #1 | ~15.8M |
| #2–5 | ~2.1M |
| #6–10 | ~750k |
| #11–20 | ~230k |
| #21–50 | ~70k |
| #51–100 | ~27k |

Top seasons:
1. Djokovic 2015 (~103M)
2. Djokovic 2011 (~100M)
3. Federer 2006 (~80M)
4. Federer 2004 (~62M)
5. Nadal 2008 (~58M)

### 4.3 Badges (55)

**Multipliers** (they stack):

| Badge | Rule | Value |
|---|---|---|
| Top Ranked | Final rank: top 3 / 5 / 10 / 20 / 50 | ×10 / ×8 / ×6 / ×3 / ×1.5 |
| World No. 1 | Finished #1 (on top of Top Ranked) | ×1.5 |
| Grand Slam Champion | Per major title | ×1.4 each |
| Masters Champion | Per Masters 1000 title | ×1.1 each |
| Year-End Champion | Won the Tour Finals | ×1.25 |
| Olympic Gold | Won Olympic singles | ×1.25 |
| Triple Crown | Exactly 3 majors | ×1.4 |
| Calendar Slam (hidden) | All 4 majors | ×5 |
| Big Title Sweep | Major + Masters + Tour Finals | ×1.5 |
| Golden Season | Major + Olympic gold | ×1.5 |
| Channel Slam | Roland Garros + Wimbledon | ×1.5 |
| Unstoppable | Win streak of 30+ / 40+ matches | ×1.25 / ×2 |

**Points** (values shown after the ×120 scale):

| Group | Badges |
|---|---|
| Titles | Titlist 6,000/title, Finalist 1,800/final lost, Slam Finalist 14,400, Deep Run (major SF) 7,200, Second Week (major QF) 3,000, Maiden Voyage 9,000, Title Defense 4,800 each, From the Qualies 18,000, Wildcard Wonder 12,000, Luckiest Loser 30,000 |
| Surface | Clay Court King 2,400/title, Grass Master 3,600/title, Hard Court Hero 1,800/title, Carpet Era 4,800, All-Surface 18,000, Sunshine Double 24,000 |
| Ranking | Summit (peaked in a higher tier), King of the Hill 960/week at #1, Point Haul (share of #1's points, stacks at 10/25/50/75/100%), Breakthrough (first top-10 finish) 18,000, Rookie (first top-100 finish) 6,000, Rocket 120/place climbed, Flag Bearer 4,800 |
| Matches | Match Winner 360/win, Win Rate 70/80/90%, On Fire (streak milestones), Giant Killer 3,000/top-10 win, Dethroner 12,000/win over #1, Upset Artist 1,800 each, Iron Man (80+ matches), Five-Set Warrior, Escape Artist (from two sets down), Baker (6–0 sets), Tiebreak Titan, Marathon Man (4h+ win) |
| Serve (1991+) | Ace Machine 2,400/100 aces, Big Server, Clutch (BP saved), Hold Steady |
| Profile | Teen Phenom, Wily Veteran, Lefty, Skyscraper |

**Parked ideas** (need extra data):
- Home Hero (won a title in his own country)
- Davis Cup Champion
- Farewell Tour (final season in the top 100)
- Rivalry badges (beat the Big 3 in one season)
- Collection meta-achievements on the profile, such as "Rolled all 37 years" or "Rolled every year-end #1"

### 4.4 2026 (live season)

- The pool is the latest ranking list's top 100, and its stats are year-to-date.
- Ranking badges read "currently" instead of "year-end". The roll card says which list it was ranked on ("live season, ranked as of Oct 19, 2026").
- Each stored roll keeps its own stats snapshot, so its score is frozen at roll time.
- The data refreshes daily (see "Live season" in section 6).

---

## 5. Sandbox mode

- Unlimited rolls, labeled **SANDBOX** everywhere. Never saved to profile or leaderboards.
- **Luck slider** 1×–10×. Year stays uniform. Each player's weight within the year is `1 / rank^k`, where `k` goes from 0 (uniform) at 1× to 1.5 at 10×.
- `/sandbox` (the old `/dev/roll` redirects there), backed by `GET /api/sandbox/roll?luck=1..10`. Use `?year=&player=` to score a specific season.
- Every sandbox roll plays the reveal, then shows "top X% of all seasons".
- Any sandbox roll can enter a practice tournament (§5.1). Nothing is saved.

### 5.1 Tournament mode

After a roll, the player can take the rolled player-season into a tournament (`src/lib/tournament.ts`).

- **Draw:** the player plus 15 player-seasons rolled like the daily roll (any year, any of its top 100), seeded 1–16 by score in a standard draw, so seeds 1 and 2 can only meet in the final.
- **Odds:** a player scoring `a` beats one scoring `b` with chance `a / (a + b)` (their share of the two scores). Scores span 1k–100M, so ratios, not differences: twice the score is a 67% favourite, ten times is 91%.
- **The player's matches:** a timing game. A ball sweeps back and forth along a track; tapping (or Space) while it's in the green zone wins the set. Best of 3 sets, the final best of 5. The odds set the zone (7% of the track at 0% odds, 40% at 100%) and the ball's speed (0.45–1.6 s per pass).
- **Other matches:** decided by the odds, using a random number drawn from the tournament's seed per match, so the draw always plays out the same. Results of a round show once the player has finished their own match in it.
- **Daily rolls:** one tournament per roll, saved: the draw, its seed and each set as it's played (a lost set can't be replayed). The result (rounds won, 4 = champion) shows on the roll page, in the share text and in the roll history. It never changes scores or leaderboards. Other people can see a roll's finished draw at `/rolls/[id]/tournament`.
- **Sandbox:** the same game, with nothing saved (`GET /api/sandbox/tournament?year=&player=` makes the draw).

### 5.2 Season mode

A card can also play a full season (`src/lib/season/`): today's calendar of
4 Slams and 9 Masters against a field of 40 rivals (ranked 1–50, any year),
then the ATP Finals for the top 8 in the race. Odds are court-adjusted, with
form and fatigue; each event is seeded by race points (card score for the
first). Like a tournament, a season is its setup plus the player's sets, and
everything else is replayed from those (`seasonState`), including a log of
the player's matches with the odds they had going in.

**Storylines** (`stories.ts`) are worked out from that state, so every
season has them, old ones included:
- **Headlines** per event, up to three, most important first: titles, the
  Calendar Slam, the first loss, revenge on a rival who beat the player
  earlier, a rival beating them again, upsets (won at 35% or less) and shocks
  (lost at 70% or more), winning streaks every 10, the race lead and the
  Finals places, rivals winning several titles, and the year-end place.
- **Rivalries:** the record against each rival met; the one who beat the
  player most (at least twice) is the nemesis.
- **Recap** once it's over: biggest upset, toughest loss, longest streak,
  nemesis, top rival, and the record and points on each court.

The season page shows the latest storylines, each event's own headlines, the
ones a match just added, the rivalries and the recap. A finished season's
share text adds its upset (35% or less) and nemesis, and the link preview
shows one storyline.

---

## 6. Architecture

```
data/raw/            Sackmann CSVs (gitignored; npm run data:fetch)
data/seasons/        Generated player-seasons, one JSON per year (committed)
scripts/etl/         fetch.ts (sparse clone + live sources), fetch-live.ts, build.ts (stats),
                     live.ts (live-season merge), parse.ts (+ tests)
data/live/           Every published 2026 ranking list fetched so far (committed)
.github/workflows/   refresh-data.yml: daily live-season refresh
scripts/balance.ts   Writes docs/balance-report.md
scripts/db/          seed.ts: loads players + player_seasons into Supabase (+ tests)
supabase/migrations/ Postgres schema, RLS and grants
src/lib/data/        PlayerSeason types, year range, season loader
src/lib/scoring/     Pure scoring engine + badge definitions (+ tests)
src/lib/roll/        Roll logic: uniform odds, sandbox luck, daily roll + its store (+ tests)
src/lib/supabase/    Server, browser and service-role clients; Database types
src/lib/auth/        Enabled sign-in methods, the viewer for a request, post-sign-in
                     profile + guest claim (+ tests)
src/lib/leaderboard.ts  Leaderboard reads (Postgres functions)
src/lib/profile/     Profile queries; summary, badge collection, player-dex (+ tests)
src/lib/reveal.ts    Reveal timeline (+ tests)
src/lib/share.ts     Share text; scoring/distribution.ts ranks a score among all seasons (+ tests)
src/lib/roll/shared.ts  Reads any roll by id for its public page and preview card
src/components/      Roll card, reveal, share button, boards, tabs, progress bar
src/proxy.ts         Refreshes the Supabase session before rendering
src/app/             Next.js routes: / (daily roll), /leaderboard{,/weekly,/all-time},
                     /profile{,/badges,/dex}, /rolls/[id] (+ opengraph-image), /sandbox,
                     /about, /api/sandbox/roll, /auth/callback, /auth/error; actions.ts
                     (rollToday, signOut)
```

**Who writes what:** clients only ever read (RLS: own rolls; players and
profiles are public; leaderboards through functions that return public columns
only). The server writes rolls with the service-role key after verifying the
session, so a score can only come from the scoring engine.

**Rendering:** pages are static shells, and everything that depends on the
session streams in behind `<Suspense>`. Reading the session goes through
`getViewer()`, which calls `connection()` first: checking the token and working
out "today" both read the clock, which Cache Components doesn't allow while
prerendering.

### Commands

| Command | What it does |
|---|---|
| `npm run data:fetch` | Sparse-clone the source CSVs (~140 MB) and download the live season |
| `npm run data:build` | Rebuild `data/seasons/*.json` (~10 s) |
| `npm run balance` | Regenerate the balance report |
| `npm run db:seed` | Load players + player-seasons into Supabase (after a schema change or `data:build`) |
| `npm test` / `npm run lint` / `npm run typecheck` | Checks |
| `npm run dev` | Local app; open `/` for the daily roll or `/sandbox` |

### Data notes

- **Source:** the upstream `JeffSackmann/tennis_atp` repo was removed from GitHub in September 2026. We use the archive mirror `Aneeshers/tennis-sackmann-archive` (snapshot from June 2026; same CC BY-NC-SA license). Override it with `ACEDLE_DATA_REPO` or `ACEDLE_RAW_DIR`.
- **Event classification:**
  - Grand Slam Cup, Laver Cup and Next Gen Finals are excluded.
  - Davis Cup, ATP Cup, United Cup and the World Team Cup count toward W/L but not titles.
  - Olympics count as titles.
- **Reassigned ranking ids:** the rankings list Martin Damm Sr. (210013) under 102093, the id `atp_players.csv` now gives his son (born 2003). Entries dated before a player's birth go to the id in `REASSIGNED_RANKING_IDS` (`scripts/etl/parse.ts`), and the build fails if any other such entry belongs to a pool player.
- **Tournament codes** are canonicalized (zero-padding and the 2016–2020 `M0xx` scheme) so title defenses line up across years.
- **Seasons** follow the match file's year. Early-January events that start in late December belong to the new season.
- **Ranking points:** when a year's final ranking list lacks points, the latest list with points is used.
- **Weeks at #1** count days between published lists, so gaps in the data and the 2020 freeze are handled.

### Live season

The mirror stops at 25 May 2026 (matches) and 8 June 2026 (rankings). The rest of
2026 comes from two sources, picked because they're the most current and match
Sackmann's formats:

| What | Source | Freshness |
|---|---|---|
| Results after the snapshot | [Tennis My Life](https://stats.tennismylife.org/tennis-match-database): ATP results in Sackmann's columns, with serve stats | Daily, plus the current week's matches |
| Current ranking list | [Tennis Abstract](https://www.tennisabstract.com/reports/atpRankings.html) (Sackmann's site): rank, name, country, birth date | Weekly (Mondays) |

How they're merged (`scripts/etl/live.ts`):
- **Players:** TML uses ATP codes ("D643"). Each code is matched to a Sackmann id by name and birth date, then by birth date and the same name words in another order or with some left out ("Yunchaokete Bu" is Sackmann's "Bu Yunchaokete", "Daniel Merida" is "Daniel Merida Aguilar"), then by a unique name. Players Sackmann doesn't know get a stable synthetic id (2,000,000 + the code in base 36). No 2026 top-100 player needs one today.
- **Matches:** only tournaments that start after Sackmann's last one come from TML, so nothing is counted twice. TML dates matches by the day they're played; each tournament takes its first day as its date. For tournament codes Sackmann knows, Sackmann's name and level win (TML calls Monte Carlo "Monte Carlo" and marks Winston-Salem as a Masters).
- **Rankings:** every fetched list is added to `data/live/atp_rankings_live.csv`, so real weekly lists pile up over time. Weeks without a fetched list are rebuilt from the rank each player had at each tournament (tour, Challengers and qualifying), up to the newest tournament week. Tennis Abstract answers 403 to GitHub's runners, so the daily job usually can't fetch a new list. The current ranking is then estimated this way and `meta.json` says so (`rankingsEstimated`, shown on `/about`). Even building without any list since June, the estimate for 19 Oct had the right #1, 8 of the top 10 exact, 93 of the top 100 present and a median rank error of 1. Running the fetch from a network Tennis Abstract allows (e.g. `npm run data:fetch && npm run data:build` locally) saves a real list again. Ranking points come from the same per-tournament records.
- **Checked against the overlap** (January–May 2026, where both Sackmann and TML exist): 98.4% of matches are identical (1,356 of 1,378), and scores agree in 99.4% of them. Rebuilt weekly lists had the right #1 in 14 of 16 weeks, with 96 of the top 100.
- **Refresh:** `.github/workflows/refresh-data.yml` runs daily (06:17 UTC). It fetches, rebuilds, runs the tests, and commits `data/` when anything changed; the push redeploys the app. With the `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` repository secrets it also reseeds Supabase. Rolling a player who isn't in the `players` table yet adds the row, so a late reseed can't break a roll.
- **Licenses:** Sackmann's data is CC BY-NC-SA 4.0. TML lists MIT on its site and CC BY-NC-SA on its GitHub; Acedle meets the stricter one (non-commercial, attributed, share-alike). Credits are on `/about`.

### Data model (Postgres)

Schema: `supabase/migrations/`. Types: `src/lib/supabase/database.types.ts`
(hand-written; keep them in sync).

- `players(id, name, country, hand, height_cm)`, with details from each player's latest season. Birth dates aren't in the season data yet (only `age`).
- `player_seasons(year, player_id, final_rank, stats jsonb, data_as_of)`, with primary key `(year, player_id)`. `stats` is the full `PlayerSeason`.
- `profiles(user_id, handle, avatar_url, created_at, total_score, roll_count)`. Only accounts have one, which is what keeps guests off leaderboards. The handle defaults to the provider username, or a first name and last initial ("Novak D."). A trigger on `rolls` keeps `total_score` and `roll_count` up to date.
- `rolls(id, user_id, day, week, year, player_id, season_snapshot jsonb, badges jsonb, base, mult, score, scoring_version, created_at)`, with `UNIQUE(user_id, day)`. `week` is generated (the Monday of `day`).
- `user_badges`: a view over `rolls.badges` (times earned, first and last day) for the collection page.
- `create_profile_and_claim(user, handle, avatar, guest)`: run by the OAuth callback. It creates the profile, and only if that's new does it move the guest's rolls. Service role only.
- `delete_stale_guests(days = 30)`: deletes anonymous users older than 30 days with no roll in the last 30 days (their rolls go too). A `pg_cron` job runs it nightly at 04:23 UTC.
- `tournaments(roll_id, entrants jsonb, you, seed, sets boolean[], rounds_won, created_at, finished_at)`: one per roll (§5.1), readable by the roll's owner. `tournament_add_set(roll, expected, won, rounds_won)` appends a set only if the tournament still has `expected` sets and isn't over. Service role only.
- `roll_leaderboard(from, to)`: rolls between two UTC days (at most a week), so it serves both the daily and the weekly board. `alltime_leaderboard()`: accounts by `total_score`. Both return the top 100 plus the viewer's own rows, with public columns only: handle, avatar, player, score, rank, the board's size, and `is_viewer`.

---

## 7. Milestones

**M1 — Data + scoring engine ✅**
- Next.js scaffold, Vitest, lint and typecheck
- ETL that produces 3,700 player-seasons, validated against well-known seasons
- Scoring engine, 55 badges, balance report, curve tuned to a ~100M top
- `/dev/roll` page plus `GET /api/dev/roll` (also `?year=&player=` to score a specific season); now `/sandbox`

**M2 — Daily roll + accounts ✅**
- Supabase schema with RLS (`supabase/migrations/`), plus `npm run db:seed` for player data
- Guest play through anonymous sign-in, and OAuth sign-in (Google / Discord / GitHub; only the providers switched on in Supabase are shown)
- Server-side daily roll with a CSPRNG, one per user per UTC day (enforced by `UNIQUE(user_id, day)`; concurrent rolls get the stored one)
- Guest → account claim in `/auth/callback` (new accounts only; see §2)
- Session refresh in `src/proxy.ts`; the home page shows today's roll or the Roll button

**M3 — Leaderboards + profile ✅**
- Daily, weekly and all-time boards, with the viewer's position (`/leaderboard`)
- Profile: roll history with per-roll detail, badge collection, player-dex (`/profile`)
- Running totals per account, and leaderboard functions (second migration)
- Site nav; "#N of M today" on the home page

**M4 — Fun layer ✅**
- Reveal animation for daily and sandbox rolls (skip, reduced motion)
- Share text plus a public `/rolls/[id]` page with a generated preview card; "top X% of all seasons"
- `/sandbox` with the luck slider (replaces `/dev/roll`)

**M5 — Live 2026 + launch ✅** (deploy pending)
- Live 2026 from Tennis My Life + Tennis Abstract, merged into the Sackmann data and checked against the overlap
- Daily refresh workflow; players added on roll if the table is behind
- Nightly cleanup of abandoned guests (`pg_cron`)
- `/about` with credits, licenses, data dates and what's stored
- Deploy steps in the README; the deploy itself needs the owner's Vercel account

**M6 — Tournament mode + polish ✅**
- Redesign in the scoreboard theme: reveal reels, rarity tiers, countdown, sound, link previews, phone layouts
- Total score above the daily roll, with the day's score counted into it after the reveal
- Tournament mode for daily rolls (saved, fourth migration) and sandbox rolls (§5.1)

---

## 8. Open items

1. **Live sources can change:** Tennis Abstract's report is an HTML page. If its layout changes, the refresh fails loudly and the last good data stays deployed. TML's per-match dates and level codes also differ from Sackmann's (handled in `live.ts`), so a format change there would surface in the overlap check.
2. **Handles/moderation:** M2 takes the handle from OAuth (username, or first name and last initial). Should M3 let people edit it? Do we need a profanity filter?
3. **Anti-abuse:** multiple OAuth accounts per person can farm the all-time board. Accept this for v1? Supabase also recommends CAPTCHA on anonymous sign-ins; that needs a widget in the Roll flow.
4. **2027:** `LAST_YEAR` is 2026. When 2026 ends, its last ranking list becomes the year-end list. Adding 2027 means raising `LAST_YEAR` and pointing the live fetch at the new season's files.
