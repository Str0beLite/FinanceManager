import { beforeEach, describe, expect, it } from 'vitest';
import { pooledTotal, settlePool } from '@/lib/pool';
import type { Transaction } from '@/types';
import { resetIds, transaction } from './helpers';

beforeEach(resetIds);

const ordinary = (dollars: number): Transaction => transaction('cat-1', dollars, '2026-03-04');
const pooled = (dollars: number): Transaction => ({ ...ordinary(dollars), fromPool: true });

describe('pooledTotal', () => {
  it('counts only what was paid from savings', () => {
    expect(pooledTotal([ordinary(20), pooled(600), ordinary(5), pooled(40)])).toBe(64_000);
  });

  it('is zero for a ledger that never touched it', () => {
    expect(pooledTotal([ordinary(20), ordinary(5)])).toBe(0);
    expect(pooledTotal([])).toBe(0);
  });
});

describe('settlePool', () => {
  const POOL = 100_000;

  it('takes an expense out of savings when one is added', () => {
    const before: Transaction[] = [ordinary(20)];
    expect(settlePool(POOL, before, [...before, pooled(600)])).toBe(POOL - 60_000);
  });

  it('puts it back when the expense is deleted', () => {
    const charge = pooled(600);
    expect(settlePool(POOL - 60_000, [ordinary(20), charge], [ordinary(20)])).toBe(POOL);
  });

  it('follows the amount when it is edited', () => {
    const charge = pooled(600);
    const cheaper = { ...charge, amountCents: 45_000 };
    expect(settlePool(POOL - 60_000, [charge], [cheaper])).toBe(POOL - 45_000);
  });

  it('refunds it in full when it stops being paid from savings', () => {
    const charge = pooled(600);
    const { fromPool: _fromPool, ...ordinaryAgain } = charge;
    expect(settlePool(POOL - 60_000, [charge], [ordinaryAgain])).toBe(POOL);
  });

  it('charges it when an ordinary expense becomes one paid from savings', () => {
    const charge = ordinary(600);
    expect(settlePool(POOL, [charge], [{ ...charge, fromPool: true }])).toBe(POOL - 60_000);
  });

  it('moves nothing when the change touched no pooled expense', () => {
    const before = [ordinary(20), pooled(600)];
    const after = [{ ...before[0], amountCents: 999 }, before[1]];
    expect(settlePool(POOL, before, after)).toBe(POOL);
  });

  it('handles a bank amendment and a bank retraction, which are the same thing here', () => {
    const charge = pooled(600);
    const amended = { ...charge, amountCents: 72_500 };
    expect(settlePool(POOL - 60_000, [charge], [amended])).toBe(POOL - 72_500);
    expect(settlePool(POOL - 60_000, [charge], [])).toBe(POOL);
  });

  it('lets savings go under water rather than losing the expense', () => {
    expect(settlePool(40_000, [], [pooled(600)])).toBe(-20_000);
  });

  it('is exactly reversible, so nothing drifts over a long ledger', () => {
    const before = [ordinary(20), pooled(600), pooled(15)];
    const after = [ordinary(20), pooled(80), ordinary(15), pooled(200)];
    const forward = settlePool(POOL, before, after);
    expect(settlePool(forward, after, before)).toBe(POOL);
  });
});
