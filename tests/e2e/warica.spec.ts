import { expect, test, type Page } from '@playwright/test';
const key = 'warican-app-data-v2';
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
  await page.getByRole('button', { name: '精算結果をコピー' }).click();
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

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'バックアップ', exact: true }).click();
  const file = await downloading;
  const backupPath = await file.path();
  expect(backupPath).toBeTruthy();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '新しく始める' }).click();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('');
  await page.reload();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('バックアップファイル').setInputFiles(backupPath!);
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
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await setup(page);
  await page.getByLabel('金額', { exact: true }).fill('3000');
  await page.getByLabel('何の支払い？').fill('ホテル');
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'ホテルを削除' }).click();
  await expect(page.getByTestId('payment-list').locator('li')).toHaveCount(1);
  await page.getByRole('link', { name: '精算結果を見る' }).click();
  await page.getByRole('button', { name: '精算結果をコピー' }).click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: '精算結果をコピーしました。チャットに貼り付けて共有できます。' }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    'はる → あおい：¥1,000',
  );
  await page.getByRole('link', { name: 'WARICA ホーム' }).click();
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
  const backup = await page.evaluate((storageKey) => localStorage.getItem(storageKey)!, key);
  await page.evaluate((storageKey) => {
    localStorage.setItem(storageKey, '{broken');
    localStorage.setItem('warican-backup-v2', '{broken too');
  }, key);
  await page.reload();
  await expect(page.getByRole('heading', { name: '保存データを確認してください' })).toBeVisible();
  await expect(page.getByRole('button', { name: '読み込む', exact: true })).toBeEnabled();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('バックアップファイル').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup),
  });
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('週末の京都旅行');
  await expect(page.getByTestId('member-list').locator('li')).toHaveCount(3);
  await page.reload();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('週末の京都旅行');
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
  await expect(page.getByRole('button', { name: '精算結果をコピー' })).toHaveCSS(
    'background-color',
    inheritedColor,
  );
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-persisted', 'yes');
  await expect(page.getByRole('main')).toHaveCount(1);
  await page.getByRole('link', { name: 'WARICA ホーム' }).click();
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-persisted', 'yes');
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('週末の京都旅行');
});

test('payment drafts survive route changes and continuous entry keeps payer and participants', async ({
  page,
}, testInfo) => {
  await setup(page);
  if (testInfo.project.name === 'mobile') {
    await page.evaluate(() => window.scrollTo(0, 0));
    const submit = await page.getByRole('button', { name: 'この支払いを追加する' }).boundingBox();
    const dock = await page.getByRole('navigation', { name: '割り勘の手順' }).boundingBox();
    expect(submit && dock && submit.y + submit.height <= dock.y).toBeTruthy();
  }
  await page.getByLabel('支払った人').selectOption({ label: 'はる' });
  await page.getByLabel('金額', { exact: true }).fill('１２，８００');
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('12800');
  await page.getByLabel('金額', { exact: true }).press('Enter');
  await expect(page.getByLabel('何の支払い？')).toBeFocused();
  await page.getByRole('button', { name: '宿泊', exact: true }).click();
  await page.getByRole('checkbox', { name: 'りく', exact: true }).uncheck();
  await page.getByRole('link', { name: 'メンバー', exact: true }).click();
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('12800');
  await expect(page.getByLabel('何の支払い？')).toHaveValue('宿泊');
  await expect(page.getByRole('checkbox', { name: 'りく', exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'この支払いを追加する' }).click();
  await expect(page.getByRole('status').filter({ hasText: '¥12,800 追加しました' })).toBeVisible();
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
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await setup(page);
  const backup = await page.evaluate((storageKey) => localStorage.getItem(storageKey)!, key);
  await page.getByLabel('金額', { exact: true }).fill('999');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('バックアップファイル').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup),
  });
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
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '新しく始める', exact: true }).click();
  await page.getByLabel('イベント名', { exact: true }).fill('新しい集まり');
  for (const name of ['A', 'B']) {
    await page.getByLabel('メンバーの名前', { exact: true }).fill(name);
    await page.getByRole('button', { name: '追加', exact: true }).click();
  }
  await page.getByRole('link', { name: '支払い', exact: true }).click();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect(page.getByRole('navigation', { name: '割り勘の手順' })).toBeInViewport();
  await noOverflow(page);
});
