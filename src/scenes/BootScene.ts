import Phaser from 'phaser';
import {
  RUNE_COLORS, RuneType, CELL_SIZE,
} from '../core/constants';
import { BattleScene } from './BattleScene';

interface EnemyDesign {
  bodyColor: number;
  eyeColor: number;
  shape: 'circle' | 'square' | 'triangle' | 'diamond';
  features: string[];
}

const ENEMY_DESIGNS: Record<string, EnemyDesign> = {
  Goblin: {
    bodyColor: 0x4a7c3f,
    eyeColor: 0xffff00,
    shape: 'circle',
    features: ['ears'],
  },
  Skeleton: {
    bodyColor: 0xd4c8a8,
    eyeColor: 0x111111,
    shape: 'circle',
    features: ['skull'],
  },
  Orc: {
    bodyColor: 0x5a8a4a,
    eyeColor: 0xff3300,
    shape: 'square',
    features: ['tusks'],
  },
  'Dark Mage': {
    bodyColor: 0x4a2a6a,
    eyeColor: 0x00ffcc,
    shape: 'triangle',
    features: ['hood'],
  },
  Golem: {
    bodyColor: 0x7a7a7a,
    eyeColor: 0xff8800,
    shape: 'square',
    features: ['cracks'],
  },
  Dragon: {
    bodyColor: 0x8b1a1a,
    eyeColor: 0xffcc00,
    shape: 'diamond',
    features: ['horns', 'fire'],
  },
  Lich: {
    bodyColor: 0x2a1a3a,
    eyeColor: 0x66ffcc,
    shape: 'triangle',
    features: ['crown', 'glow'],
  },
  'Demon Lord': {
    bodyColor: 0x3a0a0a,
    eyeColor: 0xff0000,
    shape: 'diamond',
    features: ['horns', 'wings', 'glow'],
  },
  // Mid-bosses
  Hydra: {
    bodyColor: 0x2a6a4a,
    eyeColor: 0x00ff88,
    shape: 'diamond',
    features: ['horns', 'glow'],
  },
  'Shadow King': {
    bodyColor: 0x1a1a2a,
    eyeColor: 0xaa66ff,
    shape: 'triangle',
    features: ['crown', 'glow', 'hood'],
  },
  'Crystal Titan': {
    bodyColor: 0x6a8aaa,
    eyeColor: 0x88ddff,
    shape: 'square',
    features: ['cracks', 'glow'],
  },
  'Void Wyrm': {
    bodyColor: 0x0a0a2a,
    eyeColor: 0xff00ff,
    shape: 'diamond',
    features: ['horns', 'wings', 'glow', 'fire'],
  },
  'Chaos Emperor': {
    bodyColor: 0x2a0a1a,
    eyeColor: 0xff4400,
    shape: 'diamond',
    features: ['horns', 'wings', 'crown', 'glow', 'fire'],
  },
  // Merchant
  Merchant: {
    bodyColor: 0x3a2a1a,
    eyeColor: 0xffdd00,
    shape: 'circle',
    features: ['hood'],
  },
  // Fairy (town guide)
  Fairy: {
    bodyColor: 0x88ccff,
    eyeColor: 0x2266ff,
    shape: 'circle',
    features: ['glow', 'wings_fairy'],
  },
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    // Generate rune textures
    for (let type = 0; type < 5; type++) {
      const runeType = type as RuneType;
      const size = CELL_SIZE - 4;
      const g = this.add.graphics();
      const color = RUNE_COLORS[runeType];

      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, size, size, 8);
      g.lineStyle(2, Phaser.Display.Color.IntegerToColor(color).darken(30).color, 1);
      g.strokeRoundedRect(0, 0, size, size, 8);

      g.generateTexture(`rune_${type}`, size, size);
      g.destroy();
    }

    // Generate unique enemy textures
    for (const [name, design] of Object.entries(ENEMY_DESIGNS)) {
      this.generateEnemyTexture(name, design);
    }

    // Load persistent data
    const saved = localStorage.getItem('rune_cascade_save');
    if (saved) {
      const data = JSON.parse(saved);
      if (!data.warps) data.warps = [];
      this.registry.set('save', data);
    }

    // If mid-run, resume battle directly
    const runSave = BattleScene.loadRunSave();
    if (runSave) {
      this.scene.start('Battle', { player: runSave, stage: runSave.stage });
      return;
    }

    // First time: show story, otherwise go to town
    const storyRead = localStorage.getItem('rune_cascade_story_read');
    if (storyRead) {
      this.scene.start('Town');
    } else {
      this.scene.start('Story');
    }
  }

  private generateEnemyTexture(name: string, design: EnemyDesign): void {
    const g = this.add.graphics();
    const size = 80;
    const cx = size / 2;
    const cy = size / 2;

    // Glow aura
    if (design.features.includes('glow')) {
      g.fillStyle(design.eyeColor, 0.15);
      g.fillCircle(cx, cy, 42);
    }

    // Body shape
    g.fillStyle(design.bodyColor, 1);
    switch (design.shape) {
      case 'circle':
        g.fillCircle(cx, cy, 30);
        break;
      case 'square':
        g.fillRoundedRect(cx - 28, cy - 28, 56, 56, 6);
        break;
      case 'triangle':
        g.fillTriangle(cx, cy - 32, cx - 30, cy + 24, cx + 30, cy + 24);
        break;
      case 'diamond':
        g.fillTriangle(cx, cy - 34, cx - 28, cy, cx + 28, cy);
        g.fillTriangle(cx, cy + 34, cx - 28, cy, cx + 28, cy);
        break;
    }

    // Body outline
    const outlineColor = Phaser.Display.Color.IntegerToColor(design.bodyColor).darken(30).color;
    g.lineStyle(2, outlineColor, 1);
    switch (design.shape) {
      case 'circle':
        g.strokeCircle(cx, cy, 30);
        break;
      case 'square':
        g.strokeRoundedRect(cx - 28, cy - 28, 56, 56, 6);
        break;
      case 'triangle':
        g.strokeTriangle(cx, cy - 32, cx - 30, cy + 24, cx + 30, cy + 24);
        break;
      case 'diamond':
        g.lineStyle(2, outlineColor, 1);
        g.strokeTriangle(cx, cy - 34, cx - 28, cy, cx + 28, cy);
        g.strokeTriangle(cx, cy + 34, cx - 28, cy, cx + 28, cy);
        break;
    }

    // Eyes
    const eyeY = design.shape === 'triangle' ? cy - 4 : cy - 6;
    g.fillStyle(design.eyeColor, 1);
    g.fillCircle(cx - 10, eyeY, 5);
    g.fillCircle(cx + 10, eyeY, 5);
    // Pupils
    g.fillStyle(0x000000, 1);
    g.fillCircle(cx - 9, eyeY, 2);
    g.fillCircle(cx + 11, eyeY, 2);

    // Mouth
    g.lineStyle(2, 0x000000, 0.8);
    if (name === 'Skeleton') {
      // Teeth grid
      for (let i = -8; i <= 8; i += 4) {
        g.lineBetween(cx + i, cy + 10, cx + i, cy + 16);
      }
      g.lineBetween(cx - 10, cy + 10, cx + 10, cy + 10);
      g.lineBetween(cx - 10, cy + 16, cx + 10, cy + 16);
    } else {
      g.beginPath();
      g.arc(cx, cy + 6, 8, 0.1, Math.PI - 0.1);
      g.strokePath();
    }

    // Features
    if (design.features.includes('ears')) {
      g.fillStyle(design.bodyColor, 1);
      g.fillTriangle(cx - 28, cy - 10, cx - 18, cy - 30, cx - 12, cy - 10);
      g.fillTriangle(cx + 28, cy - 10, cx + 18, cy - 30, cx + 12, cy - 10);
    }

    if (design.features.includes('tusks')) {
      g.fillStyle(0xeeeecc, 1);
      g.fillTriangle(cx - 12, cy + 8, cx - 16, cy + 22, cx - 8, cy + 8);
      g.fillTriangle(cx + 12, cy + 8, cx + 16, cy + 22, cx + 8, cy + 8);
    }

    if (design.features.includes('horns')) {
      const hornColor = name === 'Demon Lord' ? 0x880000 : 0x666666;
      g.fillStyle(hornColor, 1);
      g.fillTriangle(cx - 20, cy - 20, cx - 28, cy - 40, cx - 14, cy - 28);
      g.fillTriangle(cx + 20, cy - 20, cx + 28, cy - 40, cx + 14, cy - 28);
    }

    if (design.features.includes('hood')) {
      g.fillStyle(0x2a1a3a, 1);
      g.fillTriangle(cx, cy - 40, cx - 32, cy - 8, cx + 32, cy - 8);
      g.lineStyle(1, 0x5a3a7a, 1);
      g.strokeTriangle(cx, cy - 40, cx - 32, cy - 8, cx + 32, cy - 8);
    }

    if (design.features.includes('skull')) {
      // Nose hole
      g.fillStyle(0x333333, 1);
      g.fillTriangle(cx, cy, cx - 3, cy + 6, cx + 3, cy + 6);
    }

    if (design.features.includes('cracks')) {
      g.lineStyle(1, 0x555555, 0.6);
      g.lineBetween(cx - 15, cy - 20, cx - 5, cy);
      g.lineBetween(cx - 5, cy, cx - 12, cy + 15);
      g.lineBetween(cx + 10, cy - 15, cx + 18, cy + 5);
    }

    if (design.features.includes('fire')) {
      g.fillStyle(0xff6600, 0.7);
      g.fillTriangle(cx - 8, cy + 20, cx, cy + 34, cx + 8, cy + 20);
      g.fillStyle(0xffcc00, 0.7);
      g.fillTriangle(cx - 4, cy + 22, cx, cy + 30, cx + 4, cy + 22);
    }

    if (design.features.includes('wings')) {
      g.fillStyle(0x440000, 0.8);
      g.fillTriangle(cx - 28, cy - 5, cx - 48, cy - 20, cx - 38, cy + 10);
      g.fillTriangle(cx + 28, cy - 5, cx + 48, cy - 20, cx + 38, cy + 10);
    }

    if (design.features.includes('wings_fairy')) {
      // Translucent butterfly wings
      g.fillStyle(0xaaddff, 0.4);
      g.fillEllipse(cx - 22, cy - 8, 18, 24);
      g.fillEllipse(cx + 22, cy - 8, 18, 24);
      g.fillStyle(0xcceeff, 0.3);
      g.fillEllipse(cx - 18, cy + 8, 12, 16);
      g.fillEllipse(cx + 18, cy + 8, 12, 16);
    }

    if (design.features.includes('crown')) {
      g.fillStyle(0xccaa00, 1);
      g.fillRect(cx - 14, cy - 32, 28, 6);
      g.fillTriangle(cx - 14, cy - 32, cx - 10, cy - 40, cx - 6, cy - 32);
      g.fillTriangle(cx - 4, cy - 32, cx, cy - 42, cx + 4, cy - 32);
      g.fillTriangle(cx + 6, cy - 32, cx + 10, cy - 40, cx + 14, cy - 32);
    }

    g.generateTexture(`enemy_${name}`, size, size);
    g.destroy();
  }
}
