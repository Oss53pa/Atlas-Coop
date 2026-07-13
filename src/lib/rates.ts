/**
 * rates.ts — Taux (rendements, intérêts, taux de ponte, indices) stockés en
 * points de base (`_bp`, entier). 10000 bp = 100 %. (CDC §3)
 *
 * Aucun taux n'est stocké en float. On applique un taux à un montant FCFA
 * par multiplication entière puis division, en conservant l'exactitude bigint.
 */
import { xof, type Money } from './money';

export const BP_FULL = 10000; // 100 %

/** Applique un taux en bp à un montant FCFA (arrondi au franc le plus proche). */
export function applyBp(amount: number | string | bigint, bp: number): Money {
  const a = xof(amount);
  const num = a * BigInt(Math.round(bp));
  const den = BigInt(BP_FULL);
  const half = den / 2n;
  // arrondi au plus proche, symétrique autour de zéro
  return num >= 0n ? (num + half) / den : (num - half) / den;
}

/** Convertit un pourcentage lisible (12.5) en points de base (1250). */
export const pctToBp = (pct: number): number => Math.round(pct * 100);

/** Convertit des bp (1250) en pourcentage (12.5). */
export const bpToPct = (bp: number): number => bp / 100;

/** Formatte un taux en bp pour affichage : 1250 → « 12,50 % ». */
export function formatBp(bp: number | null | undefined, decimals = 2): string {
  if (bp === null || bp === undefined) return '—';
  return `${(bp / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} %`;
}

/** Formatte un ratio d'indice (ex. indice de consommation kg/kg) depuis des bp. */
export function formatRatioBp(bp: number | null | undefined, decimals = 2): string {
  if (bp === null || bp === undefined) return '—';
  return (bp / 10000).toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
