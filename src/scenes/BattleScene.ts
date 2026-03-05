import Phaser from 'phaser';
import { Board, MatchResult } from '../core/Board';
import {
  BOARD_COLS, BOARD_ROWS, CELL_SIZE, BOARD_OFFSET_X, BOARD_OFFSET_Y,
  RuneType, RUNE_SYMBOLS, RUNE_COLORS,
  PlayerStats, EnemyData, generateEnemy,
} from '../core/constants';
import { Effects } from '../core/Effects';

export class BattleScene extends Phaser.Scene {
  private board!: Board;
  private player!: PlayerStats;
  private enemy!: EnemyData;
  private stage!: number;
  private runeSprites: (Phaser.GameObjects.Container | null)[][] = [];
  private selectedCell: [number, number] | null = null;
  private isProcessing = false;
  private shieldBuffer = 0;
  private comboCount = 0;
  private fx!: Effects;

  // UI elements
  private playerHpText!: Phaser.GameObjects.Text;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private enemyHpText!: Phaser.GameObjects.Text;
  private enemyHpBar!: Phaser.GameObjects.Graphics;
  private enemyNameText!: Phaser.GameObjects.Text;
  private enemyTimerText!: Phaser.GameObjects.Text;
  private enemySprite!: Phaser.GameObjects.Image;
  private stageText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;

  constructor() {
    super('Battle');
  }

  init(data: { player: PlayerStats; stage: number }): void {
    this.player = data.player;
    this.stage = data.stage;
    this.enemy = generateEnemy(this.stage);
    this.selectedCell = null;
    this.isProcessing = false;
    this.shieldBuffer = 0;
    this.comboCount = 0;
    this.runeSprites = [];
  }

