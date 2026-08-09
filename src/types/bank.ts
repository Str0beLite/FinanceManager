/*
 * Bank syncing types.
 *
 * The first half is the contract with the connector — the Cloudflare Worker in
 * `server/`, which imports these same types, so the two halves cannot drift
 * apart. The second half is what this app stores about the connection.
 */

export type PlaidEnvironment = 'sandbox' | 'production';

/**
 * One bank transaction as the connector hands it over.
 *
 * Deliberately not Plaid's own shape: the Worker narrows it to the handful of
 * fields this app uses, so raw institution data never reaches the browser and
 * a change on Plaid's side is absorbed in one file.
 */
export interface IncomingTransaction {
  readonly externalId: string;
  /** Set when this posted charge supersedes an earlier pending one. */
  readonly pendingExternalId: string | null;
  readonly merchant: string;
  /**
   * Major units — dollars, not cents — and positive when money *left* the
   * account. That is Plaid's convention and it is preserved here rather than
   * reinterpreted, so the sign rule lives in exactly one place (`classifyIncoming`).
   */
  readonly amount: number;
  /** `YYYY-MM-DD`. */
  readonly date: string;
  readonly pending: boolean;
}

export interface HealthResponse {
  readonly ok: true;
  readonly env: PlaidEnvironment;
}

export interface LinkTokenResponse {
  readonly linkToken: string;
}

export interface ExchangeResponse {
  readonly itemId: string;
  readonly institutionName: string;
}

export interface SyncResponse {
  readonly added: readonly IncomingTransaction[];
  readonly modified: readonly IncomingTransaction[];
  /** External ids the bank has retracted since the cursor. */
  readonly removed: readonly string[];
  readonly nextCursor: string;
  readonly hasMore: boolean;
}

/** Every connector error arrives in this shape, whatever the status code. */
export interface ConnectorError {
  readonly error: string;
}

/* ------------------------------------------------------------------------- */

/** One linked bank, as this app remembers it. */
export interface BankConnection {
  /** Plaid's item id. The access token itself never reaches this app. */
  readonly id: string;
  readonly institutionName: string;
  readonly connectedAt: string;
  /**
   * `YYYY-MM-DD`. Charges dated before this are dropped on arrival.
   *
   * Banks hand over months of history on the first sync, and a budget you have
   * been keeping by hand already accounts for that spending. Importing it would
   * double-count what you typed in and bury the review inbox under months of
   * charges filed against books that are already closed.
   */
  readonly importFrom: string;
  /** Plaid's sync cursor, so each sync only asks for what is new. */
  readonly cursor: string | null;
  readonly lastSyncedAt: string | null;
}

/** "Anything from this merchant is groceries." */
export interface BankRule {
  readonly id: string;
  /** Lowercased substring, matched against the normalised merchant name. */
  readonly match: string;
  readonly categoryId: string;
}

/**
 * Why a transaction is waiting instead of being filed.
 *
 * `closed-month` matters more than it looks: a closed month renders from a
 * frozen snapshot, so a transaction written into one would never appear
 * anywhere. It waits here instead of vanishing.
 */
export type InboxReason = 'unmatched' | 'closed-month';

/** A bank transaction waiting for a category. */
export interface PendingImport {
  readonly id: string;
  readonly externalId: string;
  readonly connectionId: string;
  readonly merchant: string;
  readonly amountCents: number;
  readonly date: string;
  readonly pending: boolean;
  readonly reason: InboxReason;
}

export type PendingImportDraft = Omit<PendingImport, 'id'>;

export interface BankState {
  /** Base URL of the user's own connector. Empty means bank syncing is off. */
  readonly connectorUrl: string;
  /** Bearer token shared with that connector. Never included in a backup. */
  readonly connectorToken: string;
  readonly connections: readonly BankConnection[];
  readonly rules: readonly BankRule[];
  readonly inbox: readonly PendingImport[];
}
