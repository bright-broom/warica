import { expect, test, type Page } from '@playwright/test';
import { serializeState } from '../../src/lib/storage';
import { emptyState } from '../../src/lib/types';
const key = 'warican-app-data-v2';
async function offerBackup(page: Page, raw: string) {
  await page.getByLabel('バックアップファイル').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(raw),
  });
}
async function setup(page: Page) {
  await page.goto('/');
  await page.getByLabel('イベント名', { exact: true }).fill('週末の京都旅行');
  for (const name of ['あおい', 'はる', 'りく']) {
    await page.getByLabel('メンバーの名前', { exact: true }).fill(name);
    await page.getByRole('button', { name: '追加', exact: true }).click();
  }
  await page.getByRole('link', { name: '支払いを記録する', exact: true }).click();
  await expect(page).toHaveURL(/\/payments$/);
}
async function menu(page: Page, action: string) {
  await page.getByRole('button', { name: 'メニュー', exact: true }).click();
  await page.getByRole('menuitem', { name: action, exact: true }).click();
}
async function denyLocalWrites(page: Page) {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.defineProperty(window, '__restoreWrites', {
      configurable: true,
      value: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = function (key, value) {
      if (this === window.localStorage) throw new DOMException('Quota', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test('complete flow: selected participants, immediate reload, edit, copy fallback and backup', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await setup(page);
  await page.getByLabel('金額', { exact: true }).fill('3000');
  await page.getByLabel('何の支払い？').fill('ランチ');
  await page.getByRole('checkbox', { name: 'あおい', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'りく', exact: true }).uncheck();
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await page.getByRole('link', { name: '精算結果を見る' }).click();
  await expect(page).toHaveURL(/\/result$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: '精算', exact: true })).toBeVisible();
  const transfer = page.getByTestId('transfer-list').locator('li');
  await expect(transfer).toHaveCount(1);
  await expect(transfer).toContainText('はる');
  await expect(transfer).toContainText('あおい');
  await expect(transfer).toContainText('¥3,000');
  await expect(page.getByTestId('balance-row').filter({ hasText: 'りく' })).toContainText(
    '精算不要',
  );
  await noOverflow(page);

  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    }),
  );
  await page.getByRole('button', { name: '送金一覧を一括コピー' }).click();
  await expect(page.getByLabel('共有用テキスト')).toHaveValue(/はる → あおい：¥3,000/);

  await page.getByRole('link', { name: '支払いを追加・編集する' }).click();
  await page.getByRole('button', { name: 'ランチを編集' }).click();
  await page.getByLabel('金額', { exact: true }).fill('1001');
  await page.getByRole('checkbox', { name: 'あおい', exact: true }).check();
  await page.getByRole('button', { name: '変更を保存する' }).click();
  await expect(page.getByTestId('payment-list').locator('li')).toHaveCount(1);
  await expect(page.getByTestId('payment-list').locator('li')).toContainText('¥1,001');
  await page.getByRole('link', { name: '精算結果を見る' }).click();
  await expect(page.getByTestId('transfer-list').locator('li')).toContainText('¥500');

  await denyLocalWrites(page);
  await menu(page, 'リフレッシュ');
  await expect(page.locator('main [role=alert]')).toContainText('保存できません');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'バックアップ', exact: true }).click();
  const file = await downloading;
  const backupPath = await file.path();
  expect(backupPath).toBeTruthy();
  await page.evaluate(() =>
    (window as unknown as { __restoreWrites: () => void }).__restoreWrites(),
  );
  await page.getByRole('button', { name: '保存を再試行' }).click();
  await offerBackup(page, serializeState(emptyState()));
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '読み込む', exact: true })
    .click();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('');
  await page.reload();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('');
  await page.getByLabel('バックアップファイル').setInputFiles(backupPath!);
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '読み込む', exact: true })
    .click();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('週末の京都旅行');
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('validation preserves rejected input and protects members referenced by payments', async ({
  page,
}) => {
  await setup(page);
  await page.getByLabel('金額', { exact: true }).fill('1.5');
  await expect(page.getByRole('button', { name: 'この支払いを追加する' })).toBeDisabled();
  await page.getByLabel('金額', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await expect(page.getByTestId('payment-list').locator('li')).toHaveCount(1);
  await page.getByRole('link', { name: 'メンバーに戻る' }).click();
  await page.getByLabel('メンバーの名前', { exact: true }).fill('あおい');
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await expect(page.getByLabel('メンバーの名前', { exact: true })).toHaveValue('あおい');
  await expect(page.locator('main [role=alert]')).toContainText('同じ名前');
  await page.getByRole('button', { name: 'はるを削除' }).click();
  await expect(page.locator('main [role=alert]')).toContainText('支払いに含まれる');
  await expect(page.getByTestId('member-list').locator('li')).toHaveCount(3);
  await page.getByRole('button', { name: 'あおいの名前を編集' }).click();
  await page.getByLabel('新しい名前').fill('あおいさん');
  await page.getByRole('button', { name: '名前を保存' }).click();
  await noOverflow(page);
});

test('denied saves retain input across routes, retry persists it', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('イベント名', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.defineProperty(window, '__restoreStorage', {
      value: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota', 'QuotaExceededError');
    };
  });
  await page.getByLabel('イベント名', { exact: true }).fill('未保存の旅行');
  for (const name of ['A', 'B']) {
    await page.getByLabel('メンバーの名前', { exact: true }).fill(name);
    await page.getByRole('button', { name: '追加', exact: true }).click();
  }
  await expect(page.locator('main [role=alert]')).toContainText('保存できません');
  await page.getByRole('link', { name: '支払いを記録する' }).click();
  await expect(page.getByLabel('支払った人')).toHaveValue(/.+/);
  await page.getByRole('link', { name: 'メンバーに戻る' }).click();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('未保存の旅行');
  await page.evaluate(() =>
    (window as unknown as { __restoreStorage: () => void }).__restoreStorage(),
  );
  await page.getByRole('button', { name: '保存を再試行' }).click();
  await expect(page.locator('main [role=alert]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('未保存の旅行');
  await expect(page.getByTestId('member-list').locator('li')).toHaveCount(2);
});

test('unreadable data is retained and direct result navigation does not claim settlement', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate((storageKey) => localStorage.setItem(storageKey, '{bad'), key);
  await page.reload();
  await expect(page.getByRole('heading', { name: '保存データを確認してください' })).toBeVisible();
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe('{bad');
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveCount(0);
  await page.evaluate(() => localStorage.clear());
  await page.getByRole('button', { name: '保存を再試行' }).click();
  await expect(page.getByLabel('イベント名', { exact: true })).toBeVisible();
  await page.goto('/result');
  await expect(page.getByRole('heading', { name: '支払い未登録' })).toBeVisible();
  await expect(page.getByText('送金は不要です', { exact: true })).toHaveCount(0);
  await noOverflow(page);
});

test('empty and populated screens fit the viewport with long names', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'メンバー', exact: true, level: 1 }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-home.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByLabel('イベント名', { exact: true }).fill('長いイベント名'.repeat(6));
  for (const name of ['とても長い名前のメンバーあいうえお', 'VeryLongMemberNameAB']) {
    await page.getByLabel('メンバーの名前', { exact: true }).fill(name);
    await page.getByRole('button', { name: '追加', exact: true }).click();
  }
  await noOverflow(page);
  await page.getByRole('link', { name: '支払いを記録する' }).click();
  await page.getByLabel('金額', { exact: true }).fill('1000000');
  await page.getByLabel('何の支払い？').fill('長い支払いのメモ'.repeat(10));
  await noOverflow(page);
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await noOverflow(page);
  await page.getByRole('link', { name: '精算結果を見る' }).click();
  await expect(page.getByRole('heading', { name: '精算', exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-result.png`,
    fullPage: true,
    animations: 'disabled',
  });
});

test('clipboard success, deletion cancellation and stale-tab protection', async ({
  page,
  context,
  browserName,
}) => {
  // WebKit writes from the click gesture; it only exposes a clipboard-read permission.
  await context.grantPermissions(
    browserName === 'webkit' ? ['clipboard-read'] : ['clipboard-read', 'clipboard-write'],
  );
  await setup(page);
  await page.getByLabel('金額', { exact: true }).fill('3000');
  await page.getByLabel('何の支払い？').fill('ホテル');
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await page.getByRole('button', { name: 'ホテルを削除' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'キャンセル' }).click();
  await expect(page.getByTestId('payment-list').locator('li')).toHaveCount(1);
  await page.getByRole('link', { name: '精算結果を見る' }).click();
  await page.getByRole('button', { name: '送金一覧を一括コピー' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'コピーしました。LINEに貼り付けて送れます。' }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    '週末の京都旅行｜精算結果\n合計 ¥3,000 / 3人 / 1件\n\nはる → あおい：¥1,000\nりく → あおい：¥1,000',
  );
  await page.getByRole('link', { name: 'メンバー', exact: true }).click();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('週末の京都旅行');
  const stale = await context.newPage();
  await stale.goto('/');
  await expect(stale.getByLabel('イベント名', { exact: true })).toHaveValue('週末の京都旅行');
  await page.getByLabel('イベント名', { exact: true }).fill('先に保存した旅行');
  await stale.getByLabel('イベント名', { exact: true }).fill('別タブの入力');
  await expect(stale.locator('main [role=alert]')).toContainText('別の画面で保存データが変更');
  await expect(stale.getByLabel('イベント名', { exact: true })).toHaveValue('別タブの入力');
  expect(
    await page.evaluate(
      (storageKey) => JSON.parse(localStorage.getItem(storageKey)!).data.eventName,
      key,
    ),
  ).toBe('先に保存した旅行');
  await stale.close();
});

test('denied storage access at startup can recover without overwriting data', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
    Object.defineProperty(window, '__restoreStorage', {
      value: () => Object.defineProperty(window, 'localStorage', original),
    });
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Denied', 'SecurityError');
      },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '保存データを確認してください' })).toBeVisible();
  await expect(page.locator('main [role=alert]')).toContainText('アクセスできません');
  await page.evaluate(() =>
    (window as unknown as { __restoreStorage: () => void }).__restoreStorage(),
  );
  await page.getByRole('button', { name: '保存を再試行' }).click();
  await expect(page.getByLabel('イベント名', { exact: true })).toBeVisible();
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBeNull();
});

test('a user-confirmed backup can recover an otherwise unreadable event', async ({ page }) => {
  await setup(page);
  await page.getByLabel('金額', { exact: true }).fill('999');
  const backup = await page.evaluate((storageKey) => localStorage.getItem(storageKey)!, key);
  await page.evaluate((storageKey) => {
    localStorage.setItem(storageKey, '{broken');
    localStorage.setItem('warican-backup-v2', '{broken too');
  }, key);
  await page.reload();
  await expect(page.getByRole('heading', { name: '保存データを確認してください' })).toBeVisible();
  await expect(page.getByRole('button', { name: '読み込む', exact: true })).toBeEnabled();
  await page.getByLabel('バックアップファイル').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup),
  });
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '読み込む', exact: true })
    .click();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('週末の京都旅行');
  await expect(page.getByTestId('member-list').locator('li')).toHaveCount(3);
  await page.reload();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('週末の京都旅行');
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
});

test('all routes inherit the shared theme and keep a single persistent shell', async ({ page }) => {
  await setup(page);
  await page.addStyleTag({ content: '* { transition: none !important; }' });
  await page.getByRole('link', { name: 'メンバーに戻る' }).click();
  await expect(page.getByTestId('app-shell')).toHaveCount(1);
  await page
    .getByTestId('app-shell')
    .evaluate((shell) => shell.setAttribute('data-persisted', 'yes'));
  const primary = page.getByRole('link', { name: '支払いを記録する', exact: true });
  await page.mouse.move(0, 0);
  const originalColor = await primary.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--brand-accent', 'var(--brand-main)');
  });
  await expect
    .poll(() => primary.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe(originalColor);
  const inheritedColor = await primary.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await primary.click();
  await page.getByLabel('金額', { exact: true }).fill('1001');
  const add = page.getByRole('button', { name: 'この支払いを追加する' });
  await page.mouse.move(0, 0);
  await expect(add).toHaveCSS('background-color', inheritedColor);
  await add.click();
  await page.getByRole('link', { name: '精算結果を見る' }).click();
  await page.mouse.move(0, 0);
  await expect(page.getByRole('button', { name: '送金一覧を一括コピー' })).toHaveCSS(
    'background-color',
    inheritedColor,
  );
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-persisted', 'yes');
  await expect(page.getByRole('main')).toHaveCount(1);
  await page.getByRole('link', { name: 'メンバー', exact: true }).click();
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-persisted', 'yes');
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('週末の京都旅行');
});

test('payment drafts survive route changes and continuous entry keeps payer and participants', async ({
  page,
  isMobile,
}) => {
  await setup(page);
  if (isMobile) {
    await page
      .getByRole('button', { name: 'この支払いを追加する' })
      .evaluate((element) => element.scrollIntoView({ block: 'center' }));
    const submit = await page.getByRole('button', { name: 'この支払いを追加する' }).boundingBox();
    const dock = await page.getByRole('navigation', { name: '割り勘の手順' }).boundingBox();
    expect(submit && dock && submit.y + submit.height <= dock.y).toBeTruthy();
  }
  await page.getByLabel('支払った人').selectOption({ label: 'はる' });
  await page.getByLabel('金額', { exact: true }).fill('１２，８００');
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('12800');
  await page.getByLabel('金額', { exact: true }).press('Enter');
  await expect(page.getByLabel('何の支払い？')).toBeFocused();
  await page.getByLabel('宿泊', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'りく', exact: true }).uncheck();
  await page.getByRole('link', { name: 'メンバー', exact: true }).click();
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await expect(page).toHaveURL(/\/payments$/);
  await page.reload();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('12800');
  await expect(page.getByLabel('何の支払い？')).toHaveValue('宿泊');
  await expect(page.getByRole('checkbox', { name: 'りく', exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await expect(
    page.getByRole('region', { name: /通知/ }).getByText('¥12,800 追加しました'),
  ).toBeVisible();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('金額', { exact: true })).toBeFocused();
  await expect(page.getByLabel('支払った人').locator('option:checked')).toHaveText('はる');
  await expect(page.getByRole('checkbox', { name: 'りく', exact: true })).not.toBeChecked();
  await page.getByLabel('金額', { exact: true }).fill('500');
  await page.getByLabel('何の支払い？').fill('次の支払い');
  await page.getByRole('button', { name: '宿泊を編集', exact: true }).click();
  await page.getByLabel('金額', { exact: true }).fill('12000');
  await page.getByRole('link', { name: '精算結果', exact: true }).click();
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await menu(page, 'リフレッシュ');
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('12000');
  await page.getByRole('button', { name: '編集をキャンセル', exact: true }).click();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('500');
  await expect(page.getByLabel('何の支払い？')).toHaveValue('次の支払い');
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await expect(page.getByTestId('payment-list').locator('li')).toHaveCount(2);
  await noOverflow(page);
});

test('replacing an event clears drafts and individual transfers can be copied with a fallback', async ({
  page,
  context,
  browserName,
}) => {
  // WebKit writes from the click gesture; it only exposes a clipboard-read permission.
  await context.grantPermissions(
    browserName === 'webkit' ? ['clipboard-read'] : ['clipboard-read', 'clipboard-write'],
  );
  await setup(page);
  const backup = await page.evaluate((storageKey) => localStorage.getItem(storageKey)!, key);
  await page.getByLabel('金額', { exact: true }).fill('999');
  await page.getByLabel('バックアップファイル').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup),
  });
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '読み込む', exact: true })
    .click();
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
  await page.getByLabel('金額', { exact: true }).fill('3000');
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await page.getByRole('link', { name: '精算結果', exact: true }).click();
  await page.getByRole('button', { name: 'はるからあおいへの送金をコピー' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    '週末の京都旅行\nはる → あおい：¥1,000',
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    }),
  );
  await page.getByRole('button', { name: 'りくからあおいへの送金をコピー' }).click();
  await expect(page.getByLabel('共有用テキスト')).toHaveValue(
    '週末の京都旅行\nりく → あおい：¥1,000',
  );
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await page.getByLabel('金額', { exact: true }).fill('800');
  await offerBackup(page, serializeState(emptyState()));
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '読み込む', exact: true })
    .click();
  await page.getByLabel('イベント名', { exact: true }).fill('新しい集まり');
  for (const name of ['A', 'B']) {
    await page.getByLabel('メンバーの名前', { exact: true }).fill(name);
    await page.getByRole('button', { name: '追加', exact: true }).click();
  }
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await expect(page).toHaveURL(/\/payments$/);
  await page.reload();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
  await expect(page.locator('footer')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole('navigation', { name: '割り勘の手順' })).toBeInViewport();
  await noOverflow(page);
});

test('shadcn controls support keyboard selection, help, tooltips and safe confirmation focus', async ({
  page,
  context,
}) => {
  await setup(page);
  const choice = page.getByLabel('宿泊', { exact: true });
  const choiceBox = await choice.boundingBox();
  expect(choiceBox?.width).toBeGreaterThanOrEqual(44);
  expect(choiceBox?.height).toBeGreaterThanOrEqual(44);
  await choice.click();
  await expect(choice).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByLabel('何の支払い？')).toHaveValue('宿泊');
  const participant = page.getByRole('checkbox', { name: 'あおい', exact: true });
  await participant.focus();
  await participant.press('Space');
  await expect(participant).not.toBeChecked();
  await participant.press('Space');
  await expect(participant).toBeChecked();
  const help = page.getByRole('button', { name: '計算ルール', exact: true });
  await help.click();
  await expect(help).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByText('端数は対象者の登録順に1円ずつ配分。金額は1〜1,000,000円の整数。'),
  ).toBeVisible();
  await help.click();
  await expect(help).toHaveAttribute('aria-expanded', 'false');
  const other = await context.newPage();
  await other.goto('/');
  await other.getByLabel('イベント名', { exact: true }).fill('別タブのイベント');
  await expect(
    page.getByRole('button', { name: '最新の保存データを読み込む', exact: true }),
  ).toBeVisible();
  await other.close();
  const trigger = page.getByRole('button', { name: 'メニュー', exact: true });
  await trigger.focus();
  await trigger.press('Enter');
  await page.getByRole('menuitem', { name: 'リフレッシュ', exact: true }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('alertdialog', { name: '最新の保存データ' });
  await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeFocused();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel('金額', { exact: true })).toBeVisible();
  await noOverflow(page);
});

test('refresh keeps data and failed draft saves retain inputs until retry', async ({ page }) => {
  await setup(page);
  await expect(page.locator('footer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'バックアップ', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '読み込む', exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.defineProperty(window, '__restoreDraft', {
      value: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = function (key, value) {
      if (this === window.sessionStorage) throw new DOMException('Quota', 'QuotaExceededError');
      original.call(this, key, value);
    };
    document.documentElement.dataset.beforeRefresh = 'yes';
  });
  await page.getByLabel('金額', { exact: true }).fill('1.5');
  await page.getByLabel('何の支払い？').fill('まだ入力途中');
  await expect(page.locator('main [role=alert]')).toContainText('下書きを保存できません');
  await menu(page, 'リフレッシュ');
  await expect(page.locator('html')).toHaveAttribute('data-before-refresh', 'yes');
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('1.5');
  await page.getByRole('link', { name: 'メンバー', exact: true }).click();
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await expect(page.getByLabel('何の支払い？')).toHaveValue('まだ入力途中');
  await page.evaluate(() => (window as unknown as { __restoreDraft: () => void }).__restoreDraft());
  await menu(page, 'リフレッシュ');
  await expect(page.locator('html')).not.toHaveAttribute('data-before-refresh', 'yes');
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('1.5');
  await expect(page.getByLabel('何の支払い？')).toHaveValue('まだ入力途中');
  await expect(page.locator('main [role=alert]')).toHaveCount(0);
});

test('unreadable draft storage can be retried without overwriting the saved draft', async ({
  page,
}) => {
  await setup(page);
  await page.getByLabel('金額', { exact: true }).fill('750');
  await page.addInitScript(() => {
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage')!;
    Object.defineProperty(window, '__restoreDraftRead', {
      value: () => Object.defineProperty(window, 'sessionStorage', original),
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('Denied', 'SecurityError');
      },
    });
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: '下書きを確認してください' })).toBeVisible();
  await expect(page.getByLabel('金額', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'メンバー', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveCount(0);
  await page.evaluate(() =>
    (window as unknown as { __restoreDraftRead: () => void }).__restoreDraftRead(),
  );
  await page.getByRole('button', { name: '保存を再試行' }).click();
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('750');
  await expect(page.locator('main [role=alert]')).toHaveCount(0);
});

test('mobile actions stay in the right half with usable touch targets', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Right hand layout applies to phones.');
  async function rightHandActions() {
    const controls = page.locator(
      'button:visible, [role="checkbox"]:visible, [role="radio"]:visible, nav a:visible, a[data-slot="button"]:visible',
    );
    const targets = await controls.evaluateAll((elements) =>
      elements.map((element) => ({
        box: element.getBoundingClientRect().toJSON(),
        label: element.getAttribute('aria-label') || element.textContent,
      })),
    );
    expect(targets.length).toBeGreaterThan(0);
    for (const { box, label } of targets) {
      expect(box!.x + box!.width / 2, label || 'right half').toBeGreaterThanOrEqual(
        page.viewportSize()!.width / 2,
      );
      expect(box!.width, label || 'touch width').toBeGreaterThanOrEqual(44);
      expect(box!.height, label || 'touch height').toBeGreaterThanOrEqual(44);
    }
    await noOverflow(page);
  }
  await setup(page);
  const main = await page.getByRole('main').boundingBox();
  const dock = await page.getByRole('navigation', { name: '割り勘の手順' }).boundingBox();
  expect(main && dock && main.y + main.height <= dock.y).toBeTruthy();
  await rightHandActions();
  await page.getByRole('link', { name: 'メンバー', exact: true }).click();
  await expect(page.getByLabel('メンバーの名前', { exact: true })).toBeVisible();
  await rightHandActions();
  await page.getByRole('button', { name: 'あおいの名前を編集' }).click();
  await rightHandActions();
  await page.getByRole('button', { name: '編集をキャンセル' }).click();
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await page.getByLabel('金額', { exact: true }).fill('3000');
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await rightHandActions();
  await page.getByRole('link', { name: '精算結果を見る' }).click();
  await expect(page.getByTestId('transfer-list')).toBeVisible();
  await rightHandActions();
  await page
    .getByRole('button', { name: /PayPay請求リンクを登録/ })
    .first()
    .click();
  await rightHandActions();
  await page
    .getByLabel('PayPay請求リンク', { exact: true })
    .fill('https://www.paypay.ne.jp/example');
  await page.getByRole('button', { name: 'リンク編集をキャンセル' }).click();
  await offerBackup(page, serializeState(emptyState()));
  await rightHandActions();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'キャンセル', exact: true })
    .click();
});

for (const failure of ['quota', 'stale'] as const) {
  test(`failed backup replacement preserves the current event and draft (${failure})`, async ({
    page,
    context,
  }) => {
    await setup(page);
    const imported = await page.evaluate((storageKey) => localStorage.getItem(storageKey)!, key);
    await page.getByRole('link', { name: 'メンバー', exact: true }).click();
    await page.getByLabel('イベント名', { exact: true }).fill('現在のイベント');
    await page.getByRole('link', { name: '支払い', exact: true }).click();
    await page.getByLabel('金額', { exact: true }).fill('3000');
    await page.getByLabel('何の支払い？').fill('登録済み');
    await page.getByRole('button', { name: 'この支払いを追加する' }).click();
    await expect(page.getByTestId('payment-list').locator('li')).toHaveCount(1);
    await page.getByLabel('金額', { exact: true }).fill('777');
    await page.getByLabel('何の支払い？').fill('入力途中');
    const draft = await page.evaluate(() => sessionStorage.getItem('warica-payment-draft-v1'));
    const saved = await page.evaluate((storageKey) => localStorage.getItem(storageKey)!, key);
    let latest = saved;
    if (failure === 'quota') await denyLocalWrites(page);
    else {
      const other = await context.newPage();
      await other.goto('/');
      await other.getByLabel('イベント名', { exact: true }).fill('別タブの更新');
      latest = await other.evaluate((storageKey) => localStorage.getItem(storageKey)!, key);
      await other.close();
    }
    await page.getByLabel('バックアップファイル').setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(imported),
    });
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: '読み込む', exact: true })
      .click();
    await expect(page.locator('main [role=alert]')).toContainText(
      failure === 'quota' ? '保存できません' : '別の画面',
    );
    await expect(page).toHaveURL(/\/payments$/);
    await expect(page.getByLabel('金額', { exact: true })).toHaveValue('777');
    await expect(page.getByLabel('何の支払い？')).toHaveValue('入力途中');
    await expect(page.getByTestId('payment-list').locator('li')).toContainText('登録済み');
    expect(await page.evaluate(() => sessionStorage.getItem('warica-payment-draft-v1'))).toBe(
      draft,
    );
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(latest);
    await expect(page.getByText('バックアップを読み込みました。', { exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'メンバー', exact: true }).click();
    await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('現在のイベント');
    if (failure === 'quota') {
      await page.evaluate(() =>
        (window as unknown as { __restoreWrites: () => void }).__restoreWrites(),
      );
      await page.getByRole('button', { name: '保存を再試行' }).click();
      await page.reload();
      await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('現在のイベント');
      await page.getByRole('link', { name: '支払い', exact: true }).click();
      await expect(page.getByLabel('金額', { exact: true })).toHaveValue('777');
      await page.getByLabel('バックアップファイル').setInputFiles({
        name: 'backup.json',
        mimeType: 'application/json',
        buffer: Buffer.from(imported),
      });
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: '読み込む', exact: true })
        .click();
      await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('週末の京都旅行');
      await page.reload();
      await page.getByRole('link', { name: '支払い', exact: true }).click();
      await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
      await expect(page.getByTestId('payment-list')).toHaveCount(0);
    }
  });
}

test('backup recovery invalidates old drafts even when session storage cannot be cleared', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-09-13T00:00:00.000Z'));
  await setup(page);
  const backup = await page.evaluate((storageKey) => localStorage.getItem(storageKey)!, key);
  await page.getByLabel('金額', { exact: true }).fill('999');
  const oldDraft = await page.evaluate(() => sessionStorage.getItem('warica-payment-draft-v1'));
  await page.evaluate((storageKey) => {
    localStorage.setItem(storageKey, '{broken');
    localStorage.setItem('warican-backup-v2', '{broken too');
  }, key);
  await page.reload();
  await expect(page.getByRole('heading', { name: '保存データを確認してください' })).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === window.sessionStorage) throw new DOMException('Quota', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.getByLabel('バックアップファイル').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup),
  });
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '読み込む', exact: true })
    .click();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('週末の京都旅行');
  await expect(page.locator('main [role=alert]')).toContainText('下書きを保存できません');
  expect(await page.evaluate(() => sessionStorage.getItem('warica-payment-draft-v1'))).toBe(
    oldDraft,
  );
  const restoredStamp = await page.evaluate(
    (storageKey) => JSON.parse(localStorage.getItem(storageKey)!).data.lastUpdated,
    key,
  );
  expect(restoredStamp).not.toBe(JSON.parse(backup).data.lastUpdated);
  page.once('dialog', (dialog) => dialog.accept());
  await page.reload();
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
  await expect(page.locator('main [role=alert]')).toHaveCount(0);
});

test('a failed refresh keeps the event and both new and editing drafts', async ({ page }) => {
  await setup(page);
  await page.getByLabel('金額', { exact: true }).fill('3000');
  await page.getByLabel('何の支払い？').fill('ランチ');
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await page.getByLabel('金額', { exact: true }).fill('777');
  await page.getByRole('button', { name: 'ランチを編集' }).click();
  await page.getByLabel('金額', { exact: true }).fill('1234');
  const saved = await page.evaluate((storageKey) => localStorage.getItem(storageKey), key);
  const draft = await page.evaluate(() => sessionStorage.getItem('warica-payment-draft-v1'));
  await denyLocalWrites(page);
  await menu(page, 'リフレッシュ');
  await expect(page.locator('main [role=alert]')).toContainText('保存できません');
  await expect(page).toHaveURL(/\/payments$/);
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('1234');
  await expect(page.getByTestId('payment-list').locator('li')).toContainText('¥3,000');
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(saved);
  expect(await page.evaluate(() => sessionStorage.getItem('warica-payment-draft-v1'))).toBe(draft);
  await page.getByRole('button', { name: '編集をキャンセル', exact: true }).click();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('777');
});

test('a storage conflict can be cancelled or resolved using the latest saved event without writing over it', async ({
  page,
  context,
}) => {
  await setup(page);
  await page.getByLabel('金額', { exact: true }).fill('777');
  await page.getByLabel('何の支払い？').fill('このタブの下書き');
  const other = await context.newPage();
  await other.goto('/');
  await other.getByLabel('イベント名', { exact: true }).fill('別タブのイベント');
  await page.getByRole('link', { name: 'メンバー', exact: true }).click();
  await page.getByLabel('イベント名', { exact: true }).fill('このタブの未保存変更');
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  const draft = await page.evaluate(() => sessionStorage.getItem('warica-payment-draft-v1'));
  await expect(page.locator('main [role=alert]')).toContainText('別の画面');
  await menu(page, 'リフレッシュ');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('最新の保存データ');
  await dialog.getByRole('button', { name: 'キャンセル', exact: true }).click();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('777');
  expect(await page.evaluate(() => sessionStorage.getItem('warica-payment-draft-v1'))).toBe(draft);
  await page.getByRole('button', { name: '最新の保存データを読み込む', exact: true }).click();
  // Re-read after confirmation, not when the confirmation was opened.
  await other.getByLabel('イベント名', { exact: true }).fill('確認中の最新更新');
  const latest = await other.evaluate((storageKey) => localStorage.getItem(storageKey), key);
  await denyLocalWrites(page);
  await dialog.getByRole('button', { name: '最新を読み込む', exact: true }).click();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('確認中の最新更新');
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(latest);
  await expect(page.locator('main [role=alert]')).toHaveCount(0);
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
  await page.reload();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
  await other.close();
});

for (const failure of ['unreadable', 'draft-deletion'] as const) {
  test(`conflict recovery keeps local input when preparation fails (${failure})`, async ({
    page,
    context,
  }) => {
    await setup(page);
    await page.getByLabel('金額', { exact: true }).fill('888');
    const draft = await page.evaluate(() => sessionStorage.getItem('warica-payment-draft-v1'));
    const other = await context.newPage();
    await other.goto('/');
    await other.getByLabel('イベント名', { exact: true }).fill('保存済みの最新イベント');
    // Detect another tab without requiring a local edit or a failed save first.
    await expect(page.locator('main [role=alert]')).toContainText('別の画面');
    await expect(page.getByLabel('金額', { exact: true })).toHaveValue('888');
    const latest = await other.evaluate((storageKey) => localStorage.getItem(storageKey), key);
    await page.evaluate((mode) => {
      const get = Storage.prototype.getItem;
      const remove = Storage.prototype.removeItem;
      Object.defineProperty(window, '__restoreRecoveryStorage', {
        value: () => {
          Storage.prototype.getItem = get;
          Storage.prototype.removeItem = remove;
        },
      });
      if (mode === 'unreadable')
        Storage.prototype.getItem = function (key) {
          if (this === window.localStorage) throw new DOMException('Denied', 'SecurityError');
          return get.call(this, key);
        };
      else
        Storage.prototype.removeItem = function (key) {
          if (this === window.sessionStorage) throw new DOMException('Denied', 'SecurityError');
          remove.call(this, key);
        };
    }, failure);
    await page.getByRole('button', { name: '最新の保存データを読み込む', exact: true }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: '最新を読み込む', exact: true })
      .click();
    await expect(page.locator('main [role=alert]')).toContainText(
      failure === 'unreadable' ? 'アクセスできません' : '下書きを消去できません',
    );
    await expect(page).toHaveURL(/\/payments$/);
    await expect(page.getByLabel('金額', { exact: true })).toHaveValue('888');
    expect(await page.evaluate(() => sessionStorage.getItem('warica-payment-draft-v1'))).toBe(
      draft,
    );
    await page.evaluate(() =>
      (window as unknown as { __restoreRecoveryStorage: () => void }).__restoreRecoveryStorage(),
    );
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(latest);
    await page.getByRole('button', { name: '最新の保存データを読み込む', exact: true }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: '最新を読み込む', exact: true })
      .click();
    await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue(
      '保存済みの最新イベント',
    );
    await expect(page.locator('main [role=alert]')).toHaveCount(0);
    await other.close();
  });
}

test('recovery on the member page clears unsubmitted member edits', async ({ page, context }) => {
  await setup(page);
  await page.getByRole('link', { name: 'メンバー', exact: true }).click();
  await page.getByLabel('メンバーの名前', { exact: true }).fill('追加前の名前');
  await page.getByRole('button', { name: 'あおいの名前を編集', exact: true }).click();
  await page.getByLabel('新しい名前', { exact: true }).fill('変更前の下書き');
  const other = await context.newPage();
  await other.goto('/');
  await other.getByLabel('イベント名', { exact: true }).fill('切り替え先のイベント');
  await page.getByRole('button', { name: '最新の保存データを読み込む', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '最新を読み込む', exact: true })
    .click();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('切り替え先のイベント');
  await expect(page.getByLabel('メンバーの名前', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('新しい名前', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('member-list')).toContainText('あおい');
  await other.close();
});
