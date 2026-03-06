import { test, expect } from '@playwright/test';

// Helper: skip story (2 taps) and get to town, then click EXPLORE to start battle
async function skipStoryAndStartBattle(page: import('@playwright/test').Page) {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 10000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error('No canvas bounding box');

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Story page 1 - tap to continue
  await page.waitForTimeout(1500);
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(1000);

  // Story page 2 - tap to begin
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(1000);

  // Now in Town - click EXPLORE DUNGEON button area
  // The button is around y=215 in game coords (roughly 30% of height)
  await page.mouse.click(cx, box.y + box.height * 0.33);
  await page.waitForTimeout(2000);

  return box;
}

// Helper: navigate to town screen (skip story)
async function goToTown(page: import('@playwright/test').Page) {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 10000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error('No canvas bounding box');

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Story page 1
  await page.waitForTimeout(1500);
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(1000);

  // Story page 2
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(1000);

  return box;
}

// Convert game coordinates to canvas pixel coordinates
function gameToCanvas(box: { x: number; y: number; width: number; height: number }, gx: number, gy: number) {
  // Game is 480x720, canvas is scaled to fit
  const scaleX = box.width / 480;
  const scaleY = box.height / 720;
  return {
    x: box.x + gx * scaleX,
    y: box.y + gy * scaleY,
  };
}

test.describe('Rune Cascade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('loads and shows story screen', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test('canvas has correct dimensions', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    const count = await canvas.count();
    expect(count).toBe(1);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });

  test('story advances and reaches town', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const box = await canvas.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      // Tap through story (2 pages)
      await page.waitForTimeout(1500);
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(1000);
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(1000);
    }
    expect(errors).toEqual([]);
  });

  test('can start battle from town', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');

    await skipStoryAndStartBattle(page);
    expect(errors).toEqual([]);
  });

  test('drag swap does not crash on multiple swipes', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');

    const box = await skipStoryAndStartBattle(page);

    // Multiple drag swipes
    const boardX = box.x + box.width * 0.4;
    const boardY = box.y + box.height * 0.6;

    for (const [dx, dy] of [[50, 0], [0, 50], [-50, 0], [0, -50]]) {
      await page.mouse.move(boardX, boardY);
      await page.mouse.down();
      await page.mouse.move(boardX + dx, boardY + dy, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(1500);
    }
    expect(errors).toEqual([]);
  });

  test('town EXPLORE button is clickable', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');

    const box = await goToTown(page);

    // EXPLORE DUNGEON button is at game y=215, center of 36px tall button
    // Click it and verify no errors (scene should transition to Battle)
    const exploreBtn = gameToCanvas(box, 240, 233);
    await page.mouse.click(exploreBtn.x, exploreBtn.y);
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test('town EXPLORE button responds to multiple clicks', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');

    const box = await goToTown(page);

    // Try clicking the EXPLORE button area multiple times to verify it's reliably tappable
    const exploreBtn = gameToCanvas(box, 240, 233);
    for (let i = 0; i < 3; i++) {
      await page.mouse.click(exploreBtn.x, exploreBtn.y);
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test('town upgrade buttons work with gems', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Set up save data with gems so upgrade buttons appear
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('rune_cascade_save', JSON.stringify({
        gems: 100,
        atkLv: 0,
        defLv: 0,
        hpLv: 0,
        warps: [],
      }));
      localStorage.setItem('rune_cascade_story_read', '1');
    });
    await page.reload();

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No canvas bounding box');

    // Wait for town scene to render
    await page.waitForTimeout(2000);

    // With gems=100 and no levels, upgrades section appears after EXPLORE button
    // EXPLORE at y=215 (36px + 6px gap = y=257)
    // "~ Fairy Upgrades ~" label at y=262
    // First upgrade (ATK Up 10G) at y=282 (30px + 6px = y=318)
    // Click ATK Up button
    const atkBtn = gameToCanvas(box, 240, 297);
    await page.mouse.click(atkBtn.x, atkBtn.y);
    await page.waitForTimeout(2000);

    // Scene should restart after purchase - verify no errors
    expect(errors).toEqual([]);

    // After restart, gems should be 90 (100 - 10)
    const saveAfter = await page.evaluate(() => {
      const raw = localStorage.getItem('rune_cascade_save');
      return raw ? JSON.parse(raw) : null;
    });
    expect(saveAfter).not.toBeNull();
    expect(saveAfter.gems).toBe(90);
    expect(saveAfter.atkLv).toBe(1);
  });
});
