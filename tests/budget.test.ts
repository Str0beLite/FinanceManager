import { beforeEach, describe, expect, it } from 'vitest';
import { computeMonth, settleMonth, type ComputeMonthInput } from '@/lib/budget';
import type { MonthComputation } from '@/types';
import {
  fixedCategory,
  income,
  percentCategory,
  resetIds,
  subscription,
  transaction,
} from './helpers';

const MONTH = '2026-03';

function compute(overrides: Partial<ComputeMonthInput> = {}): MonthComputation {
  return computeMonth({
    monthKey: MONTH,
    categories: [],
    subscriptions: [],
    transactions: [],
    incomes: [],
    paycheckCents: 0,
    deficitInCents: 0,
    ...overrides,
  });
}

const find = (result: MonthComputation, name: string) => {
  const row = result.categories.find((c) => c.name === name);
  if (!row) throw new Error(`No computed row for ${name}`);
  return row;
};

beforeEach(resetIds);

describe('allocation', () => {
  it('takes fixed categories off the top, then splits the rest by percentage', () => {
    const rent = fixedCategory('Rent', 1400);
    const groceries = percentCategory('Groceries', 50);
    const fun = percentCategory('Fun', 30);
    const savings = percentCategory('Savings', 20);

    const result = compute({
      categories: [rent, groceries, fun, savings],
      paycheckCents: 300_000,
    });

    expect(result.fixedTotalCents).toBe(140_000);
    expect(result.percentPoolCents).toBe(160_000);
    expect(find(result, 'Rent').budgetCents).toBe(140_000);
    expect(find(result, 'Groceries').budgetCents).toBe(80_000);
    expect(find(result, 'Fun').budgetCents).toBe(48_000);
    expect(find(result, 'Savings').budgetCents).toBe(32_000);
    // The whole paycheck is allocated, to the cent.
    expect(result.totalBudgetCents).toBe(300_000);
  });

  it('allocates the full paycheck even when the split does not divide evenly', () => {
    const result = compute({
      categories: [
        percentCategory('A', 33.33),
        percentCategory('B', 33.33),
        percentCategory('C', 33.34),
      ],
      paycheckCents: 100_001,
    });

    expect(result.totalBudgetCents).toBe(100_001);
  });

  it('adds extra income on top of the paycheck', () => {
    const fun = percentCategory('Fun', 100);
    const result = compute({
      categories: [fun],
      paycheckCents: 200_000,
      incomes: [income(500, `${MONTH}-09`), income(100, '2026-04-01')],
    });

    // Only the March bonus counts; the April one belongs to another month.
    expect(result.extraIncomeCents).toBe(50_000);
    expect(result.incomeCents).toBe(250_000);
    expect(find(result, 'Fun').budgetCents).toBe(250_000);
  });

  it('flags a month where fixed bills alone exceed income', () => {
    const result = compute({
      categories: [fixedCategory('Rent', 1400), percentCategory('Fun', 100)],
      paycheckCents: 100_000,
    });

    expect(result.overcommitted).toBe(true);
    expect(result.percentPoolCents).toBe(0);
    expect(find(result, 'Fun').budgetCents).toBe(0);
    expect(find(result, 'Rent').budgetCents).toBe(140_000);
  });
});

describe('spending', () => {
  it('counts subscriptions and one-off transactions against the same category', () => {
    const fun = percentCategory('Fun', 100);
    const result = compute({
      categories: [fun],
      paycheckCents: 100_000,
      subscriptions: [subscription(fun.id, 15)],
      transactions: [
        transaction(fun.id, 40, `${MONTH}-04`),
        transaction(fun.id, 10, `${MONTH}-22`),
        transaction(fun.id, 99, '2026-04-02'),
      ],
    });

    const row = find(result, 'Fun');
    expect(row.subscriptionCents).toBe(1_500);
    expect(row.transactionCents).toBe(5_000);
    expect(row.spentCents).toBe(6_500);
    expect(row.remainingCents).toBe(93_500);
  });

  it('keeps an archived category visible while it still has spending', () => {
    const old = percentCategory('Old', 0, { archived: true });
    const result = compute({
      categories: [old, percentCategory('Fun', 100)],
      paycheckCents: 100_000,
      transactions: [transaction(old.id, 25, `${MONTH}-11`)],
    });

    const row = find(result, 'Old');
    expect(row.budgetCents).toBe(0);
    expect(row.spentCents).toBe(2_500);
    // Its overspend still drags the month's total down, rather than disappearing.
    expect(result.totalSpentCents).toBe(2_500);
  });
});

