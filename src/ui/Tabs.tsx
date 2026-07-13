import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { key: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (key: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-ligne', className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'relative flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors',
            value === t.key ? 'text-primaire' : 'text-texte-2 hover:text-texte',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs',
                value === t.key ? 'bg-primaire/10 text-primaire' : 'bg-desactive-fond text-texte-2',
              )}
            >
              {t.count}
            </span>
          )}
          {value === t.key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primaire" />}
        </button>
      ))}
    </div>
  );
}
