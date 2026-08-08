import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong border-transparent',
  secondary:
    'bg-surface-raised text-content border-border-subtle hover:border-brand hover:text-brand',
  ghost: 'bg-transparent text-content-muted border-transparent hover:text-content hover:bg-surface-muted',
  danger: 'bg-transparent text-danger border-danger/40 hover:bg-danger hover:text-white',
};

const SIZES: Record<Size, string> = {
  sm: 'text-xs px-2.5 py-1.5 gap-1',
  md: 'text-sm px-3.5 py-2 gap-1.5',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg border font-medium transition-colors focus-visible:ring-brand/50 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
