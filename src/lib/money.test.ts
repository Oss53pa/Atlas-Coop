import { describe, it, expect } from 'vitest';
import { xof, addMoney, subMoney, absMoney, isNegative, formatFcfa, formatFcfaText, splitMoney } from './money';

describe('xof — coercion en bigint', () => {
  it('convertit number, string et bigint', () => {
    expect(xof(1000)).toBe(1000n);
    expect(xof('1000')).toBe(1000n);
    expect(xof(1000n)).toBe(1000n);
  });
  it('nettoie espaces et virgules', () => {
    expect(xof('1 000 000')).toBe(1000000n);
    expect(xof('1000,50')).toBe(1001n); // arrondi
  });
  it('null/undefined/vide → 0', () => {
    expect(xof(null)).toBe(0n);
    expect(xof(undefined)).toBe(0n);
    expect(xof('')).toBe(0n);
  });
  it('rejette les non-finis', () => {
    expect(() => xof(Infinity)).toThrow();
  });
});

describe('opérations', () => {
  it('addMoney / subMoney', () => {
    expect(addMoney(100, 200, 300)).toBe(600n);
    expect(subMoney(500, 200)).toBe(300n);
  });
  it('absMoney / isNegative', () => {
    expect(absMoney(-500)).toBe(500n);
    expect(isNegative(-1)).toBe(true);
    expect(isNegative(0)).toBe(false);
  });
});

describe('formatFcfa — séparateur milliers', () => {
  it('groupe par 3 avec espace insécable', () => {
    expect(formatFcfa(1000000)).toBe('1 000 000');
    expect(formatFcfa(1500)).toBe('1 500');
  });
  it('gère le signe négatif (minus typographique)', () => {
    expect(formatFcfa(-2000)).toBe('−2 000');
  });
  it('signe + optionnel', () => {
    expect(formatFcfa(2000, { sign: true })).toBe('+2 000');
  });
  it('formatFcfaText ajoute le suffixe', () => {
    expect(formatFcfaText(5000)).toBe('5 000 FCFA');
  });
});

describe('splitMoney — partage sans perte', () => {
  it('partage exact', () => {
    const parts = splitMoney(900, 3);
    expect(parts).toEqual([300n, 300n, 300n]);
  });
  it('reliquat aux premiers', () => {
    const parts = splitMoney(100, 3);
    expect(parts).toEqual([34n, 33n, 33n]);
    expect(parts.reduce((s, p) => s + p, 0n)).toBe(100n);
  });
});
