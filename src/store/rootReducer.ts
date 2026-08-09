import type { AppState } from '@/types';
import { bankReducer, type BankAction } from './slices/bank';
import { categoriesReducer, type CategoryAction } from './slices/categories';
import { dataReducer, type DataAction } from './slices/data';
import { incomesReducer, type IncomeAction } from './slices/incomes';
import { monthsReducer, type MonthAction } from './slices/months';
import { settingsReducer, type SettingsAction } from './slices/settings';
import { subscriptionsReducer, type SubscriptionAction } from './slices/subscriptions';
import { transactionsReducer, type TransactionAction } from './slices/transactions';

export type AppAction =
  | CategoryAction
  | TransactionAction
  | SubscriptionAction
  | IncomeAction
  | MonthAction
  | SettingsAction
  | BankAction
  | DataAction;

/**
 * Every slice takes the whole state and returns the whole state, so a slice can
 * touch related collections when it has to — deleting a category also drops its
 * transactions. Each action is still owned by exactly one slice file.
 */
export function rootReducer(state: AppState, action: AppAction): AppState {
  const [domain] = action.type.split('/');

  switch (domain) {
    case 'category':
      return categoriesReducer(state, action as CategoryAction);
    case 'transaction':
      return transactionsReducer(state, action as TransactionAction);
    case 'subscription':
      return subscriptionsReducer(state, action as SubscriptionAction);
    case 'income':
      return incomesReducer(state, action as IncomeAction);
    case 'month':
      return monthsReducer(state, action as MonthAction);
    case 'settings':
      return settingsReducer(state, action as SettingsAction);
    case 'bank':
      return bankReducer(state, action as BankAction);
    case 'data':
      return dataReducer(state, action as DataAction);
    default:
      return state;
  }
}
