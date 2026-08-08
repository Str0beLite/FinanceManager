interface CurrencyOption {
  readonly code: string;
  readonly label: string;
}

/** Offered in Settings. Any ISO 4217 code Intl knows about would work here. */
export const CURRENCIES: readonly CurrencyOption[] = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
];

export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_LOCALE = 'en-US';
