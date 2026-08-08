import type { Category, IncomeEntry, Subscription, Transaction } from '@/types';

let counter = 0;
const nextId = (prefix: string): string => `${prefix}-${(counter += 1)}`;

export function resetIds(): void {
  counter = 0;
}

export function category(overrides: Partial<Category> = {}): Category {
  return {
    id: nextId('cat'),
    name: 'Category',
    color: '#6366f1',
    allocationType: 'percent',
    fixedCents: 0,
    percentBp: 0,
    hardSet: false,
    archived: false,
    ...overrides,
  };
}

/** Shorthand: a percentage category, e.g. `percentCategory('Fun', 25)`. */
export function percentCategory(
  name: string,
  percent: number,
  overrides: Partial<Category> = {},
): Category {
  return category({ name, allocationType: 'percent', percentBp: percent * 100, ...overrides });
}

/** Shorthand: a fixed-dollar category, e.g. `fixedCategory('Rent', 1400)`. */
export function fixedCategory(
  name: string,
  dollars: number,
  overrides: Partial<Category> = {},
): Category {
  return category({
    name,
    allocationType: 'fixed',
    fixedCents: dollars * 100,
    ...overrides,
  });
}

export function transaction(
  categoryId: string,
  dollars: number,
  date: string,
  note = 'test',
): Transaction {
  return { id: nextId('txn'), categoryId, amountCents: dollars * 100, date, note };
}

export function income(dollars: number, date: string, label = 'bonus'): IncomeEntry {
  return { id: nextId('inc'), label, amountCents: dollars * 100, date };
}

export function subscription(
  categoryId: string,
  dollars: number,
  overrides: Partial<Subscription> = {},
): Subscription {
  return {
    id: nextId('sub'),
    name: 'Subscription',
    categoryId,
    amountCents: dollars * 100,
    cadence: 'monthly',
    startMonth: '2026-01',
    endMonth: null,
    billingDay: 1,
    active: true,
    ...overrides,
  };
}
