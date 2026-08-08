import type { ComponentType } from 'react';
import { CategoriesPage } from '@/features/categories';
import { Dashboard } from '@/features/dashboard';
import { HistoryPage } from '@/features/history';
import { SettingsPage } from '@/features/settings';
import { SubscriptionsPage } from '@/features/subscriptions';
import { TransactionsPage } from '@/features/transactions';

export type PageId =
  | 'dashboard'
  | 'transactions'
  | 'subscriptions'
  | 'categories'
  | 'history'
  | 'settings';

export interface NavItem {
  readonly id: PageId;
  readonly label: string;
  /** Fits the mobile tab bar, where six labels share the screen width. */
  readonly shortLabel: string;
  readonly icon: string;
  /** Pages that need to switch tabs receive an `onNavigate` prop. */
  readonly component: ComponentType<{ onNavigate: (page: PageId) => void }>;
}

/**
 * The single source of truth for both the nav bar and which page renders.
 * Adding a screen is one entry here plus its feature folder — nothing else.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Budget', icon: '📊', component: Dashboard },
  {
    id: 'transactions',
    label: 'Expenses',
    shortLabel: 'Spend',
    icon: '🧾',
    component: TransactionsPage,
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    shortLabel: 'Subs',
    icon: '🔁',
    component: SubscriptionsPage,
  },
  {
    id: 'categories',
    label: 'Categories',
    shortLabel: 'Split',
    icon: '🗂️',
    component: CategoriesPage,
  },
  { id: 'history', label: 'History', shortLabel: 'History', icon: '📅', component: HistoryPage },
  { id: 'settings', label: 'Settings', shortLabel: 'More', icon: '⚙️', component: SettingsPage },
];

export const DEFAULT_PAGE: PageId = 'dashboard';

export function findNavItem(id: PageId): NavItem {
  return NAV_ITEMS.find((item) => item.id === id) ?? NAV_ITEMS[0];
}
