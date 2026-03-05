import Phaser from 'phaser';
import { PlayerStats } from '../core/constants';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: { player: PlayerStats; stage: number; won: boolean }): void {
    const { width } = this.scale;
    const { player, stage } = data;

    this.add.text(width / 2, 160, 'GAME OVER', {
      fontSize: '36px',
      color: '#e74c3c',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 220, `Reached Stage ${stage}`, {
      fontSize: '20px',
      color: '#bdc3c7',
    }).setOrigin(0.5);

    this.add.text(width / 2, 260, `Gems: ${player.gems}`, {
      fontSize: '20px',
      color: '#f1c40f',
    }).setOrigin(0.5);

    // Save gems for next run
    const save = {
      gems: player.gems,
      atkLv: player.attackLevel,
      defLv: player.defenseLevel,
      hpLv: player.hpLevel,
    };
    localStorage.setItem('rune_cascade_save', JSON.stringify(save));
    this.registry.set('save', save);

    // Retry button
    const retryBtn = this.add.text(width / 2, 360, '[ TITLE ]', {
      fontSize: '28px',
      color: '#3498db',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerover', () => retryBtn.setColor('#2980b9'));
    retryBtn.on('pointerout', () => retryBtn.setColor('#3498db'));
    retryBtn.on('pointerdown', () => {
      this.scene.start('Title');
    });
  }
}
