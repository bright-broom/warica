import { expect, test, type Page } from '@playwright/test';
import {
  MAX_FILE_SIZE,
  parseState,
  serializeState,
  STORAGE_KEY,
} from '../../src/lib/persistence/storage';
import { DRAFT_KEY, emptyWorkspace, serializeDraft } from '../../src/lib/persistence/payment-draft';
import type { Payment, WarikanState } from '../../src/lib/domain/types';

/*
 * 2026-09-14 の棚卸しで再現した境界条件（docs/verification/2026-09-14-boundary-cases.json）の回帰テスト。
 * WAR-001：指数・16進表記の金額 / WAR-002：過長な下書き / WAR-003：保存容量の上限
 */

const members = [
  { id: 'a', name: 'あおい' },
  { id: 'b', name: 'はる' },
];
const stamp = '2026-11-25T00:00:00.000Z';

async function seed(page: Page, state: WarikanState, draft?: string) {
  await page.addInitScript(
    ({ storageKey, raw, draftKey, draftRaw }) => {
      if (localStorage.getItem(storageKey) === null) localStorage.setItem(storageKey, raw);
      if (draftRaw && sessionStorage.getItem('seeded') === null) {
        sessionStorage.setItem(draftKey, draftRaw);
        sessionStorage.setItem('seeded', 'yes');
      }
    },
    { storageKey: STORAGE_KEY, raw: serializeState(state), draftKey: DRAFT_KEY, draftRaw: draft },
  );
}

async function storedState(page: Page) {
  const raw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  const parsed = parseState(raw!);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.data;
}

test('WAR-001: amounts in exponent, hex or signed notation are rejected and kept for correction', async ({
  page,
}) => {
  await seed(page, { eventName: '旅行', members, payments: [], lastUpdated: stamp });
  await page.goto('/payments');
  const amount = page.getByLabel('金額', { exact: true });
  const add = page.getByRole('button', { name: 'この支払いを追加する' });
  for (const value of ['1e3', '0x10', '-100', '1.5', '1,0']) {
    await amount.fill(value);
    await expect(amount).toHaveValue(value);
    await expect(amount).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('1〜1,000,000円の整数で入力してください')).toBeVisible();
    await expect(add).toBeDisabled();
  }
  await amount.fill('１２，８００');
  await expect(amount).toHaveValue('12800');
  await expect(add).toBeEnabled();
  await add.click();
  await expect(page.getByTestId('payment-list')).toContainText('¥12,800');
  expect((await storedState(page)).payments.map((p) => p.amount)).toEqual([12800]);
});

test('WAR-002: an oversized paste cannot create an unreadable draft', async ({ page }) => {
  await seed(page, { eventName: '旅行', members, payments: [], lastUpdated: stamp });
  await page.goto('/payments');
  const amount = page.getByLabel('金額', { exact: true });
  await amount.focus();
  await page.evaluate((text) => {
    const input = document.activeElement as HTMLInputElement;
    // React の onChange を通すため、ネイティブの setter で値を入れて input を発火する
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, '9'.repeat(10_001));
  expect((await amount.inputValue()).length).toBeLessThanOrEqual(20);
  await page.reload();
  await expect(page.getByLabel('金額', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '下書きを確認してください' })).toHaveCount(0);
});

test('WAR-002: an existing unreadable draft can be discarded after confirmation without touching payments', async ({
  page,
}) => {
  const payment: Payment = {
    id: 'p1',
    payerId: 'a',
    amount: 3000,
    participantIds: ['a', 'b'],
    memo: '夕食',
    createdAt: stamp,
  };
  const broken = emptyWorkspace();
  broken.draft = { payerId: 'a', amount: '9'.repeat(10_001), memo: '', participantIds: null };
  await seed(
    page,
    { eventName: '旅行', members, payments: [payment], lastUpdated: stamp },
    serializeDraft(broken, stamp),
  );
  await page.goto('/payments');
  await expect(page.getByRole('heading', { name: '下書きを確認してください' })).toBeVisible();
  await expect(page.getByLabel('金額', { exact: true })).toHaveCount(0);

  const discard = page.getByRole('button', { name: '下書きを破棄して再開' });
  await discard.click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'キャンセル' }).click();
  await expect(page.getByRole('heading', { name: '下書きを確認してください' })).toBeVisible();

  await discard.click();
  await page.getByRole('alertdialog').getByRole('button', { name: '下書きを破棄する' }).click();
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('');
  await expect(page.getByTestId('payment-list')).toContainText('夕食');
  await page.reload();
  await expect(page.getByLabel('金額', { exact: true })).toBeVisible();
  expect((await storedState(page)).payments).toHaveLength(1);
});

/** 保存容量の上限の数バイト手前まで支払いを詰めたイベント */
function nearCapacity(): WarikanState {
  const payment = (i: number, memo = ''): Payment => ({
    id: `p${i}`,
    payerId: 'a',
    amount: 1001,
    participantIds: ['a', 'b'],
    memo,
    createdAt: stamp,
  });
  const base: WarikanState = { eventName: 'E', members, payments: [], lastUpdated: stamp };
  const size = (state: WarikanState) => new Blob([serializeState(state)]).size;
  // 1件ずつ足すと遅いので、1件あたりの大きさから件数を見積もってから、上限の手前まで削る
  const sample = Array.from({ length: 1000 }, (_, i) => payment(i + 10_000));
  const perPayment = (size({ ...base, payments: sample }) - size(base)) / sample.length;
  const payments = Array.from(
    { length: Math.floor((MAX_FILE_SIZE - size(base)) / perPayment) },
    (_, i) => payment(i + 10_000),
  );
  while (size({ ...base, payments }) > MAX_FILE_SIZE - 120) payments.pop();
  // 残りを内容欄（最大100文字）に分けて埋め、上限まで数バイトにする
  let room = MAX_FILE_SIZE - size({ ...base, payments }) - 4;
  for (let i = 0; room > 0; i++) {
    const memo = 'x'.repeat(Math.min(100, room));
    payments[i] = payment(i + 10_000, memo);
    room = MAX_FILE_SIZE - size({ ...base, payments }) - 4;
  }
  while (size({ ...base, payments }) > MAX_FILE_SIZE) {
    const last = payments.findLastIndex((p) => p.memo);
    payments[last] = payment(last + 10_000, payments[last].memo.slice(1));
  }
  return { ...base, payments };
}

test('WAR-003: hitting the storage limit explains why and offers the backup action', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const state = nearCapacity();
  const bytes = new Blob([serializeState(state)]).size;
  expect(bytes).toBeLessThanOrEqual(MAX_FILE_SIZE);
  expect(bytes).toBeGreaterThan(MAX_FILE_SIZE - 40);
  await seed(page, state);
  await page.goto('/');
  const name = page.getByLabel('イベント名', { exact: true });
  await expect(name).toHaveValue('E');
  await name.fill('E'.repeat(50));

  const alert = page.getByRole('main').getByRole('alert');
  await expect(alert).toContainText('保存容量（2MB）を超えるため、この変更は保存していません');
  await expect(name).toHaveValue('E');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'バックアップを書き出す', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^warica-\d{4}-\d{2}-\d{2}\.json$/);

  // 保存済みのイベントは変わっていない。再試行で案内は消える
  expect((await storedState(page)).eventName).toBe('E');
  await page.getByRole('button', { name: '保存を再試行', exact: true }).click();
  await expect(alert).toHaveCount(0);
});
