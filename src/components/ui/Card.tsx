import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <section
      className={`bg-surface-raised border-border-subtle rounded-card border p-5 ${className}`}
    >
      {children}
    </section>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <header className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-content text-base font-semibold">{title}</h2>
        {description && <p className="text-content-muted mt-0.5 text-sm">{description}</p>}
      </div>
      {action}
    </header>
  );
}
