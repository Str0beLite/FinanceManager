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

export type DragAxis = 'horizontal' | 'vertical' | null;

/**
 * Which way a drag has committed, or `null` while it is too small to tell.
 *
 * A finger resting on the screen wobbles by a pixel or two, so guessing from
 * the first movement would start the page sliding under what was meant to be a
 * tap. Once past `slop` the axis is settled and stays settled — a swipe that
 * drifts downward mid-gesture is still a swipe.
 */
export function resolveAxis(dx: number, dy: number, slop = 12): DragAxis {
  if (Math.abs(dx) < slop && Math.abs(dy) < slop) return null;
  return Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
}

/** How much of a blocked drag shows: a quarter of it, and never past this. */
const WALL_RESISTANCE = 0.25;
const WALL_LIMIT_PX = 64;

/**
 * How far the page moves for a finger that has travelled `dx`.
 *
 * One-for-one when there is a tab that way. At the ends of the bar it gives a
 * little and then stops, so a wall is something you feel push back rather than
 * something that ignores you.
 */
export function dampDrag(dx: number, blocked: boolean): number {
  if (!blocked) return dx;
  const damped = dx * WALL_RESISTANCE;
  return Math.max(-WALL_LIMIT_PX, Math.min(WALL_LIMIT_PX, damped));
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
