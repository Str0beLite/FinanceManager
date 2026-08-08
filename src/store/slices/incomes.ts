import { createId } from '@/lib/id';
import type { AppState, IncomeDraft } from '@/types';

export type IncomeAction =
  | { type: 'income/add'; draft: IncomeDraft }
  | { type: 'income/update'; id: string; changes: Partial<IncomeDraft> }
  | { type: 'income/delete'; id: string };

export function incomesReducer(state: AppState, action: IncomeAction): AppState {
  switch (action.type) {
    case 'income/add':
      return { ...state, incomes: [...state.incomes, { ...action.draft, id: createId() }] };

    case 'income/update':
      return {
        ...state,
        incomes: state.incomes.map((entry) =>
          entry.id === action.id ? { ...entry, ...action.changes } : entry,
        ),
      };

    case 'income/delete':
      return { ...state, incomes: state.incomes.filter((entry) => entry.id !== action.id) };

    default:
      return state;
  }
}
