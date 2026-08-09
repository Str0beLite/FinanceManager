import type {
  ExchangeResponse,
  HealthResponse,
  IncomingTransaction,
  LinkTokenResponse,
  SyncResponse,
} from '@/types';

/**
 * The only place this app talks to a network.
 *
 * Everything goes to the user's own connector (see `server/`), never to Plaid
 * directly and never to anywhere else. With no connector configured, nothing in
 * here is ever called.
 */

export interface ConnectorConfig {
  readonly url: string;
  readonly token: string;
}

export type ConnectorResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Guards against a connector that keeps claiming there is more to fetch. */
const MAX_SYNC_PAGES = 50;

async function call<T>(
  config: ConnectorConfig,
  path: string,
  init: RequestInit = {},
): Promise<ConnectorResult<T>> {
  const base = config.url.trim().replace(/\/+$/, '');
  if (!base) return { ok: false, error: 'No connector URL is set.' };

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`,
        ...init.headers,
      },
    });
  } catch {
    // fetch only rejects on a transport failure, which here means a wrong URL,
    // a connector that was never deployed, or a CORS origin mismatch.
    return {
      ok: false,
      error: 'Could not reach the connector. Check the URL, and that it allows this site.',
    };
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      return { ok: false, error: 'The connector rejected that token.' };
    }
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `The connector returned ${response.status}.`;
    return { ok: false, error: message };
  }

  return { ok: true, data: payload as T };
}

export function checkConnector(config: ConnectorConfig) {
  return call<HealthResponse>(config, '/health', { method: 'GET' });
}

export function createLinkToken(config: ConnectorConfig) {
  return call<LinkTokenResponse>(config, '/link/token', { method: 'POST' });
}

export function exchangePublicToken(config: ConnectorConfig, publicToken: string) {
  return call<ExchangeResponse>(config, '/link/exchange', {
    method: 'POST',
    body: JSON.stringify({ publicToken }),
  });
}

export function disconnectItem(config: ConnectorConfig, itemId: string) {
  return call<{ ok: true }>(config, `/item/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  });
}

export interface SyncPage {
  readonly incoming: readonly IncomingTransaction[];
  readonly removed: readonly string[];
  readonly nextCursor: string;
}

/**
 * Walks Plaid's paginated sync to the end and returns it as one batch.
 *
 * The cursor only advances once the whole batch is applied, so a failure
 * halfway through means the next sync re-fetches rather than skips — and
 * `classifyIncoming` treats the repeats as the duplicates they are.
 */
export async function syncAll(
  config: ConnectorConfig,
  itemId: string,
  cursor: string | null,
): Promise<ConnectorResult<SyncPage>> {
  const incoming: IncomingTransaction[] = [];
  const removed: string[] = [];
  let nextCursor = cursor ?? '';

  for (let page = 0; page < MAX_SYNC_PAGES; page += 1) {
    const result = await call<SyncResponse>(config, '/sync', {
      method: 'POST',
      body: JSON.stringify({ itemId, cursor: nextCursor || null }),
    });
    if (!result.ok) return result;

    incoming.push(...result.data.added, ...result.data.modified);
    removed.push(...result.data.removed);
    nextCursor = result.data.nextCursor;

    if (!result.data.hasMore) break;
  }

  return { ok: true, data: { incoming, removed, nextCursor } };
}
