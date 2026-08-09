import type {
  ExchangeResponse,
  HealthResponse,
  IncomingTransaction,
  LinkTokenResponse,
  PlaidEnvironment,
  SyncResponse,
} from '../../src/types/bank';

/*
 * The connector: the only part of Finance Manager that runs on a server.
 *
 * It exists because Plaid cannot be called from a browser — every request is
 * signed with a client_id/secret pair, the API sends no CORS headers, and the
 * per-bank access token is not allowed near client code. So this Worker holds
 * those three things and hands the browser back nothing but transactions.
 *
 * It is deliberately dependency-free. Bank credentials pass through here, and a
 * file you can read top to bottom in one sitting is worth more than the
 * convenience of the Plaid SDK.
 */

export interface Env {
  /** Holds one Plaid access token per linked item. Never leaves this Worker. */
  BANK_KV: KVNamespace;
  PLAID_CLIENT_ID: string;
  PLAID_SECRET: string;
  /** Shared with the app, which sends it as a bearer token on every request. */
  APP_TOKEN: string;
  PLAID_ENV: PlaidEnvironment;
  /** Exact origin of your deployed app. Not a wildcard — see cors() below. */
  ALLOWED_ORIGIN: string;
}

const PLAID_HOSTS: Record<PlaidEnvironment, string> = {
  sandbox: 'https://sandbox.plaid.com',
  production: 'https://production.plaid.com',
};

const KV_PREFIX = 'item:';

interface StoredItem {
  readonly accessToken: string;
  readonly institutionName: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(env) });
    }

    if (!isAuthorized(request, env)) {
      // Without this the Worker's URL alone would serve someone's bank
      // transactions to anyone who found it.
      return json({ error: 'Unauthorized' }, 401, env);
    }

    try {
      return await route(request, url, env);
    } catch (error) {
      // Plaid errors carry institution detail; log it for the operator, and
      // return only what the app needs to show.
      console.error('connector error', error);
      const message = error instanceof Error ? error.message : 'Connector failed';
      return json({ error: message }, 502, env);
    }
  },
};

async function route(request: Request, url: URL, env: Env): Promise<Response> {
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'GET' && path === '/health') {
    const body: HealthResponse = { ok: true, env: env.PLAID_ENV };
    return json(body, 200, env);
  }

  if (request.method === 'POST' && path === '/link/token') {
    const { redirectUri } = await readJson<{ redirectUri?: string }>(request);
    // Banks that use OAuth send the browser away and back again, and Plaid will
    // only return it to an address registered in your dashboard. Pinning it to
    // ALLOWED_ORIGIN means this Worker can't be talked into minting a token
    // that lands someone on a site you don't control.
    if (redirectUri && !redirectUri.startsWith(`${env.ALLOWED_ORIGIN}/`)) {
      return json({ error: 'redirectUri must be on the allowed origin' }, 400, env);
    }
    return json(await createLinkToken(env, redirectUri ?? null), 200, env);
  }

  if (request.method === 'POST' && path === '/link/exchange') {
    const { publicToken } = await readJson<{ publicToken?: string }>(request);
    if (!publicToken) return json({ error: 'publicToken is required' }, 400, env);
    return json(await exchange(publicToken, env), 200, env);
  }

  if (request.method === 'POST' && path === '/sync') {
    const { itemId, cursor } = await readJson<{ itemId?: string; cursor?: string | null }>(
      request,
    );
    if (!itemId) return json({ error: 'itemId is required' }, 400, env);
    return json(await sync(itemId, cursor ?? null, env), 200, env);
  }

  if (request.method === 'DELETE' && path.startsWith('/item/')) {
    const itemId = decodeURIComponent(path.slice('/item/'.length));
    if (!itemId) return json({ error: 'itemId is required' }, 400, env);
    await removeItem(itemId, env);
    return json({ ok: true }, 200, env);
  }

  return json({ error: 'Not found' }, 404, env);
}

/* -------------------------------------------------------------------------- */
/* Plaid                                                                       */
/* -------------------------------------------------------------------------- */

async function plaid<T>(env: Env, path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${PLAID_HOSTS[env.PLAID_ENV]}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.PLAID_CLIENT_ID,
      secret: env.PLAID_SECRET,
      ...body,
    }),
  });

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const detail =
      typeof payload.error_message === 'string' ? payload.error_message : response.statusText;
    throw new Error(`Plaid ${path}: ${detail}`);
  }
  return payload as T;
}

