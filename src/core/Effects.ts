import Phaser from 'phaser';
import { RUNE_COLORS, RuneType } from './constants';

export class Effects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Particle burst when runes are matched */
  runeMatchBurst(x: number, y: number, type: RuneType): void {
    const color = RUNE_COLORS[type];
    const count = 12;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;
      const size = 3 + Math.random() * 4;

      const particle = this.scene.add.circle(x, y, size, color, 1);
      particle.setDepth(100);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 400 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /** Screen shake effect */
  screenShake(intensity: number = 5, duration: number = 200): void {
    this.scene.cameras.main.shake(duration, intensity / 1000);
  }

  /** Big combo text splash */
  comboSplash(x: number, y: number, comboCount: number): void {
    const colors = ['#f39c12', '#e74c3c', '#e91e63', '#ff0000'];
    const colorIdx = Math.min(comboCount - 2, colors.length - 1);
    const fontSize = Math.min(28 + comboCount * 4, 48);

    const text = this.scene.add.text(x, y, `${comboCount} COMBO!`, {
      fontSize: `${fontSize}px`,
      color: colors[colorIdx],
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(200);

    // Scale pop-in
    text.setScale(0.3);
    this.scene.tweens.add({
      targets: text,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
      ease: 'Back.easeOut',
      yoyo: true,
      onYoyo: () => {
        this.scene.tweens.add({
          targets: text,
          scaleX: 1, scaleY: 1,
          duration: 100,
        });
      },
    });

    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1200,
      delay: 400,
      onComplete: () => text.destroy(),
    });
  }

  /** Enemy hit flash: the sprite flashes white/red */
  enemyHitFlash(sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Container): void {
    this.scene.tweens.add({
      targets: sprite,
      alpha: 0.3,
      duration: 60,
      yoyo: true,
      repeat: 2,
    });
  }

  /** Big slash effect across the enemy */
  slashEffect(x: number, y: number): void {
    const slash = this.scene.add.graphics();
    slash.setDepth(150);

    const startX = x - 50;
    const startY = y - 30;
    const endX = x + 50;
    const endY = y + 30;

    slash.lineStyle(4, 0xffffff, 1);
    slash.beginPath();
    slash.moveTo(startX, startY);
    slash.lineTo(endX, endY);
    slash.strokePath();

    // Second cross slash
    slash.lineStyle(3, 0xf1c40f, 0.8);
    slash.beginPath();
    slash.moveTo(x + 40, y - 25);
    slash.lineTo(x - 40, y + 25);
    slash.strokePath();

    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      duration: 300,
      delay: 100,
      onComplete: () => slash.destroy(),
    });
  }

  /** Shield shimmer effect */
  shieldShimmer(x: number, y: number): void {
    const shield = this.scene.add.circle(x, y, 40, 0x3498db, 0.3);
    shield.setDepth(100);

    this.scene.tweens.add({
      targets: shield,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => shield.destroy(),
    });
  }

  /** Heal sparkle */
  healSparkle(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const px = x + Phaser.Math.Between(-30, 30);
      const py = y + Phaser.Math.Between(-10, 10);

      const star = this.scene.add.text(px, py, '+', {
        fontSize: '18px',
        color: '#2ecc71',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(100);

      this.scene.tweens.add({
        targets: star,
        y: py - 30 - Math.random() * 20,
        alpha: 0,
        duration: 600 + Math.random() * 300,
        delay: i * 50,
        onComplete: () => star.destroy(),
      });
    }
  }

  /** Enemy death explosion */
  deathExplosion(x: number, y: number): void {
    this.screenShake(10, 400);

    // Ring expansion
    const ring = this.scene.add.circle(x, y, 10, 0xffffff, 0);
    ring.setStrokeStyle(3, 0xf1c40f, 1);
    ring.setDepth(200);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 8,
      scaleY: 8,
      alpha: 0,
      duration: 500,
      onComplete: () => ring.destroy(),
    });

    // Burst particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 150;
      const color = [0xe74c3c, 0xf1c40f, 0xffffff, 0xe67e22][Math.floor(Math.random() * 4)];
      const p = this.scene.add.circle(x, y, 2 + Math.random() * 5, color, 1);
      p.setDepth(200);

      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0, scaleY: 0,
        duration: 500 + Math.random() * 300,
        onComplete: () => p.destroy(),
      });
    }
  }

  /** Player damage: red vignette flash */
  playerDamageFlash(): void {
    const { width, height } = this.scene.scale;
    const vignette = this.scene.add.graphics();
    vignette.setDepth(300);
    vignette.fillStyle(0xff0000, 0.3);
    vignette.fillRect(0, 0, width, height);

    this.scene.tweens.add({
      targets: vignette,
      alpha: 0,
      duration: 400,
      onComplete: () => vignette.destroy(),
    });
  }

  /** Gold collect sparkle */
  goldCollect(x: number, y: number, amount: number): void {
    const text = this.scene.add.text(x, y, `+${amount}G`, {
      fontSize: '20px',
      color: '#f1c40f',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);

    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 300,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      duration: 400,
      delay: 500,
      onComplete: () => text.destroy(),
    });
  }
}
