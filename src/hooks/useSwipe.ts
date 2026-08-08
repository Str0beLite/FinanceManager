import { useRef, type TouchEvent } from 'react';
import { resolveSwipe } from '@/lib/gestures';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Horizontal distance, in px, before a drag counts as a swipe. */
  threshold?: number;
}

/**
 * Horizontal swipe detection for touch screens. The decision itself lives in
 * `resolveSwipe`; this hook only tracks the touch points.
 */
export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 60 }: SwipeOptions) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!start.current) return;
    const touch = event.changedTouches[0];
    const direction = resolveSwipe(
      touch.clientX - start.current.x,
      touch.clientY - start.current.y,
      threshold,
    );
    start.current = null;

    if (direction === 'left') onSwipeLeft?.();
    if (direction === 'right') onSwipeRight?.();
  };

  return { onTouchStart, onTouchEnd };
}
