# The connector

A single Cloudflare Worker that stands between Finance Manager and Plaid.

## Why this exists

Plaid can't be called from a browser. Every request is signed with a
`client_id`/`secret` pair, the API returns no CORS headers, and the access token
Plaid issues for your bank is explicitly not allowed near client code. A
`VITE_` variable wouldn't help — those are compiled into the JavaScript bundle
and anyone can read them.

So the secrets live here instead, on infrastructure you own. The app talks only
to this Worker; this Worker talks to Plaid. Nothing goes to anyone else.

## What it holds

| Value | Where it lives | Does the browser ever see it? |
| --- | --- | --- |
| Plaid `client_id` / `secret` | Worker secrets | No |
| Plaid `access_token` (one per bank) | Worker KV | **No** — this is the important one |
| `APP_TOKEN` | Worker secret, and your app's Settings | Yes, it's the app's password to this Worker |
| Your transactions | Passed through, never stored | Yes, that's the point |

Nothing is logged except error messages, and nothing persists but the access
tokens in KV.

## Deploying it

You need a [Plaid account](https://dashboard.plaid.com/signup) — sandbox keys
are free and issued immediately — and a Cloudflare account. The free tier covers
this comfortably.

There are two routes. The first needs nothing installed on your machine.

### With GitHub Actions (recommended)

`.github/workflows/deploy-connector.yml` deploys this Worker on every push to
`main` that touches `server/`, and can be run by hand from the **Actions** tab.
It creates the KV namespace if it doesn't exist, uploads the secrets, and sets
`ALLOWED_ORIGIN` for you.

Add five **repository secrets** under Settings → Secrets and variables → Actions:

| Secret | Where it comes from |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens. Needs **Workers Scripts: Edit** and **Workers KV Storage: Edit** on your account. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages, in the right-hand sidebar |
| `PLAID_CLIENT_ID` | Plaid dashboard → Team Settings → Keys |
| `PLAID_SECRET` | Same page — the **sandbox** secret to begin with |
| `APP_TOKEN` | Invent one: `openssl rand -hex 32` |

Two optional **repository variables** (same page, "Variables" tab) if the
defaults don't suit:

| Variable | Default |
| --- | --- |
| `PAGES_ORIGIN` | `https://<your-username>.github.io` — set this if the app is on a custom domain |
| `PLAID_ENV` | `sandbox` — set to `production` once Plaid has approved you |

Then run **Actions → Deploy connector → Run workflow**. The run summary prints
the Worker URL to paste into the app.

Set all five or none: a repository with none of them skips the deploy and stays
green, because bank syncing is opt-in. A repository with *some* of them fails
loudly, because a Worker missing one fails at request time instead, which is a
much worse place to find out.

### By hand

```bash
cd server
npm install

# 1. Create the KV namespace and paste the printed id into wrangler.toml.
npx wrangler kv namespace create BANK_KV

# 2. Set ALLOWED_ORIGIN in wrangler.toml to your app's exact origin,
#    e.g. https://your-username.github.io  (no trailing slash, no wildcard).

# 3. Store the secrets. These never touch wrangler.toml.
npx wrangler secret put PLAID_CLIENT_ID
npx wrangler secret put PLAID_SECRET
npx wrangler secret put APP_TOKEN     # invent a long random string

# 4. Ship it.
npx wrangler deploy
```

### Either way

Generate an `APP_TOKEN` with something like `openssl rand -hex 32`. Without it
the Worker's URL alone would hand your bank transactions to anyone who found it,
so it is not optional — the Worker rejects every request that doesn't carry it.

Then open the app, go to **Settings → Bank syncing**, and paste in the Worker URL
plus the same `APP_TOKEN`.

## Trying it locally first

```bash
cd server
cp .dev.vars.example .dev.vars   # then fill in your sandbox values
npx wrangler dev                 # serves on http://localhost:8787
```

Set `ALLOWED_ORIGIN = "http://localhost:5173"` in `wrangler.toml` while you do
this, run `npm run dev` in the repo root, and point Settings at
`http://localhost:8787`.

In sandbox, Plaid's Link dialog accepts any institution with the username
`user_good` and password `pass_good`, and returns a couple of years of
plausible-looking fake transactions.

## Going to production

Get production access approved in the Plaid dashboard, then replace the
`PLAID_SECRET` with the production one and switch the environment:

- **Via Actions:** update the `PLAID_SECRET` repository secret, set the
  `PLAID_ENV` repository variable to `production`, and re-run the workflow.
- **By hand:** `npx wrangler secret put PLAID_SECRET`, change `PLAID_ENV` to
  `"production"` in `wrangler.toml`, and redeploy.

Nothing in the code changes.

## The API

Every route requires `Authorization: Bearer <APP_TOKEN>`.

| Route | Does |
| --- | --- |
| `GET /health` | `{ ok, env }` — lets Settings check the URL and token before opening Link |
| `POST /link/token` | Creates a Plaid Link token |
| `POST /link/exchange` | Trades a public token for an access token, stores it, returns the item id and bank name |
| `POST /sync` | Incremental `/transactions/sync` from a cursor |
| `DELETE /item/:itemId` | Unlinks at Plaid and deletes the stored token |

Responses are narrowed to the handful of fields the app uses, so raw institution
data never reaches the browser and a change on Plaid's side is absorbed in
`src/index.ts` alone.
