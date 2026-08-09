import { SCHEMA_VERSION, STORAGE_KEY } from '@/config/constants';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '@/config/currency';
import type { AppState, BankConnection, BankState } from '@/types';
import { monthKeyOf } from './dates';

export function createEmptyBankState(): BankState {
  return {
    connectorUrl: '',
    connectorToken: '',
    connections: [],
    rules: [],
    inbox: [],
  };
}

export function createEmptyState(): AppState {
  return {
    version: SCHEMA_VERSION,
    categories: [],
    subscriptions: [],
    transactions: [],
    incomes: [],
    months: {},
    rolloverPoolCents: 0,
    settings: {
      defaultPaycheckCents: 0,
      currency: DEFAULT_CURRENCY,
      locale: DEFAULT_LOCALE,
      theme: 'system',
    },
    bank: createEmptyBankState(),
  };
}

/**
 * Brings an older save up to the current schema. Each future version adds one
 * step here; `parseState` runs it before the shape is trusted.
 */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  const state = { ...raw };

  // v2 added the `bank` section. A v1 save simply doesn't have one, which reads
  // as "bank syncing was never set up" — exactly what the empty default below
  // means — so there is no data to move, only a version to bump. New steps go
  // here:  if ((state.version ?? 0) < 3) { ...; state.version = 3; }

  state.version = SCHEMA_VERSION;
  return state;
}

/**
 * Rebuilds a valid AppState from unknown JSON. Anything missing or malformed
 * falls back to the empty-state default rather than throwing, so a partially
 * corrupt save still opens instead of bricking the app.
 */
export function parseState(input: unknown): AppState {
  if (typeof input !== 'object' || input === null) return createEmptyState();

  const raw = migrate(input as Record<string, unknown>);
  const fallback = createEmptyState();
  const settings = isRecord(raw.settings) ? raw.settings : {};

  return {
    version: SCHEMA_VERSION,
    categories: asArray(raw.categories),
    subscriptions: asArray(raw.subscriptions),
    transactions: asArray(raw.transactions),
    incomes: asArray(raw.incomes),
    months: isRecord(raw.months) ? (raw.months as AppState['months']) : fallback.months,
    rolloverPoolCents: asNumber(raw.rolloverPoolCents, 0),
    settings: {
      defaultPaycheckCents: asNumber(
        settings.defaultPaycheckCents,
        fallback.settings.defaultPaycheckCents,
      ),
      currency: asString(settings.currency, fallback.settings.currency),
      locale: asString(settings.locale, fallback.settings.locale),
      theme:
        settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'system'
          ? settings.theme
          : fallback.settings.theme,
    },
    bank: parseBank(raw.bank),
  };
}

function parseBank(input: unknown): AppState['bank'] {
  if (!isRecord(input)) return createEmptyBankState();
  const fallback = createEmptyBankState();

  return {
    connectorUrl: asString(input.connectorUrl, fallback.connectorUrl),
    connectorToken: asString(input.connectorToken, fallback.connectorToken),
    connections: asArray<BankConnection>(input.connections).map(parseConnection),
    rules: asArray(input.rules),
    inbox: asArray(input.inbox),
  };
}

/**
 * A connection saved before `importFrom` existed keeps its behaviour: it was
 * already syncing, so its history has either arrived or been dealt with, and
 * imposing a cutoff now would silently drop charges it would have taken
 * yesterday. The month it was connected in is the honest default.
 */
function parseConnection(connection: BankConnection): BankConnection {
  if (connection.importFrom) return connection;
  const connectedAt = connection.connectedAt ?? '';
  const monthKey = connectedAt.length >= 7 ? connectedAt.slice(0, 7) : monthKeyOf();
  return { ...connection, importFrom: `${monthKey}-01` };
}

export function loadState(storage: Storage = localStorage): AppState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    return parseState(JSON.parse(raw));
  } catch {
    // A corrupt or unreadable save should not stop the app from opening.
    return createEmptyState();
  }
}

export function saveState(state: AppState, storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private-browsing modes and full quotas both throw here; the in-memory
    // session keeps working, it just won't survive a reload.
  }
}

export function clearState(storage: Storage = localStorage): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing useful to do — the caller resets in-memory state either way.
  }
}

/**
 * Strips the connector token out of a state about to leave the browser.
 *
 * A backup is a file people email to themselves and drop in cloud storage, and
 * that token is a bearer credential for their bank transactions — it must not
 * ride along in one. The connector URL is harmless on its own, since the
 * connector rejects any request without the token, and re-entering it after a
 * restore is a single paste.
 */
export function redactForExport(state: AppState): AppState {
  return { ...state, bank: { ...state.bank, connectorToken: '' } };
}

/** Serialises for export, so redaction is not something a caller can forget. */
export function serializeState(state: AppState): string {
  return JSON.stringify(redactForExport(state), null, 2);
}

export interface ImportResult {
  readonly ok: boolean;
  readonly state?: AppState;
  readonly error?: string;
}

export function deserializeState(json: string): ImportResult {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed) || !('categories' in parsed)) {
      return { ok: false, error: "That file doesn't look like a Finance Manager backup." };
    }
    return { ok: true, state: parseState(parsed) };
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}
