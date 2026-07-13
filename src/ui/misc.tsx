import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { initials } from '../lib/format';

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primaire/10 text-primaire">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-texte sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-texte-2">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = 'primaire',
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'primaire' | 'action' | 'alerte' | 'or';
  className?: string;
}) {
  const toneCls = {
    primaire: 'text-primaire bg-primaire/10',
    action: 'text-action bg-action/10',
    alerte: 'text-alerte bg-alerte/10',
    or: 'text-or-fcfa bg-or-fcfa/10',
  }[tone];
  return (
    <div className={cn('rounded-2xl border border-ligne bg-surface p-4 shadow-carte', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-texte-2">{label}</span>
        {icon && <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', toneCls)}>{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold text-texte">{value}</div>
      {hint && <div className="mt-1 text-xs text-texte-2">{hint}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ligne bg-surface-2 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-desactive-texte">{icon}</div>}
      <h3 className="font-semibold text-texte">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-texte-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-10 text-texte-2', className)}>
      <Loader2 className="h-5 w-5 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 'md',
}: {
  name?: string | null;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const cls = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' }[size];
  if (src) {
    return <img src={src} alt={name ?? ''} className={cn('rounded-full object-cover', cls)} />;
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primaire/10 font-semibold text-primaire',
        cls,
      )}
    >
      {initials(name)}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} />;
}
