import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '@/config/constants';
import {
  createEmptyState,
  deserializeState,
  parseState,
  serializeState,
} from '@/lib/storage';
import { percentCategory } from './helpers';

describe('parseState', () => {
  it('falls back to an empty state for junk input', () => {
    expect(parseState(null).categories).toEqual([]);
    expect(parseState('nonsense').rolloverPoolCents).toBe(0);
    expect(parseState(42).version).toBe(SCHEMA_VERSION);
  });

  it('fills in missing sections instead of throwing', () => {
    const partial = parseState({ categories: [percentCategory('Fun', 100)] });
    expect(partial.categories).toHaveLength(1);
    expect(partial.subscriptions).toEqual([]);
    expect(partial.months).toEqual({});
    expect(partial.settings.currency).toBe('USD');
  });

  it('rejects an unrecognised theme value', () => {
    const state = parseState({ settings: { theme: 'neon' } });
    expect(state.settings.theme).toBe('system');
  });
});

describe('export / import round trip', () => {
  it('restores an identical state', () => {
    const original = {
      ...createEmptyState(),
      categories: [percentCategory('Fun', 100)],
      rolloverPoolCents: 12_345,
      settings: { ...createEmptyState().settings, defaultPaycheckCents: 300_000 },
    };

    const result = deserializeState(serializeState(original));
    expect(result.ok).toBe(true);
    expect(result.state).toEqual(original);
  });

  it('leaves the connector token out of the file', () => {
    // A backup gets emailed around and dropped in cloud storage; that token is
    // a bearer credential for bank data and must not travel with it.
    const connected = {
      ...createEmptyState(),
      bank: {
        ...createEmptyState().bank,
        connectorUrl: 'https://connector.example.workers.dev',
        connectorToken: 'super-secret',
      },
    };

    const json = serializeState(connected);
    expect(json).not.toContain('super-secret');

    const restored = deserializeState(json).state;
    expect(restored?.bank.connectorUrl).toBe('https://connector.example.workers.dev');
    expect(restored?.bank.connectorToken).toBe('');
  });

  it('reports a helpful error for a file that is not a backup', () => {
    expect(deserializeState('{"hello":"world"}')).toMatchObject({ ok: false });
    expect(deserializeState('not json at all').error).toMatch(/valid JSON/);
  });
});
