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
  [RuneType.Shield]: '\u26e1',
  [RuneType.Heart]: '\u2665',
  [RuneType.Star]: '\u2605',
  [RuneType.Gold]: '\u25c6',
};

export const RUNE_COUNT = 5;

export interface PlayerStats {
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  gems: number;
  // Permanent upgrades
  attackLevel: number;
  defenseLevel: number;
  hpLevel: number;
}

export interface EnemyData {
  name: string;
  maxHp: number;
  hp: number;
  attack: number;
  turnTimer: number;   // turns until next attack
  maxTurnTimer: number;
}

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
  };
}

export function generateEnemy(stage: number): EnemyData {
  const names = ['Goblin', 'Skeleton', 'Orc', 'Dark Mage', 'Golem', 'Dragon', 'Lich', 'Demon Lord'];
  const idx = Math.min(stage - 1, names.length - 1);
  const hpScale = 1 + stage * 0.4;
  const atkScale = 1 + stage * 0.3;
  return {
    name: names[idx],
    maxHp: Math.floor(30 * hpScale),
    hp: Math.floor(30 * hpScale),
    attack: Math.floor(5 * atkScale),
    turnTimer: 3,
    maxTurnTimer: Math.max(2, 4 - Math.floor(stage / 4)),
  };
}
