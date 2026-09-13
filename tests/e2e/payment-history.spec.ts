import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { serializeState, STORAGE_KEY } from '../../src/lib/storage';

async function seed(page: Page, count: number) {
  const raw = serializeState({
    eventName: '旅行',
    lastUpdated: '2026-09-13T00:00:00.000Z',
    members: [
      { id: 'a', name: 'あおい' },
      { id: 'b', name: 'はる' },
    ],
    payments: Array.from({ length: count }, (_, i) => ({
      id: `p${i}`,
      payerId: 'a',
      amount: 1_001,
      participantIds: ['a', 'b'],
      memo: `記録 ${String(i + 1).padStart(4, '0')}`,
      createdAt: '2026-09-13T00:00:00.000Z',
    })),
  });
  await page.addInitScript(
    ({ key, raw }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, raw);
    },
    { key: STORAGE_KEY, raw },
  );
  await page.goto('/payments');
}

test('both routes bound history rendering and search all records without filtering totals or copy', async ({
  page,
}) => {
  await seed(page, 1_000);
  const history = page.getByRole('region', { name: '支払いの記録', exact: true });
  const rows = history.getByTestId('payment-list').locator('li');
  const search = history.getByRole('searchbox');
  await expect(rows).toHaveCount(20);
  await expect(rows.first()).toContainText('記録 1000');
  await search.fill('記録 ０００１');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('記録 0001');
  await search.fill('該当なし');
  await expect(history.getByText('見つかりませんでした')).toBeVisible();
  await history.getByRole('button', { name: '履歴の検索をクリア' }).click();
  await expect(search).toBeFocused();
  await expect(rows).toHaveCount(20);
  await page.getByRole('link', { name: '精算結果を見る', exact: true }).click();
  await expect(rows).toHaveCount(20);
  await search.fill('0001');
  await expect(rows).toHaveCount(1);
  await expect(page.getByTestId('transfer-list')).toContainText('¥500,000');
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('denied');
        },
      },
    }),
  );
  await page.getByRole('button', { name: '送金一覧を一括コピー' }).click();
  await expect(page.getByLabel('共有用テキスト')).toHaveValue(/合計 ¥1,001,000 \/ 2人 \/ 1000件/);
  await expect(page.getByLabel('共有用テキスト')).toHaveValue(/はる → あおい：¥500,000/);
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).data.payments.length,
    STORAGE_KEY,
  );
  expect(stored).toBe(1_000);
});

test('paging preserves drafts, clamps after deletion and edits the selected older record', async ({
  page,
  isMobile,
}) => {
  await seed(page, 41);
  const history = page.getByRole('region', { name: '支払いの記録', exact: true });
  const rows = history.getByTestId('payment-list').locator('li');
  const older = history.getByRole('button', { name: '古い支払いのページ' });
  await page.getByLabel('金額', { exact: true }).fill('777');
  await page.getByLabel('何の支払い？').fill('入力途中');
  await older.click();
  await expect(rows.first()).toContainText('記録 0021');
  await expect(history).toBeFocused();
  if (isMobile) await expect(page.locator('header')).toBeInViewport({ ratio: 1 });
  await expect(history.getByRole('status')).toHaveText('表示中：21–40 / 41件');
  await older.click();
  await expect(rows).toHaveCount(1);
  await expect(older).toBeDisabled();
  await history.getByRole('button', { name: '記録 0001を削除', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '削除する', exact: true })
    .click();
  await expect(rows).toHaveCount(20);
  await expect(rows.first()).toContainText('記録 0021');
  await expect(rows.last()).toContainText('記録 0002');
  await history.getByRole('button', { name: '新しい支払いのページ' }).focus();
  await page.keyboard.press('Enter');
  await expect(rows.first()).toContainText('記録 0041');
  await expect(history).toBeFocused();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('777');
  await history.getByRole('searchbox').fill('0002');
  await expect(rows).toHaveCount(1);
  await history.getByRole('button', { name: '記録 0002を編集', exact: true }).click();
  await expect(page.getByLabel('何の支払い？')).toHaveValue('記録 0002');
  await page.getByLabel('何の支払い？').fill('修正済み');
  await page.getByRole('button', { name: '変更を保存する', exact: true }).click();
  await expect(history.getByText('見つかりませんでした')).toBeVisible();
  await history.getByRole('button', { name: '履歴の検索をクリア' }).click();
  await expect(rows.first()).toContainText('記録 0041');
  await history.getByRole('searchbox').fill('記録');
  if (isMobile) {
    for (const button of await history.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x + box!.width / 2).toBeGreaterThanOrEqual(page.viewportSize()!.width / 2);
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(report.violations).toEqual([]);
  await page.reload();
  await history.getByRole('searchbox').fill('修正済み');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('¥1,001');
});
