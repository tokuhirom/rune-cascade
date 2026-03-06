import Phaser from 'phaser';
import { createInitialPlayer, SaveData, WARP_FLOORS } from '../core/constants';
import { BattleScene } from './BattleScene';

declare const __BUILD_TIME__: number;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.text(width / 2, 100, 'RUNE CASCADE', {
      fontSize: '40px',
      fontFamily: 'serif',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 150, 'Dungeon B100F', {
      fontSize: '16px',
      color: '#bdc3c7',
    }).setOrigin(0.5);

    // Load saved data
    const save = this.registry.get('save') as SaveData | undefined;

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

    const warps = save?.warps || [];

    this.add.text(width / 2, 190, `Gems: ${player.gems}`, {
      fontSize: '16px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    let btnY = 240;

    // Continue button (if run save exists)
    const runSave = BattleScene.loadRunSave();
    if (runSave) {
      const continueBtn = this.add.text(width / 2, btnY, `[ CONTINUE B${runSave.stage}F ]`, {
        fontSize: '22px',
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
          items: runSave.items || { shuffle: 0 },
          buffs: runSave.buffs || { atkUp: false, defUp: false, regen: false },
          gemsAtRunStart: runSave.gemsAtRunStart || 0,
        };
        this.scene.start('Battle', { player: resumePlayer, stage: runSave.stage });
      });
      btnY += 45;
    }

    // New Run button
    const startBtn = this.add.text(width / 2, btnY, '[ NEW RUN - B1F ]', {
      fontSize: '22px',
      color: '#2ecc71',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setColor('#27ae60'));
    startBtn.on('pointerout', () => startBtn.setColor('#2ecc71'));
    startBtn.on('pointerdown', () => {
      BattleScene.clearRunSave();
      player.gemsAtRunStart = player.gems;
      this.scene.start('Battle', { player, stage: 1 });
    });
    btnY += 45;

    // Warp buttons
    for (const warpFloor of warps) {
      const warpCost = warpFloor * 2;
      const canAfford = player.gems >= warpCost;
      const warpBtn = this.add.text(width / 2, btnY, `[ WARP B${warpFloor + 1}F - ${warpCost}G ]`, {
        fontSize: '18px',
        color: canAfford ? '#00ccaa' : '#555555',
        fontStyle: 'bold',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      if (canAfford) {
        warpBtn.on('pointerover', () => warpBtn.setColor('#00aa88'));
        warpBtn.on('pointerout', () => warpBtn.setColor('#00ccaa'));
        warpBtn.on('pointerdown', () => {
          BattleScene.clearRunSave();
          player.gems -= warpCost;
          player.gemsAtRunStart = player.gems;
          // Save the gem deduction
          this.savePersistent(player, save);
          this.scene.start('Battle', { player, stage: warpFloor + 1 });
        });
      }
      btnY += 40;
    }

    // Upgrade button
    if (player.gems > 0) {
      const upgradeBtn = this.add.text(width / 2, btnY, '[ UPGRADE ]', {
        fontSize: '20px',
        color: '#3498db',
        fontStyle: 'bold',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      upgradeBtn.on('pointerover', () => upgradeBtn.setColor('#2980b9'));
      upgradeBtn.on('pointerout', () => upgradeBtn.setColor('#3498db'));
      upgradeBtn.on('pointerdown', () => {
        this.scene.start('Upgrade', { player });
      });
      btnY += 40;
    }

    // Stats display
    this.add.text(width / 2, btnY + 20, `ATK: ${player.attack}  DEF: ${player.defense}  HP: ${player.maxHp}`, {
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

  private savePersistent(player: { gems: number; attackLevel: number; defenseLevel: number; hpLevel: number }, existing?: SaveData): void {
    const save: SaveData = {
      gems: player.gems,
      atkLv: player.attackLevel,
      defLv: player.defenseLevel,
      hpLv: player.hpLevel,
      warps: existing?.warps || [],
    };
    localStorage.setItem('rune_cascade_save', JSON.stringify(save));
    this.registry.set('save', save);
  }
}
