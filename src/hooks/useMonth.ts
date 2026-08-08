import { useMemo } from 'react';
import { computeMonth } from '@/lib/budget';
import {
  canCloseMonth,
  canReopenMonth,
  getMonthRecord,
  knownMonthKeys,
  resolvePaycheckCents,
} from '@/lib/months';
import type { AppState, MonthComputation, MonthRecord } from '@/types';
import { useApp } from './useApp';

export interface MonthView {
  readonly monthKey: string;
  readonly record: MonthRecord;
  /** For a closed month this is the frozen snapshot, not a fresh calculation. */
  readonly computation: MonthComputation;
  readonly paycheckCents: number;
  readonly isClosed: boolean;
  readonly canClose: boolean;
  readonly canReopen: boolean;
}

/**
 * Everything about one month, computed once.
 *
 * A closed month reads back its snapshot so history stays fixed even if
 * categories are edited afterwards; an open month is recalculated live.
 */
export function useMonthView(monthKey: string): MonthView {
  const { state } = useApp();
  return useMemo(() => buildMonthView(state, monthKey), [state, monthKey]);
}

/** The month currently selected in the UI. */
export function useCurrentMonth(): MonthView & { selectMonth: (key: string) => void } {
  const { selectedMonth, selectMonth } = useApp();
  const view = useMonthView(selectedMonth);
  return { ...view, selectMonth };
}

export function useKnownMonths(): string[] {
  const { state } = useApp();
  return useMemo(() => knownMonthKeys(state), [state]);
}

export function buildMonthView(state: AppState, monthKey: string): MonthView {
  const record = getMonthRecord(state, monthKey);
  const paycheckCents = resolvePaycheckCents(state, monthKey);

  const computation =
    record.closed && record.snapshot
      ? record.snapshot.computation
      : computeMonth({
          monthKey,
          categories: state.categories,
          subscriptions: state.subscriptions,
          transactions: state.transactions,
          incomes: state.incomes,
          paycheckCents,
          deficitInCents: record.deficitInCents,
        });

  return {
    monthKey,
    record,
    computation,
    paycheckCents,
    isClosed: record.closed,
    canClose: canCloseMonth(state, monthKey),
    canReopen: canReopenMonth(state, monthKey),
  };
}
