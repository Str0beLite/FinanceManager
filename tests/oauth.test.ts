import { afterEach, describe, expect, it } from 'vitest';
import {
  forgetLinkToken,
  isOAuthRedirect,
  rememberLinkToken,
  takeLinkToken,
} from '@/lib/oauthSession';

/**
 * These run without a DOM, which is the point: every function here has to cope
 * with `window` being absent or hostile, because a browser in private mode
 * throws on `sessionStorage` and the app still has to boot.
 */

interface FakeWindow {
  sessionStorage: Storage;
}

function withWindow(storage: Storage | (() => never)): void {
  const value =
    typeof storage === 'function'
      ? ({ get sessionStorage(): Storage { return storage(); } } as FakeWindow)
      : ({ sessionStorage: storage } as FakeWindow);
  (globalThis as { window?: FakeWindow }).window = value;
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

afterEach(() => {
  delete (globalThis as { window?: FakeWindow }).window;
});

describe('isOAuthRedirect', () => {
  it('recognises a bank sending the browser back', () => {
    expect(isOAuthRedirect('?oauth_state_id=abc123')).toBe(true);
    expect(isOAuthRedirect('?foo=1&oauth_state_id=abc123')).toBe(true);
  });

  it('is false for an ordinary page load', () => {
    expect(isOAuthRedirect('')).toBe(false);
    expect(isOAuthRedirect('?')).toBe(false);
    expect(isOAuthRedirect('?utm_source=email')).toBe(false);
  });
});

describe('the pending link token', () => {
  it('survives long enough to be picked up once', () => {
    withWindow(memoryStorage());

    rememberLinkToken('link-sandbox-123');
    expect(takeLinkToken()).toBe('link-sandbox-123');
  });

  it('is cleared by reading it, so a stale one cannot be retried forever', () => {
    withWindow(memoryStorage());

    rememberLinkToken('link-sandbox-123');
    takeLinkToken();
    expect(takeLinkToken()).toBeNull();
  });

  it('can be abandoned', () => {
    withWindow(memoryStorage());

    rememberLinkToken('link-sandbox-123');
    forgetLinkToken();
    expect(takeLinkToken()).toBeNull();
  });

  it('does nothing at all when there is no window', () => {
    expect(() => rememberLinkToken('link-sandbox-123')).not.toThrow();
    expect(takeLinkToken()).toBeNull();
  });

  it('survives storage that throws, as private browsing does', () => {
    withWindow(() => {
      throw new Error('The operation is insecure.');
    });

    expect(() => rememberLinkToken('link-sandbox-123')).not.toThrow();
    expect(() => forgetLinkToken()).not.toThrow();
    expect(takeLinkToken()).toBeNull();
  });
});

describe('linkRedirectUri', () => {
  /** Plaid string-compares this, so the shapes that mean the same page must not differ. */
  const cases: ReadonlyArray<readonly [string, string, string]> = [
    ['a directory URL', '/FinanceManager/', 'https://you.github.io/FinanceManager/'],
    ['a missing trailing slash', '/FinanceManager', 'https://you.github.io/FinanceManager/'],
    ['an explicit index.html', '/FinanceManager/index.html', 'https://you.github.io/FinanceManager/'],
    ['the beta channel', '/FinanceManager/beta/', 'https://you.github.io/FinanceManager/beta/'],
    ['beta via index.html', '/FinanceManager/beta/index.html', 'https://you.github.io/FinanceManager/beta/'],
  ];

  it.each(cases)('normalises %s', async (_name, pathname, expected) => {
    (globalThis as { window?: unknown }).window = {
      location: { origin: 'https://you.github.io', pathname },
    };
    const { linkRedirectUri } = await import('@/lib/plaidLink');
    expect(linkRedirectUri()).toBe(expected);
  });
});
