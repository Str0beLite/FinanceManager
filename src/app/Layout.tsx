import type { ReactNode } from 'react';
import { Badge, Icon } from '@/components/ui';
import { IS_BETA } from '@/config/channel';
import { useMoney } from '@/hooks/useMoney';
import { useAppState } from '@/hooks/useApp';
import { useSwipe } from '@/hooks/useSwipe';
import BottomNav from './BottomNav';
import PageSlide from './PageSlide';
import { NAV_ITEMS, adjacentPage, findNavItem, type PageId } from './navigation';

interface LayoutProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
}

export default function Layout({ activePage, onNavigate, children }: LayoutProps) {
  const { rolloverPoolCents } = useAppState();
  const { format } = useMoney();
  const isSettings = activePage === 'settings';

  const nextPage = adjacentPage(activePage, 1);
  const previousPage = adjacentPage(activePage, -1);

  // Swiping sideways walks the tab bar, matching the order of the tabs under
  // your thumb. It lives here rather than in a page because the gesture is
  // navigation — every screen gets it, and none of them has to ask.
  const swipe = useSwipe({
    canSwipeLeft: nextPage !== null,
    canSwipeRight: previousPage !== null,
    onSwipeLeft: () => {
      if (nextPage) onNavigate(nextPage);
    },
    onSwipeRight: () => {
      if (previousPage) onNavigate(previousPage);
    },
  });

  // Settings has no place in the tab order, so it sits just past the end of it:
  // it slides in from the right, matching its corner of the header, and leaves
  // to the right again. Every real tab keeps its own position.
  const tabIndex = NAV_ITEMS.findIndex((item) => item.id === activePage);
  const slideIndex = tabIndex === -1 ? NAV_ITEMS.length : tabIndex;

  return (
    <div className="flex min-h-full flex-col">
      {/* Beta and production sit on one origin with separate data. Say which is
          which, so a test session is never mistaken for the real budget. */}
      {IS_BETA && (
        <p className="bg-warning-soft text-warning border-warning/40 pt-safe border-b px-4 py-1.5 text-center text-xs font-medium">
          Beta build — its data is kept separate from the live app
        </p>
      )}

      <header
        className={`border-border-subtle bg-surface-raised/95 sticky top-0 z-40 border-b backdrop-blur ${
          IS_BETA ? '' : 'pt-safe'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          {/* On mobile the header names the current screen; the tab bar carries the brand. */}
          <h1 className="text-content truncate text-base font-semibold sm:hidden">
            {findNavItem(activePage).label}
          </h1>
          <div className="hidden items-center gap-2 sm:flex">
            <Icon name="brand" className="text-brand text-lg" />
            <span className="text-content text-sm font-semibold">Finance Manager</span>
            {IS_BETA && <Badge tone="warning">Beta</Badge>}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-baseline gap-2 sm:block sm:text-right">
              <p className="text-content-muted text-[10px] font-medium tracking-wide uppercase">
                Pool
              </p>
              {/* Expenses can be paid straight from savings, so this can go
                  under water. Say so in the colour rather than showing a
                  minus sign the same shade as a healthy balance. */}
              <p
                className={`text-sm font-semibold tabular-nums ${
                  rolloverPoolCents < 0 ? 'text-danger' : 'text-brand'
                }`}
              >
                {format(rolloverPoolCents)}
              </p>
            </div>

            {/* Settings is a place you visit twice a year, so it earns a corner
                of the header rather than a quarter of the tab bar. */}
            <button
              type="button"
              aria-label="Settings"
              aria-current={isSettings ? 'page' : undefined}
              onClick={() => onNavigate(isSettings ? 'dashboard' : 'settings')}
              className={`flex size-10 items-center justify-center rounded-lg transition-colors ${
                isSettings
                  ? 'bg-brand-soft text-brand'
                  : 'text-content-muted hover:text-content hover:bg-surface-muted active:bg-surface-muted'
              }`}
            >
              <Icon name="settings" className="text-base" />
            </button>
          </div>
        </div>

        <nav
          aria-label="Sections"
          className="mx-auto hidden max-w-6xl gap-1 px-2 pb-2 sm:flex"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activePage;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-brand-soft text-brand'
                    : 'text-content-muted hover:text-content hover:bg-surface-muted'
                }`}
              >
                <Icon name={item.icon} className="text-xs" />
                {item.shortLabel}
              </button>
            );
          })}
        </nav>
      </header>

      {/* `overflow-x: clip` rather than `hidden`, so a page dragged sideways is
          trimmed at the edge without turning this into a scroll container —
          which would break `position: sticky` for everything inside it. */}
      <main
        {...swipe.handlers}
        className="pb-nav mx-auto w-full max-w-6xl flex-1 overflow-x-clip px-4 py-4 sm:pb-6"
      >
        <PageSlide index={slideIndex} dx={swipe.dx} dragging={swipe.dragging}>
          {children}
        </PageSlide>
      </main>

      <footer className="text-content-muted mx-auto hidden w-full max-w-6xl px-4 py-6 text-center text-xs sm:block">
        Stored in this browser only — export a backup from Settings to keep it safe.
      </footer>

      <BottomNav activePage={activePage} onNavigate={onNavigate} />
    </div>
  );
}
