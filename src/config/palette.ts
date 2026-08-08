/**
 * Colours offered when creating a category. Plain hex so they can be dropped
 * straight into inline styles and SVG fills without a Tailwind class lookup.
 */
export const CATEGORY_COLORS: readonly string[] = [
  '#6366f1',
  '#0ea5e9',
  '#14b8a6',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#a855f7',
  '#64748b',
];

/** Picks the next unused colour, cycling once every colour is taken. */
export function nextCategoryColor(usedColors: readonly string[]): string {
  const free = CATEGORY_COLORS.find((c) => !usedColors.includes(c));
  return free ?? CATEGORY_COLORS[usedColors.length % CATEGORY_COLORS.length];
}
