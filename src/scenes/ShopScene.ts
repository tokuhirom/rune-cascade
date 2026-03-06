import Phaser from 'phaser';
import { PlayerStats, SaveData, WARP_FLOORS } from '../core/constants';
import { BattleScene } from './BattleScene';
import { createMuteButton, soundManager } from '../core/SoundManager';

type Rarity = 'common' | 'rare' | 'epic' | 'cursed';

const RARITY_COLORS: Record<Rarity, { border: number; label: string; tag: string }> = {
  common:  { border: 0x888888, label: '#cccccc', tag: '' },
  rare:    { border: 0x3498db, label: '#5dade2', tag: '[Rare] ' },
  epic:    { border: 0x9b59b6, label: '#bb8fce', tag: '[Epic] ' },
  cursed:  { border: 0xe74c3c, label: '#e74c3c', tag: '[Cursed] ' },
};

interface ShopItem {
  label: string;
  desc: string;
  cost: number;
  rarity: Rarity;
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

    createMuteButton(this);
    soundManager.startBgm('shop');

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

    // Shop items: fixed (heal) + random selection from pool
    const returnCost = 30 + data.stage * 2;

    const fixedItems: ShopItem[] = [
      {
        label: 'Heal 50%',
        desc: 'Recover half of max HP',
        cost: 15 + Math.floor(data.stage / 10) * 5,
        rarity: 'common',
        available: (p) => p.hp < p.maxHp,
        apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.5)); },
      },
      {
        label: 'Full Heal',
        desc: 'Fully restore HP',
        cost: 35 + Math.floor(data.stage / 10) * 5,
        rarity: 'common',
        available: (p) => p.hp < p.maxHp,
        apply: (p) => { p.hp = p.maxHp; },
      },
    ];

    const commonPool: ShopItem[] = [
      {
        label: 'Whetstone',
        desc: 'ATK +3 this run',
        cost: 20,
        rarity: 'common',
        available: () => true,
        apply: (p) => { p.attack += 3; },
      },
      {
        label: 'Iron Shield',
        desc: 'DEF +2 this run',
        cost: 18,
        rarity: 'common',
        available: () => true,
        apply: (p) => { p.defense += 2; },
      },
      {
        label: 'Vitality Herb',
        desc: 'Max HP +15 this run',
        cost: 18,
        rarity: 'common',
        available: () => true,
        apply: (p) => { p.maxHp += 15; p.hp += 15; },
      },
      {
        label: 'Shuffle Rune',
        desc: 'Consumable: shuffle board x1',
        cost: 12,
        rarity: 'common',
        available: () => true,
        apply: (p) => { p.items.shuffle++; },
      },
      {
        label: 'Regen Charm',
        desc: 'Heal 3 HP per turn',
        cost: 30,
        rarity: 'common',
        available: (p) => !p.buffs.regen,
        apply: (p) => { p.buffs.regen = true; },
      },
    ];

    const rarePool: ShopItem[] = [
      {
        label: 'ATK Boost',
        desc: 'ATK +50% this run',
        cost: 50,
        rarity: 'rare',
        available: (p) => !p.buffs.atkUp,
        apply: (p) => { p.buffs.atkUp = true; },
      },
      {
        label: 'DEF Boost',
        desc: 'DEF +50% this run',
        cost: 40,
        rarity: 'rare',
        available: (p) => !p.buffs.defUp,
        apply: (p) => { p.buffs.defUp = true; },
      },
      {
        label: 'War Axe',
        desc: 'ATK +8 this run',
        cost: 45,
        rarity: 'rare',
        available: () => true,
        apply: (p) => { p.attack += 8; },
      },
      {
        label: 'Titan Belt',
        desc: 'Max HP +40 this run',
        cost: 40,
        rarity: 'rare',
        available: () => true,
        apply: (p) => { p.maxHp += 40; p.hp += 40; },
      },
      {
        label: 'Shuffle Pack',
        desc: 'Consumable: shuffle board x3',
        cost: 30,
        rarity: 'rare',
        available: () => true,
        apply: (p) => { p.items.shuffle += 3; },
      },
    ];

    const epicPool: ShopItem[] = [
      {
        label: 'Dragon Blade',
        desc: 'ATK +15 this run',
        cost: 80,
        rarity: 'epic',
        available: () => true,
        apply: (p) => { p.attack += 15; },
      },
      {
        label: 'Adamant Armor',
        desc: 'DEF +10 this run',
        cost: 70,
        rarity: 'epic',
        available: () => true,
        apply: (p) => { p.defense += 10; },
      },
      {
        label: 'Elixir of Life',
        desc: 'Max HP +80, full heal',
        cost: 90,
        rarity: 'epic',
        available: () => true,
        apply: (p) => { p.maxHp += 80; p.hp = p.maxHp; },
      },
    ];

    const cursedPool: ShopItem[] = [
      {
        label: 'Berserker Pact',
        desc: 'ATK x2 but heart runes disabled',
        cost: 25,
        rarity: 'cursed',
        available: (p) => !p.buffs.noHeal,
        apply: (p) => { p.attack = Math.floor(p.attack * 2); p.buffs.noHeal = true; },
      },
      {
        label: 'Cursed Fortress',
        desc: 'DEF +20 but obstacles each turn',
        cost: 20,
        rarity: 'cursed',
        available: (p) => !p.buffs.cursedObstacles,
        apply: (p) => { p.defense += 20; p.buffs.cursedObstacles = 2; },
      },
      {
        label: 'Blood Diamond',
        desc: 'Gems +50 but lose 30% max HP',
        cost: 5,
        rarity: 'cursed',
        available: () => true,
        apply: (p) => {
          p.gems += 50;
          const hpLoss = Math.floor(p.maxHp * 0.3);
          p.maxHp -= hpLoss;
          p.hp = Math.min(p.hp, p.maxHp);
        },
      },
      {
        label: 'Dark Bargain',
        desc: 'ATK +10 DEF +5 but 3 obstacles/turn',
        cost: 15,
        rarity: 'cursed',
        available: (p) => !p.buffs.cursedObstacles,
        apply: (p) => { p.attack += 10; p.defense += 5; p.buffs.cursedObstacles = 3; },
      },
    ];

    // Roll rarity for each of 3 random slots
    // Deeper floors have higher chance of rare/epic
    const rollRarity = (): Rarity => {
      const r = Math.random();
      const epicChance = Math.min(0.05 + data.stage * 0.003, 0.15);
      const rareChance = Math.min(0.15 + data.stage * 0.005, 0.35);
      const cursedChance = Math.min(0.05 + data.stage * 0.002, 0.15);
      if (r < epicChance) return 'epic';
      if (r < epicChance + rareChance) return 'rare';
      if (r < epicChance + rareChance + cursedChance) return 'cursed';
      return 'common';
    };

    const pickFromPool = (pool: ShopItem[]): ShopItem | null => {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      return shuffled[0] || null;
    };

    const picked: ShopItem[] = [];
    const usedLabels = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const rarity = rollRarity();
      let pool: ShopItem[];
      switch (rarity) {
        case 'epic': pool = epicPool; break;
        case 'rare': pool = rarePool; break;
        case 'cursed': pool = cursedPool; break;
        default: pool = commonPool; break;
      }
      // Avoid duplicates
      const available = pool.filter(item => !usedLabels.has(item.label));
      const item = pickFromPool(available.length > 0 ? available : commonPool.filter(item => !usedLabels.has(item.label)));
      if (item) {
        picked.push(item);
        usedLabels.add(item.label);
      }
    }

    const items = [...fixedItems, ...picked];

    const startY = 200;
    const itemHeight = 52;
    const itemElements: { bg: Phaser.GameObjects.Graphics; labelText: Phaser.GameObjects.Text; descText: Phaser.GameObjects.Text; costText: Phaser.GameObjects.Text; item: ShopItem; sold: boolean }[] = [];

    const refreshShop = () => {
      gemsText.setText(`Gems: ${player.gems}`);
      hpText.setText(`HP: ${player.hp} / ${player.maxHp}`);
      hpText.setColor(player.hp < player.maxHp * 0.5 ? '#e74c3c' : '#2ecc71');
      for (const el of itemElements) {
        const canAfford = !el.sold && player.gems >= el.item.cost && el.item.available(player);
        el.bg.clear();
        el.bg.fillStyle(canAfford ? 0x2c3e50 : 0x1a1a2e, 1);
        const y = startY + itemElements.indexOf(el) * itemHeight;
        const rarityInfo = RARITY_COLORS[el.item.rarity];
        el.bg.fillRoundedRect(20, y, width - 40, itemHeight - 6, 6);
        el.bg.lineStyle(2, canAfford ? rarityInfo.border : 0x444444, 1);
        el.bg.strokeRoundedRect(20, y, width - 40, itemHeight - 6, 6);
        if (el.sold) {
          el.labelText.setColor('#555555');
          el.descText.setText('SOLD').setColor('#555555');
          el.costText.setText('---').setColor('#555555');
        } else {
          el.labelText.setColor(canAfford ? rarityInfo.label : '#666666');
          el.costText.setColor(canAfford ? '#f1c40f' : '#666666');
        }
      }
    };

    items.forEach((item, i) => {
      const y = startY + i * itemHeight;
      const canAfford = player.gems >= item.cost && item.available(player);
      const rarityInfo = RARITY_COLORS[item.rarity];

      const bg = this.add.graphics();
      bg.fillStyle(canAfford ? 0x2c3e50 : 0x1a1a2e, 1);
      bg.fillRoundedRect(20, y, width - 40, itemHeight - 6, 6);
      bg.lineStyle(2, canAfford ? rarityInfo.border : 0x444444, 1);
      bg.strokeRoundedRect(20, y, width - 40, itemHeight - 6, 6);

      const labelText = this.add.text(35, y + 8, rarityInfo.tag + item.label, {
        fontSize: '15px',
        color: canAfford ? rarityInfo.label : '#666666',
        fontStyle: 'bold',
      });

      const descText = this.add.text(35, y + 28, item.desc, {
        fontSize: '11px',
        color: canAfford ? '#bdc3c7' : '#555555',
      });

      const costText = this.add.text(width - 35, y + 18, `${item.cost}G`, {
        fontSize: '14px',
        color: canAfford ? '#f1c40f' : '#666666',
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);

      const el = { bg, labelText, descText, costText, item, sold: false };
      itemElements.push(el);

      const hitArea = this.add.rectangle(width / 2, y + (itemHeight - 6) / 2, width - 40, itemHeight - 6)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0.001)
        .setDepth(100);

      hitArea.on('pointerdown', () => {
        if (!el.sold && player.gems >= item.cost && item.available(player)) {
          player.gems -= item.cost;
          item.apply(player);
          el.sold = true;
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
