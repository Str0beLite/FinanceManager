import { Icon } from '@/components/ui';
import { NAV_ITEMS, type PageId } from './navigation';

interface BottomNavProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

/**
 * Mobile navigation: a fixed tab bar in thumb reach, icons only.
 *
 * With four tabs each target is a quarter of the screen, so the icon carries
 * the meaning on its own and the label underneath was only shrinking the thing
 * you actually tap. The name still reaches screen readers, and the active tab
 * is marked by colour *and* the dot, never colour alone.
 *
 * Replaced by the header nav from `sm` up, where labels cost nothing.
 */
export default function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Sections"
      className="border-border-subtle bg-surface-raised/95 pb-nav-safe fixed inset-x-0 bottom-0 z-40 flex border-t backdrop-blur sm:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === activePage;
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
            // min-h-14 keeps every tab a comfortable thumb target.
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1.5 py-2 transition-colors ${
              isActive ? 'text-brand' : 'text-content-muted active:bg-surface-muted'
            }`}
          >
            <Icon name={item.icon} className="text-xl" />
            <span
              aria-hidden
              className={`size-1 rounded-full transition-colors ${
                isActive ? 'bg-brand' : 'bg-transparent'
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
