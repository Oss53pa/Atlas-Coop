import { describe, it, expect } from 'vitest';
import { toBase, toDisplay, formatQty, formatSuperficie } from './units';

describe('conversions unité de base ⇄ affichage', () => {
  it('kg ⇄ grammes', () => {
    expect(toBase(12.5, 'kg')).toBe(12500);
    expect(toDisplay(12500, 'kg')).toBe(12.5);
  });
  it('ha ⇄ m²', () => {
    expect(toBase(2, 'ha')).toBe(20000);
    expect(toDisplay(20000, 'ha')).toBe(2);
  });
  it('L ⇄ ml', () => {
    expect(toBase(15, 'L')).toBe(15000);
  });
  it('sac de 50 kg', () => {
    expect(toBase(1, 'sac50')).toBe(50000);
  });
  it('arrondit la base à l\'entier', () => {
    expect(toBase(1.2345, 'kg')).toBe(1235); // 1234.5 → 1235
  });
});

// toLocaleString('fr-FR') utilise l'espace fine insécable ( / ) : on normalise.
const norm = (s: string) => s.replace(/[  ]/g, ' ');

describe('formatQty / formatSuperficie', () => {
  it('affiche avec libellé', () => {
    expect(norm(formatQty(3600000, 'kg'))).toBe('3 600 kg');
  });
  it('superficie en ha', () => {
    expect(norm(formatSuperficie(20000))).toBe('2 ha');
  });
  it('null → tiret', () => {
    expect(formatQty(null, 'kg')).toBe('—');
  });
});
