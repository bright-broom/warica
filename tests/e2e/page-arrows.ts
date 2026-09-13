import { expect, type Page } from '@playwright/test';

/** Exercise the same in-page arrows on phones and desktop, without relying on the sidebar. */
export async function goToStep(page: Page, destination: '/' | '/payments' | '/result') {
  for (let hop = 0; hop < 2; hop++) {
    const current = new URL(page.url()).pathname;
    if (current === destination) return;
    const [label, next] =
      current === '/result'
        ? ['支払いを追加・編集する', '/payments']
        : current === '/'
          ? ['支払いを記録する', '/payments']
          : destination === '/'
            ? ['メンバーに戻る', '/']
            : ['精算結果を見る', '/result'];
    await page.getByRole('main').getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new URL(next, page.url()).href);
  }
  expect(new URL(page.url()).pathname).toBe(destination);
}
