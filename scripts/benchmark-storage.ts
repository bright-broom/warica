import assert from 'node:assert/strict';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import {
  MAX_FILE_SIZE,
  STORAGE_KEY,
  parseState,
  saveToStorage,
  serializeState,
  type StoragePort,
} from '../src/lib/storage';
import type { WarikanState } from '../src/lib/types';

function medianMs(run: () => void): number {
  for (let i = 0; i < 10; i++) run();
  const samples = Array.from({ length: 15 }, () => {
    const start = performance.now();
    run();
    return performance.now() - start;
  }).sort((a, b) => a - b);
  return Number(samples[7].toFixed(2));
}

// Synthetic records only. The port deliberately excludes browser disk I/O and rendering.
const results = [
  [2, 1_000],
  [2, 3_000],
  [2, 6_000],
  [100, 1_000],
].map(([memberCount, paymentCount]) => {
  const members = Array.from({ length: memberCount }, (_, i) => ({
    id: `m${i}`,
    name: `Member ${i}`,
  }));
  const state: WarikanState = {
    eventName: 'Storage benchmark',
    lastUpdated: '2026-09-13T00:00:00.000Z',
    members,
    payments: Array.from({ length: paymentCount }, (_, i) => ({
      id: `p${i}`,
      payerId: members[i % memberCount].id,
      amount: 1_001,
      participantIds: members.map((m) => m.id),
      memo: '',
      createdAt: '2026-09-13T00:00:00.000Z',
    })),
  };
  const raw = serializeState(state);
  const bytes = new Blob([raw]).size;
  assert.ok(bytes <= MAX_FILE_SIZE, 'Benchmark must stay within the supported file limit');
  const values = new Map([[STORAGE_KEY, raw]]);
  const storage: StoragePort = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
  };
  return {
    members: memberCount,
    payments: paymentCount,
    bytes,
    parseMedianMs: medianMs(() => assert.ok(parseState(raw).ok)),
    saveMedianMs: medianMs(() => {
      assert.ok(saveToStorage(state, values.get(STORAGE_KEY)!, storage).ok);
    }),
  };
});

console.log(JSON.stringify({ node: process.version, cpu: cpus()[0]?.model, results }, null, 2));
