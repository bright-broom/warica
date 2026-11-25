import { expect, test } from '@playwright/test';
import { savedEmptyEvent } from './saved-empty-event';

test.use({ storageState: savedEmptyEvent, colorScheme: 'dark' });

// 端末がダークモードでも、明るい配色のまま崩れない（対象者のチェックが塗りつぶされない）
test('the light-only design is unaffected by the dark colour scheme', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('イベント名', { exact: true }).fill('旅行');
  for (const name of ['あおい', 'はる']) {
    await page.getByLabel('メンバーの名前', { exact: true }).fill(name);
    await page.getByRole('button', { name: '追加', exact: true }).click();
  }
  await page.getByRole('link', { name: '支払いを記録する', exact: true }).click();
  const checkbox = page.getByRole('checkbox', { name: 'あおい', exact: true });
  await expect(checkbox).toBeChecked();
  const [background, main] = await checkbox.evaluate((element) => [
    getComputedStyle(element).backgroundColor,
    getComputedStyle(document.documentElement).getPropertyValue('--brand-main'),
  ]);
  expect(background).toBe('rgba(0, 0, 0, 0)');
  expect(main.trim()).toBe('#193B3A');
});
