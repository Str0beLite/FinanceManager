import type { AppState, MonthRecord } from '@/types';
import { compareMonthKeys, monthKeyOf, monthKeyOfIsoDate, nextMonthKey } from './dates';

export function createMonthRecord(key: string): MonthRecord {
  return {
    key,
    paycheckCents: null,
    deficitInCents: 0,
    poolAppliedCents: 0,
    closed: false,
    snapshot: null,
  };
}

/** A month that has never been touched behaves exactly like a blank one. */
export function getMonthRecord(state: AppState, key: string): MonthRecord {
  return state.months[key] ?? createMonthRecord(key);
}

/** The month's own paycheck if it has one, otherwise the default from settings. */
export function resolvePaycheckCents(state: AppState, key: string): number {
  const record = state.months[key];
  return record?.paycheckCents ?? state.settings.defaultPaycheckCents;
}

/**
 * Every month the app knows about: explicit records plus any month that has
 * activity, always including the current one. Sorted newest first.
 */
export function knownMonthKeys(state: AppState, today: Date = new Date()): string[] {
  const keys = new Set<string>([monthKeyOf(today), ...Object.keys(state.months)]);
  state.transactions.forEach((t) => keys.add(monthKeyOfIsoDate(t.date)));
  state.incomes.forEach((i) => keys.add(monthKeyOfIsoDate(i.date)));
  return [...keys].sort((a, b) => compareMonthKeys(b, a));
}

/**
 * A month can only be reopened while it is the newest closed one — undoing an
 * older close would invalidate every settlement stacked on top of it.
 */
export function canReopenMonth(state: AppState, key: string): boolean {
  const record = state.months[key];
  if (!record?.closed) return false;
  return !state.months[nextMonthKey(key)]?.closed;
}

export function isMonthClosed(state: AppState, key: string): boolean {
  return state.months[key]?.closed ?? false;
}

/**
 * Months settle in order, so exactly one is ever up for closing: the oldest
 * that is still open. Closing out of order would stack settlements on top of a
 * month that could still change.
 */
export function nextCloseableMonthKey(state: AppState, today: Date = new Date()): string {
  const oldestFirst = knownMonthKeys(state, today).reverse();
  return oldestFirst.find((key) => !isMonthClosed(state, key)) ?? monthKeyOf(today);
}

export function canCloseMonth(state: AppState, key: string, today: Date = new Date()): boolean {
  return !isMonthClosed(state, key) && nextCloseableMonthKey(state, today) === key;
}
