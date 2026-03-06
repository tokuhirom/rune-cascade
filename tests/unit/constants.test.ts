import { describe, it, expect } from 'vitest';
import {
  createInitialPlayer, generateEnemy, rollStageModifier, enemyHasAbility,
  EnemyAbility, StageModifier,
} from '../../src/core/constants';

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
    expect(p.items.shuffle).toBe(0);
    expect(p.buffs.atkUp).toBe(false);
    expect(p.gemsAtRunStart).toBe(0);
  });

  it('hp equals maxHp initially', () => {
    const p = createInitialPlayer();
    expect(p.hp).toBe(p.maxHp);
  });
});

describe('generateEnemy', () => {
  it('generates enemy for stage 1 (Goblin, no ability)', () => {
    const e = generateEnemy(1);
    expect(e.name).toBe('Goblin');
    expect(e.hp).toBe(e.maxHp);
    expect(e.hp).toBeGreaterThan(0);
    expect(e.attack).toBeGreaterThan(0);
    expect(e.turnTimer).toBe(3);
    expect(e.ability).toBe(EnemyAbility.None);
  });

  it('Skeleton has Revive ability', () => {
    const e = generateEnemy(2);
    expect(e.name).toBe('Skeleton');
    expect(e.ability).toBe(EnemyAbility.Revive);
    expect(e.revived).toBe(false);
  });

  it('Orc has Enrage ability', () => {
    const e = generateEnemy(3);
    expect(e.name).toBe('Orc');
    expect(e.ability).toBe(EnemyAbility.Enrage);
    expect(e.enraged).toBe(false);
  });

  it('Dark Mage has Scramble ability', () => {
    const e = generateEnemy(4);
    expect(e.name).toBe('Dark Mage');
    expect(e.ability).toBe(EnemyAbility.Scramble);
  });

  it('Golem has Armor ability and high HP', () => {
    const e = generateEnemy(5);
    expect(e.name).toBe('Golem');
    expect(e.ability).toBe(EnemyAbility.Armor);
    // Golem has 2x HP multiplier
    const goblin = generateEnemy(1);
    expect(e.maxHp).toBeGreaterThan(goblin.maxHp * 1.5);
  });

  it('Dragon has MultiHit ability', () => {
    const e = generateEnemy(6);
    expect(e.name).toBe('Dragon');
    expect(e.ability).toBe(EnemyAbility.MultiHit);
  });

  it('Lich has Drain ability', () => {
    const e = generateEnemy(7);
    expect(e.name).toBe('Lich');
    expect(e.ability).toBe(EnemyAbility.Drain);
  });

  it('Demon Lord has Poison ability', () => {
    const e = generateEnemy(8);
    expect(e.name).toBe('Demon Lord');
    expect(e.ability).toBe(EnemyAbility.Poison);
    expect(e.poisonDmg).toBe(5);
  });

  it('enemies get stronger with higher stages', () => {
    const e1 = generateEnemy(1);
    const e5 = generateEnemy(5);
    expect(e5.maxHp).toBeGreaterThan(e1.maxHp);
  });

  it('stage 100 generates Chaos Emperor mid-boss', () => {
    const e = generateEnemy(100);
    expect(e.name).toBe('Chaos Emperor');
    expect(e.isMidBoss).toBe(true);
  });

  it('mid-boss floors generate unique bosses', () => {
    expect(generateEnemy(20).name).toBe('Hydra');
    expect(generateEnemy(40).name).toBe('Shadow King');
    expect(generateEnemy(60).name).toBe('Crystal Titan');
    expect(generateEnemy(80).name).toBe('Void Wyrm');
  });

  it('each enemy has ability description', () => {
    for (let i = 2; i <= 8; i++) {
      const e = generateEnemy(i);
      expect(e.abilityDesc.length).toBeGreaterThan(0);
    }
  });
});

describe('rollStageModifier', () => {
  it('stage 1 has no modifier', () => {
    expect(rollStageModifier(1)).toBe(StageModifier.None);
  });

  it('boss stages have no modifier', () => {
    expect(rollStageModifier(5)).toBe(StageModifier.None);
    expect(rollStageModifier(10)).toBe(StageModifier.None);
    expect(rollStageModifier(15)).toBe(StageModifier.None);
  });

  it('non-boss stages after 1 get a modifier', () => {
    // Run multiple times since it's random
    const results = new Set<StageModifier>();
    for (let i = 0; i < 100; i++) {
      results.add(rollStageModifier(3));
    }
    expect(results.size).toBeGreaterThan(1);
    expect(results.has(StageModifier.None)).toBe(false);
  });
});
