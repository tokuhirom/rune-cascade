import Phaser from 'phaser';
import { PlayerStats, SaveData } from '../core/constants';
import { BattleScene } from './BattleScene';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('Victory');
  }

  create(data: { player: PlayerStats; stage: number }): void {
    const { width } = this.scale;
    const { player, stage } = data;

    this.cameras.main.flash(1000, 255, 200, 50);

    this.add.text(width / 2, 120, 'DUNGEON CLEARED!', {
      fontSize: '32px',
      color: '#f1c40f',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, 180, 'The Chaos Emperor has fallen.', {
      fontSize: '16px',
      color: '#ecf0f1',
    }).setOrigin(0.5);

    this.add.text(width / 2, 220, `Final Floor: B${stage}F`, {
      fontSize: '18px',
      color: '#bdc3c7',
    }).setOrigin(0.5);

    this.add.text(width / 2, 260, `Gems: ${player.gems}`, {
      fontSize: '22px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Save with gems kept
    this.savePersistent(player);
    BattleScene.clearRunSave();

    const titleBtn = this.add.text(width / 2, 380, '[ TITLE ]', {
      fontSize: '28px',
      color: '#2ecc71',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    titleBtn.on('pointerdown', () => {
      this.scene.start('Title');
    });
  }

  private savePersistent(player: PlayerStats): void {
    const raw = localStorage.getItem('rune_cascade_save');
    const existing: SaveData = raw ? JSON.parse(raw) : { gems: 0, atkLv: 0, defLv: 0, hpLv: 0, warps: [] };
    const save: SaveData = {
      gems: player.gems,
      atkLv: player.attackLevel,
      defLv: player.defenseLevel,
      hpLv: player.hpLevel,
      warps: existing.warps || [],
    };
    localStorage.setItem('rune_cascade_save', JSON.stringify(save));
    this.registry.set('save', save);
  }
}
