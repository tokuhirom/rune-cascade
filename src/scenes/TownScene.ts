import Phaser from 'phaser';
import { createInitialPlayer, SaveData, WARP_FLOORS, PlayerStats } from '../core/constants';
import { BattleScene } from './BattleScene';

declare const __BUILD_TIME__: number;

const FAIRY_TIPS = [
  'Combos deal more damage! Chain matches for big hits.',
  'Shield runes reduce the next enemy attack.',
  'Gold runes give you gems - save them for upgrades!',
  'Bosses appear every 5 floors. Prepare well!',
  'You can return to town from the shop to keep your gems.',
  'Star runes deal magic damage - useful against armored foes.',
  'Heart runes heal you. Match many for bigger heals!',
  'Dying means losing all gems earned in the run...',
  'Warp points let you skip floors you\'ve already cleared.',
  'The deeper you go, the stronger the enemies become.',
  'Mid-bosses at every 20th floor have combined abilities!',
  'Shop items are random - sometimes luck is on your side.',
  'Buffs from the shop last for the entire run.',
  'Shuffle items can save you from a bad board!',
];

export class TownScene extends Phaser.Scene {
  constructor() {
    super('Town');
  }

  create(): void {
    const { width, height } = this.scale;

    // Background gradient feel
    const bg = this.add.graphics();
    bg.fillStyle(0x1a2a3a, 1);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0x0f1f2f, 1);
    bg.fillRect(0, height * 0.6, width, height * 0.4);

