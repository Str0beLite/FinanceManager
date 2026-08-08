import { createId } from '@/lib/id';
import type { AppState, Category, CategoryDraft } from '@/types';

export type CategoryAction =
  | { type: 'category/add'; draft: CategoryDraft }
  | { type: 'category/update'; id: string; changes: Partial<CategoryDraft> }
  | { type: 'category/setArchived'; id: string; archived: boolean }
  | { type: 'category/reorder'; id: string; direction: 'up' | 'down' }
  /** Removes the category along with the subscriptions and transactions on it. */
  | { type: 'category/delete'; id: string };

export function categoriesReducer(state: AppState, action: CategoryAction): AppState {
  switch (action.type) {
    case 'category/add':
      return {
        ...state,
        categories: [...state.categories, { ...action.draft, id: createId(), archived: false }],
      };

    case 'category/update':
      return {
        ...state,
        categories: state.categories.map((category) =>
          category.id === action.id ? { ...category, ...action.changes } : category,
        ),
      };

    case 'category/setArchived':
      return {
        ...state,
        categories: state.categories.map((category) =>
          category.id === action.id ? { ...category, archived: action.archived } : category,
        ),
      };

    case 'category/reorder':
      return { ...state, categories: move(state.categories, action.id, action.direction) };

    case 'category/delete':
      return {
        ...state,
        categories: state.categories.filter((category) => category.id !== action.id),
        subscriptions: state.subscriptions.filter((s) => s.categoryId !== action.id),
        transactions: state.transactions.filter((t) => t.categoryId !== action.id),
      };

    default:
      return state;
  }
}

function move(
  categories: readonly Category[],
  id: string,
  direction: 'up' | 'down',
): Category[] {
  const index = categories.findIndex((category) => category.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= categories.length) return [...categories];

  const next = [...categories];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
