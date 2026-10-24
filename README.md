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
npm run dev          # http://localhost:3000 (daily roll) and /dev/roll (unlimited)
npm test             # unit + data regression tests
npm run balance      # regenerate docs/balance-report.md after badge changes
```

The built season data (`data/seasons/`) is committed, so the app runs without
the raw CSVs. To rebuild it from source:

```bash
npm run data:fetch   # sparse clone of the source CSVs into data/raw/
npm run data:build   # writes data/seasons/*.json
```

## Supabase (daily roll and accounts)

The daily roll, guests and sign-in need a Supabase project. `/dev/roll` works
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

## Data

ATP match and ranking data was collected and compiled by Jeff Sackmann
(originally `github.com/JeffSackmann/tennis_atp`, now preserved at
[Aneeshers/tennis-sackmann-archive](https://github.com/Aneeshers/tennis-sackmann-archive)).
It's licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/),
and so is the derived data in `data/seasons/`. Acedle is a non-commercial fan
project and isn't affiliated with the ATP Tour.