describe('rollover deficit', () => {
  it('spares hard-set categories and cuts the flexible ones proportionally', () => {
    const rent = fixedCategory('Rent', 1400, { hardSet: true });
    const groceries = percentCategory('Groceries', 50);
    const fun = percentCategory('Fun', 30);
    const savings = percentCategory('Savings', 20);

    const result = compute({
      categories: [rent, groceries, fun, savings],
      paycheckCents: 300_000,
      deficitInCents: 12_000,
    });

    expect(find(result, 'Rent').budgetCents).toBe(140_000);
    expect(find(result, 'Rent').cutCents).toBe(0);
    // $120 split 50/30/20 across the flexible categories.
    expect(find(result, 'Groceries').cutCents).toBe(6_000);
    expect(find(result, 'Fun').cutCents).toBe(3_600);
    expect(find(result, 'Savings').cutCents).toBe(2_400);
    expect(result.deficitAppliedCents).toBe(12_000);
    expect(result.unabsorbedDeficitCents).toBe(0);
    expect(result.totalBudgetCents).toBe(288_000);
  });

  it('spares a hard-set percentage category too, not just fixed ones', () => {
    const tithe = percentCategory('Tithe', 50, { hardSet: true });
    const fun = percentCategory('Fun', 50);

    const result = compute({
      categories: [tithe, fun],
      paycheckCents: 200_000,
      deficitInCents: 10_000,
    });

    expect(find(result, 'Tithe').budgetCents).toBe(100_000);
    expect(find(result, 'Fun').budgetCents).toBe(90_000);
  });

  it('carries the unabsorbable part of a deficit into the next month', () => {
    const rent = fixedCategory('Rent', 1400, { hardSet: true });
    const fun = percentCategory('Fun', 100);

    const result = compute({
      categories: [rent, fun],
      paycheckCents: 300_000,
      deficitInCents: 200_000,
    });

    // Fun can only give up the $1,600 it had.
    expect(find(result, 'Fun').budgetCents).toBe(0);
    expect(result.deficitAppliedCents).toBe(160_000);
    expect(result.unabsorbedDeficitCents).toBe(40_000);

    // With nothing spent, the leftover debt still rolls on to next month.
    const settlement = settleMonth(result);
    expect(settlement.nextDeficitCents).toBe(40_000);
  });

  it('leaves budgets untouched when every category is hard set', () => {
    const result = compute({
      categories: [fixedCategory('Rent', 1000, { hardSet: true })],
      paycheckCents: 100_000,
      deficitInCents: 5_000,
    });

    expect(find(result, 'Rent').budgetCents).toBe(100_000);
    expect(result.deficitAppliedCents).toBe(0);
    expect(result.unabsorbedDeficitCents).toBe(5_000);
  });
});

describe('settleMonth', () => {
  it('sends an under-spent month into the rollover pool', () => {
    const fun = percentCategory('Fun', 100);
    const result = compute({
      categories: [fun],
      paycheckCents: 100_000,
      transactions: [transaction(fun.id, 300, `${MONTH}-10`)],
    });

    const settlement = settleMonth(result);
    expect(settlement.deltaCents).toBe(70_000);
    expect(settlement.poolChangeCents).toBe(70_000);
    expect(settlement.nextDeficitCents).toBe(0);
  });

  it('charges an over-spent month to next month and leaves the pool alone', () => {
    const fun = percentCategory('Fun', 100);
    const result = compute({
      categories: [fun],
      paycheckCents: 100_000,
      transactions: [transaction(fun.id, 1_120, `${MONTH}-10`)],
    });

    const settlement = settleMonth(result);
    expect(settlement.deltaCents).toBe(-12_000);
    expect(settlement.poolChangeCents).toBe(0);
    expect(settlement.nextDeficitCents).toBe(12_000);
  });

  it('offsets one category going over with another coming in under', () => {
    const a = percentCategory('A', 50);
    const b = percentCategory('B', 50);
    const result = compute({
      categories: [a, b],
      paycheckCents: 200_000,
      transactions: [
        transaction(a.id, 1_200, `${MONTH}-05`),
        transaction(b.id, 500, `${MONTH}-06`),
      ],
    });

    expect(find(result, 'A').remainingCents).toBe(-20_000);
    // Net across the month is +$300, so the pool grows.
    expect(settleMonth(result).poolChangeCents).toBe(30_000);
  });
});

