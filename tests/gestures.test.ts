import { describe, expect, it } from 'vitest';
import { dampDrag, resolveAxis, resolveSwipe, stepIndex } from '@/lib/gestures';

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

describe('resolveAxis', () => {
  it('holds off until the drag is bigger than a wobble', () => {
    expect(resolveAxis(0, 0)).toBeNull();
    expect(resolveAxis(11, -11)).toBeNull();
  });

  it('commits to whichever axis has moved further', () => {
    expect(resolveAxis(40, 10)).toBe('horizontal');
    expect(resolveAxis(-40, 10)).toBe('horizontal');
    expect(resolveAxis(10, 40)).toBe('vertical');
  });

  it('calls a diagonal a scroll, because a page that scrolls is the common case', () => {
    expect(resolveAxis(30, 30)).toBe('vertical');
  });
});

describe('dampDrag', () => {
  it('tracks the finger exactly when there is a tab that way', () => {
    expect(dampDrag(87, false)).toBe(87);
    expect(dampDrag(-87, false)).toBe(-87);
  });

  it('gives a little at a wall, in the direction pushed', () => {
    expect(dampDrag(80, true)).toBe(20);
    expect(dampDrag(-80, true)).toBe(-20);
  });

  it('stops giving, so the wall stays a wall however hard it is pushed', () => {
    expect(dampDrag(4000, true)).toBe(64);
    expect(dampDrag(-4000, true)).toBe(-64);
  });
});
