import { beforeEach, describe, expect, it } from 'vitest';
import { annualCostCents, isDueInMonth, subscriptionsDueInMonth } from '@/lib/subscriptions';
import { resetIds, subscription } from './helpers';

beforeEach(resetIds);

describe('isDueInMonth', () => {
  it('bills a monthly subscription every month from its start', () => {
    const netflix = subscription('cat-1', 15, { startMonth: '2026-02' });
    expect(isDueInMonth(netflix, '2026-01')).toBe(false);
    expect(isDueInMonth(netflix, '2026-02')).toBe(true);
    expect(isDueInMonth(netflix, '2026-03')).toBe(true);
    expect(isDueInMonth(netflix, '2027-01')).toBe(true);
  });

  it('keeps a quarterly subscription on the phase set by its start month', () => {
    const quarterly = subscription('cat-1', 45, {
      cadence: 'quarterly',
      startMonth: '2026-02',
    });
    expect(isDueInMonth(quarterly, '2026-02')).toBe(true);
    expect(isDueInMonth(quarterly, '2026-03')).toBe(false);
    expect(isDueInMonth(quarterly, '2026-05')).toBe(true);
    expect(isDueInMonth(quarterly, '2026-08')).toBe(true);
    expect(isDueInMonth(quarterly, '2026-11')).toBe(true);
    expect(isDueInMonth(quarterly, '2027-02')).toBe(true);
  });

  it('bills an annual subscription in its anniversary month only', () => {
    const annual = subscription('cat-1', 120, { cadence: 'annual', startMonth: '2026-07' });
    expect(isDueInMonth(annual, '2026-07')).toBe(true);
    expect(isDueInMonth(annual, '2026-08')).toBe(false);
    expect(isDueInMonth(annual, '2027-07')).toBe(true);
  });

  it('stops after the end month and while inactive', () => {
    const ended = subscription('cat-1', 10, { startMonth: '2026-01', endMonth: '2026-03' });
    expect(isDueInMonth(ended, '2026-03')).toBe(true);
    expect(isDueInMonth(ended, '2026-04')).toBe(false);

    const paused = subscription('cat-1', 10, { active: false });
    expect(isDueInMonth(paused, '2026-06')).toBe(false);
  });
});

describe('subscriptionsDueInMonth', () => {
  it('returns only the subscriptions billing that month', () => {
    const monthly = subscription('cat-1', 15, { startMonth: '2026-01' });
    const annual = subscription('cat-1', 99, { cadence: 'annual', startMonth: '2026-01' });
    const due = subscriptionsDueInMonth([monthly, annual], '2026-04');
    expect(due).toEqual([monthly]);
  });
});

describe('annualCostCents', () => {
  it('normalises every cadence to a yearly figure', () => {
    expect(annualCostCents(subscription('c', 15))).toBe(18_000);
    expect(annualCostCents(subscription('c', 45, { cadence: 'quarterly' }))).toBe(18_000);
    expect(annualCostCents(subscription('c', 120, { cadence: 'annual' }))).toBe(12_000);
  });
});
