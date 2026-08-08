import { useMemo } from 'react';
import { Badge, Button, Card, CardHeader, EmptyState, StatTile } from '@/components/ui';
import { useApp } from '@/hooks/useApp';
import { useKnownMonths } from '@/hooks/useMonth';
import { useMoney } from '@/hooks/useMoney';
import { buildMonthView } from '@/hooks/useMonth';
import MonthSummaryRow from './MonthSummaryRow';

export default function HistoryPage() {
  const { state, dispatch, selectMonth } = useApp();
  const { format } = useMoney();
  const monthKeys = useKnownMonths();

  const views = useMemo(
    () => monthKeys.map((key) => buildMonthView(state, key)),
    [monthKeys, state],
  );

  const closedViews = views.filter((view) => view.isClosed);
  const bankedTotal = closedViews.reduce(
    (sum, view) => sum + (view.record.snapshot?.settlement.poolChangeCents ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile
          label="Rollover pool"
          value={format(state.rolloverPoolCents)}
          hint="Available savings right now"
          tone="brand"
        />
        <StatTile
          label="Total banked"
          value={format(bankedTotal)}
          hint={`Across ${closedViews.length} closed month${closedViews.length === 1 ? '' : 's'}`}
          tone="positive"
        />
        <StatTile
          label="Months tracked"
          value={String(views.length)}
          hint={`${views.length - closedViews.length} still open`}
        />
      </div>

      <Card>
        <CardHeader
          title="Month history"
          description="Closed months are frozen — their numbers stay put even if you edit categories later."
        />

        {views.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No months yet"
            description="Once you close your first month it will appear here with its settlement."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {views.map((view) => (
              <MonthSummaryRow
                key={view.monthKey}
                view={view}
                onOpen={() => selectMonth(view.monthKey)}
                onClose={() => dispatch({ type: 'month/close', key: view.monthKey })}
                onReopen={() => dispatch({ type: 'month/reopen', key: view.monthKey })}
              />
            ))}
          </ul>
        )}
      </Card>

      {closedViews.length > 0 && (
        <p className="text-content-muted text-center text-xs">
          <Badge>Tip</Badge> Reopening is only possible for the most recently closed month,
          since later settlements build on it.
        </p>
      )}

      {views.some((view) => view.canClose) && (
        <div className="flex justify-center">
          <Button
            variant="primary"
            onClick={() => {
              const next = views.find((view) => view.canClose);
              if (next) dispatch({ type: 'month/close', key: next.monthKey });
            }}
          >
            Close the oldest open month
          </Button>
        </div>
      )}
    </div>
  );
}
