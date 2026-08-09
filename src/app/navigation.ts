import type { ComponentType } from 'react';
import type { IconName } from '@/config/icons';
import { Dashboard } from '@/features/dashboard';
import { HistoryPage } from '@/features/history';
import { PlanPage } from '@/features/plan';
import { SettingsPage } from '@/features/settings';
import { TransactionsPage } from '@/features/transactions';
import { stepIndex } from '@/lib/gestures';

export type PageId = 'dashboard' | 'transactions' | 'plan' | 'history' | 'settings';

export interface NavItem {
  readonly id: PageId;
  readonly label: string;
  /** Fits the desktop tab bar, where the label sits beside the icon. */
  readonly shortLabel: string;
  readonly icon: IconName;
  /** Pages that need to switch tabs receive an `onNavigate` prop. */
  readonly component: ComponentType<{ onNavigate: (page: PageId) => void }>;
}

/**
 * The tab bar, and the order a sideways swipe walks through.
 *
 * Four is the ceiling: the bar is thumb-width, and every extra tab shrinks the
 * targets and the odds of anyone finding what is in them. Anything that isn't
 * a place you go *often* belongs in `UTILITY_ITEMS` instead.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Budget',
    icon: 'budget',
    component: Dashboard,
  },
  {
    id: 'transactions',
    label: 'Expenses',
    shortLabel: 'Spend',
    icon: 'spend',
    component: TransactionsPage,
  },
  {
    id: 'plan',
    label: 'Plan',
    shortLabel: 'Plan',
    icon: 'plan',
    component: PlanPage,
  },
  {
    id: 'history',
    label: 'History',
    shortLabel: 'History',
    icon: 'history',
    component: HistoryPage,
  },
];

/** Reachable pages that don't earn a tab — the header reaches these instead. */
export const UTILITY_ITEMS: readonly NavItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    icon: 'settings',
    component: SettingsPage,
  },
];

const ALL_ITEMS: readonly NavItem[] = [...NAV_ITEMS, ...UTILITY_ITEMS];

export const DEFAULT_PAGE: PageId = 'dashboard';

export function findNavItem(id: PageId): NavItem {
  return ALL_ITEMS.find((item) => item.id === id) ?? NAV_ITEMS[0];
}

/**
 * The tab `steps` places along from `id`, or `null` if there isn't one.
 *
 * Pages outside the tab bar — Settings — have no neighbours, so a swipe there
 * does nothing rather than jumping somewhere arbitrary.
 */
export function adjacentPage(id: PageId, steps: number): PageId | null {
  const index = NAV_ITEMS.findIndex((item) => item.id === id);
  const target = stepIndex(index, steps, NAV_ITEMS.length);
  return target === null ? null : NAV_ITEMS[target].id;
}
