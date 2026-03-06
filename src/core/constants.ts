export const BOARD_COLS = 7;
export const BOARD_ROWS = 7;
export const CELL_SIZE = 56;
export const BOARD_OFFSET_X = 480 / 2 - (BOARD_COLS * CELL_SIZE) / 2;
export const BOARD_OFFSET_Y = 280;

export enum RuneType {
  Sword = 0,  // Attack
  Shield = 1, // Defense
  Heart = 2,  // Heal
  Star = 3,   // Skill charge
  Gold = 4,   // Bonus gems
}

export const RUNE_COLORS: Record<RuneType, number> = {
  [RuneType.Sword]: 0xe74c3c,
  [RuneType.Shield]: 0x3498db,
  [RuneType.Heart]: 0x2ecc71,
  [RuneType.Star]: 0x9b59b6,
  [RuneType.Gold]: 0xf1c40f,
};

export const RUNE_SYMBOLS: Record<RuneType, string> = {
  [RuneType.Sword]: '\u2694',
  [RuneType.Shield]: '\u2b22',
  [RuneType.Heart]: '\u2665',
  [RuneType.Star]: '\u2605',
  [RuneType.Gold]: '\u25c6',
};

export const RUNE_COUNT = 5;

// Special cell states overlaid on the board
export enum CellState {
  Normal = 0,
  Frozen = 1,      // Cannot be matched; thaws when adjacent rune is matched
  Obstacle = 2,    // Unmatchable block; destroyed when adjacent rune is matched
  RowClear = 3,    // Clears entire row when matched
}

export const MAX_FLOOR = 100;
export const WARP_FLOORS = [20, 40, 60, 80];

export interface PlayerItems {
  shuffle: number;
}

export interface PlayerBuffs {
  atkUp: boolean;
  defUp: boolean;
  regen: boolean;
}

export interface PlayerStats {
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  gems: number;
  attackLevel: number;
  defenseLevel: number;
  hpLevel: number;
  items: PlayerItems;
  buffs: PlayerBuffs;
  gemsAtRunStart: number;
}

export interface SaveData {
  gems: number;
  atkLv: number;
  defLv: number;
  hpLv: number;
  warps: number[];
}

// Enemy ability types
export enum EnemyAbility {
  None = 'none',
  Enrage = 'enrage',         // ATK doubles below 30% HP
  Revive = 'revive',         // Resurrects once at 50% HP
  Poison = 'poison',         // Deals damage over time each turn
  Heal = 'heal',             // Heals self when attacking
  Armor = 'armor',           // Takes reduced damage from all sources
  Scramble = 'scramble',     // Shuffles board runes on attack
  MultiHit = 'multihit',     // Attacks multiple times (weaker each)
  Drain = 'drain',           // Steals HP on attack
  Freeze = 'freeze',         // Freezes random runes on attack
  Obstacle = 'obstacle',     // Places obstacle blocks on attack
}

export interface EnemyData {
  name: string;
  maxHp: number;
  hp: number;
  attack: number;
  turnTimer: number;
  maxTurnTimer: number;
  ability: EnemyAbility;
  abilityDesc: string;
  // Runtime state for abilities
  revived?: boolean;
  enraged?: boolean;
  poisonDmg?: number;
  // Mid-boss fields
  isMidBoss?: boolean;
  secondaryAbilities?: EnemyAbility[];
}

export function isMidBossFloor(stage: number): boolean {
  return MID_BOSS_TEMPLATES.some(mb => mb.floor === stage);
}

function getMidBossSecondaryAbilities(name: string): EnemyAbility[] {
  switch (name) {
    case 'Hydra': return [EnemyAbility.Revive];
    case 'Shadow King': return [EnemyAbility.Freeze];
    case 'Crystal Titan': return [EnemyAbility.Obstacle];
    case 'Void Wyrm': return [EnemyAbility.MultiHit];
    case 'Chaos Emperor': return [EnemyAbility.Enrage, EnemyAbility.Poison];
    default: return [];
  }
}

