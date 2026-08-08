import { createEmptyState } from '@/lib/storage';
import type { AppState } from '@/types';

/** Whole-state operations: restoring a backup and starting over. */
export type DataAction =
  | { type: 'data/replace'; state: AppState }
  | { type: 'data/reset' };

export function dataReducer(state: AppState, action: DataAction): AppState {
  switch (action.type) {
    case 'data/replace':
      return action.state;

    case 'data/reset':
      return createEmptyState();

    default:
      return state;
  }
}
