import { cadenceMeta } from '@/config/cadences';
import type { Subscription } from '@/types';
import { compareMonthKeys, monthsBetween } from './dates';

/**
 * Whether a subscription bills in the given month.
 *
 * The subscription's `startMonth` sets both the first charge and the phase: a
 * quarterly billing from 2026-02 hits Feb, May, Aug, Nov — not Jan, Apr, Jul.
 */
export function isDueInMonth(subscription: Subscription, monthKey: string): boolean {
  if (!subscription.active) return false;
  if (compareMonthKeys(monthKey, subscription.startMonth) < 0) return false;
  if (subscription.endMonth && compareMonthKeys(monthKey, subscription.endMonth) > 0) {
    return false;
  }

  const elapsed = monthsBetween(subscription.startMonth, monthKey);
  return elapsed % cadenceMeta(subscription.cadence).intervalMonths === 0;
}

export function subscriptionsDueInMonth(
  subscriptions: readonly Subscription[],
  monthKey: string,
): Subscription[] {
  return subscriptions.filter((subscription) => isDueInMonth(subscription, monthKey));
}

export function subscriptionsForCategory(
  subscriptions: readonly Subscription[],
  categoryId: string,
): Subscription[] {
  return subscriptions.filter((subscription) => subscription.categoryId === categoryId);
}

/**
 * What a subscription costs over a year — useful context when a $15 monthly
 * charge and a $150 annual one sit next to each other in the same list.
 */
export function annualCostCents(subscription: Subscription): number {
  const perYear = 12 / cadenceMeta(subscription.cadence).intervalMonths;
  return Math.round(subscription.amountCents * perYear);
}