// Stage modifiers that change gameplay each stage
export enum StageModifier {
  None = 'none',
  GoldenHour = 'golden_hour',     // Double gem drops
  Berserk = 'berserk',            // 1.5x damage both ways
  Fortified = 'fortified',        // Player defense x2
  Desperate = 'desperate',        // Player ATK +50% but no healing
  RuneStorm = 'rune_storm',       // Board shuffles every 3 turns
  Vampiric = 'vampiric',          // Sword matches heal slightly
}

export interface StageModifierData {
  type: StageModifier;
  name: string;
  desc: string;
  color: string;
}

export const STAGE_MODIFIERS: Record<StageModifier, StageModifierData> = {
  [StageModifier.None]: { type: StageModifier.None, name: '', desc: '', color: '#ffffff' },
  [StageModifier.GoldenHour]: { type: StageModifier.GoldenHour, name: 'Golden Hour', desc: 'Gem drops x2', color: '#f1c40f' },
  [StageModifier.Berserk]: { type: StageModifier.Berserk, name: 'Berserk', desc: 'All damage x1.5', color: '#e74c3c' },
  [StageModifier.Fortified]: { type: StageModifier.Fortified, name: 'Fortified', desc: 'Shield power x2', color: '#3498db' },
  [StageModifier.Desperate]: { type: StageModifier.Desperate, name: 'Desperate', desc: 'ATK +50% / No heal', color: '#e67e22' },
  [StageModifier.RuneStorm]: { type: StageModifier.RuneStorm, name: 'Rune Storm', desc: 'Board shuffles every 3 turns', color: '#9b59b6' },
  [StageModifier.Vampiric]: { type: StageModifier.Vampiric, name: 'Vampiric', desc: 'Sword heals you', color: '#c0392b' },
};

interface EnemyTemplate {
  name: string;
  hpMult: number;
  atkMult: number;
  timer: number;
  ability: EnemyAbility;
  abilityDesc: string;
}

const ENEMY_TEMPLATES: EnemyTemplate[] = [
  { name: 'Goblin', hpMult: 1.0, atkMult: 1.0, timer: 3, ability: EnemyAbility.None, abilityDesc: '' },
  { name: 'Skeleton', hpMult: 0.8, atkMult: 0.9, timer: 2, ability: EnemyAbility.Revive, abilityDesc: 'Revives once at 50% HP' },
  { name: 'Orc', hpMult: 1.4, atkMult: 1.2, timer: 4, ability: EnemyAbility.Enrage, abilityDesc: 'Enrages below 30% HP (ATK x2)' },
  { name: 'Dark Mage', hpMult: 0.9, atkMult: 1.0, timer: 3, ability: EnemyAbility.Freeze, abilityDesc: 'Freezes 2 runes on attack' },
  { name: 'Golem', hpMult: 2.0, atkMult: 0.8, timer: 5, ability: EnemyAbility.Obstacle, abilityDesc: 'Places 2 obstacles on attack' },
  { name: 'Dragon', hpMult: 1.5, atkMult: 1.5, timer: 4, ability: EnemyAbility.MultiHit, abilityDesc: 'Attacks 3 times' },
  { name: 'Lich', hpMult: 1.2, atkMult: 1.1, timer: 3, ability: EnemyAbility.Drain, abilityDesc: 'Drains HP on attack' },
  { name: 'Demon Lord', hpMult: 2.0, atkMult: 1.8, timer: 4, ability: EnemyAbility.Poison, abilityDesc: 'Poisons you (5 dmg/turn)' },
];

// Unique mid-bosses at warp floors (20, 40, 60, 80) and final boss (100)
interface MidBossTemplate extends EnemyTemplate {
  floor: number;
}

