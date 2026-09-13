import { expect, test } from '@playwright/test';

test('first use needs only an amount, preserves the unsaved draft on reload, and settles A and B', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('みんなでごはん');
  await expect(page.getByTestId('member-list').locator('li')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Aの名前を編集', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bの名前を編集', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '支払いを記録する', exact: true }).click();
  await expect(page.getByLabel('支払った人', { exact: true }).locator('option:checked')).toHaveText(
    'A',
  );
  await expect(page.getByRole('checkbox', { name: 'A', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'B', exact: true })).toBeChecked();
  await page.getByLabel('金額', { exact: true }).fill('1001');
  // No ledger has been saved yet: defaults must keep the same identity across loads.
  expect(await page.evaluate(() => localStorage.getItem('warican-app-data-v2'))).toBeNull();
  await page.reload();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('1001');
  await expect(page.getByRole('checkbox', { name: 'B', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await page.getByRole('link', { name: '精算結果を見る', exact: true }).click();
  const transfer = page.getByTestId('transfer-list');
  await expect(transfer).toContainText('¥500');
  await expect(
    page.getByRole('button', { name: 'BからAへの送金をコピー', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'メンバー', exact: true }).click();
  await page.getByLabel('イベント名', { exact: true }).fill('京都旅行');
  await page.getByRole('button', { name: 'Aの名前を編集', exact: true }).click();
  await page.getByLabel('新しい名前').fill('あおい');
  await page.getByRole('button', { name: '名前を保存', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('京都旅行');
  await expect(page.getByTestId('member-list')).toContainText('あおい');
  await expect(page.getByRole('button', { name: 'Aの名前を編集', exact: true })).toHaveCount(0);
});

test('deliberately removed members and a blank saved event are never refilled', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bを削除', exact: true }).click();
  await page.reload();
  await expect(page.getByTestId('member-list').locator('li')).toHaveCount(1);
  await expect(page.getByTestId('member-list')).toContainText('A');
  await page.getByRole('button', { name: 'Aを削除', exact: true }).click();
  await page.getByLabel('イベント名', { exact: true }).fill('');
  await page.reload();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('');
  await expect(page.getByTestId('member-list')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '支払いを記録する', exact: true })).toBeDisabled();
});
