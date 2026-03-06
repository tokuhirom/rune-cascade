import Phaser from 'phaser';
import { PlayerStats, SaveData, WARP_FLOORS } from '../core/constants';
import { BattleScene } from './BattleScene';

interface ShopItem {
  label: string;
  desc: string;
  cost: number;
  available: (p: PlayerStats) => boolean;
  apply: (p: PlayerStats) => void;
}

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create(data: { player: PlayerStats; stage: number }): void {
    const { width } = this.scale;
    const player = data.player;
    const nextStage = data.stage + 1;

    // Unlock warp point if applicable
    if (WARP_FLOORS.includes(data.stage)) {
      this.unlockWarp(data.stage);
    }

    // Title
    this.add.text(width / 2, 20, `B${data.stage}F - Rest Point`, {
      fontSize: '20px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Merchant sprite
    this.add.image(width / 2, 80, 'enemy_Merchant').setScale(1.0);
    this.add.text(width / 2, 125, '"Welcome, adventurer..."', {
      fontSize: '13px',
      color: '#ccaa66',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Warp unlock notification
    if (WARP_FLOORS.includes(data.stage)) {
      this.add.text(width / 2, 145, `Warp Point B${data.stage}F unlocked!`, {
        fontSize: '14px',
        color: '#00ffaa',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    // Player status
    const hpText = this.add.text(width / 2, 162, `HP: ${player.hp} / ${player.maxHp}`, {
      fontSize: '14px',
      color: player.hp < player.maxHp * 0.5 ? '#e74c3c' : '#2ecc71',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const gemsText = this.add.text(width / 2, 180, `Gems: ${player.gems}`, {
      fontSize: '16px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Shop items: fixed (heal/return) + random selection from pool
    const returnCost = 30 + data.stage * 2;

    const fixedItems: ShopItem[] = [
      {
        label: 'Heal 50%',
        desc: 'Recover half of max HP',
        cost: 10,
        available: (p) => p.hp < p.maxHp,
        apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.5)); },
      },
      {
        label: 'Full Heal',
        desc: 'Fully restore HP',
        cost: 25,
        available: (p) => p.hp < p.maxHp,
        apply: (p) => { p.hp = p.maxHp; },
      },
    ];

    const randomPool: ShopItem[] = [
      {
        label: 'ATK Boost',
        desc: 'ATK +50% this run',
        cost: 20,
        available: (p) => !p.buffs.atkUp,
        apply: (p) => { p.buffs.atkUp = true; },
      },
      {
        label: 'DEF Boost',
        desc: 'DEF +50% this run',
        cost: 15,
        available: (p) => !p.buffs.defUp,
        apply: (p) => { p.buffs.defUp = true; },
      },
      {
        label: 'Regen',
        desc: 'Heal 3 HP per turn',
        cost: 15,
        available: (p) => !p.buffs.regen,
        apply: (p) => { p.buffs.regen = true; },
      },
      {
        label: 'Shuffle Rune',
        desc: 'Consumable: shuffle board x1',
        cost: 8,
        available: () => true,
        apply: (p) => { p.items.shuffle++; },
      },
      {
        label: 'Whetstone',
        desc: 'ATK +3 this run',
        cost: 12,
        available: () => true,
        apply: (p) => { p.attack += 3; },
      },
      {
        label: 'Iron Shield',
        desc: 'DEF +2 this run',
        cost: 10,
        available: () => true,
        apply: (p) => { p.defense += 2; },
      },
      {
        label: 'Vitality Herb',
        desc: 'Max HP +10 this run',
        cost: 10,
        available: () => true,
        apply: (p) => { p.maxHp += 10; p.hp += 10; },
      },
    ];

    // Pick 3 random items from pool
    const shuffled = randomPool.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 3);
    const items = [...fixedItems, ...picked];

    const startY = 200;
    const itemHeight = 52;
    const itemElements: { bg: Phaser.GameObjects.Graphics; hitArea?: Phaser.GameObjects.Rectangle; labelText: Phaser.GameObjects.Text; costText: Phaser.GameObjects.Text; item: ShopItem }[] = [];

    const refreshShop = () => {
      gemsText.setText(`Gems: ${player.gems}`);
      hpText.setText(`HP: ${player.hp} / ${player.maxHp}`);
      hpText.setColor(player.hp < player.maxHp * 0.5 ? '#e74c3c' : '#2ecc71');
      for (const el of itemElements) {
        const canAfford = player.gems >= el.item.cost && el.item.available(player);
        el.bg.clear();
        el.bg.fillStyle(canAfford ? 0x2c3e50 : 0x1a1a2e, 1);
        const y = startY + itemElements.indexOf(el) * itemHeight;
        el.bg.fillRoundedRect(20, y, width - 40, itemHeight - 6, 6);
        el.bg.lineStyle(1, canAfford ? 0x3498db : 0x444444, 1);
        el.bg.strokeRoundedRect(20, y, width - 40, itemHeight - 6, 6);
        el.labelText.setColor(canAfford ? '#ecf0f1' : '#666666');
        el.costText.setColor(canAfford ? '#f1c40f' : '#666666');
      }
    };

    items.forEach((item, i) => {
      const y = startY + i * itemHeight;
      const canAfford = player.gems >= item.cost && item.available(player);

      const bg = this.add.graphics();
      bg.fillStyle(canAfford ? 0x2c3e50 : 0x1a1a2e, 1);
      bg.fillRoundedRect(20, y, width - 40, itemHeight - 6, 6);
      bg.lineStyle(1, canAfford ? 0x3498db : 0x444444, 1);
      bg.strokeRoundedRect(20, y, width - 40, itemHeight - 6, 6);

      const labelText = this.add.text(35, y + 8, item.label, {
        fontSize: '15px',
        color: canAfford ? '#ecf0f1' : '#666666',
        fontStyle: 'bold',
      });

      this.add.text(35, y + 28, item.desc, {
        fontSize: '11px',
        color: canAfford ? '#bdc3c7' : '#555555',
      });

      const costText = this.add.text(width - 35, y + 18, `${item.cost}G`, {
        fontSize: '14px',
        color: canAfford ? '#f1c40f' : '#666666',
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);

      const el = { bg, labelText, costText, item };
      itemElements.push(el);

      const hitArea = this.add.rectangle(width / 2, y + (itemHeight - 6) / 2, width - 40, itemHeight - 6)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0.001);

      hitArea.on('pointerdown', () => {
        if (player.gems >= item.cost && item.available(player)) {
          player.gems -= item.cost;
          item.apply(player);
          refreshShop();
        }
      });
    });

    // Bottom buttons
    const btnY = startY + items.length * itemHeight + 15;

    // Continue deeper
    const continueBtn = this.add.text(width / 2, btnY, '[ CONTINUE ]', {
      fontSize: '22px',
      color: '#2ecc71',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    continueBtn.on('pointerover', () => continueBtn.setColor('#27ae60'));
    continueBtn.on('pointerout', () => continueBtn.setColor('#2ecc71'));
    continueBtn.on('pointerdown', () => {
      this.savePersistent(player);
      BattleScene.saveRunStateStatic(player, nextStage);
      this.scene.start('Battle', { player, stage: nextStage });
    });

    // Return to town
    const returnBtn = this.add.text(width / 2, btnY + 40, `[ RETURN TO TOWN - ${returnCost}G ]`, {
      fontSize: '16px',
      color: player.gems >= returnCost ? '#e67e22' : '#666666',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    returnBtn.on('pointerdown', () => {
      if (player.gems >= returnCost) {
        player.gems -= returnCost;
        this.savePersistent(player);
        BattleScene.clearRunSave();
        this.scene.start('Town');
      }
    });
  }

  private unlockWarp(floor: number): void {
    const raw = localStorage.getItem('rune_cascade_save');
    const save: SaveData = raw ? JSON.parse(raw) : { gems: 0, atkLv: 0, defLv: 0, hpLv: 0, warps: [] };
    if (!save.warps) save.warps = [];
    if (!save.warps.includes(floor)) {
      save.warps.push(floor);
      save.warps.sort((a, b) => a - b);
      localStorage.setItem('rune_cascade_save', JSON.stringify(save));
      this.registry.set('save', save);
    }
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
