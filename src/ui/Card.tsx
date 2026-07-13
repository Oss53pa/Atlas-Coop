import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-ligne bg-surface shadow-carte', className)}
      {...rest}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-ligne px-5 py-4', className)}>
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 text-primaire">{icon}</div>}
        <div>
          <h3 className="font-semibold text-texte">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-texte-2">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...rest} />;
}
