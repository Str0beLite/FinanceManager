import type { ReactNode } from 'react';
import { Badge } from '@/components/ui';
import { IS_BETA } from '@/config/channel';
import { useMoney } from '@/hooks/useMoney';
import { useAppState } from '@/hooks/useApp';
import BottomNav from './BottomNav';
import { NAV_ITEMS, findNavItem, type PageId } from './navigation';

interface LayoutProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
}

export default function Layout({ activePage, onNavigate, children }: LayoutProps) {
  const { rolloverPoolCents } = useAppState();
  const { format } = useMoney();

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
            <span aria-hidden className="text-xl">
              💰
            </span>
            <span className="text-content text-sm font-semibold">Finance Manager</span>
            {IS_BETA && <Badge tone="warning">Beta</Badge>}
          </div>

          <div className="flex shrink-0 items-baseline gap-2 sm:block sm:text-right">
            <p className="text-content-muted text-[10px] font-medium tracking-wide uppercase">
              Pool
            </p>
            <p className="text-brand text-sm font-semibold tabular-nums">
              {format(rolloverPoolCents)}
            </p>
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
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-brand-soft text-brand'
                    : 'text-content-muted hover:text-content hover:bg-surface-muted'
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="pb-nav mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:pb-6">
        {children}
      </main>

      <footer className="text-content-muted mx-auto hidden w-full max-w-6xl px-4 py-6 text-center text-xs sm:block">
        Stored in this browser only — export a backup from Settings to keep it safe.
      </footer>

      <BottomNav activePage={activePage} onNavigate={onNavigate} />
    </div>
  );
}