    // Title
    this.add.text(width / 2, 25, 'RUNE CASCADE', {
      fontSize: '28px',
      fontFamily: 'serif',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Fairy sprite with floating animation
    const fairy = this.add.image(width / 2 - 80, 110, 'enemy_Fairy').setScale(0.9);
    this.tweens.add({
      targets: fairy,
      y: fairy.y - 6,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Fairy speech bubble
    const tip = FAIRY_TIPS[Math.floor(Math.random() * FAIRY_TIPS.length)];
    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0x2c3e50, 0.9);
    bubbleBg.fillRoundedRect(width / 2 - 30, 75, 200, 70, 8);
    bubbleBg.lineStyle(1, 0x44aaff, 0.5);
    bubbleBg.strokeRoundedRect(width / 2 - 30, 75, 200, 70, 8);
    // Bubble tail
    bubbleBg.fillStyle(0x2c3e50, 0.9);
    bubbleBg.fillTriangle(width / 2 - 10, 105, width / 2 - 25, 110, width / 2 - 10, 115);

    this.add.text(width / 2 + 70, 110, tip, {
      fontSize: '11px',
      color: '#88ccff',
      wordWrap: { width: 180 },
      lineSpacing: 2,
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
      player.defense += player.defenseLevel * 2;
      player.maxHp += player.hpLevel * 10;
      player.hp = player.maxHp;
    }

    const warps = save?.warps || [];

    // Gems display
    this.add.text(width / 2, 160, `Gems: ${player.gems}`, {
      fontSize: '16px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Stats
    this.add.text(width / 2, 180, `ATK: ${player.attack}  DEF: ${player.defense}  HP: ${player.maxHp}`, {
      fontSize: '13px',
      color: '#95a5a6',
    }).setOrigin(0.5);

    let btnY = 215;

    // Continue button (if run save exists)
    const runSave = BattleScene.loadRunSave();
    if (runSave) {
      btnY = this.addButton(width, btnY, `CONTINUE B${runSave.stage}F`, '#e67e22', '#d35400', () => {
        const resumePlayer: PlayerStats = {
          hp: runSave.hp,
          maxHp: runSave.maxHp,
          attack: runSave.attack,
          defense: runSave.defense,
          gems: runSave.gems,
          attackLevel: runSave.attackLevel,
          defenseLevel: runSave.defenseLevel,
          hpLevel: runSave.hpLevel,
          items: runSave.items || { shuffle: 0 },
          buffs: runSave.buffs || { atkUp: false, defUp: false, regen: false, noHeal: false, cursedObstacles: 0 },
          gemsAtRunStart: runSave.gemsAtRunStart || 0,
        };
        this.scene.start('Battle', { player: resumePlayer, stage: runSave.stage });
      });
    }

    // Explore dungeon button
    btnY = this.addButton(width, btnY, 'EXPLORE DUNGEON', '#2ecc71', '#27ae60', () => {
      BattleScene.clearRunSave();
      player.gemsAtRunStart = player.gems;
      this.scene.start('Battle', { player, stage: 1 });
    });

    // Warp buttons
    for (const warpFloor of warps) {
      const warpCost = warpFloor * 2;
      const canAfford = player.gems >= warpCost;
      if (canAfford) {
        btnY = this.addButton(width, btnY, `WARP B${warpFloor + 1}F (${warpCost}G)`, '#00ccaa', '#00aa88', () => {
          BattleScene.clearRunSave();
          player.gems -= warpCost;
          player.gemsAtRunStart = player.gems;
          this.savePersistent(player, save);
          this.scene.start('Battle', { player, stage: warpFloor + 1 });
        });
      } else {
        // Show grayed out
        this.add.text(width / 2, btnY + 16, `WARP B${warpFloor + 1}F (${warpCost}G)`, {
          fontSize: '15px',
          color: '#555555',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        btnY += 38;
      }
    }

    // Upgrade section
    if (player.gems > 0) {
      btnY += 5;
      this.add.text(width / 2, btnY, '~ Fairy Upgrades ~', {
        fontSize: '13px',
        color: '#88ccff',
      }).setOrigin(0.5);
      btnY += 20;

      const upgrades = [
        { label: `ATK Up (${10 + player.attackLevel * 8}G)`, cost: 10 + player.attackLevel * 8, apply: () => { player.attackLevel++; player.attack += 2; } },
        { label: `DEF Up (${10 + player.defenseLevel * 8}G)`, cost: 10 + player.defenseLevel * 8, apply: () => { player.defenseLevel++; player.defense += 2; } },
        { label: `HP Up (${10 + player.hpLevel * 8}G)`, cost: 10 + player.hpLevel * 8, apply: () => { player.hpLevel++; player.maxHp += 10; player.hp = player.maxHp; } },
      ];

      for (const upg of upgrades) {
        const canAfford = player.gems >= upg.cost;
        if (canAfford) {
          btnY = this.addButton(width, btnY, upg.label, '#3498db', '#2980b9', () => {
            player.gems -= upg.cost;
            upg.apply();
            this.savePersistent(player, save);
            this.scene.restart();
          }, true);
        } else {
          this.add.text(width / 2, btnY + 12, upg.label, {
            fontSize: '14px',
            color: '#555555',
          }).setOrigin(0.5);
          btnY += 30;
        }
      }
    }

    // Build date
    const buildDate = new Date(__BUILD_TIME__).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    this.add.text(width / 2, height - 16, `Build: ${buildDate}`, {
      fontSize: '11px',
      color: '#444444',
    }).setOrigin(0.5, 1);
  }

  private addButton(width: number, y: number, label: string, color: string, hoverColor: string, callback: () => void, small = false): number {
    const fontSize = small ? '15px' : '18px';
    const btnHeight = small ? 30 : 36;

    const bg = this.add.graphics();
    bg.fillStyle(0x2c3e50, 0.8);
    bg.fillRoundedRect(60, y, width - 120, btnHeight, 6);
    bg.lineStyle(1, Phaser.Display.Color.HexStringToColor(color).color, 0.6);
    bg.strokeRoundedRect(60, y, width - 120, btnHeight, 6);

    const btn = this.add.text(width / 2, y + btnHeight / 2, label, {
      fontSize,
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hit area covers the full button background - set high depth to ensure it's on top
    const hitArea = this.add.rectangle(width / 2, y + btnHeight / 2, width - 120, btnHeight)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001)
      .setDepth(100);

    hitArea.on('pointerover', () => btn.setColor(hoverColor));
    hitArea.on('pointerout', () => btn.setColor(color));
    hitArea.on('pointerdown', callback);

    return y + btnHeight + 6;
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
