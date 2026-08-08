import { describe, expect, it } from 'vitest';
import {
  distributeProportionally,
  formatCents,
  parseMoney,
  toCents,
} from '@/lib/money';

describe('toCents / parseMoney', () => {
  it('rounds to whole cents rather than carrying float error', () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it('strips currency symbols and separators', () => {
    expect(parseMoney('$1,234.50')).toBe(123450);
    expect(parseMoney('20')).toBe(2000);
  });

  it('treats empty or partial input as zero', () => {
    expect(parseMoney('')).toBe(0);
    expect(parseMoney('.')).toBe(0);
    expect(parseMoney('-')).toBe(0);
  });
});

describe('distributeProportionally', () => {
  it('never loses or invents a cent on an uneven split', () => {
    // $100 three ways is the classic case: 3333.33... cents each.
    const shares = distributeProportionally(10_000, [1, 1, 1]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10_000);
    expect(shares).toEqual([3334, 3333, 3333]);
  });

  it('sums to the total across many random splits', () => {
    for (let i = 0; i < 200; i += 1) {
      const total = Math.floor(Math.random() * 1_000_000);
      const weights = Array.from({ length: 7 }, () => Math.floor(Math.random() * 100));
      const shares = distributeProportionally(total, weights);
      const summed = shares.reduce((a, b) => a + b, 0);
      // A zero weight total means nothing can be split, which is its own case.
      if (weights.some((w) => w > 0)) expect(summed).toBe(total);
    }
  });

  it('gives every cent back when weights match the total exactly', () => {
    expect(distributeProportionally(500, [200, 300])).toEqual([200, 300]);
  });

  it('returns zeroes when there is nothing to weight against', () => {
    expect(distributeProportionally(1000, [0, 0])).toEqual([0, 0]);
    expect(distributeProportionally(1000, [])).toEqual([]);
  });
});

describe('formatCents', () => {
  it('renders cents as currency', () => {
    expect(formatCents(123456, 'USD', 'en-US')).toBe('$1,234.56');
    expect(formatCents(-500, 'USD', 'en-US')).toBe('-$5.00');
  });
});
