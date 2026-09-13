import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { APPEARANCE_KEY } from '../../src/design/appearance';

async function toggle(page: Page, name: string) {
  await page.getByRole('button', { name: 'メニュー', exact: true }).click();
  await page.getByRole('menuitem', { name, exact: true }).click();
}

test('switching appearance preserves unsaved inputs and the ledger; preference survives reload', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'みんなの、わりかん。' })).toBeVisible();
  await page.getByLabel('イベント名', { exact: true }).fill('ピクニック');
  for (const name of ['あおい', 'はる']) {
    await page.getByLabel('メンバーの名前', { exact: true }).fill(name);
    await page.getByRole('button', { name: '追加', exact: true }).click();
  }
  await page.getByLabel('メンバーの名前', { exact: true }).fill('入力中の名前');
  const ledger = await page.evaluate(() => localStorage.getItem('warican-app-data-v2'));
  await toggle(page, '以前のデザインに戻す');
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'classic');
  await expect(page.getByRole('region', { name: 'みんなの、わりかん。' })).toBeHidden();
  await expect(page.getByLabel('メンバーの名前', { exact: true })).toHaveValue('入力中の名前');
  expect(await page.evaluate(() => localStorage.getItem('warican-app-data-v2'))).toBe(ledger);
  await expect(page.locator('[data-ui=panel]').first()).toHaveCSS('border-radius', '16px');
  await page.getByRole('link', { name: '支払いを記録する', exact: true }).click();
  await page.getByLabel('金額', { exact: true }).fill('1200');
  await page.getByLabel('何の支払い？').fill('おやつ');
  await page.getByRole('checkbox', { name: 'はる', exact: true }).uncheck();
  const draft = await page.evaluate(() => sessionStorage.getItem('warica-payment-draft-v1'));
  await toggle(page, 'ポップなデザインにする');
  await expect(page.locator('[data-ui=panel]').first()).toHaveCSS('border-radius', '24px');
  expect(await page.evaluate(() => sessionStorage.getItem('warica-payment-draft-v1'))).toBe(draft);
  await toggle(page, '以前のデザインに戻す');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'classic');
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('1200');
  await expect(page.getByLabel('何の支払い？')).toHaveValue('おやつ');
  await expect(page.getByRole('checkbox', { name: 'はる', exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await expect(page.getByTestId('payment-list')).toContainText('¥1,200');
  await expect
    .poll(() =>
      page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length),
    )
    .toBe(0);
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(report.violations).toEqual([]);
  await toggle(page, 'ポップなデザインにする');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'pop');
  await expect(page.getByTestId('payment-list')).toContainText('¥1,200');
});

test('saved classic preference is applied even before React starts', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'classic'), APPEARANCE_KEY);
  await page.route('**/_next/**/*.js*', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'classic');
  await expect(page.locator('body')).toHaveCSS('font-family', /Arial/);
});

test('denied preference writes allow a reversible in-page switch without clearing input', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('メンバーの名前', { exact: true }).fill('そのまま残す');
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Quota', 'QuotaExceededError');
      original.call(this, name, value);
    };
  }, APPEARANCE_KEY);
  await toggle(page, '以前のデザインに戻す');
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'classic');
  await expect(
    page.getByText('この画面で切り替えました。デザイン設定は保存できませんでした。'),
  ).toBeVisible();
  await expect(page.getByLabel('メンバーの名前', { exact: true })).toHaveValue('そのまま残す');
  await toggle(page, 'ポップなデザインにする');
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'pop');
  await expect(page.getByLabel('メンバーの名前', { exact: true })).toHaveValue('そのまま残す');
});
