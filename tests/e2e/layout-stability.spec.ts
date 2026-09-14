import { expect, test } from '@playwright/test';
import { goToStep } from './page-arrows';

test('page and inner content stay within the viewport across all three steps', async ({
  page,
  isMobile,
}) => {
  await page.goto('/payments');
  await page.getByLabel('金額', { exact: true }).fill('3000');
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  // The root can fit while the independently scrolling main still overflows.
  for (const width of isMobile ? [320, 375, 390, 430, 640, 844, 1023] : [1024, 1440]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 800 });
    await page.goto('/');
    await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('みんなでごはん');
    for (const path of ['/', '/payments', '/result'] as const) {
      await goToStep(page, path);
      const dimensions = await page.evaluate(() => {
        const main = document.querySelector('main')!;
        main.scrollLeft = 100;
        return {
          viewport: window.innerWidth,
          root: document.documentElement.scrollWidth,
          content: main.scrollWidth,
          available: main.clientWidth,
          left: main.scrollLeft,
        };
      });
      expect(dimensions.root, `${width}px ${path}: document`).toBe(dimensions.viewport);
      expect(dimensions.content, `${width}px ${path}: main`).toBe(dimensions.available);
      expect(dimensions.left, `${width}px ${path}: horizontal scroll`).toBe(0);
    }
  }
});

test('scrolling, pressing controls and opening confirmation keep the mobile layout stable', async ({
  page,
  isMobile,
  browserName,
}) => {
  await page.goto('/');
  const refresh = page.getByRole('button', {
    name: 'リフレッシュ',
    exact: true,
    includeHidden: true,
  });
  await expect(refresh).toBeEnabled();
  // Radix hides the background from assistive technology while the dialog is open.
  const main = page.locator('main');
  const original = await main.boundingBox();

  if (isMobile) {
    if (browserName === 'chromium') {
      const touch = await page.context().newCDPSession(page);
      const x = original!.x + original!.width / 2;
      const y = original!.y + 300;
      for (const [dx, dy] of [
        [-120, 0],
        [0, -220],
      ]) {
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 6; step++) {
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: x + (dx * step) / 6, y: y + (dy * step) / 6 }],
          });
          await page.waitForTimeout(20);
        }
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
      await touch.detach();
    } else {
      // Playwright does not expose touch swipes or mouse wheels on mobile WebKit.
      await main.evaluate((element) => element.scrollBy({ left: 160, top: 260 }));
    }
    await expect.poll(() => main.evaluate((element) => element.scrollLeft)).toBe(0);
    await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    expect(await main.boundingBox()).toEqual(original);

    // Cover both the shared Button and the separate ToggleGroup choice styles.
    for (const control of [refresh, page.locator('[data-ui="choice"]').first()]) {
      await control.scrollIntoViewIfNeeded();
      const before = (await control.boundingBox())!;
      await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
      await page.mouse.down();
      await expect(control).toHaveJSProperty('tagName', 'BUTTON');
      expect(await control.evaluate((element) => element.matches(':active'))).toBe(true);
      // Sample through the previous 150ms transition, not just its first frame.
      for (let sample = 0; sample < 5; sample++) {
        await page.waitForTimeout(50);
        expect(await control.boundingBox()).toEqual(before);
      }
      await page.mouse.move(1, 1);
      await page.mouse.up();
    }
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const before = await refresh.boundingBox();
    await refresh.click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeFocused();
    // Let the dialog's entry animation finish before assessing its bounds.
    await page.waitForTimeout(250);
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(await main.boundingBox()).toEqual(original);
    if (isMobile) expect(await refresh.boundingBox()).toEqual(before);
    await dialog.getByRole('button', { name: 'キャンセル' }).click();
    await expect(dialog).toBeHidden();
    await expect(refresh).toBeFocused();
    expect(await main.boundingBox()).toEqual(original);
  }
});
