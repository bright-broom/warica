import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { serializeState, STORAGE_KEY } from '../../src/lib/storage';
import { DRAFT_KEY } from '../../src/lib/payment-draft';
import { goToStep } from './page-arrows';

const event = {
  eventName: '週末の旅行',
  lastUpdated: '2026-09-14T00:00:00.000Z',
  members: [
    { id: 'a', name: 'あおい' },
    { id: 'b', name: 'はる' },
  ],
  payments: [
    {
      id: 'p',
      payerId: 'a',
      participantIds: ['a', 'b'],
      amount: 3000,
      memo: '食事',
      createdAt: '2026-09-14T00:00:00.000Z',
    },
  ],
  paypayLinks: [
    {
      fromId: 'b',
      toId: 'a',
      from: 'はる',
      to: 'あおい',
      amount: 1500,
      url: 'https://qr.paypay.ne.jp/fixture-only',
    },
  ],
};
async function setup(page: Page) {
  await page.addInitScript(
    ({ key, raw }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
      localStorage.setItem('warica-appearance-v1', 'classic');
    },
    { key: STORAGE_KEY, raw: serializeState(event) },
  );
  await page.goto('/payments');
  await page.getByLabel('金額', { exact: true }).fill('777');
  await page.getByLabel('何の支払い？').fill('次の支払い');
  await page.getByRole('button', { name: '食事を編集', exact: true }).click();
  await page.getByLabel('金額', { exact: true }).fill('1234');
}
async function confirmReset(page: Page) {
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'リセットする', exact: true })
    .click();
}

for (const path of ['/', '/payments', '/result'] as const) {
  test(`header refresh clears payments after confirmation from ${path} and keeps the group`, async ({
    page,
  }) => {
    await setup(page);
    await goToStep(page, path);
    await expect(page.locator('header').getByRole('button')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'メニュー', exact: true })).toHaveCount(0);
    await expect(page.locator('header').getByRole('status')).toHaveCount(0);
    await expect(page.locator('[data-ui=panel]').first()).toHaveCSS('border-radius', '24px');
    const saved = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    const draft = await page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY);
    const trigger = page.getByRole('button', { name: 'リフレッシュ', exact: true });
    await trigger.click();
    const dialog = page.getByRole('alertdialog', { name: '支払いをリセット', exact: true });
    await expect(dialog).toContainText('イベント名とメンバーは残ります');
    await expect(dialog.getByRole('button', { name: 'キャンセル', exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: 'キャンセル', exact: true }).click();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(saved);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY)).toBe(draft);
    await trigger.click();
    await confirmReset(page);
    await expect(page).toHaveURL(/\/payments$/);
    await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('何の支払い？')).toHaveValue('');
    await expect(page.getByRole('button', { name: '編集をキャンセル', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByTestId('payment-list')).toHaveCount(0);
    await expect(page.getByRole('link', { name: '精算結果を見る', exact: true })).toHaveCount(0);
    const state = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).data,
      STORAGE_KEY,
    );
    expect(state).toMatchObject({
      eventName: event.eventName,
      members: event.members,
      payments: [],
      paypayLinks: [],
    });
    expect(state.lastUpdated).not.toBe(event.lastUpdated);
    await page.reload();
    await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
    await expect(page.getByTestId('payment-list')).toHaveCount(0);
    await page.getByLabel('金額', { exact: true }).fill('800');
    await page.getByRole('button', { name: 'この支払いを追加する', exact: true }).click();
    await goToStep(page, '/result');
    await expect(page.getByTestId('transfer-list')).toContainText('¥400');
    await expect(page.getByRole('link', { name: /PayPayを開く/ })).toHaveCount(0);
  });
}

test('a tab updated while reset confirmation is open cannot be erased', async ({
  page,
  context,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'リフレッシュ', exact: true }).click();
  const other = await context.newPage();
  await other.goto('/');
  await other.getByLabel('イベント名', { exact: true }).fill('別タブの最新イベント');
  const latest = await other.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  await confirmReset(page);
  await expect(page.locator('main [role=alert]')).toContainText('別の画面');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(latest);
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('1234');
  await expect(page.getByTestId('payment-list')).toContainText('¥3,000');
});

test('reset invalidates old drafts even when session storage writes fail', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === window.sessionStorage) throw new DOMException('Quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'リフレッシュ', exact: true }).click();
  await confirmReset(page);
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
  await expect(page.locator('main [role=alert]')).toContainText('下書きを保存できません');
  page.on('dialog', (dialog) => dialog.accept());
  await page.reload();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
  await expect(page.getByTestId('payment-list')).toHaveCount(0);
  await expect(page.locator('main [role=alert]')).toHaveCount(0);
});

test('browser reload preserves the ledger and drafts; reset confirmation remains accessible', async ({
  page,
}) => {
  await setup(page);
  await page.reload();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('1234');
  await expect(page.getByTestId('payment-list')).toContainText('¥3,000');
  await page.getByRole('button', { name: 'リフレッシュ', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(report.violations).toEqual([]);
});
