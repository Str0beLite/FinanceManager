import type { ReactNode } from 'react';
import type { IconName } from '@/config/icons';
import Icon from './Icon';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="border-border-subtle rounded-card flex flex-col items-center gap-2 border border-dashed px-6 py-12 text-center">
      {icon && <Icon name={icon} className="text-content-muted mb-1 text-2xl" />}
      <h3 className="text-content text-sm font-semibold">{title}</h3>
      <p className="text-content-muted max-w-sm text-sm">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
