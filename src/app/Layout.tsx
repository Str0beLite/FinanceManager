import type { ReactNode } from 'react';
import { useMoney } from '@/hooks/useMoney';
import { useAppState } from '@/hooks/useApp';
import { NAV_ITEMS, type PageId } from './navigation';

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
      <header className="border-border-subtle bg-surface-raised/90 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-xl">
              💰
            </span>
            <span className="text-content text-sm font-semibold">Finance Manager</span>
          </div>

          <div className="text-right">
            <p className="text-content-muted text-[10px] font-medium tracking-wide uppercase">
              Rollover pool
            </p>
            <p className="text-brand text-sm font-semibold tabular-nums">
              {format(rolloverPoolCents)}
            </p>
          </div>
        </div>

        <nav
          aria-label="Sections"
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2"
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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">{children}</main>

      <footer className="text-content-muted mx-auto w-full max-w-6xl px-4 py-6 text-center text-xs">
        Stored in this browser only — export a backup from Settings to keep it safe.
      </footer>
    </div>
  );
}
