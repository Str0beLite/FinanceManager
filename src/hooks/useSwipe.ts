import { useRef, useState, type TouchEvent } from 'react';
import { dampDrag, resolveAxis, resolveSwipe, type DragAxis } from '@/lib/gestures';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** False when there is nothing that way, so the drag resists instead of tracking. */
  canSwipeLeft?: boolean;
  canSwipeRight?: boolean;
  /** Horizontal distance, in px, before a drag counts as a swipe. */
  threshold?: number;
}

export interface SwipeState {
  readonly handlers: {
    onTouchStart: (event: TouchEvent) => void;
    onTouchMove: (event: TouchEvent) => void;
    onTouchEnd: (event: TouchEvent) => void;
    onTouchCancel: () => void;
  };
  /** Live travel of the page, already damped at the walls. 0 when idle. */
  readonly dx: number;
  readonly dragging: boolean;
}

/**
 * Regions where a sideways drag means something else, and must not also be
 * read as a swipe: dialogs sit above the page, and anything that scrolls
 * sideways owns the axis. Mark those with `data-swipe-ignore`.
 */
const IGNORED = '[role="dialog"], [data-swipe-ignore]';

/**
 * Horizontal swipe detection for touch screens, reporting the drag as it
 * happens so the page can follow the finger.
 *
 * Every decision it makes — is this a swipe, which axis, how far does a blocked
 * drag move — lives in `@/lib/gestures`, so the rules are testable without
 * synthesising touch events. This hook only tracks the touch points.
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft = true,
  canSwipeRight = true,
  threshold = 60,
}: SwipeOptions): SwipeState {
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<DragAxis>(null);
  const [dx, setDx] = useState(0);

  const reset = () => {
    start.current = null;
    axis.current = null;
    setDx(0);
  };

  const onTouchStart = (event: TouchEvent) => {
    // Dialogs render inside the page, so their touches bubble here. Dropping
    // the gesture at the source is what stops a drag inside a bottom sheet
    // from navigating the screen behind it.
    if (event.target instanceof Element && event.target.closest(IGNORED)) {
      reset();
      return;
    }

    const touch = event.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY };
    axis.current = null;
    setDx(0);
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!start.current) return;

    const touch = event.touches[0];
    const moveX = touch.clientX - start.current.x;
    const moveY = touch.clientY - start.current.y;

    axis.current ??= resolveAxis(moveX, moveY);
    // A scroll, settled. Let go of the gesture entirely rather than holding the
    // page a few pixels off centre for the rest of the drag.
    if (axis.current === 'vertical') {
      reset();
      return;
    }
    if (axis.current === null) return;

    setDx(dampDrag(moveX, moveX < 0 ? !canSwipeLeft : !canSwipeRight));
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!start.current) {
      setDx(0);
      return;
    }

    const touch = event.changedTouches[0];
    const direction = resolveSwipe(
      touch.clientX - start.current.x,
      touch.clientY - start.current.y,
      threshold,
    );
    reset();

    if (direction === 'left') onSwipeLeft?.();
    if (direction === 'right') onSwipeRight?.();
  };

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: reset },
    dx,
    dragging: dx !== 0,
  };
}