const MID_BOSS_TEMPLATES: MidBossTemplate[] = [
  { floor: 20, name: 'Hydra', hpMult: 3.0, atkMult: 1.4, timer: 3, ability: EnemyAbility.MultiHit, abilityDesc: 'Multi-headed: Attacks 3 times + Revives once' },
  { floor: 40, name: 'Shadow King', hpMult: 2.5, atkMult: 1.6, timer: 3, ability: EnemyAbility.Drain, abilityDesc: 'Drains HP + Shuffles board' },
  { floor: 60, name: 'Crystal Titan', hpMult: 4.0, atkMult: 1.2, timer: 5, ability: EnemyAbility.Armor, abilityDesc: 'Takes 50% damage + Enrages below 30%' },
  { floor: 80, name: 'Void Wyrm', hpMult: 3.5, atkMult: 2.0, timer: 4, ability: EnemyAbility.Poison, abilityDesc: 'Poisons (8 dmg/turn) + Attacks 3 times' },
  { floor: 100, name: 'Chaos Emperor', hpMult: 5.0, atkMult: 2.5, timer: 3, ability: EnemyAbility.Drain, abilityDesc: 'Drains HP + Enrages + Poisons (10 dmg/turn)' },
];

export function createInitialPlayer(): PlayerStats {
  return {
    maxHp: 50,
    hp: 50,
    attack: 5,
    defense: 1,
    gems: 0,
    attackLevel: 0,
    defenseLevel: 0,
    hpLevel: 0,
    items: { shuffle: 0 },
    buffs: { atkUp: false, defUp: false, regen: false },
    gemsAtRunStart: 0,
  };
}

export function generateEnemy(stage: number): EnemyData {
  // Check for mid-boss / final boss
  const midBoss = MID_BOSS_TEMPLATES.find(mb => mb.floor === stage);
  if (midBoss) {
    return generateMidBoss(midBoss, stage);
  }

  const idx = Math.min(stage - 1, ENEMY_TEMPLATES.length - 1);
  const tmpl = ENEMY_TEMPLATES[idx % ENEMY_TEMPLATES.length];
  const stageScale = 1 + (stage - 1) * 0.3;
  const hp = Math.floor(30 * tmpl.hpMult * stageScale);
  const atk = Math.floor(5 * tmpl.atkMult * stageScale);
  return {
    name: tmpl.name,
    maxHp: hp,
    hp: hp,
    attack: atk,
    turnTimer: tmpl.timer,
    maxTurnTimer: tmpl.timer,
    ability: tmpl.ability,
    abilityDesc: tmpl.abilityDesc,
    revived: false,
    enraged: false,
    poisonDmg: tmpl.ability === EnemyAbility.Poison ? 5 : 0,
  };
}

function generateMidBoss(tmpl: MidBossTemplate, stage: number): EnemyData {
  const stageScale = 1 + (stage - 1) * 0.3;
  const hp = Math.floor(30 * tmpl.hpMult * stageScale);
  const atk = Math.floor(5 * tmpl.atkMult * stageScale);
  const poisonDmg = tmpl.name === 'Void Wyrm' ? 8 : tmpl.name === 'Chaos Emperor' ? 10 : 0;
  return {
    name: tmpl.name,
    maxHp: hp,
    hp: hp,
    attack: atk,
    turnTimer: tmpl.timer,
    maxTurnTimer: tmpl.timer,
    ability: tmpl.ability,
    abilityDesc: tmpl.abilityDesc,
    revived: false,
    enraged: false,
    poisonDmg,
    // Mid-bosses with combined abilities
    isMidBoss: true,
    secondaryAbilities: getMidBossSecondaryAbilities(tmpl.name),
  };
}

export function enemyHasAbility(enemy: EnemyData, ability: EnemyAbility): boolean {
  if (enemy.ability === ability) return true;
  return enemy.secondaryAbilities?.includes(ability) ?? false;
}

export function rollStageModifier(stage: number): StageModifier {
  // Stage 1 has no modifier, boss stages (every 5) have no modifier
  if (stage <= 1 || stage % 5 === 0) return StageModifier.None;
  const mods = [
    StageModifier.GoldenHour,
    StageModifier.Berserk,
    StageModifier.Fortified,
    StageModifier.Desperate,
    StageModifier.RuneStorm,
    StageModifier.Vampiric,
  ];
  return mods[Math.floor(Math.random() * mods.length)];
}
