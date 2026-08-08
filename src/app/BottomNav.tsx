import { NAV_ITEMS, type PageId } from './navigation';

interface BottomNavProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

/**
 * Mobile navigation: a fixed tab bar in thumb reach, showing every section at
 * once. Replaced by the header nav from `sm` up, where horizontal space is not
 * the constraint.
 */
export default function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Sections"
      className="border-border-subtle bg-surface-raised/95 pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t backdrop-blur sm:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === activePage;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
            // min-h-14 keeps every tab a comfortable thumb target.
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors ${
              isActive ? 'text-brand' : 'text-content-muted active:bg-surface-muted'
            }`}
          >
            <span aria-hidden className="text-lg leading-none">
              {item.icon}
            </span>
            <span className="text-[10px] leading-none font-medium">{item.shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}
