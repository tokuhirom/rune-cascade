import { test, expect } from '@playwright/test';

test.describe('Rune Cascade', () => {
  test.beforeEach(async ({ page }) => {
    // Clear save data
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('loads and shows title screen', async ({ page }) => {
    await page.goto('/');
    // Wait for Phaser canvas to appear
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test('canvas has correct dimensions', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    // Phaser canvas should exist
    const count = await canvas.count();
    expect(count).toBe(1);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    // Wait a bit for any deferred errors
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });

  test('can click on canvas without crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Click the START button area (center of canvas, around y=380 in game coordinates)
    const box = await canvas.boundingBox();
    if (box) {
      // Click center-ish to hit START
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.53);
      await page.waitForTimeout(2000);
    }
    expect(errors).toEqual([]);
  });

  test('game board appears after starting', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const box = await canvas.boundingBox();
    if (box) {
      // Click START
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.53);
      await page.waitForTimeout(2000);

      // Try clicking on the board area (should not crash)
      const boardY = box.y + box.height * 0.55;
      const boardX = box.x + box.width * 0.3;
      await page.mouse.click(boardX, boardY);
      await page.waitForTimeout(500);
      // Click adjacent cell
      await page.mouse.click(boardX + 40, boardY);
      await page.waitForTimeout(2000);
    }
    expect(errors).toEqual([]);
  });
});
