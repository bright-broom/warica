import { goToStep } from './page-arrows';
import { savedEmptyEvent } from './saved-empty-event';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DRAFT_KEY, emptyWorkspace, serializeDraft } from '../../src/lib/payment-draft';
import { STORAGE_KEY } from '../../src/lib/storage';

test.use({ storageState: savedEmptyEvent });

async function setup(page: Page) {
  await page.goto('/');
  await page.getByLabel('イベント名', { exact: true }).fill('旅行');
  for (const name of ['あおい', 'はる', 'りく']) {
    await page.getByLabel('メンバーの名前', { exact: true }).fill(name);
    await page.getByRole('button', { name: '追加', exact: true }).click();
  }
  await page.getByRole('link', { name: '支払いを記録する', exact: true }).click();
}

for (const restored of [false, true]) {
  test(`a removed payer never silently becomes someone else (${restored ? 'legacy draft' : 'new input'})`, async ({
    page,
  }) => {
    await setup(page);
    if (restored) {
      const stamp = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).data.lastUpdated,
        STORAGE_KEY,
      );
      const workspace = emptyWorkspace();
      workspace.draft.amount = '3001';
      workspace.draft.memo = '入力途中';
      await page.evaluate(({ key, raw }) => sessionStorage.setItem(key, raw), {
        key: DRAFT_KEY,
        raw: serializeDraft(workspace, stamp),
      });
      await page.reload();
    } else {
      await page.getByLabel('金額', { exact: true }).fill('3001');
      await page.getByLabel('何の支払い？').fill('入力途中');
    }
    await goToStep(page, '/');
    await page.getByRole('button', { name: 'あおいを削除', exact: true }).click();
    await goToStep(page, '/payments');
    const submit = page.getByRole('button', { name: 'この支払いを追加する', exact: true });
    await expect(page.getByLabel('支払った人', { exact: true })).toHaveValue('');
    await expect(submit).toBeDisabled();
    await page.reload();
    await expect(page.getByLabel('金額', { exact: true })).toHaveValue('3001');
    await expect(page.getByLabel('何の支払い？')).toHaveValue('入力途中');
    await expect(page.getByLabel('支払った人', { exact: true })).toHaveValue('');
    await page.getByLabel('支払った人', { exact: true }).selectOption({ label: 'はる' });
    if (!restored) {
      const report = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(report.violations).toEqual([]);
    }
    await expect(submit).toBeDisabled();
    // An implicit form submission must not filter invalid IDs and bypass the review.
    await page
      .locator('#payment-editor form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect(page.getByTestId('payment-list')).toHaveCount(0);
    await page.getByRole('button', { name: '対象者の変更を確認', exact: true }).click();
    await expect(submit).toBeEnabled();
    await submit.click();
    const row = page.getByTestId('payment-list').locator('li');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('支払者：はる');
    await expect(row).toContainText('対象：はる、りく');
    await expect(row).toContainText('¥3,001');
  });
}

test('adding a member cannot change an in-progress split or the remembered next-entry selection', async ({
  page,
}) => {
  await setup(page);
  await page.getByLabel('金額', { exact: true }).fill('3000');
  await goToStep(page, '/');
  await page.getByLabel('メンバーの名前', { exact: true }).fill('そら');
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await goToStep(page, '/payments');
  await expect(page.getByRole('checkbox', { name: 'そら', exact: true })).not.toBeChecked();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'そら', exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'この支払いを追加する', exact: true }).click();
  await expect(page.getByTestId('payment-list')).not.toContainText('そら');
  await expect(page.getByRole('checkbox', { name: 'そら', exact: true })).not.toBeChecked();
  await page.getByRole('link', { name: '精算結果を見る', exact: true }).click();
  await expect(page.getByTestId('balance-row').filter({ hasText: 'そら' })).toContainText(
    '精算不要',
  );
});

test('editing a saved payment cannot hide an invalid member selection in the separate new draft', async ({
  page,
}) => {
  await setup(page);
  await page.getByLabel('支払った人', { exact: true }).selectOption({ label: 'りく' });
  await page.getByRole('button', { name: '全員の選択を解除', exact: true }).click();
  await page.getByRole('checkbox', { name: 'りく', exact: true }).check();
  await page.getByLabel('金額', { exact: true }).fill('1000');
  await page.getByLabel('何の支払い？').fill('登録済み');
  await page.getByRole('button', { name: 'この支払いを追加する', exact: true }).click();
  await page.getByLabel('支払った人', { exact: true }).selectOption({ label: 'あおい' });
  await page.getByRole('button', { name: '全員を選択', exact: true }).click();
  await page.getByLabel('金額', { exact: true }).fill('777');
  await page.getByLabel('何の支払い？').fill('次の支払い');
  await page.getByRole('button', { name: '登録済みを編集', exact: true }).click();
  await goToStep(page, '/');
  await page.getByRole('button', { name: 'あおいを削除', exact: true }).click();
  await goToStep(page, '/payments');
  await expect(page.getByLabel('何の支払い？')).toHaveValue('登録済み');
  await page.reload();
  await expect(page.getByLabel('何の支払い？')).toHaveValue('登録済み');
  await page.getByLabel('金額', { exact: true }).fill('2000');
  await page.getByRole('button', { name: '変更を保存する', exact: true }).click();
  await expect(page.getByTestId('payment-list')).toContainText('¥2,000');
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('777');
  await expect(page.getByLabel('何の支払い？')).toHaveValue('次の支払い');
  await expect(page.getByLabel('支払った人', { exact: true })).toHaveValue('');
  await expect(
    page.getByRole('button', { name: 'この支払いを追加する', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: '対象者の変更を確認', exact: true })).toBeVisible();
});
