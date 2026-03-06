import Phaser from 'phaser';
import { PlayerStats, SaveData } from '../core/constants';
import { BattleScene } from './BattleScene';
import { createMuteButton } from '../core/SoundManager';

const ENDING_PAGES = [
  {
    text: 'With a final surge of runic energy,\nthe Chaos Emperor shattered into light.\n\nThe dungeon trembled, its dark magic\nunraveling floor by floor.',
    color: '#ffddaa',
  },
  {
    text: 'As you emerged from the tower\'s depths,\nthe fairy was waiting.\n\n"You did it! The world is safe again.\nThe runes chose well."\n\nThe ancient Rune Tower began to crumble,\nits purpose fulfilled at last.',
    color: '#aaeedd',
  },
  {
    text: 'But deep beneath the rubble,\na faint glow pulsed...\n\nPerhaps the dungeon\'s story\nis not yet over.',
    color: '#cc88ff',
  },
];

export class VictoryScene extends Phaser.Scene {
  private currentPage = 0;
  private player!: PlayerStats;
  private stage!: number;

  constructor() {
    super('Victory');
  }

  create(data: { player: PlayerStats; stage: number }): void {
    this.player = data.player;
    this.stage = data.stage;
    this.currentPage = 0;
    this.showPage();
  }

  private showPage(): void {
    const { width, height } = this.scale;

    // Clear previous
    this.children.removeAll();
    createMuteButton(this);

    if (this.currentPage < ENDING_PAGES.length) {
      // Story pages
      const page = ENDING_PAGES[this.currentPage];

      this.cameras.main.fadeIn(600);

      // Stars background
      const g = this.add.graphics();
      for (let i = 0; i < 30; i++) {
        const sx = Phaser.Math.Between(10, width - 10);
        const sy = Phaser.Math.Between(10, height - 10);
        g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.1, 0.5));
        g.fillCircle(sx, sy, Phaser.Math.Between(1, 2));
      }

      const textObj = this.add.text(width / 2, height / 2 - 40, page.text, {
        fontSize: '16px',
        color: page.color,
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: width - 80 },
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: textObj,
        alpha: 1,
        duration: 1000,
      });

      const prompt = this.add.text(width / 2, height - 80, 'Tap to continue', {
        fontSize: '14px',
        color: '#888888',
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: prompt,
        alpha: 1,
        duration: 400,
        delay: 1500,
      });

      this.tweens.add({
        targets: prompt,
        alpha: 0.3,
        duration: 800,
        delay: 2500,
        yoyo: true,
        repeat: -1,
      });

      this.input.once('pointerdown', () => {
        this.currentPage++;
        this.cameras.main.fadeOut(400);
        this.time.delayedCall(400, () => {
          this.showPage();
        });
      });
    } else {
      // Final results screen
      this.showResults();
    }
  }

  private showResults(): void {
    const { width } = this.scale;

    this.cameras.main.fadeIn(800);
    this.cameras.main.flash(1500, 255, 220, 100);

    this.add.text(width / 2, 100, 'DUNGEON CLEARED!', {
      fontSize: '32px',
      color: '#f1c40f',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, 160, 'The Chaos Emperor has fallen.', {
      fontSize: '16px',
      color: '#ecf0f1',
    }).setOrigin(0.5);

    // Fairy congratulations
    const fairy = this.add.image(width / 2, 230, 'enemy_Fairy').setScale(1.0);
    this.tweens.add({
      targets: fairy,
      y: fairy.y - 8,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(width / 2, 280, '"You are a true hero!"', {
      fontSize: '14px',
      color: '#88ccff',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    this.add.text(width / 2, 320, `Final Floor: B${this.stage}F`, {
      fontSize: '18px',
      color: '#bdc3c7',
    }).setOrigin(0.5);

    this.add.text(width / 2, 350, `Gems: ${this.player.gems}`, {
      fontSize: '22px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Save with gems kept
    this.savePersistent();
    BattleScene.clearRunSave();

    const titleBtn = this.add.text(width / 2, 430, '[ RETURN TO TOWN ]', {
      fontSize: '22px',
      color: '#2ecc71',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    titleBtn.on('pointerover', () => titleBtn.setColor('#27ae60'));
    titleBtn.on('pointerout', () => titleBtn.setColor('#2ecc71'));
    titleBtn.on('pointerdown', () => {
      this.scene.start('Town');
    });
  }

  private savePersistent(): void {
    const raw = localStorage.getItem('rune_cascade_save');
    const existing: SaveData = raw ? JSON.parse(raw) : { gems: 0, atkLv: 0, defLv: 0, hpLv: 0, warps: [] };
    const save: SaveData = {
      gems: this.player.gems,
      atkLv: this.player.attackLevel,
      defLv: this.player.defenseLevel,
      hpLv: this.player.hpLevel,
      warps: existing.warps || [],
    };
    localStorage.setItem('rune_cascade_save', JSON.stringify(save));
    this.registry.set('save', save);
  }
}
