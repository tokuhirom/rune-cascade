import Phaser from 'phaser';
import { Board, MatchResult } from '../core/Board';
import {
  BOARD_COLS, BOARD_ROWS, CELL_SIZE, BOARD_OFFSET_X, BOARD_OFFSET_Y,
  RuneType, RUNE_SYMBOLS, RUNE_COLORS, MAX_FLOOR, WARP_FLOORS, CellState,
  PlayerStats, EnemyData, EnemyAbility, generateEnemy, enemyHasAbility,
  StageModifier, STAGE_MODIFIERS, rollStageModifier, SaveData,
} from '../core/constants';
import { Effects } from '../core/Effects';
import { soundManager, createMuteButton } from '../core/SoundManager';

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
  private shuffleBtn?: Phaser.GameObjects.Text;
  private hintTimer?: Phaser.Time.TimerEvent;
  private hintTweens: Phaser.Tweens.Tween[] = [];

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

  private savedBoard?: { grid: (number | null)[][]; cellState: number[][] };
  private savedEnemy?: EnemyData;
  private savedModifier?: StageModifier;

  init(data: { player: PlayerStats; stage: number; board?: { grid: (number | null)[][]; cellState: number[][] }; enemy?: EnemyData; modifier?: StageModifier; shieldBuffer?: number; turnCount?: number }): void {
    this.player = data.player;
    this.stage = data.stage;
    this.isProcessing = false;
    this.comboCount = 0;
    this.runeSprites = [];
    this.dragStartCell = null;
    this.isDragging = false;

    // Restore or generate battle state
    this.savedBoard = data.board;
    this.savedEnemy = data.enemy;
    this.savedModifier = data.modifier;
    this.shieldBuffer = data.shieldBuffer ?? 0;
    this.turnCount = data.turnCount ?? 0;
    this.enemy = data.enemy ?? generateEnemy(this.stage);
    this.modifier = data.modifier ?? rollStageModifier(this.stage);
  }

  create(): void {
    const { width } = this.scale;
    if (this.savedBoard) {
      this.board = new Board();
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          this.board.grid[r][c] = this.savedBoard.grid[r][c] as RuneType | null;
          this.board.cellState[r][c] = this.savedBoard.cellState[r][c] as CellState;
        }
      }
      this.savedBoard = undefined;
    } else {
      this.board = new Board();
    }
    this.fx = new Effects(this);

    const isBoss = this.stage % 5 === 0;
    const isMidBoss = this.enemy.isMidBoss;

    // Stage header - dungeon floor notation
    const stageLabel = isMidBoss ? `MID-BOSS B${this.stage}F`
      : isBoss ? `BOSS B${this.stage}F`
      : `B${this.stage}F`;
    this.stageText = this.add.text(width / 2, 10, stageLabel, {
      fontSize: isBoss || isMidBoss ? '20px' : '16px',
      color: isMidBoss ? '#ff8800' : isBoss ? '#ff4444' : '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Boss progress indicator
    this.createBossProgress(width);

    // Modifier display
    const modData = STAGE_MODIFIERS[this.modifier];
    this.modifierText = this.add.text(width / 2, 44, '', {
      fontSize: '13px',
      color: modData.color,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    if (this.modifier !== StageModifier.None) {
      this.modifierText.setText(`[${modData.name}] ${modData.desc}`);
    }

    // Enemy area
    this.enemySprite = this.add.image(width / 2, 85, `enemy_${this.enemy.name}`)
      .setScale(isBoss || isMidBoss ? 1.0 : 0.8);
    this.enemyNameText = this.add.text(width / 2, 132, this.enemy.name, {
      fontSize: isBoss || isMidBoss ? '18px' : '16px',
      color: isMidBoss ? '#ff8800' : isBoss ? '#ff6666' : '#ecf0f1',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Enemy ability
    this.enemyAbilityText = this.add.text(width / 2, 150, '', {
      fontSize: '12px',
      color: '#e67e22',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    if (this.enemy.ability !== EnemyAbility.None) {
      this.enemyAbilityText.setText(this.enemy.abilityDesc);
    }

    // Enemy HP bar
    this.enemyHpBar = this.add.graphics();
    this.enemyHpText = this.add.text(width / 2, 170, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Enemy timer
    this.enemyTimerText = this.add.text(width / 2, 190, '', {
      fontSize: '15px',
      color: '#e67e22',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Player HP bar
    this.playerHpBar = this.add.graphics();
    this.playerHpText = this.add.text(width / 2, 218, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Status effects
    this.statusText = this.add.text(width / 2, 236, '', {
      fontSize: '12px',
      color: '#bb88ff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Rune legend + items
    this.createRuneLegend(width);

    this.updateUI();

    // Boss entrance animation
    if (isBoss || isMidBoss) {
      this.enemySprite.setAlpha(0).setScale(2);
      this.tweens.add({
        targets: this.enemySprite,
        alpha: 1, scaleX: isBoss || isMidBoss ? 1.0 : 0.8, scaleY: isBoss || isMidBoss ? 1.0 : 0.8,
        duration: 600, ease: 'Back.easeOut',
      });
      this.fx.screenShake(6, 400);
      this.cameras.main.flash(400, 100, 20, 20);
    }

    // Create board sprites
    this.createBoardSprites();

    // Start hint timer
    this.resetHintTimer();

    // Drag-based input
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.isProcessing) return;
      this.resetHintTimer();
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

    // Mute toggle button (top-right)
    createMuteButton(this);

    // Start BGM (different tracks for boss types)
    if (this.stage === 100) {
      soundManager.startBgm('finalboss');
    } else if (isMidBoss) {
      soundManager.startBgm('midboss');
    } else if (isBoss) {
      soundManager.startBgm('boss');
    } else {
      soundManager.startBgm('battle');
    }
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
    const state = this.board.getState(r, c);

    // Obstacle cells have no rune type but need a sprite
    if (state === CellState.Obstacle) {
      return this.createObstacleAt(r, c);
    }

    if (type === null) return null;

    const x = BOARD_OFFSET_X + c * CELL_SIZE + CELL_SIZE / 2;
    const y = BOARD_OFFSET_Y + r * CELL_SIZE + CELL_SIZE / 2;

    const children: Phaser.GameObjects.GameObject[] = [];

    const img = this.add.image(0, 0, `rune_${type}`);
    children.push(img);

    const symbol = this.add.text(0, 0, RUNE_SYMBOLS[type], {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    children.push(symbol);

    // Frozen overlay
    if (state === CellState.Frozen) {
      const frost = this.add.graphics();
      const s = CELL_SIZE - 4;
      frost.fillStyle(0x88ccff, 0.4);
      frost.fillRoundedRect(-s / 2, -s / 2, s, s, 8);
      frost.lineStyle(2, 0xaaddff, 0.8);
      frost.strokeRoundedRect(-s / 2, -s / 2, s, s, 8);
      children.push(frost);
      // Ice crystal symbol
      const iceText = this.add.text(0, 0, '\u2744', {
        fontSize: '16px',
        color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0.7);
      children.push(iceText);
    }

    // Row-clear overlay
    if (state === CellState.RowClear) {
      const arrow = this.add.graphics();
      const s = CELL_SIZE - 4;
      arrow.lineStyle(2, 0xffaa00, 0.9);
      arrow.lineBetween(-s / 2 + 4, 0, s / 2 - 4, 0);
      // Arrow heads
      arrow.lineBetween(-s / 2 + 4, 0, -s / 2 + 10, -4);
      arrow.lineBetween(-s / 2 + 4, 0, -s / 2 + 10, 4);
      arrow.lineBetween(s / 2 - 4, 0, s / 2 - 10, -4);
      arrow.lineBetween(s / 2 - 4, 0, s / 2 - 10, 4);
      children.push(arrow);
    }

    const container = this.add.container(x, y, children);
    container.setSize(CELL_SIZE - 4, CELL_SIZE - 4);
    container.setInteractive();
    container.setData('row', r);
    container.setData('col', c);

    return container;
  }

  private createObstacleAt(r: number, c: number): Phaser.GameObjects.Container {
    const x = BOARD_OFFSET_X + c * CELL_SIZE + CELL_SIZE / 2;
    const y = BOARD_OFFSET_Y + r * CELL_SIZE + CELL_SIZE / 2;

    const img = this.add.image(0, 0, 'rune_obstacle');
    const container = this.add.container(x, y, [img]);
    container.setSize(CELL_SIZE - 4, CELL_SIZE - 4);
    container.setData('row', r);
    container.setData('col', c);

    return container;
  }

  private refreshRuneVisual(r: number, c: number): void {
    const sprite = this.runeSprites[r]?.[c];
    if (sprite) sprite.destroy();
    this.runeSprites[r][c] = this.createRuneAt(r, c);
  }

  private createRuneLegend(width: number): void {
    const legends = [
      { type: RuneType.Sword, label: 'ATK' },
      { type: RuneType.Shield, label: 'DEF' },
      { type: RuneType.Heart, label: 'HP' },
      { type: RuneType.Star, label: 'SKL' },
      { type: RuneType.Gold, label: 'GEM' },
    ];
    const y = 258;
    const legendWidth = legends.length * 70;
    const startX = width / 2 - legendWidth / 2 + 20;

    for (let i = 0; i < legends.length; i++) {
      const { type, label } = legends[i];
      const x = startX + i * 70;
      const color = RUNE_COLORS[type];

      const g = this.add.graphics();
      g.fillStyle(color, 0.8);
      g.fillRoundedRect(x - 20, y - 8, 16, 16, 3);

      this.add.text(x - 12, y, RUNE_SYMBOLS[type], {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.text(x + 8, y, label, {
        fontSize: '12px',
        color: '#aaaaaa',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);
    }

    // Shuffle item button
    if (this.player.items.shuffle > 0) {
      this.shuffleBtn = this.add.text(width - 20, y, `Shuffle x${this.player.items.shuffle}`, {
        fontSize: '11px',
        color: '#9b59b6',
        fontStyle: 'bold',
        backgroundColor: '#2c2c4a',
        padding: { x: 4, y: 2 },
      }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

      this.shuffleBtn.on('pointerdown', async () => {
        if (this.isProcessing || this.player.items.shuffle <= 0) return;
        this.player.items.shuffle--;
        this.updateShuffleBtn();
        this.isProcessing = true;
        await this.shuffleBoard('item');
        this.isProcessing = false;
      });
    }

    // Buff indicators
    const buffY = 272;
    const buffTexts: string[] = [];
    const debuffTexts: string[] = [];
    if (this.player.buffs.atkUp) buffTexts.push('ATK+');
    if (this.player.buffs.defUp) buffTexts.push('DEF+');
    if (this.player.buffs.regen) buffTexts.push('REGEN');
    if (this.player.buffs.noHeal) debuffTexts.push('NO HEAL');
    if (this.player.buffs.cursedObstacles) debuffTexts.push('CURSED');
    if (buffTexts.length > 0) {
      this.add.text(width / 2, buffY, buffTexts.join(' | '), {
        fontSize: '11px',
        color: '#44cc88',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }
    if (debuffTexts.length > 0) {
      this.add.text(width / 2, buffY + (buffTexts.length > 0 ? 14 : 0), debuffTexts.join(' | '), {
        fontSize: '11px',
        color: '#e74c3c',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }
  }

  private updateShuffleBtn(): void {
    if (this.shuffleBtn) {
      if (this.player.items.shuffle > 0) {
        this.shuffleBtn.setText(`Shuffle x${this.player.items.shuffle}`);
      } else {
        this.shuffleBtn.setText('').disableInteractive();
      }
    }
  }

  private highlightCell(r: number, c: number, on: boolean): void {
    const sprite = this.runeSprites[r]?.[c];
    if (!sprite) return;
    sprite.setScale(on ? 1.15 : 1);
  }

  private resetHintTimer(): void {
    this.clearHint();
    this.hintTimer?.remove();
    this.hintTimer = this.time.delayedCall(30000, () => {
      this.showHint();
    });
  }

  private clearHint(): void {
    for (const tw of this.hintTweens) {
      tw.stop();
      const target = tw.targets?.[0] as Phaser.GameObjects.Container | undefined;
      if (target) target.setScale(1);
    }
    this.hintTweens = [];
  }

  private showHint(): void {
    this.clearHint();
    if (this.isProcessing) return;
    const moves = this.board.findValidMoves();
    if (moves.length === 0) return;
    // Highlight the first valid move pair
    const [r1, c1, r2, c2] = moves[0];
    for (const [r, c] of [[r1, c1], [r2, c2]]) {
      const sprite = this.runeSprites[r]?.[c];
      if (!sprite) continue;
      const tw = this.tweens.add({
        targets: sprite,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.hintTweens.push(tw);
    }
  }

  private getEffectiveAttack(): number {
    return this.player.buffs.atkUp ? Math.floor(this.player.attack * 1.5) : this.player.attack;
  }

  private getEffectiveDefense(): number {
    return this.player.buffs.defUp ? Math.floor(this.player.defense * 1.5) : this.player.defense;
  }

  private async trySwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    // Prevent swapping frozen or obstacle cells
    if (!this.board.canSwap(r1, c1) || !this.board.canSwap(r2, c2)) {
      this.showStatusMessage('Blocked!', '#888888');
      return;
    }

    this.isProcessing = true;
    this.comboCount = 0;

    this.board.swap(r1, c1, r2, c2);
    soundManager.playSwapSfx();
    await this.animateSwap(r1, c1, r2, c2);

    const matches = this.board.findMatches();
    if (matches.length === 0) {
      this.board.swap(r1, c1, r2, c2);
      await this.animateSwap(r1, c1, r2, c2);
      this.isProcessing = false;
      return;
    }

    await this.processCascades();

    // Auto-shuffle if no valid moves remain
    if (this.enemy.hp > 0 && this.player.hp > 0 && !this.board.hasValidMove()) {
      await this.shuffleBoard();
    }

    this.turnCount++;

    // Regen buff
    if (this.player.buffs.regen && this.player.hp > 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 3);
    }

    // Poison damage (check both primary and secondary)
    if (this.enemy.hp > 0 && enemyHasAbility(this.enemy, EnemyAbility.Poison) && this.enemy.poisonDmg) {
      const poisonDmg = this.enemy.poisonDmg;
      this.player.hp = Math.max(0, this.player.hp - poisonDmg);
      this.showStatusMessage(`Poison: -${poisonDmg} HP`, '#9b59b6');
      this.updateUI();
    }

    // Rune Storm modifier
    if (this.modifier === StageModifier.RuneStorm && this.turnCount % 3 === 0 && this.enemy.hp > 0) {
      await this.shuffleBoard('storm');
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
      BattleScene.clearRunSave();
      soundManager.stopBgm();
      this.time.delayedCall(500, () => {
        // Restore gems to pre-run value on death
        this.player.gems = this.player.gemsAtRunStart;
        this.scene.start('GameOver', {
          player: this.player,
          stage: this.stage,
          won: false,
          enemy: this.enemy.name,
        });
      });
    } else {
      this.saveRunState(this.stage);
      this.resetHintTimer();
    }

    this.isProcessing = false;
  }

  private async processCascades(): Promise<void> {
    let matches = this.board.findMatches();

    while (matches.length > 0) {
      this.comboCount++;
      soundManager.playMatchSfx(this.comboCount);
      if (this.comboCount > 1) {
        this.showCombo(this.comboCount);
      }

      this.applyMatchEffects(matches);

      // Check for row-clear runes in matches
      const rowClearRows = this.board.getRowClearRows(matches);

      // Handle adjacent frozen/obstacle cells
      const { thawed, destroyedObstacles } = this.board.getAdjacentSpecials(matches);

      await this.animateRemove(matches);
      this.board.removeMatches(matches);

      // Clear entire rows from row-clear runes
      if (rowClearRows.length > 0) {
        const rowCleared = this.board.clearRows(rowClearRows);
        await this.animateRowClear(rowCleared);
        this.showStatusMessage('ROW CLEAR!', '#ff8800');
      }

      // Animate thawed runes (update their visual)
      if (thawed.length > 0) {
        for (const [r, c] of thawed) {
          this.refreshRuneVisual(r, c);
        }
      }

      // Animate destroyed obstacles
      if (destroyedObstacles.length > 0) {
        await this.animateObstacleDestroy(destroyedObstacles);
      }

      const drops = this.board.applyGravity();
      await this.animateDrops(drops);

      // Small chance to spawn a row-clear rune (5%)
      if (Math.random() < 0.05) {
        const pos = this.board.placeRowClear();
        if (pos) {
          this.refreshRuneVisual(pos[0], pos[1]);
        }
      }

      this.updateUI();

      // Check enemy death / revive (but continue cascades)
      if (this.enemy.hp <= 0) {
        if (enemyHasAbility(this.enemy, EnemyAbility.Revive) && !this.enemy.revived) {
          await this.enemyRevive();
        }
        // Don't return — let remaining cascades play out (heals, shields, gems)
      }

      matches = this.board.findMatches();
    }

    // After all cascades finish, handle enemy defeat
    if (this.enemy.hp <= 0 && !(enemyHasAbility(this.enemy, EnemyAbility.Revive) && !this.enemy.revived)) {
      await this.enemyDefeated();
      return;
    }
  }

  private applyMatchEffects(matches: MatchResult[]): void {
    // Combo multiplier scales exponentially for satisfying cascades
    // Combo 1: 1.0x, 2: 1.3x, 3: 1.7x, 4: 2.2x, 5: 2.8x, 8: 5.5x
    const comboMult = 1 + (this.comboCount - 1) * 0.3 + Math.max(0, this.comboCount - 3) * 0.2;
    const berserkMult = this.modifier === StageModifier.Berserk ? 1.5 : 1;
    const desperateMult = this.modifier === StageModifier.Desperate ? 1.5 : 1;
    const effectiveAtk = this.getEffectiveAttack();
    const effectiveDef = this.getEffectiveDefense();

    for (const match of matches) {
      const count = match.positions.length;
      const bonus = count > 3 ? (count - 3) * 0.5 : 0;
      const power = (1 + bonus) * comboMult;

      for (const [mr, mc] of match.positions) {
        const mx = BOARD_OFFSET_X + mc * CELL_SIZE + CELL_SIZE / 2;
        const my = BOARD_OFFSET_Y + mr * CELL_SIZE + CELL_SIZE / 2;
        this.fx.runeMatchBurst(mx, my, match.type);
      }

      const { width: sw } = this.scale;

      switch (match.type) {
        case RuneType.Sword: {
          if (this.enemy.hp <= 0) break; // Enemy already dead
          let dmg = Math.floor(effectiveAtk * power * berserkMult * desperateMult);
          if (enemyHasAbility(this.enemy, EnemyAbility.Armor)) {
            dmg = Math.floor(dmg * 0.5);
          }
          this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
          this.showDamageNumber(dmg, true);
          this.fx.slashEffect(sw / 2, 85);
          this.fx.enemyHitFlash(this.enemySprite);
          this.fx.screenShake(3 + count, 150);
          this.checkEnrage();

          if (this.modifier === StageModifier.Vampiric) {
            const vampHeal = Math.floor(dmg * 0.2);
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + vampHeal);
          }
          break;
        }
        case RuneType.Shield: {
          const shieldMult = this.modifier === StageModifier.Fortified ? 2 : 1;
          const gained = Math.floor(effectiveDef * 4 * power * shieldMult);
          this.shieldBuffer += gained;
          this.fx.shieldShimmer(sw / 2, 218);
          soundManager.playShieldSfx();
          break;
        }
        case RuneType.Heart: {
          if (this.modifier === StageModifier.Desperate || this.player.buffs.noHeal) {
            this.showStatusMessage('No healing!', '#e67e22');
          } else {
            // Heal scales with max HP (8% per 3-match, more with combos/longer matches)
            const heal = Math.max(3, Math.floor(this.player.maxHp * 0.08 * power));
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
            this.fx.healSparkle(sw / 2, 218);
            soundManager.playHealSfx();
          }
          break;
        }
        case RuneType.Star: {
          if (this.enemy.hp <= 0) break; // Enemy already dead
          let starDmg = Math.floor(effectiveAtk * 0.5 * power * berserkMult);
          if (enemyHasAbility(this.enemy, EnemyAbility.Armor)) {
            starDmg = Math.floor(starDmg * 0.5);
          }
          this.enemy.hp = Math.max(0, this.enemy.hp - starDmg);
          this.showDamageNumber(starDmg, true);
          this.fx.slashEffect(sw / 2, 85);
          this.fx.enemyHitFlash(this.enemySprite);
          this.checkEnrage();
          break;
        }
        case RuneType.Gold: {
          const goldMult = this.modifier === StageModifier.GoldenHour ? 2 : 1;
          const floorBonus = 1 + this.stage * 0.05;
          const turnDecay = 1 / (1 + this.turnCount * 0.1);
          const goldGain = Math.max(1, Math.floor(count * power * goldMult * floorBonus * turnDecay));
          this.player.gems += goldGain;
          this.fx.goldCollect(sw / 2, 248, goldGain);
          soundManager.playGoldSfx();
          break;
        }
      }
    }
  }

  private checkEnrage(): void {
    if (enemyHasAbility(this.enemy, EnemyAbility.Enrage) && !this.enemy.enraged
        && this.enemy.hp > 0 && this.enemy.hp / this.enemy.maxHp < 0.3) {
      this.enemy.enraged = true;
      this.enemy.attack *= 2;
      this.showStatusMessage('Enemy ENRAGED! ATK x2!', '#ff4444');
      this.enemySprite.setTint(0xff4444);
    }
  }

  private async enemyRevive(): Promise<void> {
    this.enemy.revived = true;
    this.enemy.hp = Math.floor(this.enemy.maxHp * 0.5);

    this.showStatusMessage('Enemy REVIVED!', '#d4c8a8');
    this.fx.screenShake(5, 300);

    this.tweens.add({
      targets: this.enemySprite,
      alpha: 0.2, duration: 150, yoyo: true, repeat: 3,
    });

    await this.delay(800);
    this.updateUI();
  }

  private async enemyDefeated(): Promise<void> {
    const { width } = this.scale;
    soundManager.playDefeatSfx();
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

    this.savePersistent();

    // Floor 100 cleared = victory
    if (this.stage >= MAX_FLOOR) {
      BattleScene.clearRunSave();
      soundManager.stopBgm();
      this.scene.start('Victory', { player: this.player, stage: this.stage });
      return;
    }

    // Boss stages go to shop
    if (isBoss) {
      soundManager.stopBgm();
      this.saveRunState(this.stage + 1);
      this.scene.start('Shop', { player: this.player, stage: this.stage });
    } else {
      this.saveRunState(this.stage + 1);
      this.scene.start('Battle', { player: this.player, stage: this.stage + 1 });
    }
  }

  private async enemyAttack(): Promise<void> {
    soundManager.playEnemyAttackSfx();
    const berserkMult = this.modifier === StageModifier.Berserk ? 1.5 : 1;

    // Mid-bosses with MultiHit secondary also do multi-hit
    if (enemyHasAbility(this.enemy, EnemyAbility.MultiHit)) {
      let totalBlocked = 0;
      for (let i = 0; i < 3; i++) {
        const rawDmg = Math.floor(this.enemy.attack * 0.5 * berserkMult);
        const blocked = Math.min(this.shieldBuffer, rawDmg);
        this.shieldBuffer -= blocked;
        totalBlocked += blocked;
        const dmg = rawDmg - blocked;
        this.player.hp = Math.max(0, this.player.hp - dmg);
        if (dmg > 0) {
          this.fx.screenShake(4, 100);
          this.showDamageNumber(dmg, false);
          soundManager.playDamageSfx();
        }
        await this.delay(200);
      }
      this.fx.playerDamageFlash();
      if (totalBlocked > 0) {
        this.showStatusMessage(`Shield blocked ${totalBlocked}!`, '#3498db');
      }
    } else {
      const baseDmg = Math.floor(this.enemy.attack * berserkMult);
      const blocked = Math.min(this.shieldBuffer, baseDmg);
      this.shieldBuffer -= blocked;
      const dmg = baseDmg - blocked;
      this.player.hp = Math.max(0, this.player.hp - dmg);

      if (blocked > 0) {
        this.showStatusMessage(`Shield blocked ${blocked}!`, '#3498db');
      }
      if (dmg > 0) {
        this.fx.playerDamageFlash();
        this.fx.screenShake(8, 300);
        this.showDamageNumber(dmg, false);
        soundManager.playDamageSfx();
      } else {
        const { width } = this.scale;
        this.fx.shieldShimmer(width / 2, 218);
      }
    }

    // Drain
    if (enemyHasAbility(this.enemy, EnemyAbility.Drain)) {
      const drainHeal = Math.floor(this.enemy.attack * 0.3);
      this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + drainHeal);
      this.showStatusMessage(`Drained ${drainHeal} HP!`, '#66ffcc');
    }

    // Self-heal
    if (enemyHasAbility(this.enemy, EnemyAbility.Heal)) {
      const selfHeal = Math.floor(this.enemy.maxHp * 0.1);
      this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + selfHeal);
      this.showStatusMessage(`Enemy healed ${selfHeal} HP!`, '#2ecc71');
    }

    // Scramble
    if (enemyHasAbility(this.enemy, EnemyAbility.Scramble)) {
      await this.delay(300);
      await this.shuffleBoard('enemy');
    }

    // Freeze / Obstacle
    await this.placeSpecialBlocks();

    // Auto-shuffle if no valid moves after enemy abilities
    if (this.player.hp > 0 && !this.board.hasValidMove()) {
      await this.delay(200);
      await this.shuffleBoard();
    }

    await this.delay(300);
  }

  private async shuffleBoard(source: 'enemy' | 'item' | 'storm' | 'auto' = 'auto'): Promise<void> {
    switch (source) {
      case 'enemy':
        this.showStatusMessage(`${this.enemy.name} scrambled the board!`, '#e74c3c');
        this.cameras.main.flash(300, 180, 40, 40);
        this.fx.screenShake(8, 400);
        break;
      case 'storm':
        this.showStatusMessage('Rune Storm!', '#9b59b6');
        this.fx.screenShake(6, 300);
        break;
      case 'item':
        this.showStatusMessage('Board Shuffled!', '#9b59b6');
        this.fx.screenShake(4, 200);
        break;
      default:
        this.showStatusMessage('No moves! Reshuffling...', '#888888');
        this.fx.screenShake(3, 150);
        break;
    }

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

    // Shuffle only normal runes, preserving special cells (Frozen, Obstacle, RowClear)
    this.board.shuffleNormalRunes();
    let retries = 0;
    while (!this.board.hasValidMove() && retries < 10) {
      this.board.shuffleNormalRunes();
      retries++;
    }
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
    soundManager.playComboSfx(count);

    // Escalating screen shake and visual feedback
    if (count >= 2) {
      this.fx.screenShake(Math.min(count * 3, 20), 200 + count * 50);
    }

    // Big combo callout for 4+
    if (count >= 4) {
      const labels = ['', '', '', '', 'GREAT!', 'EXCELLENT!', 'AMAZING!', 'INCREDIBLE!'];
      const label = count >= labels.length ? 'UNSTOPPABLE!' : labels[count];
      const colors = ['', '', '', '', '#ffaa00', '#ff6600', '#ff2200', '#ff00ff'];
      const color = count >= colors.length ? '#ff00ff' : colors[count];
      const fontSize = Math.min(18 + count * 4, 40);

      const txt = this.add.text(width / 2, 240, label, {
        fontSize: `${fontSize}px`,
        color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(300);

      this.tweens.add({
        targets: txt,
        scaleX: 1.3, scaleY: 1.3, y: 220, alpha: 0,
        duration: 1000, delay: 200,
        onComplete: () => txt.destroy(),
      });
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
    const shieldInfo = this.shieldBuffer > 0 ? `  Shield: ${this.shieldBuffer}` : '';
    this.playerHpText.setText(`HP: ${this.player.hp} / ${this.player.maxHp}${shieldInfo}  Gems: ${this.player.gems}`);

    // Status effects
    const statuses: string[] = [];
    if (this.enemy.enraged) statuses.push('ENRAGED');
    if (enemyHasAbility(this.enemy, EnemyAbility.Poison)) statuses.push('POISONED');
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

  private animateDrops(drops: { col: number; fromRow: number; toRow: number; type: RuneType; state?: CellState }[]): Promise<void> {
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
        const { col, fromRow, toRow, type, state } = drop;
        const targetX = BOARD_OFFSET_X + col * CELL_SIZE + CELL_SIZE / 2;
        const targetY = BOARD_OFFSET_Y + toRow * CELL_SIZE + CELL_SIZE / 2;
        const startY = BOARD_OFFSET_Y + fromRow * CELL_SIZE + CELL_SIZE / 2;

        const cellState = state ?? CellState.Normal;
        const children: Phaser.GameObjects.GameObject[] = [];

        if (cellState === CellState.Obstacle) {
          children.push(this.add.image(0, 0, 'rune_obstacle'));
        } else {
          children.push(this.add.image(0, 0, `rune_${type}`));
          children.push(this.add.text(0, 0, RUNE_SYMBOLS[type], {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
          }).setOrigin(0.5));

          if (cellState === CellState.Frozen) {
            const s = CELL_SIZE - 4;
            const frost = this.add.graphics();
            frost.fillStyle(0x88ccff, 0.4);
            frost.fillRoundedRect(-s / 2, -s / 2, s, s, 8);
            frost.lineStyle(2, 0xaaddff, 0.8);
            frost.strokeRoundedRect(-s / 2, -s / 2, s, s, 8);
            children.push(frost);
            children.push(this.add.text(0, 0, '\u2744', {
              fontSize: '16px', color: '#ffffff',
            }).setOrigin(0.5).setAlpha(0.7));
          }

          if (cellState === CellState.RowClear) {
            const s = CELL_SIZE - 4;
            const arrow = this.add.graphics();
            arrow.lineStyle(2, 0xffaa00, 0.9);
            arrow.lineBetween(-s / 2 + 4, 0, s / 2 - 4, 0);
            arrow.lineBetween(-s / 2 + 4, 0, -s / 2 + 10, -4);
            arrow.lineBetween(-s / 2 + 4, 0, -s / 2 + 10, 4);
            arrow.lineBetween(s / 2 - 4, 0, s / 2 - 10, -4);
            arrow.lineBetween(s / 2 - 4, 0, s / 2 - 10, 4);
            children.push(arrow);
          }
        }

        const container = this.add.container(targetX, startY, children);
        container.setSize(CELL_SIZE - 4, CELL_SIZE - 4);
        if (cellState !== CellState.Obstacle) {
          container.setInteractive();
        }
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

  private animateRowClear(positions: [number, number][]): Promise<void> {
    return new Promise((resolve) => {
      let count = positions.length;
      if (count === 0) { resolve(); return; }
      for (const [r, c] of positions) {
        const sprite = this.runeSprites[r]?.[c];
        if (sprite) {
          this.tweens.add({
            targets: sprite,
            scaleX: 2, scaleY: 0, alpha: 0,
            duration: 250,
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

  private animateObstacleDestroy(positions: [number, number][]): Promise<void> {
    return new Promise((resolve) => {
      let count = positions.length;
      if (count === 0) { resolve(); return; }
      for (const [r, c] of positions) {
        const sprite = this.runeSprites[r]?.[c];
        if (sprite) {
          this.fx.runeMatchBurst(
            BOARD_OFFSET_X + c * CELL_SIZE + CELL_SIZE / 2,
            BOARD_OFFSET_Y + r * CELL_SIZE + CELL_SIZE / 2,
            RuneType.Shield,
          );
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

  private async placeSpecialBlocks(): Promise<void> {
    // Freeze ability
    if (enemyHasAbility(this.enemy, EnemyAbility.Freeze)) {
      const freezeCount = Math.min(2 + Math.floor(this.stage / 20), 4);
      const frozen = this.board.freezeRunes(freezeCount);
      for (const [r, c] of frozen) {
        this.refreshRuneVisual(r, c);
        const sprite = this.runeSprites[r]?.[c];
        if (sprite) {
          sprite.setScale(0);
          this.tweens.add({ targets: sprite, scaleX: 1, scaleY: 1, duration: 200 });
        }
      }
      if (frozen.length > 0) {
        this.showStatusMessage(`Froze ${frozen.length} runes!`, '#88ccff');
        await this.delay(300);
      }
    }

    // Obstacle ability + cursed obstacles from player debuff
    const enemyObstacles = enemyHasAbility(this.enemy, EnemyAbility.Obstacle) ? Math.min(2 + Math.floor(this.stage / 25), 3) : 0;
    const totalObstacles = enemyObstacles + (this.player.buffs.cursedObstacles || 0);
    if (totalObstacles > 0) {
      const placed = this.board.placeObstacles(totalObstacles);
      for (const [r, c] of placed) {
        this.refreshRuneVisual(r, c);
        const sprite = this.runeSprites[r]?.[c];
        if (sprite) {
          sprite.setScale(0);
          this.tweens.add({ targets: sprite, scaleX: 1, scaleY: 1, duration: 200 });
        }
      }
      if (placed.length > 0) {
        this.showStatusMessage(`${placed.length} obstacles placed!`, '#888888');
        await this.delay(300);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, resolve);
    });
  }

  private createBossProgress(width: number): void {
    const posInCycle = ((this.stage - 1) % 5);
    const totalSteps = 5;
    const dotSpacing = 28;
    const totalWidth = (totalSteps - 1) * dotSpacing;
    const startX = width / 2 - totalWidth / 2;
    const y = 30;
    const g = this.add.graphics();

    for (let i = 0; i < totalSteps; i++) {
      const x = startX + i * dotSpacing;
      const isBossStep = i === totalSteps - 1;
      const isCompleted = i < posInCycle;
      const isCurrent = i === posInCycle;

      if (i > 0) {
        const lineColor = isCompleted ? 0xf1c40f : 0x555555;
        g.lineStyle(2, lineColor, 1);
        g.lineBetween(x - dotSpacing + 6, y, x - 6, y);
      }

      const radius = isBossStep ? 7 : 5;
      if (isCurrent) {
        g.fillStyle(0xf1c40f, 1);
        g.fillCircle(x, y, radius);
      } else if (isCompleted) {
        g.fillStyle(0xf1c40f, 0.6);
        g.fillCircle(x, y, radius);
      } else {
        g.lineStyle(2, isBossStep ? 0xff4444 : 0x555555, 1);
        g.strokeCircle(x, y, radius);
      }

      if (isBossStep) {
        this.add.text(x, y, 'B', {
          fontSize: '9px',
          color: isCurrent ? '#000000' : '#ff4444',
          fontStyle: 'bold',
        }).setOrigin(0.5);
      }
    }
  }

  private savePersistent(): void {
    const raw = localStorage.getItem('rune_cascade_save');
    const existing: SaveData = raw ? JSON.parse(raw) : { gems: 0, atkLv: 0, defLv: 0, hpLv: 0, warps: [] };
    const save: SaveData = {
      gems: this.player.gems,
      atkLv: this.player.attackLevel,
      defLv: this.player.defenseLevel,
      hpLv: this.player.hpLevel,
      warps: existing.warps || [],
    };
    localStorage.setItem('rune_cascade_save', JSON.stringify(save));
    this.registry.set('save', save);
  }

  private saveRunState(stage: number): void {
    BattleScene.saveRunStateStatic(this.player, stage, {
      board: { grid: this.board.grid, cellState: this.board.cellState },
      enemy: this.enemy,
      modifier: this.modifier,
      shieldBuffer: this.shieldBuffer,
      turnCount: this.turnCount,
    });
  }

  static saveRunStateStatic(player: PlayerStats, stage: number, extra?: {
    board?: { grid: (number | null)[][]; cellState: number[][] };
    enemy?: EnemyData;
    modifier?: StageModifier;
    shieldBuffer?: number;
    turnCount?: number;
  }): void {
    const runSave: Record<string, unknown> = {
      stage,
      hp: player.hp,
      maxHp: player.maxHp,
      attack: player.attack,
      defense: player.defense,
      gems: player.gems,
      attackLevel: player.attackLevel,
      defenseLevel: player.defenseLevel,
      hpLevel: player.hpLevel,
      items: player.items,
      buffs: player.buffs,
      gemsAtRunStart: player.gemsAtRunStart,
    };
    if (extra) {
      if (extra.board) runSave.board = extra.board;
      if (extra.enemy) runSave.enemy = extra.enemy;
      if (extra.modifier !== undefined) runSave.modifier = extra.modifier;
      if (extra.shieldBuffer !== undefined) runSave.shieldBuffer = extra.shieldBuffer;
      if (extra.turnCount !== undefined) runSave.turnCount = extra.turnCount;
    }
    localStorage.setItem('rune_cascade_run', JSON.stringify(runSave));
  }

  static clearRunSave(): void {
    localStorage.removeItem('rune_cascade_run');
  }

  static loadRunSave(): PlayerStats & { stage: number; board?: { grid: (number | null)[][]; cellState: number[][] }; enemy?: EnemyData; modifier?: StageModifier; shieldBuffer?: number; turnCount?: number } | null {
    const raw = localStorage.getItem('rune_cascade_run');
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (data && typeof data.stage === 'number' && data.stage > 0) {
        // Ensure new fields exist
        if (!data.items) data.items = { shuffle: 0 };
        if (!data.buffs) data.buffs = { atkUp: false, defUp: false, regen: false, noHeal: false, cursedObstacles: 0 };
        if (data.gemsAtRunStart === undefined) data.gemsAtRunStart = 0;
        return data;
      }
    } catch { /* ignore */ }
    return null;
  }
}
