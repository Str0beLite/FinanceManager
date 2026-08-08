import { useCallback } from 'react';
import { formatCents, formatCentsCompact } from '@/lib/money';
import { useSettings } from './useApp';

/**
 * Currency formatters already bound to the user's chosen currency and locale,
 * so no component has to remember to pass them through.
 */
export function useMoney() {
  const { currency, locale } = useSettings();

  const format = useCallback(
    (cents: number) => formatCents(cents, currency, locale),
    [currency, locale],
  );

  const formatCompact = useCallback(
    (cents: number) => formatCentsCompact(cents, currency, locale),
    [currency, locale],
  );

  /** Always shows a leading + or −. For deltas, where direction is the point. */
  const formatSigned = useCallback(
    (cents: number) => `${cents >= 0 ? '+' : '−'}${formatCents(Math.abs(cents), currency, locale)}`,
    [currency, locale],
  );

  return { format, formatCompact, formatSigned };
}
