import { monthKeyOfIsoDate } from './dates';
import type {
  BankRule,
  IncomingTransaction,
  PendingImport,
  PendingImportDraft,
  Transaction,
  TransactionDraft,
} from '@/types';

/**
 * Turning bank data into budget entries.
 *
 * Everything here is pure, because these are the rules that decide whether a
 * month's numbers are right: a duplicate coffee, a refund counted as spending,
 * or a charge filed into a month that is already closed would all be wrong in
 * ways nobody would notice for weeks.
 */

/** How long after a sync the app stops bothering the connector on foreground. */
export const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Plaid sends major units as a float. 12.34 has no exact binary representation,
 * so scale first and round once — never truncate, which loses a cent per charge.
 */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function normalizeMerchant(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * The rule that files this merchant, or null.
 *
 * The longest match wins, so a specific `"amazon fresh"` rule beats a general
 * `"amazon"` one no matter which order they were created in.
 */
export function matchRule(
  rules: readonly BankRule[],
  merchant: string,
): BankRule | null {
  const haystack = normalizeMerchant(merchant);
  let best: BankRule | null = null;
  let bestLength = 0;

  for (const rule of rules) {
    const needle = normalizeMerchant(rule.match);
    if (!needle || !haystack.includes(needle)) continue;
    if (needle.length > bestLength) {
      best = rule;
      bestLength = needle.length;
    }
  }

  return best;
}

/** One category's share of a charge that was split across several. */
export interface SplitPart {
  readonly categoryId: string;
  readonly amountCents: number;
}

/**
 * `total` divided `count` ways, adding back to exactly `total`.
 *
 * The odd cents go to the earliest parts rather than being dropped: a $4.75
 * coffee split two ways is 238 and 237, never 237 and 237 with a cent missing
 * from the month.
 */
export function evenSplit(totalCents: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

/** Why a split cannot be filed yet. The wording is the UI's business, not this file's. */
export type SplitProblem =
  | { readonly kind: 'too-few' }
  | { readonly kind: 'missing-category' }
  | { readonly kind: 'non-positive' }
  | { readonly kind: 'duplicate-category' }
  | { readonly kind: 'unassigned'; readonly differenceCents: number };

/**
 * Checks a split before it becomes transactions, or `null` if it is sound.
 *
 * The last rule is the one that matters: the parts must add up to the charge
 * exactly. A split that is a cent short is a month that is a cent wrong, and
 * nobody would find it.
 */
export function validateSplit(
  totalCents: number,
  parts: readonly SplitPart[],
): SplitProblem | null {
  if (parts.length < 2) return { kind: 'too-few' };
  if (parts.some((part) => !part.categoryId)) return { kind: 'missing-category' };
  if (parts.some((part) => part.amountCents <= 0)) return { kind: 'non-positive' };

  const categories = new Set(parts.map((part) => part.categoryId));
  if (categories.size !== parts.length) return { kind: 'duplicate-category' };

  const assigned = parts.reduce((sum, part) => sum + part.amountCents, 0);
  if (assigned !== totalCents) {
    return { kind: 'unassigned', differenceCents: totalCents - assigned };
  }

  return null;
}

export interface TransactionUpdate {
  readonly id: string;
  readonly changes: Partial<TransactionDraft>;
}

export interface InboxUpdate {
  readonly id: string;
  readonly changes: Partial<PendingImportDraft>;
}

/** Everything one sync should change, worked out before any of it is applied. */
export interface IngestPlan {
  readonly added: readonly TransactionDraft[];
  readonly updated: readonly TransactionUpdate[];
  readonly inboxAdded: readonly PendingImportDraft[];
  readonly inboxUpdated: readonly InboxUpdate[];
  /** Refunds and deposits, which this app has nowhere to put. Reported, not hidden. */
  readonly skippedCredits: number;
  /** History from before the connection's `importFrom`. Also reported, not hidden. */
  readonly skippedOld: number;
  /**
   * Charges the bank has changed since they were split into separate expenses.
   * Left alone on purpose, and surfaced so the change isn't invisible.
   */
  readonly splitChanged: number;
  /** Charges already imported. Expected on every sync — the cursor overlaps. */
  readonly duplicates: number;
}

export interface ClassifyInput {
  readonly incoming: readonly IncomingTransaction[];
  readonly connectionId: string;
  readonly rules: readonly BankRule[];
  readonly transactions: readonly Transaction[];
  readonly inbox: readonly PendingImport[];
  /** Month keys whose books are closed, from `knownMonthKeys` / month records. */
  readonly closedMonths: ReadonlySet<string>;
  /** `YYYY-MM-DD`; anything older is not this connection's business. */
  readonly importFrom: string;
}

/** Where a charge already known to the app currently lives. */
interface KnownRef {
  kind: 'transaction' | 'inbox';
  /** The row to amend when the bank changes it. Not used once `split`. */
  id: string;
  /** The charge as a whole — the sum of every row it became. */
  amountCents: number;
  date: string;
  /** Filed as several expenses, which the bank no longer gets to rewrite. */
  split: boolean;
}

export function classifyIncoming({
  incoming,
  connectionId,
  rules,
  transactions,
  inbox,
  closedMonths,
  importFrom,
}: ClassifyInput): IngestPlan {
  const index = new Map<string, KnownRef>();

  for (const transaction of transactions) {
    if (!transaction.externalId) continue;
    const known = index.get(transaction.externalId);
    if (known) {
      // A second row under one bank id can only be a split, whatever the rows
      // themselves claim — so this holds for a save written before the mark
      // existed, and for one whose other half has since been deleted.
      known.amountCents += transaction.amountCents;
      known.split = true;
      continue;
    }
    index.set(transaction.externalId, {
      kind: 'transaction',
      id: transaction.id,
      amountCents: transaction.amountCents,
      date: transaction.date,
      split: transaction.split === true,
    });
  }

  for (const row of inbox) {
    index.set(row.externalId, {
      kind: 'inbox',
      id: row.id,
      amountCents: row.amountCents,
      date: row.date,
      split: false,
    });
  }

  // One batch can carry both a pending charge and the posted charge that
  // replaces it. The posted one names the pending one, so drop the pending
  // rather than importing the same coffee twice.
  const supersededInBatch = new Set(
    incoming
      .map((item) => item.pendingExternalId)
      .filter((id): id is string => Boolean(id)),
  );

  const added: TransactionDraft[] = [];
  const updated: TransactionUpdate[] = [];
  const inboxAdded: PendingImportDraft[] = [];
  const inboxUpdated: InboxUpdate[] = [];
  const claimed = new Set<string>();
  let skippedCredits = 0;
  let skippedOld = 0;
  let splitChanged = 0;
  let duplicates = 0;

  for (const item of incoming) {
    // Checked before anything else: history from before the connection is not
    // this app's to interpret, whatever else is true of it. Dates are
    // `YYYY-MM-DD`, so comparing them as strings orders them correctly.
    if (importFrom && item.date < importFrom) {
      skippedOld += 1;
      continue;
    }

    // Plaid's amount is positive when money leaves the account. This app only
    // models spending, so a refund or a deposit has nowhere to go.
    if (item.amount <= 0) {
      skippedCredits += 1;
      continue;
    }

    if (supersededInBatch.has(item.externalId) || claimed.has(item.externalId)) {
      duplicates += 1;
      continue;
    }

    const amountCents = toCents(item.amount);
    const known =
      index.get(item.externalId) ??
      (item.pendingExternalId ? index.get(item.pendingExternalId) : undefined);

    if (known) {
      if (known.amountCents === amountCents && known.date === item.date) {
        duplicates += 1;
        continue;
      }

      // A charge that was split stopped being one bill the moment it was split.
      // Its shares are ordinary expenses now — edited, deleted, budgeted around
      // — and there is no way to push a new figure into them without
      // overwriting a decision somebody made by hand. Reported, not applied.
      if (known.split) {
        splitChanged += 1;
        known.amountCents = amountCents;
        known.date = item.date;
        continue;
      }

      // A pending charge that posted, or one the bank corrected. Updated in
      // place so the category already picked for it survives the change.
      if (known.kind === 'transaction') {
        updated.push({
          id: known.id,
          changes: { amountCents, date: item.date, externalId: item.externalId },
        });
      } else {
        inboxUpdated.push({
          id: known.id,
          changes: {
            amountCents,
            date: item.date,
            externalId: item.externalId,
            pending: item.pending,
          },
        });
      }

      known.amountCents = amountCents;
      known.date = item.date;
      index.set(item.externalId, known);
      continue;
    }

    claimed.add(item.externalId);

    const merchant = item.merchant.trim() || 'Unknown merchant';

    // A closed month renders from a frozen snapshot, so a transaction written
    // into one would count for nothing and appear nowhere. It waits instead.
    if (closedMonths.has(monthKeyOfIsoDate(item.date))) {
      inboxAdded.push({
        externalId: item.externalId,
        connectionId,
        merchant,
        amountCents,
        date: item.date,
        pending: item.pending,
        reason: 'closed-month',
      });
      continue;
    }

    const rule = matchRule(rules, merchant);
    if (rule) {
      added.push({
        categoryId: rule.categoryId,
        amountCents,
        date: item.date,
        note: merchant,
        externalId: item.externalId,
      });
      continue;
    }

    inboxAdded.push({
      externalId: item.externalId,
      connectionId,
      merchant,
      amountCents,
      date: item.date,
      pending: item.pending,
      reason: 'unmatched',
    });
  }

  return {
    added,
    updated,
    inboxAdded,
    inboxUpdated,
    skippedCredits,
    skippedOld,
    splitChanged,
    duplicates,
  };
}

/** Drops charges the bank has retracted, wherever they ended up. */
export function applyRemovals(
  removedIds: readonly string[],
  transactions: readonly Transaction[],
  inbox: readonly PendingImport[],
): { transactions: readonly Transaction[]; inbox: readonly PendingImport[] } {
  const removed = new Set(removedIds);
  if (removed.size === 0) return { transactions, inbox };

  return {
    transactions: transactions.filter(
      (transaction) => !transaction.externalId || !removed.has(transaction.externalId),
    ),
    inbox: inbox.filter((row) => !removed.has(row.externalId)),
  };
}

/**
 * Whether a foreground sync is due.
 *
 * A static site can't receive Plaid's webhooks, so "as they roll in" in practice
 * means checking when the app is opened — throttled, so flicking between apps
 * doesn't hammer the connector.
 */
export function shouldAutoSync(lastSyncedAt: string | null, now: number): boolean {
  if (!lastSyncedAt) return true;
  const last = Date.parse(lastSyncedAt);
  if (Number.isNaN(last)) return true;
  return now - last >= AUTO_SYNC_INTERVAL_MS;
}
