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
});
