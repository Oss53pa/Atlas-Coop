/**
 * units.ts — Unités physiques stockées en ENTIERS à la précision de base (CDC §3) :
 *   grammes (_g), millilitres (_ml), unités (_u), mètres carrés (_m2).
 *
 * « L'app parle en sacs et en hectares, la base parle en grammes et en mètres carrés. »
 * Chaque produit porte une `unite_affichage` (sac de 50 kg, cageot, tête, litre, hectare)
 * qui pilote la conversion base ⇄ affichage.
 */

export type BaseUnit = 'g' | 'ml' | 'u' | 'm2';

export interface DisplayUnit {
  /** Libellé court affiché (ex. « sac 50kg », « kg », « L », « tête », « ha »). */
  label: string;
  /** Unité de base sous-jacente. */
  base: BaseUnit;
  /** Nombre d'unités de base pour 1 unité d'affichage (ex. sac 50kg → 50000 g). */
  factor: number;
  /** Décimales à afficher. */
  decimals?: number;
}

/** Catalogue d'unités d'affichage courantes. Extensible par section (framework A1). */
export const DISPLAY_UNITS: Record<string, DisplayUnit> = {
  g: { label: 'g', base: 'g', factor: 1, decimals: 0 },
  kg: { label: 'kg', base: 'g', factor: 1000, decimals: 2 },
  t: { label: 't', base: 'g', factor: 1_000_000, decimals: 3 },
  sac50: { label: 'sac 50 kg', base: 'g', factor: 50_000, decimals: 2 },
  sac25: { label: 'sac 25 kg', base: 'g', factor: 25_000, decimals: 2 },
  sac100: { label: 'sac 100 kg', base: 'g', factor: 100_000, decimals: 2 },
  ml: { label: 'ml', base: 'ml', factor: 1, decimals: 0 },
  L: { label: 'L', base: 'ml', factor: 1000, decimals: 2 },
  hL: { label: 'hL', base: 'ml', factor: 100_000, decimals: 2 },
  u: { label: 'unité', base: 'u', factor: 1, decimals: 0 },
  tete: { label: 'tête', base: 'u', factor: 1, decimals: 0 },
  douzaine: { label: 'douzaine', base: 'u', factor: 12, decimals: 0 },
  plateau: { label: 'plateau (30)', base: 'u', factor: 30, decimals: 0 },
  cageot: { label: 'cageot', base: 'u', factor: 1, decimals: 0 },
  m2: { label: 'm²', base: 'm2', factor: 1, decimals: 0 },
  are: { label: 'are', base: 'm2', factor: 100, decimals: 2 },
  ha: { label: 'ha', base: 'm2', factor: 10_000, decimals: 4 },
};

/** Convertit une quantité en unité de base vers l'unité d'affichage. */
export function toDisplay(baseQty: number | bigint, unitKey: string): number {
  const u = DISPLAY_UNITS[unitKey] ?? DISPLAY_UNITS.u;
  return Number(baseQty) / u.factor;
}

/** Convertit une quantité saisie en unité d'affichage vers l'unité de base (entier). */
export function toBase(displayQty: number, unitKey: string): number {
  const u = DISPLAY_UNITS[unitKey] ?? DISPLAY_UNITS.u;
  return Math.round(displayQty * u.factor);
}

/** Formatte une quantité de base pour affichage avec son unité. */
export function formatQty(
  baseQty: number | bigint | null | undefined,
  unitKey: string,
  opts: { withLabel?: boolean } = { withLabel: true },
): string {
  if (baseQty === null || baseQty === undefined) return '—';
  const u = DISPLAY_UNITS[unitKey] ?? DISPLAY_UNITS.u;
  const value = toDisplay(baseQty, unitKey);
  const formatted = value.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: u.decimals ?? 0,
  });
  return opts.withLabel ? `${formatted} ${u.label}` : formatted;
}

/** Superficie : mètres carrés → hectares lisibles. */
export const formatSuperficie = (m2: number | bigint | null | undefined): string =>
  formatQty(m2, 'ha');

export const unitOptions = Object.entries(DISPLAY_UNITS).map(([key, u]) => ({
  key,
  label: u.label,
  base: u.base,
}));