async function createLinkToken(
  env: Env,
  redirectUri: string | null,
): Promise<LinkTokenResponse> {
  // One connector serves one person, so the Plaid user id is a constant rather
  // than an account system this app deliberately doesn't have.
  const result = await plaid<{ link_token: string }>(env, '/link/token/create', {
    user: { client_user_id: 'finance-manager' },
    client_name: 'Finance Manager',
    products: ['transactions'],
    country_codes: ['US'],
    language: 'en',
    // Sent only when the app asked for it. Plaid rejects a redirect_uri that
    // isn't registered, so an unregistered one must not break the far more
    // common non-OAuth flow.
    ...(redirectUri ? { redirect_uri: redirectUri } : {}),
  });

  return { linkToken: result.link_token };
}

async function exchange(publicToken: string, env: Env): Promise<ExchangeResponse> {
  const exchanged = await plaid<{ access_token: string; item_id: string }>(
    env,
    '/item/public_token/exchange',
    { public_token: publicToken },
  );

  const institutionName = await lookupInstitutionName(exchanged.access_token, env);

  const stored: StoredItem = {
    accessToken: exchanged.access_token,
    institutionName,
  };
  await env.BANK_KV.put(KV_PREFIX + exchanged.item_id, JSON.stringify(stored));

  // Note what is *not* here: the access token stays in KV.
  return { itemId: exchanged.item_id, institutionName };
}

async function lookupInstitutionName(accessToken: string, env: Env): Promise<string> {
  try {
    const item = await plaid<{ item: { institution_id?: string } }>(env, '/item/get', {
      access_token: accessToken,
    });
    if (!item.item.institution_id) return 'Your bank';

    const institution = await plaid<{ institution: { name: string } }>(
      env,
      '/institutions/get_by_id',
      { institution_id: item.item.institution_id, country_codes: ['US'] },
    );
    return institution.institution.name;
  } catch {
    // A missing display name is not worth failing a successful link over.
    return 'Your bank';
  }
}

interface PlaidTransaction {
  transaction_id: string;
  pending_transaction_id: string | null;
  name: string;
  merchant_name: string | null;
  amount: number;
  date: string;
  pending: boolean;
}

async function sync(itemId: string, cursor: string | null, env: Env): Promise<SyncResponse> {
  const item = await loadItem(itemId, env);

  const result = await plaid<{
    added: PlaidTransaction[];
    modified: PlaidTransaction[];
    removed: { transaction_id: string }[];
    next_cursor: string;
    has_more: boolean;
  }>(env, '/transactions/sync', {
    access_token: item.accessToken,
    ...(cursor ? { cursor } : {}),
  });

  return {
    added: result.added.map(normalize),
    modified: result.modified.map(normalize),
    removed: result.removed.map((entry) => entry.transaction_id),
    nextCursor: result.next_cursor,
    hasMore: result.has_more,
  };
}

/** Narrows Plaid's transaction to the fields the app actually uses. */
function normalize(transaction: PlaidTransaction): IncomingTransaction {
  return {
    externalId: transaction.transaction_id,
    pendingExternalId: transaction.pending_transaction_id,
    // merchant_name is the cleaned-up brand; name is the raw statement line,
    // which is all some institutions provide.
    merchant: transaction.merchant_name ?? transaction.name,
    amount: transaction.amount,
    date: transaction.date,
    pending: transaction.pending,
  };
}

async function removeItem(itemId: string, env: Env): Promise<void> {
  const item = await loadItem(itemId, env);
  try {
    await plaid(env, '/item/remove', { access_token: item.accessToken });
  } finally {
    // Drop the token even if Plaid's side fails, so disconnecting always means
    // this Worker can no longer reach the bank.
    await env.BANK_KV.delete(KV_PREFIX + itemId);
  }
}

async function loadItem(itemId: string, env: Env): Promise<StoredItem> {
  const raw = await env.BANK_KV.get(KV_PREFIX + itemId);
  if (!raw) throw new Error('That bank connection is no longer linked to this connector.');
  return JSON.parse(raw) as StoredItem;
}

/* -------------------------------------------------------------------------- */
/* Request plumbing                                                            */
/* -------------------------------------------------------------------------- */

function isAuthorized(request: Request, env: Env): boolean {
  const header = request.headers.get('Authorization') ?? '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;
  return timingSafeEqual(header.slice(prefix.length), env.APP_TOKEN);
}

/**
 * Compares without leaking the answer through how long it took, so the token
 * can't be recovered one character at a time.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * One exact origin, never `*`.
 *
 * The app sends a bearer token, so a permissive origin would let any page on
 * the internet drive this connector from a visitor's browser.
 */
function cors(env: Env): HeadersInit {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(env) },
  });
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}
