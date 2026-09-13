import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('all pages and confirmation expose accessible names and readable text', async ({
  page,
}, testInfo) => {
  const scan = async (name: string) => {
    // Inspect the settled UI, rather than sampling toast/dialog fade transitions.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter(
                (animation) =>
                  animation.playState === 'running' &&
                  animation.effect?.getTiming().iterations !== Infinity,
              ).length,
        ),
      )
      .toBe(0);
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    await testInfo.attach(`accessibility-${name}`, {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });
    expect
      .soft(
        report.violations.map(({ id, nodes }) => ({
          id,
          nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
        })),
        name,
      )
      .toEqual([]);
  };
  await page.goto('/');
  await expect(page.getByLabel('イベント名', { exact: true })).toBeVisible();
  await scan('members');
  await page.getByLabel('イベント名', { exact: true }).fill('週末の京都旅行');
  for (const name of ['あおい', 'はる', 'りく']) {
    await page.getByLabel('メンバーの名前', { exact: true }).fill(name);
    await page.getByRole('button', { name: '追加', exact: true }).click();
  }
  await scan('members-populated');
  await page.getByRole('link', { name: '支払いを記録する', exact: true }).click();
  await expect(page.getByLabel('金額', { exact: true })).toBeVisible();
  await scan('payments-empty');
  await page.getByLabel('金額', { exact: true }).fill('12800');
  await page.getByLabel('宿泊', { exact: true }).click();
  await scan('payments');
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await expect(page.getByTestId('payment-list')).toBeVisible();
  await scan('payment-history');
  await page.getByRole('link', { name: '精算結果を見る' }).click();
  await expect(page.getByTestId('transfer-list')).toBeVisible();
  await scan('result');
  await page.getByRole('button', { name: '新しく始める' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await scan('confirmation');
});
