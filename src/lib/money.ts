import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '@/config/currency';

/**
 * All money in this app is integer cents. Nothing here ever produces a
 * fractional cent, which is what keeps budgets summing exactly to the paycheck.
 */

export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Parses free-text money input ("1,234.50", "$20", "") into cents. */
export function parseMoney(input: string): number {
  const cleaned = input.replace(/[^0-9.-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0;
  return toCents(Number.parseFloat(cleaned));
}

export function formatCents(
  cents: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(fromCents(cents));
}

/** Like `formatCents` but drops the decimals on whole amounts, for tight UI. */
export function formatCentsCompact(
  cents: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  const isWhole = cents % 100 === 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(fromCents(cents));
}

export function sumBy<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

/**
 * Splits `total` cents across `weights`, guaranteeing the parts sum to exactly
 * `total`. Largest-remainder method: every share is floored first, then the
 * leftover cents go one at a time to the entries with the biggest fractional
 * loss. Without this, a three-way split of $100 loses a penny.
 */
export function distributeProportionally(
  total: number,
  weights: readonly number[],
): number[] {
  if (weights.length === 0) return [];
  if (total < 0) return distributeProportionally(-total, weights).map((s) => -s);

  const weightTotal = weights.reduce((sum, w) => sum + w, 0);
  if (weightTotal <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (total * w) / weightTotal);
  const shares = exact.map((value) => Math.floor(value));
  let leftover = total - shares.reduce((sum, s) => sum + s, 0);

  // Hand out the remaining cents to the largest fractional parts, tie-break by index.
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let i = 0; leftover > 0 && i < order.length; i += 1, leftover -= 1) {
    shares[order[i].index] += 1;
  }

  return shares;
}
