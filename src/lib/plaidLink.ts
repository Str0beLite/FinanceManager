/**
 * Plaid Link, loaded on demand.
 *
 * Link is a script served from Plaid's CDN and cannot be bundled. It is fetched
 * the first time someone taps "Connect a bank" rather than at start-up, so an
 * app nobody has connected a bank to still boots and works with no network at
 * all — which is the whole promise of the offline shell.
 *
 * The handful of types below are hand-written instead of pulling in
 * `react-plaid-link`, whose React bindings would outweigh what a screen used
 * twice actually needs.
 */

const SCRIPT_SRC = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

interface PlaidHandler {
  open(): void;
  destroy(): void;
}

interface PlaidLinkOptions {
  token: string;
  /** Only ever set when resuming after an OAuth bank sent the browser back. */
  receivedRedirectUri?: string;
  onSuccess(publicToken: string): void;
  onExit(error: { display_message?: string; error_message?: string } | null): void;
}

interface PlaidGlobal {
  create(options: PlaidLinkOptions): PlaidHandler;
}

declare global {
  interface Window {
    Plaid?: PlaidGlobal;
  }
}

let pending: Promise<PlaidGlobal> | null = null;

function loadPlaid(): Promise<PlaidGlobal> {
  if (window.Plaid) return Promise.resolve(window.Plaid);

  pending ??= new Promise<PlaidGlobal>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;

    script.onload = () => {
      if (window.Plaid) resolve(window.Plaid);
      else reject(new Error('Plaid Link loaded but did not start.'));
    };

    script.onerror = () => {
      // Let a later attempt retry — this is usually just being offline.
      pending = null;
      script.remove();
      reject(new Error('Could not load Plaid Link. Are you online?'));
    };

    document.head.append(script);
  });

  return pending;
}

/**
 * Where Plaid should send the browser back to after an OAuth bank.
 *
 * Query and hash are dropped, because Plaid matches this against the dashboard
 * list exactly, and because the address it returns to carries its own query.
 */
export function linkRedirectUri(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

export interface OpenLinkOptions {
  readonly linkToken: string;
  readonly receivedRedirectUri?: string;
  readonly onSuccess: (publicToken: string) => void;
  readonly onExit: (error: string | null) => void;
}

/**
 * Opens the bank picker. Resolves once Link is on screen, not once it is done —
 * the outcome arrives through `onSuccess` or `onExit`.
 */
export async function openPlaidLink({
  linkToken,
  receivedRedirectUri,
  onSuccess,
  onExit,
}: OpenLinkOptions): Promise<void> {
  const plaid = await loadPlaid();

  const handler = plaid.create({
    token: linkToken,
    // Passing this on a first open makes Link fail looking for an OAuth state
    // that was never issued, so the key is absent rather than undefined.
    ...(receivedRedirectUri ? { receivedRedirectUri } : {}),
    onSuccess: (publicToken) => {
      onSuccess(publicToken);
      handler.destroy();
    },
    onExit: (error) => {
      // A plain cancel reports no error, and is not worth surfacing as one.
      onExit(error ? (error.display_message ?? error.error_message ?? 'Link failed.') : null);
      handler.destroy();
    },
  });

  handler.open();
}
