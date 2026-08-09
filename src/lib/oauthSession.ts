/**
 * Carrying a bank connection across an OAuth redirect.
 *
 * Most large banks no longer take a username and password inside Plaid Link.
 * They send the browser to their own site to sign in, then send it back here —
 * which unloads this app and boots a fresh copy of it. Link can only pick up
 * where it left off if it is handed the *same* link token it started with, so
 * that token has to outlive the page.
 *
 * `sessionStorage`, not `localStorage`: a half-finished bank connection is
 * per-tab and should not still be sitting there tomorrow. Link tokens expire
 * within hours anyway, and a stale one produces a confusing failure rather than
 * a useful one.
 */

const PENDING_KEY = 'financeManager.pendingLinkToken';

/** Plaid appends this to the redirect; its presence is what marks a return. */
const OAUTH_PARAM = 'oauth_state_id';

function session(): Storage | null {
  // Private browsing modes and embedded webviews can refuse storage outright,
  // and a bank connection failing is better than the app failing to boot.
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function rememberLinkToken(linkToken: string): void {
  try {
    session()?.setItem(PENDING_KEY, linkToken);
  } catch {
    // Full or blocked storage. The OAuth resume won't work, but the ordinary
    // username-and-password flow still will, so this is not worth failing on.
  }
}

/**
 * Reads the pending token and clears it in one go, so a failed resume can't be
 * retried forever against a token Plaid has already finished with.
 */
export function takeLinkToken(): string | null {
  const store = session();
  if (!store) return null;

  try {
    const token = store.getItem(PENDING_KEY);
    store.removeItem(PENDING_KEY);
    return token;
  } catch {
    return null;
  }
}

export function forgetLinkToken(): void {
  try {
    session()?.removeItem(PENDING_KEY);
  } catch {
    /* nothing to clean up */
  }
}

/** True when this page load is a bank returning the browser to us. */
export function isOAuthRedirect(search: string = window.location.search): boolean {
  return new URLSearchParams(search).has(OAUTH_PARAM);
}

/**
 * Drops Plaid's query parameters from the address bar.
 *
 * Left alone they would survive a refresh, and a second boot would try to
 * resume a connection that has already finished.
 */
export function clearOAuthQuery(): void {
  if (!isOAuthRedirect()) return;

  const url = new URL(window.location.href);
  url.searchParams.delete(OAUTH_PARAM);
  // Plaid has used other parameter names over time; anything left here would
  // re-trigger the same resume, so the query goes entirely.
  const clean = `${url.origin}${url.pathname}${url.hash}`;
  window.history.replaceState(null, '', clean);
}
