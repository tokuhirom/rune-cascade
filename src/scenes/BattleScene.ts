import Phaser from 'phaser';
import { Board, MatchResult } from '../core/Board';
import {
  BOARD_COLS, BOARD_ROWS, CELL_SIZE, BOARD_OFFSET_X, BOARD_OFFSET_Y,
  RuneType, RUNE_SYMBOLS,
  PlayerStats, EnemyData, EnemyAbility, generateEnemy,
  StageModifier, STAGE_MODIFIERS, rollStageModifier,
} from '../core/constants';
import { Effects } from '../core/Effects';

export class BattleScene extends Phaser.Scene {
  private board!: Board;
  private player!: PlayerStats;
  private enemy!: EnemyData;
  private stage!: number;
  private runeSprites: (Phaser.GameObjects.Container | null)[][] = [];
  private isProcessing = false;
  private shieldBuffer = 0;
  private comboCount = 0;
  private turnCount = 0;
  private fx!: Effects;
  private dragStartCell: [number, number] | null = null;
  private isDragging = false;
  private modifier!: StageModifier;

  // UI elements
  private playerHpText!: Phaser.GameObjects.Text;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private enemyHpText!: Phaser.GameObjects.Text;
  private enemyHpBar!: Phaser.GameObjects.Graphics;
  private enemyNameText!: Phaser.GameObjects.Text;
  private enemyAbilityText!: Phaser.GameObjects.Text;
  private enemyTimerText!: Phaser.GameObjects.Text;
  private enemySprite!: Phaser.GameObjects.Image;
  private stageText!: Phaser.GameObjects.Text;
  private modifierText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('Battle');
  }

  init(data: { player: PlayerStats; stage: number }): void {
    this.player = data.player;
    this.stage = data.stage;
    this.enemy = generateEnemy(this.stage);
    this.isProcessing = false;
    this.shieldBuffer = 0;
    this.comboCount = 0;
    this.turnCount = 0;
    this.runeSprites = [];
    this.dragStartCell = null;
    this.isDragging = false;
    this.modifier = rollStageModifier(this.stage);
  }

  create(): void {
    const { width } = this.scale;
    this.board = new Board();
    this.fx = new Effects(this);

    const isBoss = this.stage % 5 === 0;

    // Stage header
    const stageLabel = isBoss ? `BOSS - Stage ${this.stage}` : `Stage ${this.stage}`;
    this.stageText = this.add.text(width / 2, 10, stageLabel, {
      fontSize: isBoss ? '20px' : '16px',
      color: isBoss ? '#ff4444' : '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Modifier display
    const modData = STAGE_MODIFIERS[this.modifier];
    this.modifierText = this.add.text(width / 2, 30, '', {
      fontSize: '12px',
      color: modData.color,
    }).setOrigin(0.5, 0);
    if (this.modifier !== StageModifier.None) {
      this.modifierText.setText(`[${modData.name}] ${modData.desc}`);
    }

    // Enemy area
    this.enemySprite = this.add.image(width / 2, 85, `enemy_${this.enemy.name}`)
      .setScale(isBoss ? 1.0 : 0.8);
    this.enemyNameText = this.add.text(width / 2, 132, this.enemy.name, {
      fontSize: isBoss ? '18px' : '16px',
      color: isBoss ? '#ff6666' : '#ecf0f1',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Enemy ability
    this.enemyAbilityText = this.add.text(width / 2, 150, '', {
      fontSize: '11px',
      color: '#e67e22',
    }).setOrigin(0.5);
    if (this.enemy.ability !== EnemyAbility.None) {
      this.enemyAbilityText.setText(this.enemy.abilityDesc);
    }

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
    this.playerHpText = this.add.text(width / 2, 218, '', {
      fontSize: '13px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Status effects
    this.statusText = this.add.text(width / 2, 236, '', {
      fontSize: '11px',
      color: '#bb88ff',
    }).setOrigin(0.5);

    this.updateUI();

    // Boss entrance animation
    if (isBoss) {
      this.enemySprite.setAlpha(0).setScale(2);
      this.tweens.add({
        targets: this.enemySprite,
        alpha: 1, scaleX: 1.0, scaleY: 1.0,
        duration: 600, ease: 'Back.easeOut',
      });
      this.fx.screenShake(6, 400);
      this.cameras.main.flash(400, 100, 20, 20);
    }

    // Create board sprites
    this.createBoardSprites();

    // Drag-based input
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.isProcessing) return;
      const cell = this.pointerToCell(ptr.x, ptr.y);
      if (!cell) return;
      this.dragStartCell = cell;
      this.isDragging = false;
      this.highlightCell(cell[0], cell[1], true);
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.isProcessing || !this.dragStartCell || this.isDragging) return;
      if (!ptr.isDown) return;
      const [sr, sc] = this.dragStartCell;
      const dx = ptr.x - (BOARD_OFFSET_X + sc * CELL_SIZE + CELL_SIZE / 2);
      const dy = ptr.y - (BOARD_OFFSET_Y + sr * CELL_SIZE + CELL_SIZE / 2);
      const threshold = CELL_SIZE * 0.3;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      let tr = sr, tc = sc;
      if (Math.abs(dx) > Math.abs(dy)) {
        tc += dx > 0 ? 1 : -1;
      } else {
        tr += dy > 0 ? 1 : -1;
      }

      if (tr < 0 || tr >= BOARD_ROWS || tc < 0 || tc >= BOARD_COLS) return;

      this.isDragging = true;
      this.highlightCell(sr, sc, false);
      this.dragStartCell = null;
      this.trySwap(sr, sc, tr, tc);
    });

    this.input.on('pointerup', () => {
      if (this.dragStartCell) {
        this.highlightCell(this.dragStartCell[0], this.dragStartCell[1], false);
        this.dragStartCell = null;
      }
    });
  }

  private pointerToCell(x: number, y: number): [number, number] | null {
    const c = Math.floor((x - BOARD_OFFSET_X) / CELL_SIZE);
    const r = Math.floor((y - BOARD_OFFSET_Y) / CELL_SIZE);
    if (r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS) return null;
    return [r, c];
  }

  private createBoardSprites(): void {
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

  private highlightCell(r: number, c: number, on: boolean): void {
    const sprite = this.runeSprites[r]?.[c];
    if (!sprite) return;
    sprite.setScale(on ? 1.15 : 1);
  }

  private async trySwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    this.isProcessing = true;
    this.comboCount = 0;
    this.shieldBuffer = 0;

    this.board.swap(r1, c1, r2, c2);
    await this.animateSwap(r1, c1, r2, c2);

    const matches = this.board.findMatches();
    if (matches.length === 0) {
      this.board.swap(r1, c1, r2, c2);
      await this.animateSwap(r1, c1, r2, c2);
      this.isProcessing = false;
      return;
    }

    await this.processCascades();

    this.turnCount++;

    // Poison damage
    if (this.enemy.hp > 0 && this.enemy.ability === EnemyAbility.Poison && this.enemy.poisonDmg) {
      const poisonDmg = this.enemy.poisonDmg;
      this.player.hp = Math.max(0, this.player.hp - poisonDmg);
      this.showStatusMessage(`Poison: -${poisonDmg} HP`, '#9b59b6');
      this.updateUI();
    }

    // Rune Storm modifier: shuffle every 3 turns
    if (this.modifier === StageModifier.RuneStorm && this.turnCount % 3 === 0 && this.enemy.hp > 0) {
      await this.shuffleBoard();
    }

    // Enemy turn
    this.enemy.turnTimer--;
    if (this.enemy.hp > 0) {
      if (this.enemy.turnTimer <= 0) {
        await this.enemyAttack();
        this.enemy.turnTimer = this.enemy.maxTurnTimer;
      }
      this.updateUI();
    }

    // Check player death
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

      this.applyMatchEffects(matches);

      await this.animateRemove(matches);
      this.board.removeMatches(matches);

      const drops = this.board.applyGravity();
      await this.animateDrops(drops);

      this.updateUI();

      // Check enemy death / revive
      if (this.enemy.hp <= 0) {
        if (this.enemy.ability === EnemyAbility.Revive && !this.enemy.revived) {
          await this.enemyRevive();
        } else {
          await this.enemyDefeated();
          return;
        }
      }

      matches = this.board.findMatches();
    }
  }

  private applyMatchEffects(matches: MatchResult[]): void {
    const comboMult = 1 + (this.comboCount - 1) * 0.25;
    const berserkMult = this.modifier === StageModifier.Berserk ? 1.5 : 1;
    const desperateMult = this.modifier === StageModifier.Desperate ? 1.5 : 1;

    for (const match of matches) {
      const count = match.positions.length;
      const bonus = count > 3 ? (count - 3) * 0.5 : 0;
      const power = (1 + bonus) * comboMult;

      // Particle burst
      for (const [mr, mc] of match.positions) {
        const mx = BOARD_OFFSET_X + mc * CELL_SIZE + CELL_SIZE / 2;
        const my = BOARD_OFFSET_Y + mr * CELL_SIZE + CELL_SIZE / 2;
        this.fx.runeMatchBurst(mx, my, match.type);
      }

      const { width: sw } = this.scale;

      switch (match.type) {
        case RuneType.Sword: {
          let dmg = Math.floor(this.player.attack * power * berserkMult * desperateMult);
          // Armor ability: 50% damage reduction
          if (this.enemy.ability === EnemyAbility.Armor) {
            dmg = Math.floor(dmg * 0.5);
          }
          this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
          this.showDamageNumber(dmg, true);
          this.fx.slashEffect(sw / 2, 85);
          this.fx.enemyHitFlash(this.enemySprite);
          this.fx.screenShake(3 + count, 150);

          // Check enrage
          if (this.enemy.ability === EnemyAbility.Enrage && !this.enemy.enraged
              && this.enemy.hp > 0 && this.enemy.hp / this.enemy.maxHp < 0.3) {
            this.enemy.enraged = true;
            this.enemy.attack *= 2;
            this.showStatusMessage('Enemy ENRAGED! ATK x2!', '#ff4444');
            this.enemySprite.setTint(0xff4444);
          }

          // Vampiric modifier: heal from sword matches
          if (this.modifier === StageModifier.Vampiric) {
            const vampHeal = Math.floor(dmg * 0.2);
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + vampHeal);
          }
          break;
        }
        case RuneType.Shield: {
          const shieldMult = this.modifier === StageModifier.Fortified ? 2 : 1;
          this.shieldBuffer += Math.floor(this.player.defense * 2 * power * shieldMult);
          this.fx.shieldShimmer(sw / 2, 218);
          break;
        }
        case RuneType.Heart: {
          if (this.modifier === StageModifier.Desperate) {
            // No healing in Desperate mode
            this.showStatusMessage('No healing!', '#e67e22');
          } else {
            const heal = Math.floor(5 * power);
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
            this.fx.healSparkle(sw / 2, 218);
          }
          break;
        }
        case RuneType.Star: {
          let starDmg = Math.floor(this.player.attack * 0.5 * power * berserkMult);
          if (this.enemy.ability === EnemyAbility.Armor) {
            starDmg = Math.floor(starDmg * 0.5);
          }
          this.enemy.hp = Math.max(0, this.enemy.hp - starDmg);
          this.showDamageNumber(starDmg, true);
          this.fx.slashEffect(sw / 2, 85);
          this.fx.enemyHitFlash(this.enemySprite);

          // Check enrage
          if (this.enemy.ability === EnemyAbility.Enrage && !this.enemy.enraged
              && this.enemy.hp > 0 && this.enemy.hp / this.enemy.maxHp < 0.3) {
            this.enemy.enraged = true;
            this.enemy.attack *= 2;
            this.showStatusMessage('Enemy ENRAGED! ATK x2!', '#ff4444');
            this.enemySprite.setTint(0xff4444);
          }
          break;
        }
        case RuneType.Gold: {
          const goldMult = this.modifier === StageModifier.GoldenHour ? 2 : 1;
          const goldGain = Math.floor(count * power * goldMult);
          this.player.gems += goldGain;
          this.fx.goldCollect(sw / 2, 248, goldGain);
          break;
        }
      }
    }
  }

  private async enemyRevive(): Promise<void> {
    this.enemy.revived = true;
    this.enemy.hp = Math.floor(this.enemy.maxHp * 0.5);

    const { width } = this.scale;
    this.showStatusMessage('Enemy REVIVED!', '#d4c8a8');
    this.fx.screenShake(5, 300);

    // Flash the enemy back in
    this.tweens.add({
      targets: this.enemySprite,
      alpha: 0.2, duration: 150, yoyo: true, repeat: 3,
    });

    await this.delay(800);
    this.updateUI();
  }

  private async enemyDefeated(): Promise<void> {
    const { width } = this.scale;
    this.fx.deathExplosion(width / 2, 85);

    this.tweens.add({
      targets: this.enemySprite,
      alpha: 0, scaleX: 1.5, scaleY: 1.5,
      duration: 400,
    });

    const isBoss = this.stage % 5 === 0;
    const gemsEarned = isBoss ? 15 + this.stage * 5 : 5 + this.stage * 3;
    this.player.gems += gemsEarned;

    const victoryText = this.add.text(width / 2, 90, isBoss ? 'BOSS DEFEATED!' : `+${gemsEarned} Gems!`, {
      fontSize: isBoss ? '28px' : '24px',
      color: isBoss ? '#ff4444' : '#f1c40f',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: isBoss ? 4 : 0,
    }).setOrigin(0.5);

    if (isBoss) {
      this.fx.screenShake(10, 500);
      // Show gems separately for boss
      this.add.text(width / 2, 120, `+${gemsEarned} Gems!`, {
        fontSize: '20px',
        color: '#f1c40f',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    this.tweens.add({
      targets: victoryText,
      y: 50, alpha: 0,
      duration: 1500, delay: 800,
    });

    await this.delay(1800);

    if (this.stage % 5 === 0) {
      this.savePersistent();
      this.scene.start('Upgrade', { player: this.player, stage: this.stage + 1 });
    } else {
      this.scene.start('Battle', { player: this.player, stage: this.stage + 1 });
    }
  }

  private async enemyAttack(): Promise<void> {
    const berserkMult = this.modifier === StageModifier.Berserk ? 1.5 : 1;

    if (this.enemy.ability === EnemyAbility.MultiHit) {
      // 3 weaker hits
      for (let i = 0; i < 3; i++) {
        let dmg = Math.floor(this.enemy.attack * 0.5 * berserkMult) - this.shieldBuffer;
        this.shieldBuffer = Math.max(0, this.shieldBuffer - Math.floor(this.enemy.attack * 0.5 * berserkMult));
        if (dmg < 0) dmg = 0;
        this.player.hp = Math.max(0, this.player.hp - dmg);
        if (dmg > 0) {
          this.fx.screenShake(4, 100);
          this.showDamageNumber(dmg, false);
        }
        await this.delay(200);
      }
      this.fx.playerDamageFlash();
      this.shieldBuffer = 0;
    } else {
      let baseDmg = Math.floor(this.enemy.attack * berserkMult);
      let dmg = baseDmg - this.shieldBuffer;
      this.shieldBuffer = 0;
      if (dmg < 0) dmg = 0;
      this.player.hp = Math.max(0, this.player.hp - dmg);

      if (dmg > 0) {
        this.fx.playerDamageFlash();
        this.fx.screenShake(8, 300);
        this.showDamageNumber(dmg, false);
      } else {
        const { width } = this.scale;
        this.fx.shieldShimmer(width / 2, 218);
      }

      // Drain ability: enemy heals for damage dealt
      if (this.enemy.ability === EnemyAbility.Drain && dmg > 0) {
        const drainHeal = Math.floor(dmg * 0.5);
        this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + drainHeal);
        this.showStatusMessage(`Drained ${drainHeal} HP!`, '#66ffcc');
      }

      // Heal ability: enemy heals on attack
      if (this.enemy.ability === EnemyAbility.Heal) {
        const selfHeal = Math.floor(this.enemy.maxHp * 0.1);
        this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + selfHeal);
        this.showStatusMessage(`Enemy healed ${selfHeal} HP!`, '#2ecc71');
      }

      // Scramble ability: shuffle board
      if (this.enemy.ability === EnemyAbility.Scramble) {
        await this.delay(200);
        await this.shuffleBoard();
      }
    }

    await this.delay(300);
  }

  private async shuffleBoard(): Promise<void> {
    this.showStatusMessage('Board Shuffled!', '#9b59b6');
    this.fx.screenShake(4, 200);

    // Animate all runes shrinking
    const promises: Promise<void>[] = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const sprite = this.runeSprites[r]?.[c];
        if (sprite) {
          promises.push(new Promise(resolve => {
            this.tweens.add({
              targets: sprite,
              scaleX: 0, scaleY: 0,
              duration: 150,
              onComplete: () => { sprite.destroy(); resolve(); },
            });
          }));
        }
      }
    }
    await Promise.all(promises);

    // Rebuild board
    this.board = new Board();
    this.runeSprites = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      this.runeSprites[r] = [];
      for (let c = 0; c < BOARD_COLS; c++) {
        const container = this.createRuneAt(r, c);
        if (container) {
          container.setScale(0);
          this.tweens.add({
            targets: container,
            scaleX: 1, scaleY: 1,
            duration: 200,
            delay: (r * BOARD_COLS + c) * 10,
          });
        }
        this.runeSprites[r][c] = container;
      }
    }

    await this.delay(300);
  }

  private showStatusMessage(msg: string, color: string): void {
    const { width } = this.scale;
    const txt = this.add.text(width / 2, 250, msg, {
      fontSize: '14px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: txt,
      y: 230, alpha: 0,
      duration: 1200, delay: 300,
      onComplete: () => txt.destroy(),
    });
  }

  private showDamageNumber(dmg: number, toEnemy: boolean): void {
    const { width } = this.scale;
    const x = toEnemy ? width / 2 + Phaser.Math.Between(-30, 30) : width / 2;
    const y = toEnemy ? 90 : 230;
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
      y: y - 40, alpha: 0,
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
    const hpColor = this.enemy.enraged ? 0xff4444 : 0xe74c3c;
    this.enemyHpBar.fillStyle(hpColor, 1);
    this.enemyHpBar.fillRect(width / 2 - barWidth / 2, 163, barWidth * enemyRatio, 14);
    this.enemyHpText.setText(`${this.enemy.hp} / ${this.enemy.maxHp}`);

    // Enemy timer
    this.enemyTimerText.setText(`Attack in: ${this.enemy.turnTimer}`);

    // Player HP
    this.playerHpBar.clear();
    this.playerHpBar.fillStyle(0x333333, 1);
    this.playerHpBar.fillRect(width / 2 - barWidth / 2, 211, barWidth, 14);
    const playerRatio = Math.max(0, this.player.hp / this.player.maxHp);
    this.playerHpBar.fillStyle(0x2ecc71, 1);
    this.playerHpBar.fillRect(width / 2 - barWidth / 2, 211, barWidth * playerRatio, 14);
    this.playerHpText.setText(`HP: ${this.player.hp} / ${this.player.maxHp}`);

    // Status effects
    const statuses: string[] = [];
    if (this.enemy.enraged) statuses.push('ENRAGED');
    if (this.enemy.ability === EnemyAbility.Poison) statuses.push('POISONED');
    if (this.shieldBuffer > 0) statuses.push(`Shield: ${this.shieldBuffer}`);
    this.statusText.setText(statuses.join(' | '));
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
