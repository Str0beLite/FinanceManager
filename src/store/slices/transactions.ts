import { createId } from '@/lib/id';
import type { AppState, TransactionDraft } from '@/types';

export type TransactionAction =
  | { type: 'transaction/add'; draft: TransactionDraft }
  | { type: 'transaction/update'; id: string; changes: Partial<TransactionDraft> }
  | { type: 'transaction/delete'; id: string };

export function transactionsReducer(state: AppState, action: TransactionAction): AppState {
  switch (action.type) {
    case 'transaction/add':
      return {
        ...state,
        transactions: [...state.transactions, { ...action.draft, id: createId() }],
      };

    case 'transaction/update':
      return {
        ...state,
        transactions: state.transactions.map((transaction) =>
          transaction.id === action.id ? { ...transaction, ...action.changes } : transaction,
        ),
      };

    case 'transaction/delete':
      return {
        ...state,
        transactions: state.transactions.filter((transaction) => transaction.id !== action.id),
      };

    default:
      return state;
  }
}
