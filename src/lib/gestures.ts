export type SwipeDirection = 'left' | 'right' | null;

/**
 * Classifies a drag as a horizontal swipe, or as nothing at all.
 *
 * Requires the horizontal travel to both clear the threshold and beat the
 * vertical travel, so scrolling down a long page never flips the month by
 * accident. Pure, so the rule is testable without synthesising touch events.
 */
export function resolveSwipe(dx: number, dy: number, threshold: number): SwipeDirection {
  if (Math.abs(dx) < threshold) return null;
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? 'left' : 'right';
}
