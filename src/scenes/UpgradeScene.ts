import Phaser from 'phaser';
import { PlayerStats } from '../core/constants';

interface UpgradeOption {
  label: string;
  desc: string;
  cost: number;
  apply: (p: PlayerStats) => void;
}

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('Upgrade');
  }

  create(data: { player: PlayerStats; stage?: number }): void {
    const { width, height } = this.scale;
    const player = data.player;
    const nextStage = data.stage || 1;

    this.add.text(width / 2, 40, 'UPGRADE', {
      fontSize: '32px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 90, `Gems: ${player.gems}`, {
      fontSize: '20px',
      color: '#f1c40f',
    }).setOrigin(0.5);

    const upgrades: UpgradeOption[] = [
      {
        label: 'Attack Up',
        desc: `ATK +2 (Lv ${player.attackLevel})`,
        cost: 10 + player.attackLevel * 8,
        apply: (p) => { p.attackLevel++; p.attack += 2; },
      },
      {
        label: 'Defense Up',
        desc: `DEF +1 (Lv ${player.defenseLevel})`,
        cost: 10 + player.defenseLevel * 8,
        apply: (p) => { p.defenseLevel++; p.defense += 1; },
      },
      {
        label: 'HP Up',
        desc: `MaxHP +10 (Lv ${player.hpLevel})`,
        cost: 10 + player.hpLevel * 8,
        apply: (p) => { p.hpLevel++; p.maxHp += 10; p.hp = p.maxHp; },
      },
      {
        label: 'Heal',
        desc: 'Full HP Recovery',
        cost: 5,
        apply: (p) => { p.hp = p.maxHp; },
      },
    ];

    const startY = 160;
    upgrades.forEach((upg, i) => {
      const y = startY + i * 90;
      const canAfford = player.gems >= upg.cost;

      const bg = this.add.graphics();
      bg.fillStyle(canAfford ? 0x2c3e50 : 0x1a1a2e, 1);
      bg.fillRoundedRect(40, y, width - 80, 70, 8);
      bg.lineStyle(2, canAfford ? 0x3498db : 0x555555, 1);
      bg.strokeRoundedRect(40, y, width - 80, 70, 8);

      this.add.text(60, y + 12, upg.label, {
        fontSize: '18px',
        color: canAfford ? '#ecf0f1' : '#666666',
        fontStyle: 'bold',
      });

      this.add.text(60, y + 38, upg.desc, {
        fontSize: '13px',
        color: canAfford ? '#bdc3c7' : '#555555',
      });

      this.add.text(width - 60, y + 25, `${upg.cost}G`, {
        fontSize: '16px',
        color: canAfford ? '#f1c40f' : '#666666',
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);

      if (canAfford) {
        const hitArea = this.add.rectangle(width / 2, y + 35, width - 80, 70)
          .setInteractive({ useHandCursor: true })
          .setAlpha(0.001);

        hitArea.on('pointerdown', () => {
          player.gems -= upg.cost;
          upg.apply(player);
          this.savePersistent(player);
          this.scene.restart({ player, stage: nextStage });
        });
      }
    });

    // Stats
    const statsY = startY + upgrades.length * 90 + 30;
    this.add.text(width / 2, statsY, `ATK: ${player.attack}  DEF: ${player.defense}  HP: ${player.hp}/${player.maxHp}`, {
      fontSize: '14px',
      color: '#95a5a6',
    }).setOrigin(0.5);

    // Continue button
    const continueBtn = this.add.text(width / 2, statsY + 60, '[ CONTINUE ]', {
      fontSize: '24px',
      color: '#2ecc71',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    continueBtn.on('pointerdown', () => {
      this.savePersistent(player);
      this.scene.start('Battle', { player, stage: nextStage });
    });
  }

  private savePersistent(player: PlayerStats): void {
    const save = {
      gems: player.gems,
      atkLv: player.attackLevel,
      defLv: player.defenseLevel,
      hpLv: player.hpLevel,
    };
    localStorage.setItem('rune_cascade_save', JSON.stringify(save));
    this.registry.set('save', save);
  }
}
