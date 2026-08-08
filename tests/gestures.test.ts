import { describe, expect, it } from 'vitest';
import { resolveSwipe } from '@/lib/gestures';

const THRESHOLD = 60;

describe('resolveSwipe', () => {
  it('reads a clear sideways drag as a swipe', () => {
    expect(resolveSwipe(-120, 5, THRESHOLD)).toBe('left');
    expect(resolveSwipe(120, -5, THRESHOLD)).toBe('right');
  });

  it('ignores a drag that never clears the threshold', () => {
    expect(resolveSwipe(-59, 0, THRESHOLD)).toBeNull();
    expect(resolveSwipe(0, 0, THRESHOLD)).toBeNull();
  });

  it('ignores a scroll, even a long diagonal one', () => {
    // The whole point: dragging down the page must not change the month.
    expect(resolveSwipe(80, 400, THRESHOLD)).toBeNull();
    expect(resolveSwipe(-90, -90, THRESHOLD)).toBeNull();
  });

  it('still fires on a diagonal that is mostly horizontal', () => {
    expect(resolveSwipe(-200, 90, THRESHOLD)).toBe('left');
  });
});
