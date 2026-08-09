/**
 * Months are identified by a `YYYY-MM` string throughout the app. Working with
 * strings rather than Date objects keeps every month calculation timezone-proof
 * — a Date at midnight UTC can silently land in the previous month locally.
 */

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string): boolean {
  return MONTH_KEY_PATTERN.test(value);
}

/** `YYYY-MM` for the month a given local date falls in. Defaults to today. */
export function monthKeyOf(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

/** The `YYYY-MM` prefix of an ISO `YYYY-MM-DD` date string. */
export function monthKeyOfIsoDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Today as `YYYY-MM-DD` in local time — the default for new date inputs. */
export function todayIsoDate(date: Date = new Date()): string {
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${monthKeyOf(date)}-${day}`;
}

/**
 * The date a new expense in `key` should open on.
 *
 * Today, whenever today is inside the month being viewed — which is nearly
 * always, and is nearly always the date meant. Browsing another month falls
 * back to its first day, because today is not in it to offer.
 */
export function defaultDateInMonth(key: string, date: Date = new Date()): string {
  return key === monthKeyOf(date) ? todayIsoDate(date) : `${key}-01`;
}

function parseMonthKey(key: string): { year: number; month: number } {
  const [year, month] = key.split('-').map(Number);
  return { year, month };
}

export function addMonths(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key);
  // Shift to a 0-based absolute month count so the arithmetic wraps years for us.
  const absolute = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(absolute / 12);
  // JS % keeps the sign of the dividend, so normalise before adding 1.
  const nextMonth = `${(((absolute % 12) + 12) % 12) + 1}`.padStart(2, '0');
  return `${nextYear}-${nextMonth}`;
}

export const nextMonthKey = (key: string): string => addMonths(key, 1);
export const prevMonthKey = (key: string): string => addMonths(key, -1);

/** Whole months from `from` to `to`. Negative when `to` is earlier. */
export function monthsBetween(from: string, to: string): number {
  const a = parseMonthKey(from);
  const b = parseMonthKey(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}

export function compareMonthKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

/** "August 2026" */
export function formatMonthLabel(key: string, locale = 'en-US'): string {
  const { year, month } = parseMonthKey(key);
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  return formatter.format(new Date(year, month - 1, 1));
}

/** "Aug 2026" — for tables and tight spaces. */
export function formatMonthLabelShort(key: string, locale = 'en-US'): string {
  const { year, month } = parseMonthKey(key);
  const formatter = new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' });
  return formatter.format(new Date(year, month - 1, 1));
}

/** "12 Aug" — for transaction rows, where the year is implied by the month. */
export function formatDayLabel(isoDate: string, locale = 'en-US'): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  return formatter.format(new Date(year, month - 1, day));
}

export function daysInMonth(key: string): number {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 0).getDate();
}

/** Adds an ordinal suffix for billing days: 1 → "1st", 22 → "22nd". */
export function ordinal(day: number): string {
  const remainderTen = day % 10;
  const remainderHundred = day % 100;
  if (remainderTen === 1 && remainderHundred !== 11) return `${day}st`;
  if (remainderTen === 2 && remainderHundred !== 12) return `${day}nd`;
  if (remainderTen === 3 && remainderHundred !== 13) return `${day}rd`;
  return `${day}th`;
}
