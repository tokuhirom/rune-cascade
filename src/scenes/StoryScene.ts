import Phaser from 'phaser';

const STORY_PAGES = [
  {
    text: 'In an age long forgotten, the ancient Rune Tower\nstood at the heart of the world.\n\nWithin its depths, an entity known as\nthe Chaos Emperor gathered power,\ntwisting the dungeon\'s magic\ninto an endless labyrinth of 100 floors.',
    color: '#ccddee',
  },
  {
    text: 'A small fairy found you at the tower\'s entrance.\n\n"You are the one the runes have chosen.\nDescend into the depths, match the runes,\nand defeat the Chaos Emperor\nbefore his power consumes the world."\n\nAnd so, your journey begins...',
    color: '#aaeedd',
  },
];

export class StoryScene extends Phaser.Scene {
  private currentPage = 0;

  constructor() {
    super('Story');
  }

  init(data: { page?: number }): void {
    this.currentPage = data.page || 0;
  }

  create(): void {
    this.showPage();
  }

  private showPage(): void {
    const { width, height } = this.scale;
    const page = STORY_PAGES[this.currentPage];

    // Fade in
    this.cameras.main.fadeIn(500);

    const textObj = this.add.text(width / 2, height / 2 - 40, page.text, {
      fontSize: '16px',
      color: page.color,
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: textObj,
      alpha: 1,
      duration: 800,
    });

    const isLast = this.currentPage >= STORY_PAGES.length - 1;
    const promptText = isLast ? 'Tap to begin' : 'Tap to continue';
    const prompt = this.add.text(width / 2, height - 80, promptText, {
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: prompt,
      alpha: 1,
      duration: 400,
      delay: 1200,
    });

    // Blinking prompt
    this.tweens.add({
      targets: prompt,
      alpha: 0.3,
      duration: 800,
      delay: 2000,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => {
      if (isLast) {
        localStorage.setItem('rune_cascade_story_read', '1');
        this.cameras.main.fadeOut(500);
        this.time.delayedCall(500, () => {
          this.scene.start('Town');
        });
      } else {
        const nextPage = this.currentPage + 1;
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
          this.scene.restart({ page: nextPage });
        });
      }
    });
  }
}
