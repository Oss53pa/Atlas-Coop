import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'action' | 'danger' | 'ghost' | 'outline' | 'subtle';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  // Bleu fleuve = structure ; Vert herbe = action/validation (CDC §3)
  primary: 'bg-primaire text-white hover:bg-primaire-hover active:bg-primaire-active shadow-sm',
  action: 'bg-action text-white hover:bg-action-hover active:bg-action-active shadow-sm',
  danger: 'bg-alerte text-white hover:bg-alerte-hover',
  outline: 'border border-ligne bg-surface text-texte hover:bg-surface-2',
  ghost: 'text-texte hover:bg-surface-2',
  subtle: 'bg-surface-2 text-texte hover:bg-desactive-fond',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-10 w-10 justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center rounded-lg font-medium transition-colors select-none',
        'disabled:bg-desactive-fond disabled:text-desactive-texte disabled:cursor-not-allowed disabled:shadow-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});
