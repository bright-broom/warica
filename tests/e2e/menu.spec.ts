import { expect, test } from '@playwright/test';

test('legacy appearance preferences cannot restore the removed theme; every menu only refreshes safely', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('warica-appearance-v1', 'classic'));
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'みんなの、わりかん。' })).toBeVisible();
  await page.getByLabel('イベント名', { exact: true }).fill('週末の旅行');
  for (const name of ['あおい', 'はる']) {
    await page.getByLabel('メンバーの名前', { exact: true }).fill(name);
    await page.getByRole('button', { name: '追加', exact: true }).click();
  }
  await page.getByRole('link', { name: '支払いを記録する', exact: true }).click();
  await page.getByLabel('金額', { exact: true }).fill('2000');
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await page.getByLabel('金額', { exact: true }).fill('777');
  await page.getByLabel('何の支払い？').fill('入力途中');
  const ledger = await page.evaluate(
    () => JSON.parse(localStorage.getItem('warican-app-data-v2')!).data,
  );
  for (const name of ['メンバー', '支払い', '精算結果']) {
    await page.getByRole('link', { name, exact: true }).click();
    await page.getByRole('button', { name: 'メニュー', exact: true }).click();
    await expect(page.getByRole('menuitem')).toHaveCount(1);
    await expect(page.getByRole('menuitem')).toHaveText('リフレッシュ');
    await page.evaluate(() => document.documentElement.setAttribute('data-before-refresh', 'yes'));
    await page.getByRole('menuitem', { name: 'リフレッシュ', exact: true }).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-before-refresh', 'yes');
    await expect(page.locator('[data-ui=panel]').first()).toHaveCSS('border-radius', '24px');
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem('warican-app-data-v2')!).data),
    ).toEqual(ledger);
  }
  await expect(page.getByTestId('transfer-list')).toContainText('¥1,000');
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('777');
  await expect(page.getByLabel('何の支払い？')).toHaveValue('入力途中');
});
