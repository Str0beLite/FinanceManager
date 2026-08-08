import { describe, expect, it } from 'vitest';
import {
  addMonths,
  daysInMonth,
  isMonthKey,
  monthKeyOf,
  monthsBetween,
  nextMonthKey,
  ordinal,
  prevMonthKey,
} from '@/lib/dates';

describe('month keys', () => {
  it('wraps across year boundaries in both directions', () => {
    expect(nextMonthKey('2026-12')).toBe('2027-01');
    expect(prevMonthKey('2026-01')).toBe('2025-12');
    expect(addMonths('2026-11', 4)).toBe('2027-03');
    expect(addMonths('2026-02', -14)).toBe('2024-12');
  });

  it('measures the gap between two months', () => {
    expect(monthsBetween('2026-01', '2026-04')).toBe(3);
    expect(monthsBetween('2026-01', '2027-01')).toBe(12);
    expect(monthsBetween('2026-06', '2026-01')).toBe(-5);
  });

  it('derives the key from a local date without drifting a month', () => {
    // Last instant of the month in local time — a UTC-based conversion would slip.
    expect(monthKeyOf(new Date(2026, 2, 31, 23, 59))).toBe('2026-03');
    expect(monthKeyOf(new Date(2026, 0, 1, 0, 0))).toBe('2026-01');
  });

  it('validates format', () => {
    expect(isMonthKey('2026-03')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('2026-3')).toBe(false);
  });

  it('knows month lengths including leap years', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-04')).toBe(30);
  });
});

describe('ordinal', () => {
  it('handles the irregular suffixes', () => {
    expect(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']).toEqual([
      ordinal(1),
      ordinal(2),
      ordinal(3),
      ordinal(4),
      ordinal(11),
      ordinal(12),
      ordinal(13),
      ordinal(21),
      ordinal(22),
    ]);
  });
});
