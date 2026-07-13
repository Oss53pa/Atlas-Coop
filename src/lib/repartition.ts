/**
 * repartition.ts — Répartition d'un montant entier (FCFA) au prorata de poids,
 * SANS perte au franc : le reliquat de l'arrondi va aux plus gros poids.
 * Utilisé par les ristournes (prorata des apports) et la répartition d'équipage
 * (prorata des quote-parts). Fonctions pures → testées.
 */
export interface Poids { id: string; poids: number }
export interface Part { id: string; montant: number }

export function splitProrata(total: number, poids: Poids[]): Part[] {
  const somme = poids.reduce((s, w) => s + w.poids, 0);
  const tries = [...poids].sort((a, b) => b.poids - a.poids);
  if (somme <= 0 || total <= 0) return tries.map((w) => ({ id: w.id, montant: 0 }));
  let alloue = 0;
  const res = tries.map((w) => {
    const m = Math.floor((total * w.poids) / somme);
    alloue += m;
    return { id: w.id, montant: m };
  });
  let reliquat = total - alloue;
  for (let i = 0; i < res.length && reliquat > 0; i++) {
    res[i].montant += 1;
    reliquat -= 1;
  }
  return res;
}

/** Somme des parts — doit toujours égaler le total (invariant vérifié en test). */
export const sommeParts = (parts: Part[]): number => parts.reduce((s, p) => s + p.montant, 0);
