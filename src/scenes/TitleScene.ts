import Phaser from 'phaser';
import { createInitialPlayer } from '../core/constants';
import { BattleScene } from './BattleScene';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.text(width / 2, 160, 'RUNE CASCADE', {
      fontSize: '40px',
      fontFamily: 'serif',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 220, 'Match-3 Roguelite', {
      fontSize: '18px',
      color: '#bdc3c7',
    }).setOrigin(0.5);

    // Load saved upgrades
    const save = this.registry.get('save') as { gems: number; atkLv: number; defLv: number; hpLv: number } | undefined;

    const player = createInitialPlayer();
    if (save) {
      player.gems = save.gems || 0;
      player.attackLevel = save.atkLv || 0;
      player.defenseLevel = save.defLv || 0;
      player.hpLevel = save.hpLv || 0;
      player.attack += player.attackLevel * 2;
      player.defense += player.defenseLevel * 1;
      player.maxHp += player.hpLevel * 10;
      player.hp = player.maxHp;
    }

    if (player.gems > 0) {
      this.add.text(width / 2, 280, `Gems: ${player.gems}`, {
        fontSize: '16px',
        color: '#f1c40f',
      }).setOrigin(0.5);
    }

    let btnY = 360;

    // Continue button (if run save exists)
    const runSave = BattleScene.loadRunSave();
    if (runSave) {
      const continueBtn = this.add.text(width / 2, btnY, `[ CONTINUE Stage ${runSave.stage} ]`, {
        fontSize: '24px',
        color: '#e67e22',
        fontStyle: 'bold',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      continueBtn.on('pointerover', () => continueBtn.setColor('#d35400'));
      continueBtn.on('pointerout', () => continueBtn.setColor('#e67e22'));
      continueBtn.on('pointerdown', () => {
        const resumePlayer = {
          hp: runSave.hp,
          maxHp: runSave.maxHp,
          attack: runSave.attack,
          defense: runSave.defense,
          gems: runSave.gems,
          attackLevel: runSave.attackLevel,
          defenseLevel: runSave.defenseLevel,
          hpLevel: runSave.hpLevel,
        };
        this.scene.start('Battle', { player: resumePlayer, stage: runSave.stage });
      });
      btnY += 50;
    }

    // Start button
    const startBtn = this.add.text(width / 2, btnY, '[ NEW RUN ]', {
      fontSize: '28px',
      color: '#2ecc71',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setColor('#27ae60'));
    startBtn.on('pointerout', () => startBtn.setColor('#2ecc71'));
    startBtn.on('pointerdown', () => {
      BattleScene.clearRunSave();
      this.scene.start('Battle', { player, stage: 1 });
    });
    btnY += 50;

    // Upgrade button
    if (player.gems > 0) {
      const upgradeBtn = this.add.text(width / 2, btnY, '[ UPGRADE ]', {
        fontSize: '24px',
        color: '#3498db',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      upgradeBtn.on('pointerover', () => upgradeBtn.setColor('#2980b9'));
      upgradeBtn.on('pointerout', () => upgradeBtn.setColor('#3498db'));
      upgradeBtn.on('pointerdown', () => {
        this.scene.start('Upgrade', { player });
      });
      btnY += 50;
    }

    // Stats display
    const statsY = 520;
    this.add.text(width / 2, statsY, `ATK: ${player.attack}  DEF: ${player.defense}  HP: ${player.maxHp}`, {
      fontSize: '14px',
      color: '#95a5a6',
    }).setOrigin(0.5);

    // Build date
    const buildDate = new Date(__BUILD_TIME__).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    this.add.text(width / 2, height - 16, `Build: ${buildDate}`, {
      fontSize: '11px',
      color: '#555555',
    }).setOrigin(0.5, 1);
  }
}
