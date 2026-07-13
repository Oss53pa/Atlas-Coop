import { describe, it, expect } from 'vitest';
import { applyBp, pctToBp, bpToPct, formatBp, BP_FULL } from './rates';

describe('applyBp — taux en points de base', () => {
  it('18% de 1000 = 180', () => {
    expect(applyBp(1000, 1800)).toBe(180n);
  });
  it('100% = valeur entière', () => {
    expect(applyBp(5000, BP_FULL)).toBe(5000n);
  });
  it('arrondi au franc le plus proche', () => {
    expect(applyBp(1000, 1250)).toBe(125n);      // 12,5%
    expect(applyBp(333, 5000)).toBe(167n);       // 16,65 → 167 (arrondi sup)
  });
  it('montant négatif symétrique', () => {
    expect(applyBp(-1000, 1800)).toBe(-180n);
  });
});

describe('conversions', () => {
  it('pctToBp / bpToPct', () => {
    expect(pctToBp(12.5)).toBe(1250);
    expect(bpToPct(1250)).toBe(12.5);
  });
});

describe('formatBp', () => {
  it('formate en pourcentage fr', () => {
    expect(formatBp(1250)).toBe('12,50 %');
    expect(formatBp(1500, 0)).toBe('15 %');
  });
  it('null → tiret', () => {
    expect(formatBp(null)).toBe('—');
  });
});
