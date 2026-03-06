import Phaser from 'phaser';
import { PlayerStats, SaveData } from '../core/constants';
import { BattleScene } from './BattleScene';
import { createMuteButton, soundManager } from '../core/SoundManager';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: { player: PlayerStats; stage: number; won: boolean }): void {
    const { width } = this.scale;
    createMuteButton(this);
    soundManager.stopBgm();
    const { player, stage } = data;

    this.add.text(width / 2, 160, 'GAME OVER', {
      fontSize: '36px',
      color: '#e74c3c',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 220, `Reached B${stage}F`, {
      fontSize: '20px',
      color: '#bdc3c7',
    }).setOrigin(0.5);

    // Gems are lost on death (restored to pre-run value)
    const lostGems = player.gems - player.gemsAtRunStart;
    if (lostGems > 0) {
      this.add.text(width / 2, 260, `Lost ${lostGems} Gems...`, {
        fontSize: '18px',
        color: '#e74c3c',
      }).setOrigin(0.5);
    }

    this.add.text(width / 2, 290, `Gems: ${player.gemsAtRunStart}`, {
      fontSize: '20px',
      color: '#f1c40f',
    }).setOrigin(0.5);

    // Save with pre-run gems (gems earned this run are lost)
    const raw = localStorage.getItem('rune_cascade_save');
    const existing: SaveData = raw ? JSON.parse(raw) : { gems: 0, atkLv: 0, defLv: 0, hpLv: 0, warps: [] };
    const save: SaveData = {
      gems: player.gemsAtRunStart,
      atkLv: player.attackLevel,
      defLv: player.defenseLevel,
      hpLv: player.hpLevel,
      warps: existing.warps || [],
    };
    localStorage.setItem('rune_cascade_save', JSON.stringify(save));
    this.registry.set('save', save);
    BattleScene.clearRunSave();

    // Retry button
    const retryBtn = this.add.text(width / 2, 380, '[ TITLE ]', {
      fontSize: '28px',
      color: '#3498db',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerover', () => retryBtn.setColor('#2980b9'));
    retryBtn.on('pointerout', () => retryBtn.setColor('#3498db'));
    retryBtn.on('pointerdown', () => {
      this.scene.start('Town');
    });
  }
}
