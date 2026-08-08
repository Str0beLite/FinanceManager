import type {
  Category,
  CategoryComputation,
  IncomeEntry,
  MonthComputation,
  Settlement,
  Subscription,
  Transaction,
} from '@/types';
import { monthKeyOfIsoDate } from './dates';
import { distributeProportionally, sumBy } from './money';
import { subscriptionsDueInMonth } from './subscriptions';

export interface ComputeMonthInput {
  readonly monthKey: string;
  readonly categories: readonly Category[];
  readonly subscriptions: readonly Subscription[];
  readonly transactions: readonly Transaction[];
  readonly incomes: readonly IncomeEntry[];
  /** Resolved paycheck for this month (override already applied). */
  readonly paycheckCents: number;
  /** Deficit carried in from the previous month. Positive means "claw back". */
  readonly deficitInCents: number;
}

/**
 * Turns raw records into the full financial picture of one month.
 *
 * Pure, and the single source of truth for every number the UI shows — no
 * component does its own arithmetic on top of this.
 *
 * The order matters:
 *   1. income  = paycheck + any extra income logged this month
 *   2. fixed-amount categories take their exact cut off the top
 *   3. percentage categories split whatever is left
 *   4. a rollover deficit is clawed back from the flexible categories only,
 *      leaving hard-set categories at exactly their full amount
 */
export function computeMonth(input: ComputeMonthInput): MonthComputation {
  const {
    monthKey,
    categories,
    subscriptions,
    transactions,
    incomes,
    paycheckCents,
    deficitInCents,
  } = input;

  const monthTransactions = transactions.filter(
    (t) => monthKeyOfIsoDate(t.date) === monthKey,
  );
  const monthSubscriptions = subscriptionsDueInMonth(subscriptions, monthKey);
  const extraIncomeCents = sumBy(
    incomes.filter((i) => monthKeyOfIsoDate(i.date) === monthKey),
    (i) => i.amountCents,
  );

  const spentByCategory = tallySpending(monthSubscriptions, monthTransactions);

  // An archived category still shows up if money moved through it this month,
  // so spending can never quietly vanish from the totals.
  const relevant = categories.filter(
    (category) => !category.archived || spentByCategory.has(category.id),
  );

  const incomeCents = paycheckCents + extraIncomeCents;
  const fixedCategories = relevant.filter((c) => c.allocationType === 'fixed');
  const percentCategories = relevant.filter((c) => c.allocationType === 'percent');

  const fixedTotalCents = sumBy(fixedCategories, (c) => c.fixedCents);
  const percentPoolCents = Math.max(0, incomeCents - fixedTotalCents);

  // Percentages split the remainder exactly — no cent is created or lost.
  const percentShares = distributeProportionally(
    percentPoolCents,
    percentCategories.map((c) => c.percentBp),
  );
  const baseByCategory = new Map<string, number>();
  fixedCategories.forEach((c) => baseByCategory.set(c.id, c.fixedCents));
  percentCategories.forEach((c, i) => baseByCategory.set(c.id, percentShares[i]));

  const cutByCategory = applyDeficit(relevant, baseByCategory, deficitInCents);
  const deficitAppliedCents = sumBy([...cutByCategory.values()], (v) => v);

  const computedCategories = relevant.map((category) =>
    buildCategoryComputation(
      category,
      baseByCategory.get(category.id) ?? 0,
      cutByCategory.get(category.id) ?? 0,
      spentByCategory.get(category.id),
    ),
  );

  const totalBudgetCents = sumBy(computedCategories, (c) => c.budgetCents);
  const totalSpentCents = sumBy(computedCategories, (c) => c.spentCents);

  return {
    monthKey,
    paycheckCents,
    extraIncomeCents,
    incomeCents,
    fixedTotalCents,
    percentPoolCents,
    overcommitted: fixedTotalCents > incomeCents,
    deficitInCents,
    deficitAppliedCents,
    unabsorbedDeficitCents: deficitInCents - deficitAppliedCents,
    categories: computedCategories,
    totalBudgetCents,
    totalSpentCents,
    totalRemainingCents: totalBudgetCents - totalSpentCents,
  };
}

/**
 * Closes a month: under-spending becomes savings, over-spending becomes next
 * month's problem.
 *
 * The pool is deliberately *not* raided to cover an overspend — every month
 * settles on its own, so the pool only ever grows. (The dashboard offers an
 * explicit button to spend it against a deficit when you actually want that.)
 */
export function settleMonth(computation: MonthComputation): Settlement {
  const deltaCents = computation.totalRemainingCents;
  return {
    monthKey: computation.monthKey,
    deltaCents,
    poolChangeCents: Math.max(0, deltaCents),
    // Anything the flexible categories couldn't absorb rolls on rather than vanishing.
    nextDeficitCents:
      Math.max(0, -deltaCents) + computation.unabsorbedDeficitCents,
  };
}

interface Spending {
  subscriptionCents: number;
  transactionCents: number;
}

function tallySpending(
  dueSubscriptions: readonly Subscription[],
  monthTransactions: readonly Transaction[],
): Map<string, Spending> {
  const totals = new Map<string, Spending>();
  const bucket = (categoryId: string): Spending => {
    const existing = totals.get(categoryId);
    if (existing) return existing;
    const created = { subscriptionCents: 0, transactionCents: 0 };
    totals.set(categoryId, created);
    return created;
  };

  // Subscriptions are committed in full on day one of the month they bill,
  // so "remaining" never hides a charge that is still to land.
  dueSubscriptions.forEach((s) => {
    bucket(s.categoryId).subscriptionCents += s.amountCents;
  });
  monthTransactions.forEach((t) => {
    bucket(t.categoryId).transactionCents += t.amountCents;
  });

  return totals;
}

/**
 * Spreads a rollover deficit across the categories that are allowed to shrink,
 * proportionally to how much budget each has.
 *
 * Hard-set categories are skipped entirely — that is the whole point of the
 * flag. If the flexible categories together can't cover the deficit they all go
 * to zero, and `computeMonth` rolls the shortfall into the next month.
 */
function applyDeficit(
  categories: readonly Category[],
  baseByCategory: ReadonlyMap<string, number>,
  deficitInCents: number,
): Map<string, number> {
  const cuts = new Map<string, number>();
  if (deficitInCents <= 0) return cuts;

  const flexible = categories.filter((c) => !c.hardSet);
  const bases = flexible.map((c) => baseByCategory.get(c.id) ?? 0);
  const capacity = bases.reduce((sum, base) => sum + base, 0);
  if (capacity <= 0) return cuts;

  const absorbed = Math.min(deficitInCents, capacity);
  const shares = distributeProportionally(absorbed, bases);
  flexible.forEach((category, i) => {
    if (shares[i] > 0) cuts.set(category.id, shares[i]);
  });

  return cuts;
}

function buildCategoryComputation(
  category: Category,
  baseCents: number,
  cutCents: number,
  spending: Spending | undefined,
): CategoryComputation {
  const budgetCents = Math.max(0, baseCents - cutCents);
  const subscriptionCents = spending?.subscriptionCents ?? 0;
  const transactionCents = spending?.transactionCents ?? 0;
  const spentCents = subscriptionCents + transactionCents;

  return {
    categoryId: category.id,
    name: category.name,
    color: category.color,
    hardSet: category.hardSet,
    allocationType: category.allocationType,
    baseCents,
    cutCents,
    budgetCents,
    subscriptionCents,
    transactionCents,
    spentCents,
    remainingCents: budgetCents - spentCents,
    usageRatio: budgetCents > 0 ? spentCents / budgetCents : spentCents > 0 ? 1 : 0,
  };
}
