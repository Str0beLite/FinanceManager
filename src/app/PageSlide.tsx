import { useRef, type ReactNode } from 'react';

interface PageSlideProps {
  /** Position of the page in the tab bar. A change decides the direction. */
  index: number;
  /** Live drag distance in px, from `useSwipe`. */
  dx: number;
  dragging: boolean;
  children: ReactNode;
}

/**
 * The moving half of the swipe gesture.
 *
 * Two transforms on two elements, and nothing else: the outer one follows the
 * finger and springs back when the drag falls short, the inner one plays the
 * arriving tab in from the side it came from. No neighbouring page is rendered
 * and no animation library is involved — a page is a whole screen of cards, and
 * keeping two of them mounted to animate between them would cost far more than
 * the gesture is worth.
 */
export default function PageSlide({ index, dx, dragging, children }: PageSlideProps) {
  // Remembered rather than derived, because a re-render mid-animation must not
  // swap the class underneath it and cut the animation short.
  const seen = useRef({ index, direction: 'right' as 'left' | 'right' });
  if (seen.current.index !== index) {
    seen.current = {
      index,
      direction: index > seen.current.index ? 'right' : 'left',
    };
  }

  return (
    <div
      style={dx === 0 ? undefined : { transform: `translate3d(${dx}px, 0, 0)` }}
      className={dragging ? undefined : 'transition-transform duration-200 ease-out'}
    >
      {/* Keyed by the tab, so arriving at one remounts this and replays the
          animation. The children themselves are unaffected — React reuses the
          element, so a page does not rebuild to be slid into place. */}
      <div
        key={index}
        className={
          seen.current.direction === 'right' ? 'animate-page-in-right' : 'animate-page-in-left'
        }
      >
        {children}
      </div>
    </div>
  );
}
