import { expect, test } from '@playwright/test';
import { parseState, serializeState, STORAGE_KEY } from '../../src/lib/storage';
import type { WarikanState } from '../../src/lib/types';

test('typing an event name with 6,000 payments survives an immediate reload', async ({ page }) => {
  const state: WarikanState = {
    eventName: '旅行',
    lastUpdated: '2026-09-13T00:00:00.000Z',
    members: [
      { id: 'a', name: 'あおい' },
      { id: 'b', name: 'はる' },
    ],
    payments: Array.from({ length: 6_000 }, (_, i) => ({
      id: `p${i}`,
      payerId: 'a',
      amount: 1_001,
      participantIds: ['a', 'b'],
      memo: '',
      createdAt: '2026-09-13T00:00:00.000Z',
    })),
  };
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(
    ({ key, raw }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, raw);
    },
    { key: STORAGE_KEY, raw: serializeState(state) },
  );
  await page.goto('/');
  const name = page.getByLabel('イベント名', { exact: true });
  await expect(name).toHaveValue('旅行');
  await name.fill('');
  await name.pressSequentially('Updated');
  await page.reload();
  await expect(name).toHaveValue('Updated');
  const raw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  expect(raw).not.toBeNull();
  const loaded = parseState(raw!);
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) throw new Error(loaded.error);
  expect(loaded.data).toEqual({ ...state, eventName: 'Updated', lastUpdated: expect.any(String) });
  expect(errors).toEqual([]);
});
