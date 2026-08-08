import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyState } from '@/lib/storage';
import { rootReducer } from '@/store/rootReducer';
import type { AppAction } from '@/store/rootReducer';
import type { AppState } from '@/types';
import { fixedCategory, percentCategory, resetIds, transaction } from './helpers';

const MONTH = '2026-03';
const NEXT = '2026-04';

const rent = fixedCategory('Rent', 1400, { hardSet: true });
const fun = percentCategory('Fun', 100);

function baseState(overrides: Partial<AppState> = {}): AppState {
  const empty = createEmptyState();
  return {
    ...empty,
    categories: [rent, fun],
    settings: { ...empty.settings, defaultPaycheckCents: 300_000 },
    ...overrides,
  };
}

const run = (state: AppState, ...actions: AppAction[]): AppState =>
  actions.reduce(rootReducer, state);

beforeEach(resetIds);

describe('closing a month', () => {
  it('banks the surplus and leaves next month at full budget', () => {
    const state = run(
      baseState({ transactions: [transaction(fun.id, 1_000, `${MONTH}-05`)] }),
      { type: 'month/close', key: MONTH },
    );

    // Budget $3,000, spent $1,000 → $2,000 banked.
    expect(state.rolloverPoolCents).toBe(200_000);
    expect(state.months[MONTH].closed).toBe(true);
    expect(state.months[MONTH].snapshot).not.toBeNull();
    expect(state.months[NEXT]?.deficitInCents ?? 0).toBe(0);
  });

  it('hands an overspend to the next month without touching the pool', () => {
    const state = run(
      baseState({
        rolloverPoolCents: 50_000,
        transactions: [transaction(fun.id, 3_120, `${MONTH}-05`)],
      }),
      { type: 'month/close', key: MONTH },
    );

    expect(state.rolloverPoolCents).toBe(50_000);
    expect(state.months[NEXT].deficitInCents).toBe(12_000);
  });

  it('refuses to close the same month twice', () => {
    const closed = run(baseState(), { type: 'month/close', key: MONTH });
    const again = run(closed, { type: 'month/close', key: MONTH });
    expect(again).toBe(closed);
  });

  it('freezes the snapshot against later category edits', () => {
    const closed = run(
      baseState({ transactions: [transaction(fun.id, 1_000, `${MONTH}-05`)] }),
      { type: 'month/close', key: MONTH },
    );

    const edited = run(closed, {
      type: 'category/update',
      id: fun.id,
      changes: { percentBp: 5_000 },
    });

    expect(edited.months[MONTH].snapshot?.computation.totalBudgetCents).toBe(300_000);
  });
});

describe('reopening a month', () => {
  it('exactly reverses the close', () => {
    const start = baseState({ transactions: [transaction(fun.id, 1_000, `${MONTH}-05`)] });
    const roundTrip = run(
      start,
      { type: 'month/close', key: MONTH },
      { type: 'month/reopen', key: MONTH },
    );

    expect(roundTrip.rolloverPoolCents).toBe(start.rolloverPoolCents);
    expect(roundTrip.months[MONTH].closed).toBe(false);
    expect(roundTrip.months[MONTH].snapshot).toBeNull();
    expect(roundTrip.months[NEXT].deficitInCents).toBe(0);
  });

  it('will not reopen a month once a later one is closed', () => {
    const state = run(
      baseState(),
      { type: 'month/close', key: MONTH },
      { type: 'month/close', key: NEXT },
    );

    expect(run(state, { type: 'month/reopen', key: MONTH })).toBe(state);
  });
});

describe('spending the pool on a deficit', () => {
  it('moves money from savings into the month and shrinks the deficit', () => {
    const state = run(
      baseState({
        rolloverPoolCents: 50_000,
        transactions: [transaction(fun.id, 3_120, `${MONTH}-05`)],
      }),
      { type: 'month/close', key: MONTH },
      { type: 'month/applyPool', key: NEXT, amountCents: 12_000 },
    );

    expect(state.months[NEXT].deficitInCents).toBe(0);
    expect(state.months[NEXT].poolAppliedCents).toBe(12_000);
    expect(state.rolloverPoolCents).toBe(38_000);
  });

  it('never spends more than the pool holds or the deficit needs', () => {
    const state = run(
      baseState({
        rolloverPoolCents: 5_000,
        transactions: [transaction(fun.id, 3_120, `${MONTH}-05`)],
      }),
      { type: 'month/close', key: MONTH },
      { type: 'month/applyPool', key: NEXT, amountCents: 999_999 },
    );

    expect(state.rolloverPoolCents).toBe(0);
    expect(state.months[NEXT].deficitInCents).toBe(7_000);
  });

  it('refunds pool spent on the deficit when the earlier month is reopened', () => {
    const start = baseState({
      rolloverPoolCents: 50_000,
      transactions: [transaction(fun.id, 3_120, `${MONTH}-05`)],
    });

    const state = run(
      start,
      { type: 'month/close', key: MONTH },
      { type: 'month/applyPool', key: NEXT, amountCents: 12_000 },
      { type: 'month/reopen', key: MONTH },
    );

    // Without the refund the $120 drawn from savings would vanish.
    expect(state.rolloverPoolCents).toBe(50_000);
    expect(state.months[NEXT].poolAppliedCents).toBe(0);
    expect(state.months[NEXT].deficitInCents).toBe(0);
  });
});

describe('paycheck overrides', () => {
  it('overrides just one month and can fall back to the default', () => {
    const overridden = run(baseState(), {
      type: 'month/setPaycheck',
      key: MONTH,
      paycheckCents: 400_000,
    });
    expect(overridden.months[MONTH].paycheckCents).toBe(400_000);

    const reset = run(overridden, {
      type: 'month/setPaycheck',
      key: MONTH,
      paycheckCents: null,
    });
    expect(reset.months[MONTH].paycheckCents).toBeNull();
  });

  it('ignores paycheck edits on a closed month', () => {
    const closed = run(baseState(), { type: 'month/close', key: MONTH });
    const attempted = run(closed, {
      type: 'month/setPaycheck',
      key: MONTH,
      paycheckCents: 999_900,
    });
    expect(attempted).toBe(closed);
  });
});

describe('deleting a category', () => {
  it('takes its transactions and subscriptions with it', () => {
    const state = run(
      baseState({ transactions: [transaction(fun.id, 50, `${MONTH}-05`)] }),
      { type: 'category/delete', id: fun.id },
    );

    expect(state.categories).toHaveLength(1);
    expect(state.transactions).toHaveLength(0);
  });
});
