import { Card, CardHeader, FormField, MoneyInput, Select } from '@/components/ui';
import { CURRENCIES } from '@/config/currency';
import { useApp } from '@/hooks/useApp';
import type { Settings, ThemePreference } from '@/types';
import DataTransfer from './DataTransfer';

const THEME_OPTIONS = [
  { value: 'system', label: 'Match my system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsPage() {
  const { state, dispatch } = useApp();
  const { settings } = state;

  const update = (changes: Partial<Settings>) =>
    dispatch({ type: 'settings/update', changes });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="Budget defaults"
          description="Used for every month that doesn't have its own paycheck override."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Default monthly paycheck">
            {(id) => (
              <MoneyInput
                id={id}
                valueCents={settings.defaultPaycheckCents}
                onChange={(cents) => update({ defaultPaycheckCents: cents })}
              />
            )}
          </FormField>

          <FormField label="Currency">
            {(id) => (
              <Select
                id={id}
                value={settings.currency}
                options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
                onChange={(event) => update({ currency: event.target.value })}
              />
            )}
          </FormField>
        </div>
      </Card>

      <Card>
        <CardHeader title="Appearance" />
        <FormField label="Theme">
          {(id) => (
            <Select
              id={id}
              value={settings.theme}
              options={THEME_OPTIONS}
              onChange={(event) =>
                update({ theme: event.target.value as ThemePreference })
              }
            />
          )}
        </FormField>
      </Card>

      <DataTransfer />

      <Card>
        <CardHeader title="How the rollover works" />
        <ul className="text-content-muted flex list-disc flex-col gap-2 pl-5 text-sm">
          <li>
            Fixed categories take their exact amount off the top of your income. Percentage
            categories then split whatever is left.
          </li>
          <li>
            When you close a month, anything unspent is added to the{' '}
            <span className="text-content font-medium">rollover pool</span>.
          </li>
          <li>
            If you overspent, that amount is deducted from next month&rsquo;s budget instead —
            the pool is left alone, so savings only ever grow unless you spend them
            deliberately.
          </li>
          <li>
            A deduction is spread across your flexible categories in proportion to their size.{' '}
            <span className="text-content font-medium">Hard-set</span> categories are skipped
            entirely and always cost the same.
          </li>
          <li>
            If the flexible categories can&rsquo;t absorb the whole deficit, the remainder
            carries into the month after.
          </li>
        </ul>
      </Card>
    </div>
  );
}
