import { createId } from '@/lib/id';
import type { AppState, SubscriptionDraft } from '@/types';

export type SubscriptionAction =
  | { type: 'subscription/add'; draft: SubscriptionDraft }
  | { type: 'subscription/update'; id: string; changes: Partial<SubscriptionDraft> }
  | { type: 'subscription/toggleActive'; id: string }
  | { type: 'subscription/delete'; id: string };

export function subscriptionsReducer(state: AppState, action: SubscriptionAction): AppState {
  switch (action.type) {
    case 'subscription/add':
      return {
        ...state,
        subscriptions: [...state.subscriptions, { ...action.draft, id: createId() }],
      };

    case 'subscription/update':
      return {
        ...state,
        subscriptions: state.subscriptions.map((subscription) =>
          subscription.id === action.id
            ? { ...subscription, ...action.changes }
            : subscription,
        ),
      };

    case 'subscription/toggleActive':
      return {
        ...state,
        subscriptions: state.subscriptions.map((subscription) =>
          subscription.id === action.id
            ? { ...subscription, active: !subscription.active }
            : subscription,
        ),
      };

    case 'subscription/delete':
      return {
        ...state,
        subscriptions: state.subscriptions.filter(
          (subscription) => subscription.id !== action.id,
        ),
      };

    default:
      return state;
  }
}
