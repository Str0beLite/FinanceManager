import { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  FormField,
  Icon,
  inputClasses,
} from '@/components/ui';
import { useApp } from '@/hooks/useApp';
import { useBankConfig } from '@/hooks/useBank';
import {
  checkConnector,
  createLinkToken,
  disconnectItem,
  exchangePublicToken,
} from '@/lib/connector';
import { formatDayLabel } from '@/lib/dates';
import {
  clearOAuthQuery,
  isOAuthRedirect,
  rememberLinkToken,
  takeLinkToken,
} from '@/lib/oauthSession';
import { linkRedirectUri, openPlaidLink } from '@/lib/plaidLink';
import RulesList from './RulesList';
import SyncStatus from './SyncStatus';

type Message = { tone: 'ok' | 'error'; text: string } | null;

/**
 * Setting up bank syncing.
 *
 * The app can't do this alone — see `server/` for why — so the first thing this
 * screen does is say so, rather than presenting a Connect button that could
 * never work.
 */
export default function BankSettings() {
  const { state, dispatch } = useApp();
  const config = useBankConfig();
  const { connections } = state.bank;

  const [url, setUrl] = useState(state.bank.connectorUrl);
  const [token, setToken] = useState(state.bank.connectorToken);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setMessage(null);

    const candidate = { url: url.trim().replace(/\/+$/, ''), token: token.trim() };
    const result = await checkConnector(candidate);

    if (!result.ok) {
      setMessage({ tone: 'error', text: result.error });
      setBusy(false);
      return;
    }

    dispatch({
      type: 'bank/configure',
      connectorUrl: candidate.url,
      connectorToken: candidate.token,
    });
    setMessage({
      tone: 'ok',
      text: `Connected to your ${result.data.env} connector.`,
    });
    setBusy(false);
  };

  /** Everything after Link hands back a public token, however it got there. */
  const finishLink = (publicToken: string) => {
    void (async () => {
      const exchanged = await exchangePublicToken(config, publicToken);
      if (!exchanged.ok) {
        setMessage({ tone: 'error', text: exchanged.error });
        return;
      }
      dispatch({
        type: 'bank/connect',
        itemId: exchanged.data.itemId,
        institutionName: exchanged.data.institutionName,
      });
      setMessage({
        tone: 'ok',
        text: `${exchanged.data.institutionName} connected. Expenses will appear on the next sync.`,
      });
    })();
  };

  const openLink = async (linkToken: string, receivedRedirectUri?: string) => {
    try {
      await openPlaidLink({
        linkToken,
        receivedRedirectUri,
        onSuccess: finishLink,
        onExit: (error) => {
          if (error) setMessage({ tone: 'error', text: error });
        },
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not open Plaid Link.',
      });
    } finally {
      setBusy(false);
    }
  };

  const connectBank = async () => {
    setBusy(true);
    setMessage(null);

    const redirectUri = linkRedirectUri();
    const tokenResult = await createLinkToken(config, redirectUri);
    if (!tokenResult.ok) {
      // Plaid compares this against the dashboard exactly, and its complaint
      // doesn't say what it was given — so show it, rather than leaving anyone
      // to compare two invisible strings.
      const text = /redirect/i.test(tokenResult.error)
        ? `${tokenResult.error} This app sent: ${redirectUri} — it must appear in your Plaid dashboard, for this environment, character for character.`
        : tokenResult.error;
      setMessage({ tone: 'error', text });
      setBusy(false);
      return;
    }

    // A bank that uses OAuth unloads this page, so the token it started with
    // has to be waiting when the browser comes back.
    rememberLinkToken(tokenResult.data.linkToken);
    await openLink(tokenResult.data.linkToken);
  };

  // Picking up a connection an OAuth bank sent back to us. The query is cleared
  // first: a refresh must not try to resume a connection that already finished.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !isOAuthRedirect()) return;
    resumed.current = true;

    const href = window.location.href;
    const linkToken = takeLinkToken();
    clearOAuthQuery();

    if (!linkToken) {
      setMessage({
        tone: 'error',
        text: 'Your bank sent you back, but this tab had lost track of the connection. Please start again.',
      });
      return;
    }

    setBusy(true);
    void openLink(linkToken, href);
    // Empty deps and the `resumed` guard are deliberate: this is a one-shot
    // reaction to how the page was loaded, not to anything that can change.
  }, []);

  const disconnect = async (id: string) => {
    setBusy(true);
    // Forget it locally whatever the connector says — leaving a dead connection
    // on screen because a network call failed helps nobody.
    const result = await disconnectItem(config, id);
    dispatch({ type: 'bank/disconnect', id });
    setMessage(
      result.ok
        ? { tone: 'ok', text: 'Bank disconnected. Expenses already imported are kept.' }
        : { tone: 'error', text: `Removed here, but the connector said: ${result.error}` },
    );
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader
        title="Bank syncing"
        description="Optional. Everything else in this app works without it."
      />

      <p className="text-content-muted mb-4 text-sm">
        Plaid can&rsquo;t be called from a browser — it signs every request with a secret
        that would be readable by anyone if it shipped in this page. So bank syncing needs
        a small connector of your own, running on your Cloudflare account, holding those
        secrets. <span className="text-content font-medium">server/README.md</span> in this
        repository has the five commands. Your bank credentials never reach this app, and
        your transactions never reach anyone but you.
      </p>

      <div className="flex flex-col gap-4">
        <FormField
          label="Connector URL"
          hint="Printed by `wrangler deploy`, e.g. https://finance-manager-connector.you.workers.dev"
        >
          {(id) => (
            <input
              id={id}
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://…workers.dev"
              className={inputClasses}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          )}
        </FormField>

        <FormField
          label="Connector token"
          hint="The APP_TOKEN you set on the connector. Never included in an exported backup."
        >
          {(id) => (
            <input
              id={id}
              type="password"
              autoComplete="off"
              className={inputClasses}
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          )}
        </FormField>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={busy || !url || !token} onClick={() => void save()}>
            {config.isConfigured ? 'Re-check connection' : 'Save and check'}
          </Button>
          {config.isConfigured && (
            <Button disabled={busy} onClick={() => void connectBank()}>
              <Icon name="bank" />
              Connect a bank
            </Button>
          )}
        </div>
      </div>

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm ${message.tone === 'ok' ? 'text-positive' : 'text-danger'}`}
        >
          {message.text}
        </p>
      )}

      {connections.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1">
          {connections.map((connection) => (
            <li
              key={connection.id}
              className="border-border-subtle flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <span className="min-w-0 text-xs">
                <span className="text-content block truncate font-medium">
                  {connection.institutionName}
                </span>
                <span className="text-content-muted">
                  Connected {formatDayLabel(connection.connectedAt.slice(0, 10))}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {!connection.lastSyncedAt && <Badge tone="brand">New</Badge>}
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  onClick={() => void disconnect(connection.id)}
                >
                  Disconnect
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {config.isConfigured && connections.length > 0 && <SyncStatus />}
      {config.isConfigured && <RulesList />}
    </Card>
  );
}
