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

**Required one-time setup: Settings → Pages → Build and deployment → Source must be
"GitHub Actions", not "Deploy from a branch".** This is not optional, and getting it
wrong fails in a confusing way rather than an obvious one.

Branch deployment publishes the *repository* as-is. The `index.html` at the repo root
is Vite's development entry — it points at `/src/main.tsx`, which is TypeScript that no
browser can execute, at a path that doesn't exist on the deployed site. The result is a
page that loads and renders nothing at all.

Worse, the two can run at once: if Pages is set to a branch while this workflow is also
enabled, both publish on every push and whichever finishes last wins. A green checkmark
on the deploy workflow is therefore not proof the built app is live.

Two guards exist for this:

- The workflow verifies `dist/` before uploading — that `index.html` references the
  bundle rather than the TS source, that assets sit under the `/FinanceManager/` base
  path, and that every referenced file is actually in the artifact.
- `index.html` carries fallback content inside `#root`, which React replaces on mount.
  If the bundle never loads, the page explains why instead of showing a white screen.

Once the source is set correctly the app is live at
`https://<your-username>.github.io/FinanceManager/`.

### Beta channel

A `beta` branch is published alongside production, so you can try a change on the
real site before merging it:

| Branch | URL |
| --- | --- |
| `main` | `https://<your-username>.github.io/FinanceManager/` |
| `beta` | `https://<your-username>.github.io/FinanceManager/beta/` |

Create the branch once (`git switch -c beta && git push -u origin beta`) and push to
it whenever you want to test something. A push to *either* branch rebuilds both and
republishes the whole site — GitHub Pages serves a single artifact per repository, so
the workflow builds each branch and combines them, production at the root and beta in
a `beta/` subdirectory. Until the branch exists the workflow just publishes production.

**Beta has its own data.** Both channels share an origin, so they would otherwise share
one `localStorage` key and testing on beta would edit your real budget. Beta writes to
a separate key instead, which means it starts empty. To try something against realistic
numbers, export a backup from production (Settings → Your data) and import it into beta.

Beta is signposted so a test session is never mistaken for the real thing: an amber
banner across the top, a "Beta" badge next to the title, and a distinct name and colour
in its web app manifest, so an installed beta app is its own icon rather than a second
copy of the live one.

To promote a beta change, merge `beta` into `main` as normal.

The Vite `base` is set to `/FinanceManager/`. If you rename the repository, update it
in `vite.config.ts` to match — including the PWA manifest's `start_url` and `scope`
in the same file, or the installed app will open a 404.

## On a phone

This is a phone app first; the desktop layout is the adaptation.

**Install it.** Open the site on your phone and choose "Add to Home Screen"
(iOS Safari: Share → Add to Home Screen; Android Chrome: menu → Install app).
It launches full-screen with no browser chrome, its own icon, and its own entry
in the app switcher.

**It works offline.** A service worker precaches the whole app, and your data
was never on a server to begin with — so it opens and works on a plane, in a
lift, or with the signal off. When a new version ships, the app tells you and
offers a reload rather than silently sitting on the old build.

**It behaves like an app:**

- Bottom tab bar in thumb reach, all six sections visible at once. Becomes a
  header nav from the `sm` breakpoint up.
- **Swipe left and right on the dashboard to move between months.** Vertical
  drags are ignored, so scrolling never flips the month by accident, and the
  browser's own edge swipe-to-go-back is suppressed so it can't hijack the
  gesture.
- The dashboard leads with one number — what's left to spend — instead of four
  equal tiles, with the allocation split as a single stacked bar rather than a
  donut that would cost 170px of height.
- A floating action button on each list screen for its primary action.
- Tables become cards below `sm`, built from the same column definitions rather
  than a second hand-written layout.
- Dialogs are bottom sheets on a phone, centred dialogs on a desktop.
- Inputs render at 16px on mobile — below that, iOS zooms the viewport when you
  focus a field and leaves the page scrolled sideways.
- Safe-area insets for notch and home indicator, and every tap target is at
  least 40px tall.

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
