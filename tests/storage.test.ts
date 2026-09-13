import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BACKUP_KEY,
  STORAGE_KEY,
  loadFromStorage,
  parseState,
  saveToStorage,
  serializeState,
  type StoragePort,
} from '../src/lib/storage';
import { emptyState, type WarikanState } from '../src/lib/types';

const event: WarikanState = {
  ...emptyState(),
  eventName: '京都旅行',
  members: [
    { id: 'a', name: 'あおい' },
    { id: 'b', name: 'はる' },
  ],
  payments: [
    {
      id: 'p',
      payerId: 'a',
      participantIds: ['a', 'b'],
      amount: 1001,
      memo: 'ランチ',
      createdAt: '2026-09-13T00:00:00.000Z',
    },
  ],
};
function memory() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
function container(data: unknown, version = '3.0.0') {
  const raw = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  return JSON.stringify({
    metadata: { version, timestamp: Date.now(), checksum: Math.abs(hash).toString(16) },
    data,
  });
}

test('JSON roundtrip preserves a complete event and saves synchronously', () => {
  const storage = memory();
  const result = saveToStorage(event, null, storage);
  assert.equal(result.ok, true);
  const loaded = loadFromStorage(storage);
  assert.ok(loaded.ok);
  assert.deepEqual(loaded.data.state, event);
  assert.equal(loaded.data.recovered, false);
});

test('reading an empty store does not write anything', () => {
  const storage = memory();
  const loaded = loadFromStorage(storage);
  assert.ok(loaded.ok);
  assert.equal(loaded.data.state.payments.length, 0);
  assert.equal(storage.values.size, 0);
});

test('malformed JSON and valid JSON with a broken checksum restore the last valid backup', () => {
  for (const bad of ['{broken', serializeState(event).replace('京都旅行', 'changed')]) {
    const storage = memory();
    storage.setItem(STORAGE_KEY, bad);
    storage.setItem(BACKUP_KEY, serializeState(event));
    const loaded = loadFromStorage(storage);
    assert.ok(loaded.ok);
    assert.equal(loaded.data.recovered, true);
    assert.deepEqual(loaded.data.state, event);
    assert.equal(storage.getItem(STORAGE_KEY), bad, 'reading must not destroy original evidence');
  }
});

test('both corrupt snapshots block loading and remain untouched', () => {
  const storage = memory();
  storage.setItem(STORAGE_KEY, '{broken');
  storage.setItem(BACKUP_KEY, 'bad');
  assert.equal(loadFromStorage(storage).ok, false);
  assert.equal(storage.getItem(STORAGE_KEY), '{broken');
  assert.equal(storage.getItem(BACKUP_KEY), 'bad');
});

test('access-denied reads and quota-denied writes report a failure', () => {
  const blocked: StoragePort = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('denied');
    },
  };
  assert.equal(loadFromStorage(blocked).ok, false);
  assert.equal(saveToStorage(event, null, blocked).ok, false);
  assert.equal(
    saveToStorage(event, null, {
      getItem: () => null,
      setItem() {
        throw new Error('quota');
      },
    }).ok,
    false,
  );
});

test('a failed write can retry the same input after storage recovers', () => {
  const storage = memory();
  let denied = true;
  const port = {
    getItem: storage.getItem,
    setItem(key: string, value: string) {
      if (denied) throw new Error('quota');
      storage.setItem(key, value);
    },
  };
  assert.equal(saveToStorage(event, null, port).ok, false);
  denied = false;
  assert.equal(saveToStorage(event, null, port).ok, true);
  const result = loadFromStorage(port);
  assert.ok(result.ok);
  assert.deepEqual(result.data.state, event);
});

test('another tab cannot be silently overwritten', () => {
  const storage = memory();
  const old = serializeState(event);
  storage.setItem(STORAGE_KEY, old);
  const changed = serializeState({ ...event, eventName: '別タブ' });
  storage.setItem(STORAGE_KEY, changed);
  assert.equal(saveToStorage(event, old, storage).ok, false);
  assert.equal(storage.getItem(STORAGE_KEY), changed);
});

test('a failed save retains the previous valid main and backup snapshots', () => {
  const storage = memory();
  const old = serializeState(event);
  storage.setItem(STORAGE_KEY, old);
  const failing = {
    getItem: storage.getItem,
    setItem(key: string, value: string) {
      if (key === STORAGE_KEY) throw new Error('quota');
      storage.setItem(key, value);
    },
  };
  assert.equal(saveToStorage({ ...event, eventName: '新しい名前' }, old, failing).ok, false);
  assert.equal(storage.getItem(STORAGE_KEY), old);
  assert.equal(storage.getItem(BACKUP_KEY), old);
});

test('old v2 records migrate as a provisional all-member split without interpreting memo text', () => {
  const old = {
    ...event,
    version: '2.0.0',
    payments: [
      {
        id: 'p',
        payerId: 'a',
        amount: 1001,
        memo: "ランチ (はる's share)",
        createdAt: event.payments[0].createdAt,
      },
    ],
  };
  const result = parseState(container(old, '2.0.0'));
  assert.ok(result.ok);
  assert.deepEqual(result.data.payments[0].participantIds, ['a', 'b']);
  assert.equal(result.data.payments[0].needsReview, true);
  assert.equal(result.data.payments[0].memo, old.payments[0].memo);
  assert.equal(parseState(container(old, '3.0.0')).ok, false);
});

test('valid checksums cannot bypass structural validation or future-version rejection', () => {
  const variants = [
    {
      ...event,
      members: [
        { id: 'a', name: 'A' },
        { id: 'a', name: 'B' },
      ],
    },
    {
      ...event,
      members: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'a' },
      ],
    },
    { ...event, payments: [{ ...event.payments[0], amount: 1.5 }] },
    { ...event, payments: [{ ...event.payments[0], payerId: 'unknown' }] },
    { ...event, payments: [{ ...event.payments[0], participantIds: ['a', 'a'] }] },
    { ...event, payments: [{ ...event.payments[0], participantIds: ['unknown'] }] },
    { ...event, payments: [{ ...event.payments[0], createdAt: 'invalid' }] },
    { ...event, payments: [event.payments[0], event.payments[0]] },
  ];
  for (const variant of variants) assert.equal(parseState(container(variant)).ok, false);
  assert.equal(parseState(container(event, '99.0.0')).ok, false);
  assert.equal(parseState('x'.repeat(2 * 1024 * 1024 + 1)).ok, false);
});
