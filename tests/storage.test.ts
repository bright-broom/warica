import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BACKUP_KEY,
  MAX_FILE_SIZE,
  STORAGE_KEY,
  loadFromStorage,
  parseState,
  saveToStorage,
  serializeState,
  type StoragePort,
} from '../src/lib/storage';
import { emptyState, type WarikanState } from '../src/lib/types';
import { MAX_PAYMENTS } from '../src/lib/validation';

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

test('first use supplies stable dinner defaults without writing to storage', () => {
  const storage = memory();
  const loaded = loadFromStorage(storage);
  assert.ok(loaded.ok);
  assert.equal(loaded.data.state.eventName, 'みんなでごはん');
  assert.deepEqual(
    loaded.data.state.members.map((member) => member.name),
    ['A', 'B'],
  );
  assert.deepEqual(loadFromStorage(storage), loaded);
  assert.equal(loaded.data.state.payments.length, 0);
  assert.equal(storage.values.size, 0);
});

test('an intentionally empty saved event and recovered backup never get default members', () => {
  const state = emptyState();
  const raw = serializeState(state);
  for (const key of [STORAGE_KEY, BACKUP_KEY]) {
    const storage = memory();
    storage.setItem(key, raw);
    const loaded = loadFromStorage(storage);
    assert.ok(loaded.ok);
    assert.deepEqual(loaded.data.state, state);
    assert.equal(storage.getItem(key), raw);
    assert.equal(storage.values.size, 1);
  }
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

test('the maximum-size ledger validates every record, including the final payment', () => {
  const payments = Array.from({ length: MAX_PAYMENTS }, (_, i) => ({
    ...event.payments[0],
    id: `p${i}`,
  }));
  // Compact imported JSON can reach the count limit while remaining under 2 MB.
  const raw = container({ ...event, payments });
  assert.ok(new Blob([raw]).size <= MAX_FILE_SIZE);
  const parsed = parseState(raw);
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.data.payments, payments);

  for (const last of [
    { ...payments[MAX_PAYMENTS - 1], id: payments[0].id },
    { ...payments[MAX_PAYMENTS - 1], participantIds: ['a', 'missing'] },
    { ...payments[MAX_PAYMENTS - 1], participantIds: ['a', 'b', 'a'] },
  ]) {
    assert.equal(
      parseState(container({ ...event, payments: [...payments.slice(0, -1), last] })).ok,
      false,
    );
  }
  assert.equal(
    parseState(container({ ...event, payments: [...payments, { ...payments[0], id: 'extra' }] }))
      .ok,
    false,
  );
});

test('large event saves retain the previous snapshot and reject a later invalid payment', () => {
  const state: WarikanState = {
    ...event,
    payments: Array.from({ length: 6_000 }, (_, i) => ({ ...event.payments[0], id: `p${i}` })),
  };
  const storage = memory();
  const first = saveToStorage(state, null, storage);
  assert.ok(first.ok);
  const changed = { ...state, eventName: '変更後' };
  const second = saveToStorage(changed, first.data, storage);
  assert.ok(second.ok);
  assert.equal(storage.getItem(BACKUP_KEY), first.data);
  const loaded = loadFromStorage(storage);
  assert.ok(loaded.ok);
  assert.deepEqual(loaded.data.state, changed);

  const invalid = { ...changed, payments: [...state.payments, state.payments[0]] };
  const rejected = saveToStorage(invalid, second.data, storage);
  assert.ok(!rejected.ok);
  assert.equal(rejected.code, 'invalid');
  assert.equal(storage.getItem(STORAGE_KEY), second.data);
  assert.equal(storage.getItem(BACKUP_KEY), first.data);
});
