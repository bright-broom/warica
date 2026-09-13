import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Deliberately fake link. Every PayPay navigation in these tests is intercepted.
const requestURL = 'https://qr.paypay.ne.jp/warica-test-request?token=fixture-only';
const storageKey = 'warican-app-data-v2';
async function setup(page: Page) {
  await page.goto('/');
  await page.getByLabel('イベント名', { exact: true }).fill('旅行');
  for (const name of ['A', 'B']) {
    await page.getByLabel('メンバーの名前', { exact: true }).fill(name);
    await page.getByRole('button', { name: '追加', exact: true }).click();
  }
  await page.getByRole('link', { name: '支払いを記録する', exact: true }).click();
  await page.getByLabel('金額', { exact: true }).fill('3000');
  await page.getByLabel('何の支払い？').fill('ホテル');
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await page.getByRole('link', { name: '精算結果を見る' }).click();
  await expect(page.getByTestId('transfer-list')).toContainText('¥1,500');
}
async function register(page: Page) {
  await page.getByRole('button', { name: 'BからAへのPayPay請求リンクを登録' }).click();
  await page.getByLabel('PayPay請求リンク', { exact: true }).fill(requestURL);
  await page.getByRole('button', { name: '請求リンクを登録する', exact: true }).click();
  await expect(page.getByRole('link', { name: 'BからAへのPayPayを開く' })).toHaveAttribute(
    'href',
    requestURL,
  );
}

test('PayPay request links persist, copy and open the exact URL without marking payment complete', async ({
  page,
  context,
}, testInfo) => {
  const opened: string[] = [];
  await context.route('https://**.paypay.ne.jp/**', async (route) => {
    opened.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<title>PayPay handoff fixture</title>',
    });
  });
  await setup(page);
  await page.getByRole('button', { name: 'BからAへのPayPay請求リンクを登録' }).click();
  const input = page.getByLabel('PayPay請求リンク', { exact: true });
  await expect(input).toBeFocused();
  await input.fill('https://paypay.ne.jp.evil.example/request');
  await page.getByRole('button', { name: '請求リンクを登録する', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'HTTPS' })).toBeVisible();
  await expect(input).toHaveValue('https://paypay.ne.jp.evil.example/request');
  await expect(page.getByRole('link', { name: 'BからAへのPayPayを開く' })).toHaveCount(0);
  await input.fill(requestURL);
  const editorAudit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(editorAudit.violations).toEqual([]);
  await page.getByRole('button', { name: '請求リンクを登録する', exact: true }).click();
  await page.reload();
  const open = page.getByRole('link', { name: 'BからAへのPayPayを開く' });
  await expect(open).toHaveAttribute('href', requestURL);
  const ledger = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).data,
    storageKey,
  );
  expect(ledger.paypayLinks).toHaveLength(1);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    }),
  );
  await page.getByRole('button', { name: 'BからAへの送金をコピー' }).click();
  await expect(page.getByLabel('共有用テキスト')).toHaveValue(`旅行\nB → A：¥1,500\n${requestURL}`);
  const popupReady = page.waitForEvent('popup');
  await open.click();
  const popup = await popupReady;
  await popup.waitForLoadState();
  expect(popup.url()).toBe(requestURL);
  expect(opened).toEqual([requestURL]);
  await popup.close();
  await expect(page).toHaveURL(/\/result$/);
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).data, storageKey),
  ).toEqual(ledger);
  await expect(page.getByTestId('transfer-list')).toContainText('¥1,500');
  await page.getByRole('button', { name: 'BからAへのPayPay請求リンクを編集' }).click();
  await expect(input).toHaveValue(requestURL);
  await page.getByRole('button', { name: 'BからAへのPayPay請求リンクを削除' }).click();
  await expect(open).toHaveCount(0);
  await page.reload();
  await expect(open).toHaveCount(0);
  await register(page);
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-paypay.png`,
    fullPage: true,
    animations: 'disabled',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('changed amounts invalidate links permanently and importing a backup replaces link data', async ({
  page,
}) => {
  await setup(page);
  const backup = await page.evaluate((key) => localStorage.getItem(key)!, storageKey);
  await register(page);
  for (const amount of ['4000', '3000']) {
    await page.getByRole('link', { name: '支払い', exact: true }).click();
    await page.getByRole('button', { name: 'ホテルを編集' }).click();
    await page.getByLabel('金額', { exact: true }).fill(amount);
    await page.getByRole('button', { name: '変更を保存する' }).click();
    await page.getByRole('link', { name: '精算結果', exact: true }).click();
    await expect(page).toHaveURL(/\/result$/);
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'BからAへのPayPay請求リンクを登録' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'BからAへのPayPayを開く' })).toHaveCount(0);
  }
  await register(page);
  await page.getByLabel('バックアップファイル').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup),
  });
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '読み込む', exact: true })
    .click();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('旅行');
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).data.paypayLinks ?? [],
      storageKey,
    ),
  ).toEqual([]);
});

test('failed saves and stale tabs block PayPay handoff while retaining the registered link', async ({
  page,
  context,
}) => {
  const opened: string[] = [];
  await context.route('https://**.paypay.ne.jp/**', async (route) => {
    opened.push(route.request().url());
    await route.fulfill({ status: 200, body: 'fixture' });
  });
  await setup(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.defineProperty(window, '__restorePayPayStorage', {
      value: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = function (key, value) {
      if (this === window.localStorage) throw new DOMException('Quota', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await register(page);
  await page.getByRole('link', { name: 'BからAへのPayPayを開く' }).click();
  await expect(
    page.getByText('保存と精算内容を確認してから、もう一度開いてください。'),
  ).toBeVisible();
  expect(context.pages()).toHaveLength(1);
  expect(opened).toEqual([]);
  await page.evaluate(() =>
    (window as unknown as { __restorePayPayStorage: () => void }).__restorePayPayStorage(),
  );
  await page.getByRole('button', { name: '保存を再試行' }).click();
  await page.reload();
  await expect(page.getByRole('link', { name: 'BからAへのPayPayを開く' })).toHaveAttribute(
    'href',
    requestURL,
  );
  const other = await context.newPage();
  await other.goto('/');
  await other.getByLabel('イベント名', { exact: true }).fill('別タブで更新');
  await page.getByRole('link', { name: 'BからAへのPayPayを開く' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: '別の画面で保存データが変更' }),
  ).toBeVisible();
  expect(opened).toEqual([]);
  expect(context.pages()).toHaveLength(2);
  await other.close();
});
