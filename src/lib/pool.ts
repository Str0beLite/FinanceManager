import type { Transaction } from '@/types';

/**
 * Keeping the rollover pool honest as expenses come and go.
 *
 * The pool is a stored running total rather than something derived: it also
 * banks each month's surplus at close, and no transaction records that. So the
 * risk here is drift — the pool is moved from several reducers, and one missed
 * path leaves savings permanently wrong with nothing left to notice it by.
 *
 * The answer is to move it by the *change* in pooled spending rather than by
 * whatever the caller thinks just happened. Adding an expense, editing its
 * amount, turning it back into ordinary spending, deleting it, a bank
 * amendment and a bank retraction are then all the same operation, and there is
 * no case for a reducer to get subtly wrong.
 */

/** What these transactions have taken out of the pool. */
export function pooledTotal(transactions: readonly Transaction[]): number {
  let total = 0;
  for (const transaction of transactions) {
    if (transaction.fromPool) total += transaction.amountCents;
  }
  return total;
}

/**
 * The pool after the ledger changes from `before` to `after`.
 *
 * Allowed to go negative: savings can be overdrawn and dug out of later, and
 * refusing at this level would mean silently losing an expense somebody meant
 * to record.
 */
export function settlePool(
  poolCents: number,
  before: readonly Transaction[],
  after: readonly Transaction[],
): number {
  return poolCents + pooledTotal(before) - pooledTotal(after);
}
