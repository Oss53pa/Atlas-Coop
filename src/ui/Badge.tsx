import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

type Tone = 'neutre' | 'primaire' | 'action' | 'alerte' | 'or' | 'info';

// Fonds sémantiques : couleur à 10% en fond, 33% en bordure, 100% en texte (CDC §3)
const tones: Record<Tone, string> = {
  neutre: 'bg-desactive-fond text-texte-2 border-ligne',
  primaire: 'text-primaire border-primaire/30 bg-primaire/10',
  action: 'text-action border-action/30 bg-action/10',
  alerte: 'text-alerte border-alerte/30 bg-alerte/10',
  or: 'text-or-fcfa border-or-fcfa/30 bg-or-fcfa/10',
  info: 'border-[#6e93b8]/30 bg-[#6e93b8]/10 text-[#3a5a78]',
};

export function Badge({
  children,
  tone = 'neutre',
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
