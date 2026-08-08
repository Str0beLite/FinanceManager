import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Registers the service worker and reports the two moments worth telling the
 * user about: the app is now usable offline, and a new version is ready.
 *
 * Installed apps are the reason this matters — a home-screen icon can otherwise
 * sit on a stale build indefinitely with no visible way to refresh.
 */
export default function PwaStatus() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!offlineReady && !needRefresh) return undefined;
    setVisible(true);
    // The update prompt is actionable, so it stays; "offline ready" is a
    // one-off confirmation and can dismiss itself.
    if (needRefresh) return undefined;

    const timer = setTimeout(() => {
      setVisible(false);
      setOfflineReady(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [offlineReady, needRefresh, setOfflineReady]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-20 z-50 mb-safe sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-sm"
    >
      <div className="border-border-subtle bg-surface-raised flex items-center gap-3 rounded-xl border p-3 shadow-lg">
        <p className="text-content min-w-0 flex-1 text-sm">
          {needRefresh ? 'A new version is ready.' : 'Ready to use offline.'}
        </p>
        {needRefresh && (
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="bg-brand active:bg-brand-strong shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-white"
          >
            Reload
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-content-muted hover:text-content shrink-0 px-2 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
