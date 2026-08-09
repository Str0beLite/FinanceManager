import type { BankState } from './bank';
import type { Category } from './category';
import type { IncomeEntry } from './income';
import type { MonthRecord } from './month';
import type { Settings } from './settings';
import type { Subscription } from './subscription';
import type { Transaction } from './transaction';

/** The whole persisted app. Everything in localStorage is exactly this shape. */
export interface AppState {
  readonly version: number;
  readonly categories: readonly Category[];
  readonly subscriptions: readonly Subscription[];
  readonly transactions: readonly Transaction[];
  readonly incomes: readonly IncomeEntry[];
  /** Keyed by `YYYY-MM`. */
  readonly months: Readonly<Record<string, MonthRecord>>;
  /** Savings accumulated from months that came in under budget. */
  readonly rolloverPoolCents: number;
  readonly settings: Settings;
  /** Bank syncing. Empty and inert until the user sets up a connector. */
  readonly bank: BankState;
}
