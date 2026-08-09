import { describe, expect, it } from 'vitest';
import { resolveSwipe, stepIndex } from '@/lib/gestures';

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
    // The whole point: dragging down the page must not change tab.
    expect(resolveSwipe(80, 400, THRESHOLD)).toBeNull();
    expect(resolveSwipe(-90, -90, THRESHOLD)).toBeNull();
  });

  it('still fires on a diagonal that is mostly horizontal', () => {
    expect(resolveSwipe(-200, 90, THRESHOLD)).toBe('left');
  });
});

describe('stepIndex', () => {
  const TABS = 4;

  it('steps to the neighbouring tab', () => {
    expect(stepIndex(0, 1, TABS)).toBe(1);
    expect(stepIndex(2, -1, TABS)).toBe(1);
  });

  it('stops at both ends instead of wrapping around', () => {
    expect(stepIndex(0, -1, TABS)).toBeNull();
    expect(stepIndex(TABS - 1, 1, TABS)).toBeNull();
  });

  it('has no neighbours for a page outside the bar', () => {
    // Settings is reachable but not a tab, so a swipe there does nothing.
    expect(stepIndex(-1, 1, TABS)).toBeNull();
    expect(stepIndex(-1, -1, TABS)).toBeNull();
  });
});