describe('end-to-end month chain', () => {
  it('overspending by $120 cuts next month by exactly $120, rent untouched', () => {
    const rent = fixedCategory('Rent', 1400, { hardSet: true });
    const groceries = percentCategory('Groceries', 60);
    const fun = percentCategory('Fun', 40);
    const categories = [rent, groceries, fun];

    const march = compute({
      categories,
      paycheckCents: 300_000,
      subscriptions: [subscription(fun.id, 20)],
      transactions: [
        transaction(rent.id, 1_400, `${MONTH}-01`),
        transaction(groceries.id, 980, `${MONTH}-12`),
        transaction(fun.id, 700, `${MONTH}-18`),
      ],
    });

    // Budgeted $3,000; spent $1,400 + $980 + $700 + $20 subscription = $3,100.
    expect(march.totalSpentCents).toBe(310_000);
    const settlement = settleMonth(march);
    expect(settlement.nextDeficitCents).toBe(10_000);

    const april = computeMonth({
      monthKey: '2026-04',
      categories,
      subscriptions: [],
      transactions: [],
      incomes: [],
      paycheckCents: 300_000,
      deficitInCents: settlement.nextDeficitCents,
    });

    expect(find(april, 'Rent').budgetCents).toBe(140_000);
    expect(april.totalBudgetCents).toBe(290_000);
    expect(find(april, 'Groceries').budgetCents).toBe(90_000);
    expect(find(april, 'Fun').budgetCents).toBe(60_000);
  });
});

describe('an expense paid from the rollover pool', () => {
  const pooled = (categoryId: string, dollars: number) => ({
    ...transaction(categoryId, dollars, `${MONTH}-14`),
    fromPool: true,
  });

  it('funds its own category, so the month has the same money left as before', () => {
    const repairs = percentCategory('Repairs', 50);
    const groceries = percentCategory('Groceries', 50);
    const categories = [repairs, groceries];

    const without = compute({ categories, paycheckCents: 200_000 });
    const withPooled = compute({
      categories,
      paycheckCents: 200_000,
      transactions: [pooled(repairs.id, 600)],
    });

    const row = find(withPooled, 'Repairs');
    expect(row.pooledCents).toBe(60_000);
    // Spending, and spending here — only the funding came from elsewhere.
    expect(row.transactionCents).toBe(60_000);
    expect(row.spentCents).toBe(60_000);
    // Budget up by exactly the same, so nothing is left over or short.
    expect(row.budgetCents).toBe(find(without, 'Repairs').budgetCents + 60_000);
    expect(row.remainingCents).toBe(find(without, 'Repairs').remainingCents);

    expect(withPooled.totalPooledCents).toBe(60_000);
    expect(withPooled.totalRemainingCents).toBe(without.totalRemainingCents);
  });

  it('leaves the settlement untouched — no surplus banked, no deficit handed on', () => {
    const repairs = percentCategory('Repairs', 100);
    const categories = [repairs];

    const without = settleMonth(compute({ categories, paycheckCents: 100_000 }));
    const withPooled = settleMonth(
      compute({
        categories,
        paycheckCents: 100_000,
        transactions: [pooled(repairs.id, 600)],
      }),
    );

    // This is the whole point: the pool pays once, at the moment the expense is
    // saved. A month that also banked or clawed back the same money would be
    // spending it twice.
    expect(withPooled).toEqual(without);
  });

  it('does not enlarge the category’s share of a rollover deficit', () => {
    const repairs = percentCategory('Repairs', 50);
    const groceries = percentCategory('Groceries', 50);
    const categories = [repairs, groceries];
    const shared = { categories, paycheckCents: 200_000, deficitInCents: 40_000 };

    const without = compute(shared);
    const withPooled = compute({ ...shared, transactions: [pooled(repairs.id, 600)] });

    // Money earmarked from savings is not capacity to absorb somebody else's
    // overspend, so the cut is shared out exactly as it was.
    expect(find(withPooled, 'Repairs').cutCents).toBe(find(without, 'Repairs').cutCents);
    expect(find(withPooled, 'Groceries').cutCents).toBe(find(without, 'Groceries').cutCents);
    expect(withPooled.deficitAppliedCents).toBe(without.deficitAppliedCents);
  });

  it('still leaves a hard-set category uncut when it is holding pooled money', () => {
    const rent = fixedCategory('Rent', 1400, { hardSet: true });
    const fun = percentCategory('Fun', 100);

    const result = compute({
      categories: [rent, fun],
      paycheckCents: 300_000,
      deficitInCents: 50_000,
      transactions: [pooled(rent.id, 600)],
    });

    expect(find(result, 'Rent').cutCents).toBe(0);
    expect(find(result, 'Rent').budgetCents).toBe(140_000 + 60_000);
  });

  it('reports nothing pooled when nothing was', () => {
    const fun = percentCategory('Fun', 100);
    const result = compute({
      categories: [fun],
      paycheckCents: 100_000,
      transactions: [transaction(fun.id, 20, `${MONTH}-04`)],
    });

    expect(result.totalPooledCents).toBe(0);
    expect(find(result, 'Fun').pooledCents).toBe(0);
  });
});
