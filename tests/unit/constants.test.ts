import { describe, it, expect } from 'vitest';
import { createInitialPlayer, generateEnemy } from '../../src/core/constants';

describe('createInitialPlayer', () => {
  it('returns player with correct initial values', () => {
    const p = createInitialPlayer();
    expect(p.hp).toBe(50);
    expect(p.maxHp).toBe(50);
    expect(p.attack).toBe(5);
    expect(p.defense).toBe(1);
    expect(p.gems).toBe(0);
    expect(p.attackLevel).toBe(0);
    expect(p.defenseLevel).toBe(0);
    expect(p.hpLevel).toBe(0);
  });

  it('hp equals maxHp initially', () => {
    const p = createInitialPlayer();
    expect(p.hp).toBe(p.maxHp);
  });
});

describe('generateEnemy', () => {
  it('generates enemy for stage 1', () => {
    const e = generateEnemy(1);
    expect(e.name).toBe('Goblin');
    expect(e.hp).toBe(e.maxHp);
    expect(e.hp).toBeGreaterThan(0);
    expect(e.attack).toBeGreaterThan(0);
    expect(e.turnTimer).toBe(3);
  });

  it('enemies get stronger with higher stages', () => {
    const e1 = generateEnemy(1);
    const e5 = generateEnemy(5);
    expect(e5.maxHp).toBeGreaterThan(e1.maxHp);
    expect(e5.attack).toBeGreaterThan(e1.attack);
  });

  it('caps enemy name index at array length', () => {
    const e = generateEnemy(100);
    expect(e.name).toBe('Demon Lord');
  });

  it('turnTimer decreases for higher stages', () => {
    const e1 = generateEnemy(1);
    const e20 = generateEnemy(20);
    expect(e20.maxTurnTimer).toBeLessThanOrEqual(e1.maxTurnTimer);
    expect(e20.maxTurnTimer).toBeGreaterThanOrEqual(2);
  });
});
