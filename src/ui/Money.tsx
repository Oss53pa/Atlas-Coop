import { cn } from '../lib/cn';
import { formatFcfa } from '../lib/money';

interface MoneyProps {
  value: number | string | bigint | null | undefined;
  /** Affiche le suffixe « FCFA ». */
  suffix?: boolean;
  /** Affiche le signe + pour les positifs. */
  sign?: boolean;
  /** Colore en rouge (latérite) si négatif. */
  colorNegative?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeCls = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg', xl: 'text-2xl' };

/**
 * Montant FCFA — JetBrains Mono 700, couleur or (`--or-fcfa`), EXCLUSIVEMENT (CDC §3).
 * « Si un élément non monétaire est doré, c'est un bug de design. »
 */
export function Money({
  value,
  suffix = true,
  sign = false,
  colorNegative = false,
  size = 'md',
  className,
}: MoneyProps) {
  const negative = typeof value === 'bigint' ? value < 0n : Number(value) < 0;
  return (
    <span
      className={cn('fcfa whitespace-nowrap', sizeCls[size], className)}
      style={colorNegative && negative ? { color: 'var(--alerte)' } : undefined}
    >
      {formatFcfa(value, { sign })}
      {suffix && <span className="ml-1 opacity-70">FCFA</span>}
    </span>
  );
}
