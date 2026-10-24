# Acedle — Product & Technical Spec

> A daily tennis roll game inspired by RNGdle. Once per day you roll a random
> season (1990–2026), then a random top-100 player from that season. That
> player-season's real stats earn badges, and the badges add up to your score.

Status: **v0.2**. Milestone 1 (data + scoring engine) is built. Badge values
are tuned against the real data, and `docs/balance-report.md` shows the
current numbers.

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
| Data | Jeff Sackmann's ATP data (CC BY-NC-SA 4.0), via an archive mirror. Non-commercial hobby project |
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

**Guests:** use Supabase **anonymous sign-in**. A guest has a real (anonymous)
user row, so one roll per day is enforced the same way for guests and accounts.
Linking an OAuth identity upgrades the same user in place, so today's roll and
history carry over. Only linked (non-anonymous) accounts appear on leaderboards,
because clearing cookies would give a guest a fresh roll.

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
| All rolls | ~49k | ~436k | ~7.4M | ~103M |

| Final rank | median score |
|---|---|
| #1 | ~14.6M |
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
- Ranking badges read "currently" instead of "year-end".
- Each stored roll keeps its own stats snapshot, so its score is frozen at roll time.

---

## 5. Sandbox mode

- Unlimited rolls, labeled **SANDBOX** everywhere. Never saved to profile or leaderboards.
- **Luck slider** 1×–10×. Year stays uniform. Each player's weight within the year is `1 / rank^k`, where `k` goes from 0 (uniform) at 1× to 1.5 at 10×.
- The prototype is `/dev/roll`.

---

## 6. Architecture

```
data/raw/            Sackmann CSVs (gitignored; npm run data:fetch)
data/seasons/        Generated player-seasons, one JSON per year (committed)
scripts/etl/         fetch.ts (sparse clone), build.ts (stats), parse.ts (+ tests)
scripts/balance.ts   Writes docs/balance-report.md
src/lib/data/        PlayerSeason types, year range, season loader
src/lib/scoring/     Pure scoring engine + badge definitions (+ tests)
src/lib/roll/        Roll logic: uniform odds, sandbox luck (+ tests)
src/app/             Next.js routes: /, /dev/roll, /api/dev/roll
```

### Commands

| Command | What it does |
|---|---|
| `npm run data:fetch` | Sparse-clone the source CSVs (~140 MB) |
| `npm run data:build` | Rebuild `data/seasons/*.json` (~10 s) |
| `npm run balance` | Regenerate the balance report |
| `npm test` / `npm run lint` / `npm run typecheck` | Checks |
| `npm run dev` | Local app; open `/dev/roll` |

### Data notes

- **Source:** the upstream `JeffSackmann/tennis_atp` repo was removed from GitHub in September 2026. We use the archive mirror `Aneeshers/tennis-sackmann-archive` (snapshot from June 2026; same CC BY-NC-SA license). Override it with `ACEDLE_DATA_REPO` or `ACEDLE_RAW_DIR`.
- **Event classification:**
  - Grand Slam Cup, Laver Cup and Next Gen Finals are excluded.
  - Davis Cup, ATP Cup, United Cup and the World Team Cup count toward W/L but not titles.
  - Olympics count as titles.
- **Tournament codes** are canonicalized (zero-padding and the 2016–2020 `M0xx` scheme) so title defenses line up across years.
- **Seasons** follow the match file's year. Early-January events that start in late December belong to the new season.
- **Ranking points:** when a year's final ranking list lacks points, the latest list with points is used.
- **Weeks at #1** count days between published lists, so gaps in the data and the 2020 freeze are handled.

### Data model (Postgres, M2)

- `players(id, name, country, hand, height_cm, birth_date)`
- `player_seasons(year, player_id, final_rank, stats jsonb, data_as_of)`, with primary key `(year, player_id)`
- `profiles(user_id, handle, avatar_url, created_at)`
- `rolls(id, user_id, day date, year, player_id, season_snapshot jsonb, badges jsonb, base, mult, score, scoring_version, created_at)`, with `UNIQUE(user_id, day)`
- `user_badges` (a view over `rolls.badges`) for the collection page
- Leaderboards are indexed queries on `rolls(day, score desc)`, `rolls(week, score desc)`, and the per-user sum of score

---

## 7. Milestones

**M1 — Data + scoring engine ✅**
- Next.js scaffold, Vitest, lint and typecheck
- ETL that produces 3,700 player-seasons, validated against well-known seasons
- Scoring engine, 55 badges, balance report, curve tuned to a ~100M top
- `/dev/roll` page plus `GET /api/dev/roll` (also `?year=&player=` to score a specific season)

**M2 — Daily roll + accounts** (next)
- Supabase project and schema
- Anonymous auth plus OAuth linking
- Server-side daily roll with one-per-day enforcement
- Guest → account claim

**M3 — Leaderboards + profile**
- Daily, weekly and all-time boards; roll history; badge collection; player-dex

**M4 — Fun layer**
- Reveal animation, share text plus OG image, `/sandbox` with luck slider

**M5 — Live 2026 + launch**
- A 2026 data source that updates past the June 2026 snapshot, scheduled refresh, deploy to Vercel, attribution page

---

## 8. Open items

1. **Live 2026 data:** the mirror stops at 8 June 2026 (rankings) and late May 2026 (matches). Keeping 2026 "live" needs a new source that permits non-commercial use. Otherwise 2026 stays frozen at the June snapshot.
2. **Handles/moderation:** are display names chosen freely or taken from OAuth? A profanity filter?
3. **Anti-abuse:** multiple OAuth accounts per person can farm the all-time board. Accept this for v1?
4. **Supabase:** needs a project (URL + anon key + service key) before M2 can be tested end to end.
