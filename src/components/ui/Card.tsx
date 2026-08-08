import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <section
      className={`bg-surface-raised border-border-subtle rounded-card border p-4 sm:p-5 ${className}`}
    >
      {children}
    </section>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /**
   * Hides the action on mobile, where a floating action button covers it.
   * Keeps the title readable instead of squeezing a button beside it.
   */
  hideActionOnMobile?: boolean;
}

export function CardHeader({
  title,
  description,
  action,
  hideActionOnMobile,
}: CardHeaderProps) {
  return (
    <header className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-content text-base font-semibold">{title}</h2>
        {description && <p className="text-content-muted mt-0.5 text-sm">{description}</p>}
      </div>
      {action && (
        <div className={`shrink-0 ${hideActionOnMobile ? 'hidden sm:block' : ''}`}>
          {action}
        </div>
      )}
    </header>
  );
}
