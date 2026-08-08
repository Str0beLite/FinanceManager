# Finance Manager

A per-month budgeting app. You set a monthly paycheck, split it across categories,
track subscriptions and one-off spending, then close the month — anything unspent
becomes savings, anything overspent is taken out of next month's budget.

Everything is stored in your browser. No account, no server, no data leaving your machine.

## How the money works

**Allocation.** Each category is funded one of two ways:

- **Fixed amount** — an exact figure taken off the top of your income (rent, insurance).
- **Percentage** — a share of whatever is left after the fixed categories are paid.

So a $3,000 paycheck with $1,400 fixed rent leaves $1,600, and a 60% groceries
category gets $960 of it. Percentages should add up to 100%; the app tells you when
they don't.

**Subscriptions** are committed in full on day one of each month they bill, so
"left to spend" never hides a charge that lands on the 28th. They support monthly,
quarterly and yearly cycles — the first billing month also sets the cycle, so a
quarterly starting in February bills Feb, May, Aug, Nov.

**Closing a month** compares everything budgeted against everything spent:

- Came in **under**? The surplus is added to your **rollover pool**.
- Came in **over**? That amount is deducted from next month's budget. The pool is
  left alone — savings only shrink if you deliberately spend them, via the
  "Pay from savings" button on the deficit banner.

**Hard-set categories.** A deficit is spread across your flexible categories in
proportion to their size. Categories marked **hard set** are skipped entirely and
always cost exactly the same. Rent doesn't get cheaper because you overspent on
dining last month.

If the flexible categories can't absorb the whole deficit — they all hit zero — the
remainder carries into the month after rather than disappearing.

Closed months are frozen: their numbers are snapshotted, so editing a category later
never rewrites history. You can reopen the most recently closed month to correct it.

## Running it locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the budget-engine test suite |
| `npm run build` | Type-checks and builds to `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run typecheck` | Types only, no build |

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
After that the app is live at `https://<your-username>.github.io/FinanceManager/`.

The Vite `base` is set to `/FinanceManager/`. If you rename the repository, update it
in `vite.config.ts` to match.

## On a phone

The layout is mobile-first and the phone build is the one that got tuned:

- Navigation is a fixed bottom tab bar in thumb reach, with all six sections
  visible at once. It becomes a header nav from the `sm` breakpoint up.
- Each list screen has a floating action button for its primary action.
- Tables re-lay-out as cards below `sm`, built from the same column definitions
  rather than a second hand-written layout.
- Dialogs are bottom sheets on a phone and centred dialogs on a desktop.
- Inputs render at 16px on mobile, which is what stops iOS zooming the viewport
  when you focus a field.
- Safe-area insets are respected, so nothing hides under a notch or home
  indicator, and every tap target is at least 40px tall.

Add it to your home screen and it opens like an app.

## Backups

Your data lives in this browser's `localStorage` under one key. Clearing site data
deletes it. **Settings → Your data → Export backup** downloads a JSON file you can
re-import later, or on another machine.

## Project layout

```
src/
  config/       Constants, cadences, currencies, colour palette
  types/        One file per domain concept
  lib/          Pure engine — money, dates, budget, subscriptions, storage
  store/        Reducer split into per-domain slices
  hooks/        The bridge between store and UI
  components/   Reusable primitives (ui/) and the SVG donut (charts/)
  features/     One folder per screen, each self-contained
  app/          Shell, layout, and the nav array that drives routing
tests/          Vitest suite for the engine
```

Two rules keep it easy to change:

1. **`src/lib` is pure.** No React, no storage, no globals — just functions over
   plain data. Every money rule is testable in isolation, which is why the rollover
   logic has tests covering hard-set protection, unabsorbable deficits and
   cent-exact rounding.
2. **`computeMonth()` is the only place money is calculated.** Components render
   what it returns; none of them do arithmetic of their own.

Adding a screen means adding a folder under `features/` and one entry in
`src/app/navigation.ts` — that array drives both the nav bar and which page renders.
