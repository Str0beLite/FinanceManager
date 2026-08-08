import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (item: T) => ReactNode;
  /** Hides the column below the `sm` breakpoint, for secondary detail. */
  hideOnMobile?: boolean;
}

interface EntityTableProps<T> {
  items: readonly T[];
  columns: readonly Column<T>[];
  getKey: (item: T) => string;
  /** Trailing per-row controls (edit, delete). Rendered right-aligned. */
  actions?: (item: T) => ReactNode;
  emptyState?: ReactNode;
}

/**
 * One table for transactions, subscriptions and categories alike. New screens
 * describe their columns instead of hand-rolling another table.
 */
export default function EntityTable<T>({
  items,
  columns,
  getKey,
  actions,
  emptyState,
}: EntityTableProps<T>) {
  if (items.length === 0) return <>{emptyState}</>;

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-border-subtle border-b">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`text-content-muted pb-2 text-xs font-medium tracking-wide uppercase ${
                  column.align === 'right' ? 'text-right' : 'text-left'
                } ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}`}
              >
                {column.header}
              </th>
            ))}
            {actions && <th scope="col" className="w-px pb-2" />}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={getKey(item)}
              className="border-border-subtle hover:bg-surface-muted/60 border-b last:border-0"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`text-content py-2.5 ${
                    column.align === 'right' ? 'text-right tabular-nums' : 'text-left'
                  } ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}`}
                >
                  {column.render(item)}
                </td>
              ))}
              {actions && (
                <td className="py-2.5 pl-3">
                  <div className="flex justify-end gap-1">{actions(item)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
