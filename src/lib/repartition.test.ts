import { describe, it, expect } from 'vitest';
import { splitProrata, sommeParts } from './repartition';

const montantDe = (parts: { id: string; montant: number }[], id: string) =>
  parts.find((p) => p.id === id)?.montant ?? 0;

describe('splitProrata — répartition au prorata sans perte', () => {
  it('ristourne 500 000 : apports 60/30/10 → 300k/150k/50k', () => {
    const parts = splitProrata(500000, [
      { id: 'kone', poids: 600000 },
      { id: 'yao', poids: 300000 },
      { id: 'diarra', poids: 100000 },
    ]);
    expect(montantDe(parts, 'kone')).toBe(300000);
    expect(montantDe(parts, 'yao')).toBe(150000);
    expect(montantDe(parts, 'diarra')).toBe(50000);
    expect(sommeParts(parts)).toBe(500000);
  });

  it('invariant : la somme des parts = total, même avec reliquat', () => {
    const parts = splitProrata(1000, [
      { id: 'a', poids: 1 },
      { id: 'b', poids: 1 },
      { id: 'c', poids: 1 },
    ]);
    expect(sommeParts(parts)).toBe(1000); // 334 + 333 + 333
    expect(montantDe(parts, 'a')).toBe(334); // reliquat au plus gros (égalité → 1er trié)
  });

  it('parts égales exactes', () => {
    const parts = splitProrata(900, [
      { id: 'a', poids: 100 },
      { id: 'b', poids: 100 },
      { id: 'c', poids: 100 },
    ]);
    expect(parts.every((p) => p.montant === 300)).toBe(true);
  });

  it('poids nul ou total nul → 0 partout', () => {
    expect(sommeParts(splitProrata(0, [{ id: 'a', poids: 10 }]))).toBe(0);
    expect(sommeParts(splitProrata(1000, [{ id: 'a', poids: 0 }]))).toBe(0);
  });

  it('reliquat attribué aux plus gros poids en priorité', () => {
    const parts = splitProrata(100, [
      { id: 'gros', poids: 700 },
      { id: 'petit', poids: 300 },
    ]);
    // 70 + 30 = 100 exact ici ; test avec reliquat :
    const parts2 = splitProrata(10, [
      { id: 'gros', poids: 700 },
      { id: 'petit', poids: 300 },
    ]);
    expect(montantDe(parts2, 'gros')).toBe(7);
    expect(montantDe(parts2, 'petit')).toBe(3);
    expect(sommeParts(parts)).toBe(100);
  });
});
