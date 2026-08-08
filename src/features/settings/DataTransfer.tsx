import { useRef, useState } from 'react';
import { Button, Card, CardHeader } from '@/components/ui';
import { EXPORT_FILENAME_PREFIX } from '@/config/constants';
import { useApp } from '@/hooks/useApp';
import { todayIsoDate } from '@/lib/dates';
import { deserializeState, serializeState } from '@/lib/storage';

/** Backup and restore. The only way data leaves this browser. */
export default function DataTransfer() {
  const { state, dispatch } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleExport = () => {
    const blob = new Blob([serializeState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${EXPORT_FILENAME_PREFIX}-${todayIsoDate()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage({ tone: 'ok', text: 'Backup downloaded.' });
  };

  const handleImport = async (file: File) => {
    const result = deserializeState(await file.text());
    if (!result.ok || !result.state) {
      setMessage({ tone: 'error', text: result.error ?? 'Could not read that file.' });
      return;
    }
    dispatch({ type: 'data/replace', state: result.state });
    setMessage({ tone: 'ok', text: 'Backup restored.' });
  };

  return (
    <Card>
      <CardHeader
        title="Your data"
        description="Everything is stored in this browser only. Export regularly — clearing site data wipes it."
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleExport}>Export backup</Button>
        <Button onClick={() => fileInput.current?.click()}>Import backup</Button>
        <Button variant="danger" onClick={() => setConfirmingReset(true)}>
          Reset everything
        </Button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleImport(file);
          event.target.value = '';
        }}
      />

      {confirmingReset && (
        <div className="border-danger/40 bg-danger-soft mt-4 rounded-lg border p-3">
          <p className="text-content text-sm font-medium">
            Delete all categories, subscriptions, expenses and history?
          </p>
          <p className="text-content-muted mt-1 text-xs">
            This cannot be undone. Export a backup first if you might want it back.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                dispatch({ type: 'data/reset' });
                setConfirmingReset(false);
                setMessage({ tone: 'ok', text: 'Everything reset.' });
              }}
            >
              Yes, delete it all
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmingReset(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`mt-3 text-sm ${message.tone === 'ok' ? 'text-positive' : 'text-danger'}`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </Card>
  );
}
