import Phaser from 'phaser';
import { getRunHistory, RunHistoryEntry } from '../core/constants';
import { createMuteButton, soundManager } from '../core/SoundManager';

export class HistoryScene extends Phaser.Scene {
  constructor() {
    super('History');
  }

  create(): void {
    const { width, height } = this.scale;
    createMuteButton(this);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a2a3a, 1);
    bg.fillRect(0, 0, width, height);

    this.add.text(width / 2, 25, 'Adventure Log', {
      fontSize: '24px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const history = getRunHistory();

    if (history.length === 0) {
      this.add.text(width / 2, height / 2, 'No adventures yet...', {
        fontSize: '16px',
        color: '#888888',
      }).setOrigin(0.5);
    } else {
      let y = 60;
      for (const entry of history) {
        const { text, color } = this.formatEntry(entry);
        const date = new Date(entry.timestamp);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

        this.add.text(16, y, dateStr, {
          fontSize: '11px',
          color: '#666666',
        });

        this.add.text(80, y, text, {
          fontSize: '13px',
          color,
          wordWrap: { width: width - 100 },
        });

        y += 24;
        if (y > height - 60) break;
      }
    }

    const backBtn = this.add.text(width / 2, height - 35, '[ BACK ]', {
      fontSize: '20px',
      color: '#3498db',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#2980b9'));
    backBtn.on('pointerout', () => backBtn.setColor('#3498db'));
    backBtn.on('pointerdown', () => {
      this.scene.start('Town');
    });
  }

  private formatEntry(entry: RunHistoryEntry): { text: string; color: string } {
    switch (entry.type) {
      case 'death':
        return {
          text: `B${entry.floor}F - Killed by ${entry.enemy || 'unknown'}`,
          color: '#e74c3c',
        };
      case 'return':
        return {
          text: `B${entry.floor}F - Returned to town`,
          color: '#e67e22',
        };
      case 'victory':
        return {
          text: `B${entry.floor}F - Dungeon Cleared!`,
          color: '#f1c40f',
        };
    }
  }
}
