/**
 * Money.ts — Manipulation des montants FCFA/XOF (CDC §3, principe non négociable).
 *
 *  - Tout montant est un ENTIER de francs CFA, stocké en `bigint` (colonnes `_xof`).
 *  - Jamais de float. Jamais de montant calculé par un LLM.
 *  - Le franc CFA (XOF) n'a pas de sous-unité en circulation : 1 = 1 franc.
 *  - PostgREST peut renvoyer un `int8` comme number ou string : on normalise toujours en bigint.
 */

export type Money = bigint;

/** Coerce une valeur (number | string | bigint | null) en montant bigint FCFA. */
export function xof(value: number | string | bigint | null | undefined): Money {
  if (value === null || value === undefined || value === '') return 0n;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Montant FCFA invalide : ${value}`);
    return BigInt(Math.round(value));
  }
  // string : on retire espaces/insécables éventuels
  const cleaned = value.replace(/[\s ]/g, '').replace(',', '.');
  if (cleaned.includes('.')) return BigInt(Math.round(Number(cleaned)));
  return BigInt(cleaned);
}

export const addMoney = (...values: Array<number | string | bigint>): Money =>
  values.reduce<Money>((acc, v) => acc + xof(v), 0n);

export const subMoney = (a: number | string | bigint, b: number | string | bigint): Money =>
  xof(a) - xof(b);

export const negMoney = (a: number | string | bigint): Money => -xof(a);

export const absMoney = (a: number | string | bigint): Money => {
  const v = xof(a);
  return v < 0n ? -v : v;
};

export const isNegative = (a: number | string | bigint): boolean => xof(a) < 0n;
export const isZero = (a: number | string | bigint): boolean => xof(a) === 0n;

/**
 * Formatte un montant FCFA avec séparateur de milliers (espace insécable, usage UEMOA).
 * N'ajoute PAS le suffixe « FCFA » (c'est le composant <Money> qui le gère visuellement).
 */
export function formatFcfa(
  value: number | string | bigint | null | undefined,
  opts: { sign?: boolean } = {},
): string {
  const v = xof(value);
  const neg = v < 0n;
  const digits = (neg ? -v : v).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const prefix = neg ? '−' : opts.sign && v > 0n ? '+' : '';
  return `${prefix}${grouped}`;
}

/** Version avec suffixe, pour usage texte hors composant (ex. SMS, exports). */
export const formatFcfaText = (value: number | string | bigint | null | undefined): string =>
  `${formatFcfa(value)} FCFA`;

/** Répartit un montant en `n` parts entières sans perte au centime (dernier reçoit le reliquat). */
export function splitMoney(total: number | string | bigint, n: number): Money[] {
  if (n <= 0) return [];
  const t = xof(total);
  const base = t / BigInt(n);
  const remainder = t - base * BigInt(n);
  return Array.from({ length: n }, (_, i) =>
    i < Number(remainder) ? base + 1n : base,
  );
}
