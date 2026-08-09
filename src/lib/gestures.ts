export type SwipeDirection = 'left' | 'right' | null;

/**
 * Classifies a drag as a horizontal swipe, or as nothing at all.
 *
 * Requires the horizontal travel to both clear the threshold and beat the
 * vertical travel, so scrolling down a long page never changes tab by
 * accident. Pure, so the rule is testable without synthesising touch events.
 */
export function resolveSwipe(dx: number, dy: number, threshold: number): SwipeDirection {
  if (Math.abs(dx) < threshold) return null;
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? 'left' : 'right';
}

/**
 * The index `steps` away from `from` in a list of `length`, or `null` when that
 * would fall off either end.
 *
 * Clamping rather than wrapping is what makes a swipe predictable: the ends of
 * the tab bar feel like walls, so nobody swipes past the last tab and lands
 * back on the first.
 */
export function stepIndex(from: number, steps: number, length: number): number | null {
  if (from < 0 || from >= length) return null;

  const target = from + steps;
  return target < 0 || target >= length ? null : target;
}
