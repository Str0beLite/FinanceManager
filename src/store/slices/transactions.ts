import { createId } from '@/lib/id';
import { settlePool } from '@/lib/pool';
import type { AppState, Transaction, TransactionDraft } from '@/types';

export type TransactionAction =
  | { type: 'transaction/add'; draft: TransactionDraft }
  /** A split expense: several rows, one state change, one save. */
  | { type: 'transaction/addMany'; drafts: readonly TransactionDraft[] }
  | { type: 'transaction/update'; id: string; changes: Partial<TransactionDraft> }
  | { type: 'transaction/delete'; id: string };

export function transactionsReducer(state: AppState, action: TransactionAction): AppState {
  switch (action.type) {
    case 'transaction/add':
      return withTransactions(state, [
        ...state.transactions,
        { ...action.draft, id: createId() },
      ]);

    case 'transaction/addMany':
      if (action.drafts.length === 0) return state;
      return withTransactions(state, [
        ...state.transactions,
        ...action.drafts.map((draft) => ({ ...draft, id: createId() })),
      ]);

    case 'transaction/update':
      return withTransactions(
        state,
        state.transactions.map((transaction) =>
          transaction.id === action.id ? { ...transaction, ...action.changes } : transaction,
        ),
      );

    case 'transaction/delete':
      return withTransactions(
        state,
        state.transactions.filter((transaction) => transaction.id !== action.id),
      );

    default:
      return state;
  }
}

/**
 * Writes the ledger, and moves the pool by however much pooled spending changed.
 *
 * Every path goes through here rather than adjusting the pool itself, so no
 * case has to be reasoned about twice: turning "pay from savings" off is the
 * same operation as deleting the expense, which is the same operation as
 * halving its amount.
 */
function withTransactions(state: AppState, transactions: readonly Transaction[]): AppState {
  return {
    ...state,
    transactions,
    rolloverPoolCents: settlePool(state.rolloverPoolCents, state.transactions, transactions),
  };
}
