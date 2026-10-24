# Acedle

A daily tennis roll game inspired by RNGdle. Roll a random season (1990–2026)
and a random year-end top-100 player from it. Their real stats earn badges,
and the badges add up to your score: around 50k for a typical roll, and up to
~100 million for an all-time great season.

See [SPEC.md](./SPEC.md) for the product and technical spec, and
[docs/balance-report.md](./docs/balance-report.md) for the current score
distribution.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000 (daily roll) and /sandbox (unlimited)
npm test             # unit + data regression tests
npm run balance      # regenerate docs/balance-report.md after badge changes
```

The built season data (`data/seasons/`) is committed, so the app runs without
the raw CSVs. To rebuild it from source:

```bash
npm run data:fetch   # sparse clone of the source CSVs into data/raw/, plus the live season
npm run data:build   # writes data/seasons/*.json
```

The 2026 season is live: a GitHub Actions workflow
(`.github/workflows/refresh-data.yml`) runs those two commands every day and
commits the result, and the push redeploys the app. See "Live season" in
SPEC.md for how the sources are merged.

## Supabase (daily roll and accounts)

The daily roll, guests and sign-in need a Supabase project. `/sandbox` works
without one.

1. Copy `.env.example` to `.env.local` and fill in the project URL and keys.
2. Apply the schema in `supabase/migrations/`, oldest file first. Either paste
   each file into the dashboard's SQL Editor and run it, or use the CLI (stick
   to one of the two, since the CLI keeps its own record of applied migrations):
   ```bash
   npx supabase db push --db-url "$SUPABASE_DB_URL"
   ```
3. Load the player data (safe to re-run, e.g. after `npm run data:build`):
   ```bash
   npm run db:seed
   ```
4. In **Authentication → Sign In / Providers**, turn on **anonymous sign-ins**
   (guest play), and enable Google, Discord and/or GitHub with each provider's
   client ID and secret. The app only offers the providers that are enabled.
5. In **Authentication → URL Configuration**, set the Site URL and add
   `http://localhost:3000/auth/callback` (and the production
   `https://<domain>/auth/callback`) to the redirect URLs.

## Deploying (Vercel)

1. **Production branch.** Vercel deploys the repository's default branch, and
   GitHub only runs scheduled workflows there. Make the branch with the latest
   code the default (or merge it into `main` and make that the default).
2. **Import the project.** In Vercel, go to Add New → Project and import the
   repository. The framework (Next.js) is detected automatically. Add these
   environment variables for Production and Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (the `sb_secret_…` key)
   - `NEXT_PUBLIC_SITE_URL` (optional): your custom domain, for link previews

   Then deploy.
3. **Supabase URLs.** In Authentication → URL Configuration, set the Site URL
   to the production URL and add `https://<domain>/auth/callback` to the
   redirect URLs. Add `https://*-<team>.vercel.app/auth/callback` too if you
   want sign-in on preview deployments.
4. **Guest cleanup.** Apply `supabase/migrations/20261025000000_guest_cleanup.sql`
   if you haven't already. Integrations → Cron should then list
   `acedle-delete-stale-guests`.
5. **Daily refresh.** On GitHub, under Settings → Secrets and variables →
   Actions, add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` so the
   workflow can reseed Supabase. These are optional: rolls add missing players
   by themselves. Then run "Refresh live data" once from the Actions tab.

## Data

ATP match and ranking data was collected and compiled by Jeff Sackmann
(originally `github.com/JeffSackmann/tennis_atp`, now preserved at
[Aneeshers/tennis-sackmann-archive](https://github.com/Aneeshers/tennis-sackmann-archive)).
It's licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/),
and so is the derived data in `data/seasons/`. The live 2026 season adds
results from [Tennis My Life](https://stats.tennismylife.org/tennis-match-database)
and the current ranking list from [Tennis Abstract](https://www.tennisabstract.com/reports/atpRankings.html).
Acedle is a non-commercial fan project and isn't affiliated with the ATP Tour.

The link preview images (`opengraph-image.tsx` files, styled in `src/lib/og.tsx`)
use Barlow Condensed from `assets/fonts/`, under the SIL Open Font License
(`assets/fonts/OFL.txt`).
