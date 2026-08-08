import type { Cadence } from '@/types';

interface CadenceMeta {
  readonly value: Cadence;
  readonly label: string;
  /** How many months apart two charges are. Drives `isDueInMonth`. */
  readonly intervalMonths: number;
}

export const CADENCES: readonly CadenceMeta[] = [
  { value: 'monthly', label: 'Monthly', intervalMonths: 1 },
  { value: 'quarterly', label: 'Every 3 months', intervalMonths: 3 },
  { value: 'annual', label: 'Yearly', intervalMonths: 12 },
];

const BY_VALUE = new Map(CADENCES.map((c) => [c.value, c]));

export function cadenceMeta(cadence: Cadence): CadenceMeta {
  const meta = BY_VALUE.get(cadence);
  if (!meta) throw new Error(`Unknown cadence: ${cadence}`);
  return meta;
}

export function cadenceLabel(cadence: Cadence): string {
  return cadenceMeta(cadence).label;
}
