import Phaser from 'phaser';
import {
  RUNE_COLORS, RUNE_SYMBOLS, RuneType, CELL_SIZE,
} from '../core/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    // Generate rune textures programmatically
    for (let type = 0; type < 5; type++) {
      const runeType = type as RuneType;
      const size = CELL_SIZE - 4;
      const g = this.add.graphics();
      const color = RUNE_COLORS[runeType];

      // Background rounded rect
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, size, size, 8);

      // Darker border
      g.lineStyle(2, Phaser.Display.Color.IntegerToColor(color).darken(30).color, 1);
      g.strokeRoundedRect(0, 0, size, size, 8);

      g.generateTexture(`rune_${type}`, size, size);
      g.destroy();
    }

    // Generate enemy texture
    const eg = this.add.graphics();
    eg.fillStyle(0x444444, 1);
    eg.fillCircle(40, 40, 40);
    eg.fillStyle(0xff0000, 1);
    eg.fillCircle(28, 30, 6);
    eg.fillCircle(52, 30, 6);
    eg.generateTexture('enemy', 80, 80);
    eg.destroy();

    // Load persistent data
    const saved = localStorage.getItem('rune_cascade_save');
    if (saved) {
      this.registry.set('save', JSON.parse(saved));
    }

    this.scene.start('Title');
  }
}
