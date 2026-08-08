import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (item: T) => ReactNode;
}

interface EntityTableProps<T> {
  items: readonly T[];
  columns: readonly Column<T>[];
  getKey: (item: T) => string;
  /**
   * Which column headlines the mobile card. Defaults to the first column, which
   * suits a table but not always a card — an expense list leads with the date,
   * while the card should lead with the category.
   */
  titleKey?: string;
  /** Trailing per-row controls (edit, delete). Rendered right-aligned. */
  actions?: (item: T) => ReactNode;
  emptyState?: ReactNode;
}

/**
 * One component for transactions, subscriptions and categories alike. New
 * screens describe their columns instead of hand-rolling another table.
 *
 * Below `sm` a table would either overflow or shrink to unreadable columns, so
 * each row is re-laid-out as a card built from the same column definitions: the
 * first column is the title, the right-aligned one is the value, and everything
 * else becomes a meta line.
 */
export default function EntityTable<T>({
  items,
  columns,
  getKey,
  titleKey,
  actions,
  emptyState,
}: EntityTableProps<T>) {
  if (items.length === 0) return <>{emptyState}</>;

  const titleColumn = columns.find((column) => column.key === titleKey) ?? columns[0];
  const restColumns = columns.filter((column) => column !== titleColumn);
  const valueColumn = [...restColumns].reverse().find((column) => column.align === 'right');
  const metaColumns = restColumns.filter((column) => column !== valueColumn);

  return (
    <>
      <ul className="flex flex-col gap-2 sm:hidden">
        {items.map((item) => (
          <li
            key={getKey(item)}
            className="border-border-subtle flex flex-col gap-2 rounded-lg border p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-content min-w-0 text-sm font-medium">
                {titleColumn.render(item)}
              </div>
              {valueColumn && (
                <div className="text-content shrink-0 text-sm font-semibold tabular-nums">
                  {valueColumn.render(item)}
                </div>
              )}
            </div>

            {metaColumns.length > 0 && (
              <div className="text-content-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {metaColumns.map((column) => (
                  <span key={column.key} className="min-w-0">
                    {column.render(item)}
                  </span>
                ))}
              </div>
            )}

            {actions && (
              <div className="border-border-subtle flex flex-wrap justify-end gap-1 border-t pt-2">
                {actions(item)}
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="-mx-5 hidden overflow-x-auto px-5 sm:block">
        <table className="w-full min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-border-subtle border-b">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`text-content-muted pb-2 text-xs font-medium tracking-wide uppercase ${
                    column.align === 'right' ? 'text-right' : 'text-left'
                  }`}
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
                    }`}
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
    </>
  );
}
