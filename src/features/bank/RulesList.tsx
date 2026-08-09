import { Button, Icon } from '@/components/ui';
import { useApp } from '@/hooks/useApp';
import { useCategoryLookup } from '@/hooks/useCategories';

/**
 * The rules that decide what files itself.
 *
 * Read-only apart from deleting: rules are created by approving something in the
 * inbox, which is the moment you actually know what a merchant is. Deleting one
 * just sends the next charge from it back to the inbox.
 */
export default function RulesList() {
  const { state, dispatch } = useApp();
  const categories = useCategoryLookup();
  const { rules } = state.bank;

  if (rules.length === 0) {
    return (
      <p className="text-content-muted mt-4 text-xs">
        No rules yet. Approving something in the inbox offers to remember it, and from
        then on charges from that merchant file themselves.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-content text-sm font-medium">Filing rules</h3>
      <ul className="mt-2 flex flex-col gap-1">
        {rules.map((rule) => {
          const category = categories.get(rule.categoryId);
          return (
            <li
              key={rule.id}
              className="border-border-subtle flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <span className="min-w-0 text-xs">
                <span className="text-content block truncate font-medium">{rule.match}</span>
                <span className="text-content-muted flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: category?.color ?? 'var(--color-content-muted)' }}
                  />
                  {category?.name ?? 'Deleted category'}
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Delete the rule for ${rule.match}`}
                onClick={() => dispatch({ type: 'bank/deleteRule', id: rule.id })}
              >
                <Icon name="dismiss" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
