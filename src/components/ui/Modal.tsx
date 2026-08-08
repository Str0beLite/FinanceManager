import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Modal({ open, title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    // Stop the page behind the dialog from scrolling while it's open.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-raised border-border-subtle max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border p-5 shadow-xl sm:rounded-2xl">
        <header className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-content text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-content-muted hover:text-content rounded-lg px-2 py-1 text-lg leading-none"
          >
            ×
          </button>
        </header>

        {children}

        {footer && <footer className="mt-5 flex justify-end gap-2">{footer}</footer>}
      </div>
    </div>
  );
}