  create(): void {
    const { width } = this.scale;
    this.board = new Board();
    this.fx = new Effects(this);

    // Stage header
    this.stageText = this.add.text(width / 2, 16, `Stage ${this.stage}`, {
      fontSize: '18px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Enemy area
    this.enemySprite = this.add.image(width / 2, 90, 'enemy').setScale(0.8);
    this.enemyNameText = this.add.text(width / 2, 140, this.enemy.name, {
      fontSize: '16px',
      color: '#ecf0f1',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Enemy HP bar
    this.enemyHpBar = this.add.graphics();
    this.enemyHpText = this.add.text(width / 2, 170, '', {
      fontSize: '13px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Enemy timer
    this.enemyTimerText = this.add.text(width / 2, 190, '', {
      fontSize: '14px',
      color: '#e67e22',
    }).setOrigin(0.5);

    // Player HP bar
    this.playerHpBar = this.add.graphics();
    this.playerHpText = this.add.text(width / 2, 222, '', {
      fontSize: '13px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Combo text
    this.comboText = this.add.text(width / 2, 254, '', {
      fontSize: '20px',
      color: '#f39c12',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.updateUI();

    // Create board sprites
    this.createBoardSprites();

    // Input
    this.input.on('gameobjectdown', (_ptr: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (this.isProcessing) return;
      const r = obj.getData('row') as number;
      const c = obj.getData('col') as number;
      if (r === undefined || c === undefined) return;
      this.onCellClick(r, c);
    });
  }

  private createBoardSprites(): void {
    // Clear existing
    for (const row of this.runeSprites) {
      if (row) {
        for (const sprite of row) {
          sprite?.destroy();
        }
      }
    }
    this.runeSprites = [];

    for (let r = 0; r < BOARD_ROWS; r++) {
      this.runeSprites[r] = [];
      for (let c = 0; c < BOARD_COLS; c++) {
        this.runeSprites[r][c] = this.createRuneAt(r, c);
      }
    }
  }

  private createRuneAt(r: number, c: number): Phaser.GameObjects.Container | null {
    const type = this.board.get(r, c);
    if (type === null) return null;

    const x = BOARD_OFFSET_X + c * CELL_SIZE + CELL_SIZE / 2;
    const y = BOARD_OFFSET_Y + r * CELL_SIZE + CELL_SIZE / 2;

    const img = this.add.image(0, 0, `rune_${type}`);
    const symbol = this.add.text(0, 0, RUNE_SYMBOLS[type], {
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const container = this.add.container(x, y, [img, symbol]);
    container.setSize(CELL_SIZE - 4, CELL_SIZE - 4);
    container.setInteractive();
    container.setData('row', r);
    container.setData('col', c);

    return container;
  }

  private onCellClick(r: number, c: number): void {
    if (!this.selectedCell) {
      this.selectedCell = [r, c];
      this.highlightCell(r, c, true);
      return;
    }

    const [sr, sc] = this.selectedCell;
    this.highlightCell(sr, sc, false);

    if (sr === r && sc === c) {
      this.selectedCell = null;
      return;
    }

    if (!this.board.isAdjacent(sr, sc, r, c)) {
      // Select new cell instead
      this.selectedCell = [r, c];
      this.highlightCell(r, c, true);
      return;
    }

    this.selectedCell = null;
    this.trySwap(sr, sc, r, c);
  }

  private highlightCell(r: number, c: number, on: boolean): void {
    const sprite = this.runeSprites[r]?.[c];
    if (!sprite) return;
    if (on) {
      sprite.setScale(1.15);
    } else {
      sprite.setScale(1);
    }
  }

  private async trySwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    this.isProcessing = true;
    this.comboCount = 0;
    this.shieldBuffer = 0;

    // Animate swap
    this.board.swap(r1, c1, r2, c2);
    await this.animateSwap(r1, c1, r2, c2);

    // Check matches
    const matches = this.board.findMatches();
    if (matches.length === 0) {
      // Swap back
      this.board.swap(r1, c1, r2, c2);
      await this.animateSwap(r1, c1, r2, c2);
      this.isProcessing = false;
      return;
    }

    // Process cascades
    await this.processCascades();

    // Enemy turn
    this.enemy.turnTimer--;
    if (this.enemy.hp > 0) {
      if (this.enemy.turnTimer <= 0) {
        await this.enemyAttack();
        this.enemy.turnTimer = this.enemy.maxTurnTimer;
      }
      this.updateUI();
    }

    // Check death
    if (this.player.hp <= 0) {
      this.time.delayedCall(500, () => {
        this.scene.start('GameOver', {
          player: this.player,
          stage: this.stage,
          won: false,
        });
      });
    }

    this.isProcessing = false;
  }

  private async processCascades(): Promise<void> {
    let matches = this.board.findMatches();

    while (matches.length > 0) {
      this.comboCount++;
      if (this.comboCount > 1) {
        this.showCombo(this.comboCount);
      }

      // Apply match effects
      this.applyMatchEffects(matches);

      // Remove matched runes with animation
      await this.animateRemove(matches);
      this.board.removeMatches(matches);

      // Gravity
      const drops = this.board.applyGravity();
      await this.animateDrops(drops);

      this.updateUI();

      // Check enemy death
      if (this.enemy.hp <= 0) {
        await this.enemyDefeated();
        return;
      }

      matches = this.board.findMatches();
    }
  }

  private applyMatchEffects(matches: MatchResult[]): void {
    const comboMult = 1 + (this.comboCount - 1) * 0.25;

    for (const match of matches) {
      const count = match.positions.length;
      const bonus = count > 3 ? (count - 3) * 0.5 : 0;
      const power = (1 + bonus) * comboMult;

      // Particle burst for each matched rune
      for (const [mr, mc] of match.positions) {
        const mx = BOARD_OFFSET_X + mc * CELL_SIZE + CELL_SIZE / 2;
        const my = BOARD_OFFSET_Y + mr * CELL_SIZE + CELL_SIZE / 2;
        this.fx.runeMatchBurst(mx, my, match.type);
      }

      const { width: sw } = this.scale;

      switch (match.type) {
        case RuneType.Sword: {
          const dmg = Math.floor(this.player.attack * power);
          this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
          this.showDamageNumber(dmg, true);
          this.fx.slashEffect(sw / 2, 90);
          this.fx.enemyHitFlash(this.enemySprite);
          this.fx.screenShake(3 + count, 150);
          break;
        }
        case RuneType.Shield:
          this.shieldBuffer += Math.floor(this.player.defense * 2 * power);
          this.fx.shieldShimmer(sw / 2, 222);
          break;
        case RuneType.Heart: {
          const heal = Math.floor(5 * power);
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
          this.fx.healSparkle(sw / 2, 222);
          break;
        }
        case RuneType.Star: {
          const starDmg = Math.floor(this.player.attack * 0.5 * power);
          this.enemy.hp = Math.max(0, this.enemy.hp - starDmg);
          this.showDamageNumber(starDmg, true);
          this.fx.slashEffect(sw / 2, 90);
          this.fx.enemyHitFlash(this.enemySprite);
          break;
        }
        case RuneType.Gold: {
          const goldGain = Math.floor(count * power);
          this.player.gems += goldGain;
          this.fx.goldCollect(sw / 2, 250, goldGain);
          break;
        }
      }
    }
  }

  private async enemyDefeated(): Promise<void> {
    const { width } = this.scale;
    this.fx.deathExplosion(width / 2, 90);

    this.tweens.add({
      targets: this.enemySprite,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 400,
    });

    const gemsEarned = 5 + this.stage * 3;
    this.player.gems += gemsEarned;

    const victoryText = this.add.text(width / 2, 100, `+${gemsEarned} Gems!`, {
      fontSize: '24px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: victoryText,
      y: 60,
      alpha: 0,
      duration: 1500,
      delay: 500,
    });

    await this.delay(1500);

    // Next stage
    if (this.stage % 5 === 0) {
      // Every 5 stages, go to upgrade screen
      this.savePersistent();
      this.scene.start('Upgrade', { player: this.player, stage: this.stage + 1 });
    } else {
      this.scene.start('Battle', { player: this.player, stage: this.stage + 1 });
    }
  }

  private async enemyAttack(): Promise<void> {
    let dmg = this.enemy.attack - this.shieldBuffer;
    this.shieldBuffer = 0;

    if (dmg < 0) dmg = 0;
    this.player.hp = Math.max(0, this.player.hp - dmg);

    if (dmg > 0) {
      this.fx.playerDamageFlash();
      this.fx.screenShake(8, 300);
      this.showDamageNumber(dmg, false);
    } else {
      // Shield absorbed the hit
      const { width } = this.scale;
      this.fx.shieldShimmer(width / 2, 222);
    }

    await this.delay(400);
  }

  private showDamageNumber(dmg: number, toEnemy: boolean): void {
    const { width } = this.scale;
    const x = toEnemy ? width / 2 + Phaser.Math.Between(-30, 30) : width / 2;
    const y = toEnemy ? 100 : 235;
    const color = toEnemy ? '#e74c3c' : '#ff6b6b';

    const txt = this.add.text(x, y, `-${dmg}`, {
      fontSize: '22px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => txt.destroy(),
    });
  }

  private showCombo(count: number): void {
    const { width } = this.scale;
    this.fx.comboSplash(width / 2, 254, count);
    if (count >= 3) {
      this.fx.screenShake(count * 2, 200);
    }
  }

  private updateUI(): void {
    const { width } = this.scale;
    const barWidth = 200;

    // Enemy HP
    this.enemyHpBar.clear();
    this.enemyHpBar.fillStyle(0x333333, 1);
    this.enemyHpBar.fillRect(width / 2 - barWidth / 2, 163, barWidth, 14);
    const enemyRatio = Math.max(0, this.enemy.hp / this.enemy.maxHp);
    this.enemyHpBar.fillStyle(0xe74c3c, 1);
    this.enemyHpBar.fillRect(width / 2 - barWidth / 2, 163, barWidth * enemyRatio, 14);
    this.enemyHpText.setText(`${this.enemy.hp} / ${this.enemy.maxHp}`);

    // Enemy timer
    this.enemyTimerText.setText(`Attack in: ${this.enemy.turnTimer}`);

    // Player HP
    this.playerHpBar.clear();
    this.playerHpBar.fillStyle(0x333333, 1);
    this.playerHpBar.fillRect(width / 2 - barWidth / 2, 215, barWidth, 14);
    const playerRatio = Math.max(0, this.player.hp / this.player.maxHp);
    this.playerHpBar.fillStyle(0x2ecc71, 1);
    this.playerHpBar.fillRect(width / 2 - barWidth / 2, 215, barWidth * playerRatio, 14);
    this.playerHpText.setText(`HP: ${this.player.hp} / ${this.player.maxHp}`);
  }

  // Animation helpers
  private animateSwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    return new Promise((resolve) => {
      const s1 = this.runeSprites[r1][c1];
      const s2 = this.runeSprites[r2][c2];

      const x1 = BOARD_OFFSET_X + c1 * CELL_SIZE + CELL_SIZE / 2;
      const y1 = BOARD_OFFSET_Y + r1 * CELL_SIZE + CELL_SIZE / 2;
      const x2 = BOARD_OFFSET_X + c2 * CELL_SIZE + CELL_SIZE / 2;
      const y2 = BOARD_OFFSET_Y + r2 * CELL_SIZE + CELL_SIZE / 2;

      let done = 0;
      const checkDone = () => { done++; if (done >= 2) resolve(); };

      if (s1) {
        this.tweens.add({
          targets: s1, x: x2, y: y2, duration: 150,
          onComplete: checkDone,
        });
        s1.setData('row', r2);
        s1.setData('col', c2);
      } else { checkDone(); }

      if (s2) {
        this.tweens.add({
          targets: s2, x: x1, y: y1, duration: 150,
          onComplete: checkDone,
        });
        s2.setData('row', r1);
        s2.setData('col', c1);
      } else { checkDone(); }

      // Swap sprite references
      this.runeSprites[r1][c1] = s2;
      this.runeSprites[r2][c2] = s1;
    });
  }

  private animateRemove(matches: MatchResult[]): Promise<void> {
    return new Promise((resolve) => {
      const positions = new Set<string>();
      for (const match of matches) {
        for (const [r, c] of match.positions) {
          positions.add(`${r},${c}`);
        }
      }

      let count = positions.size;
      if (count === 0) { resolve(); return; }

      for (const key of positions) {
        const [r, c] = key.split(',').map(Number);
        const sprite = this.runeSprites[r][c];
        if (sprite) {
          this.tweens.add({
            targets: sprite,
            scaleX: 0, scaleY: 0, alpha: 0,
            duration: 200,
            onComplete: () => {
              sprite.destroy();
              this.runeSprites[r][c] = null;
              count--;
              if (count <= 0) resolve();
            },
          });
        } else {
          count--;
          if (count <= 0) resolve();
        }
      }
    });
  }

  private animateDrops(drops: { col: number; fromRow: number; toRow: number; type: RuneType }[]): Promise<void> {
    return new Promise((resolve) => {
      // First, rebuild all sprites at their target positions
      // Clear all sprites
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          this.runeSprites[r]?.[c]?.destroy();
          if (this.runeSprites[r]) this.runeSprites[r][c] = null;
        }
      }

      let animCount = 0;
      let completed = 0;

      for (const drop of drops) {
        const { col, fromRow, toRow, type } = drop;
        const targetX = BOARD_OFFSET_X + col * CELL_SIZE + CELL_SIZE / 2;
        const targetY = BOARD_OFFSET_Y + toRow * CELL_SIZE + CELL_SIZE / 2;
        const startY = BOARD_OFFSET_Y + fromRow * CELL_SIZE + CELL_SIZE / 2;

        const img = this.add.image(0, 0, `rune_${type}`);
        const symbol = this.add.text(0, 0, RUNE_SYMBOLS[type], {
          fontSize: '22px',
          color: '#ffffff',
        }).setOrigin(0.5);

        const container = this.add.container(targetX, startY, [img, symbol]);
        container.setSize(CELL_SIZE - 4, CELL_SIZE - 4);
        container.setInteractive();
        container.setData('row', toRow);
        container.setData('col', col);

        this.runeSprites[toRow][col] = container;
        animCount++;

        this.tweens.add({
          targets: container,
          y: targetY,
          duration: 150 + Math.abs(toRow - fromRow) * 30,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            completed++;
            if (completed >= animCount) resolve();
          },
        });
      }

      if (animCount === 0) resolve();
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, resolve);
    });
  }

  private savePersistent(): void {
    const save = {
      gems: this.player.gems,
      atkLv: this.player.attackLevel,
      defLv: this.player.defenseLevel,
      hpLv: this.player.hpLevel,
    };
    localStorage.setItem('rune_cascade_save', JSON.stringify(save));
    this.registry.set('save', save);
  }
}
