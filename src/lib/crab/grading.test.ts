import { describe, it, expect } from 'vitest';
import { computeGrade, shellsFor } from './grading';

describe('computeGrade', () => {
  it('returns C on defeat regardless of dps', () => {
    expect(computeGrade(false, 999, 50)).toBe('C');
  });
  it('assigns base tiers by dps', () => {
    expect(computeGrade(true, 10, 0)).toBe('C');
    expect(computeGrade(true, 30, 0)).toBe('B');
    expect(computeGrade(true, 40, 0)).toBe('A');
    expect(computeGrade(true, 60, 0)).toBe('S');
  });
  it('combo bump promotes one tier (max S)', () => {
    expect(computeGrade(true, 39, 12)).toBe('A'); // B -> A
    expect(computeGrade(true, 54, 12)).toBe('S'); // A -> S
  });
});

describe('shellsFor', () => {
  it('scales with grade and dps', () => {
    const s = shellsFor('S', 80); // 25 + floor(80/4)=45
    const a = shellsFor('A', 50); // 16 + floor(50/5)=26
    const b = shellsFor('B', 36); // 10 + floor(36/6)=16
    const c = shellsFor('C', 20); // 5
    expect(s).toBe(45);
    expect(a).toBe(26);
    expect(b).toBe(16);
    expect(c).toBe(5);
  });
});
