import { computeMonth, settleMonth } from '@/lib/budget';
import { nextMonthKey } from '@/lib/dates';
import { canReopenMonth, getMonthRecord, resolvePaycheckCents } from '@/lib/months';
import type { AppState, MonthRecord } from '@/types';

export type MonthAction =
  | { type: 'month/setPaycheck'; key: string; paycheckCents: number | null }
  | { type: 'month/close'; key: string }
  | { type: 'month/reopen'; key: string }
  /** Spends savings to shrink a deficit the previous month handed down. */
  | { type: 'month/applyPool'; key: string; amountCents: number };

export function monthsReducer(state: AppState, action: MonthAction): AppState {
  switch (action.type) {
    case 'month/setPaycheck': {
      const record = getMonthRecord(state, action.key);
      if (record.closed) return state;
      return writeMonths(state, {
        [action.key]: { ...record, paycheckCents: action.paycheckCents },
      });
    }

    case 'month/close':
      return closeMonth(state, action.key);

    case 'month/reopen':
      return reopenMonth(state, action.key);

    case 'month/applyPool':
      return applyPool(state, action.key, action.amountCents);

    default:
      return state;
  }
}

/**
 * Freezes the month's numbers, banks any surplus, and hands any overspend to
 * the following month as a deficit.
 */
function closeMonth(state: AppState, key: string): AppState {
  const record = getMonthRecord(state, key);
  if (record.closed) return state;

  const computation = computeMonth({
    monthKey: key,
    categories: state.categories,
    subscriptions: state.subscriptions,
    transactions: state.transactions,
    incomes: state.incomes,
    paycheckCents: resolvePaycheckCents(state, key),
    deficitInCents: record.deficitInCents,
  });
  const settlement = settleMonth(computation);

  const followingKey = nextMonthKey(key);
  const following = getMonthRecord(state, followingKey);

  return {
    ...writeMonths(state, {
      // The snapshot is what History reads, so later edits can't rewrite the past.
      [key]: { ...record, closed: true, snapshot: { computation, settlement } },
      [followingKey]: { ...following, deficitInCents: settlement.nextDeficitCents },
    }),
    rolloverPoolCents: state.rolloverPoolCents + settlement.poolChangeCents,
  };
}

/** Exact inverse of `closeMonth`, including any pool since spent on the deficit. */
function reopenMonth(state: AppState, key: string): AppState {
  const record = state.months[key];
  if (!record?.closed || !record.snapshot || !canReopenMonth(state, key)) return state;

  const { settlement } = record.snapshot;
  const followingKey = nextMonthKey(key);
  const following = getMonthRecord(state, followingKey);

  return {
    ...writeMonths(state, {
      [key]: { ...record, closed: false, snapshot: null },
      [followingKey]: { ...following, deficitInCents: 0, poolAppliedCents: 0 },
    }),
    rolloverPoolCents:
      state.rolloverPoolCents - settlement.poolChangeCents + following.poolAppliedCents,
  };
}

/**
 * The deliberate escape hatch from the settle-every-month rule: months never
 * raid savings on their own, but you can choose to spend the pool on a deficit.
 */
function applyPool(state: AppState, key: string, amountCents: number): AppState {
  const record = getMonthRecord(state, key);
  const amount = Math.min(amountCents, state.rolloverPoolCents, record.deficitInCents);
  if (amount <= 0) return state;

  return {
    ...writeMonths(state, {
      [key]: {
        ...record,
        deficitInCents: record.deficitInCents - amount,
        poolAppliedCents: record.poolAppliedCents + amount,
      },
    }),
    rolloverPoolCents: state.rolloverPoolCents - amount,
  };
}

function writeMonths(state: AppState, updates: Record<string, MonthRecord>): AppState {
  return { ...state, months: { ...state.months, ...updates } };
}
