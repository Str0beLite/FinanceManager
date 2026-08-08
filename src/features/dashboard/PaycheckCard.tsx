import { Button, Card, CardHeader, MoneyInput } from '@/components/ui';
import { useApp } from '@/hooks/useApp';
import { useMoney } from '@/hooks/useMoney';
import type { MonthRecord } from '@/types';

interface PaycheckCardProps {
  record: MonthRecord;
  paycheckCents: number;
  readOnly: boolean;
}

export default function PaycheckCard({
  record,
  paycheckCents,
  readOnly,
}: PaycheckCardProps) {
  const { state, dispatch } = useApp();
  const { format } = useMoney();
  const { defaultPaycheckCents } = state.settings;

  const hasOverride = record.paycheckCents !== null;
  const differsFromDefault = paycheckCents !== defaultPaycheckCents;

  return (
    <Card>
      <CardHeader
        title="Paycheck"
        description={
          hasOverride
            ? `Custom amount for this month. Default is ${format(defaultPaycheckCents)}.`
            : 'Inherited from your default. Change it to override just this month.'
        }
      />

      <MoneyInput
        valueCents={paycheckCents}
        disabled={readOnly}
        onChange={(cents) =>
          dispatch({ type: 'month/setPaycheck', key: record.key, paycheckCents: cents })
        }
      />

      {!readOnly && (
        <div className="mt-3 flex flex-wrap gap-2">
          {differsFromDefault && (
            <Button
              size="sm"
              onClick={() =>
                dispatch({
                  type: 'settings/update',
                  changes: { defaultPaycheckCents: paycheckCents },
                })
              }
            >
              Use as default going forward
            </Button>
          )}
          {hasOverride && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                dispatch({
                  type: 'month/setPaycheck',
                  key: record.key,
                  paycheckCents: null,
                })
              }
            >
              Reset to default
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
