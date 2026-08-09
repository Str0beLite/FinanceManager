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
}

/** Where a charge already known to the app currently lives. */
interface KnownRef {
  kind: 'transaction' | 'inbox';
  id: string;
  amountCents: number;
  date: string;
}

export function classifyIncoming({
  incoming,
  connectionId,
  rules,
  transactions,
  inbox,
  closedMonths,
}: ClassifyInput): IngestPlan {
  const index = new Map<string, KnownRef>();

  for (const transaction of transactions) {
    if (!transaction.externalId) continue;
    index.set(transaction.externalId, {
      kind: 'transaction',
      id: transaction.id,
      amountCents: transaction.amountCents,
      date: transaction.date,
    });
  }

  for (const row of inbox) {
    index.set(row.externalId, {
      kind: 'inbox',
      id: row.id,
      amountCents: row.amountCents,
      date: row.date,
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
  let duplicates = 0;

  for (const item of incoming) {
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

      // A pending charge that posted, or one the bank corrected. Update it in
      // place so the category the user already picked survives the change.
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

  return { added, updated, inboxAdded, inboxUpdated, skippedCredits, duplicates };
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
