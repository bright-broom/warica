import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPaymentSearchIndex, searchPayments } from '../src/lib/payment-history';
import type { Payment } from '../src/lib/types';

const members = [
  { id: 'a', name: 'あおい' },
  { id: 'b', name: 'Haru' },
  { id: 'c', name: 'りく' },
];
const payments: Payment[] = [
  {
    id: 'old',
    payerId: 'a',
    participantIds: ['b'],
    amount: 1_001,
    memo: 'カフェ ABC',
    createdAt: '2026-09-13',
  },
  {
    id: 'new',
    payerId: 'c',
    participantIds: ['a'],
    amount: 2_000,
    memo: '電車',
    createdAt: '2026-09-13',
  },
];

test('history searches every record by memo, payer and participant without changing the ledger', () => {
  const before = structuredClone(payments);
  const index = createPaymentSearchIndex(payments, members);
  assert.deepEqual(
    searchPayments(index, '  ').map((p) => p.id),
    ['new', 'old'],
  );
  assert.deepEqual(
    searchPayments(index, 'あおい').map((p) => p.id),
    ['new', 'old'],
  );
  assert.deepEqual(
    searchPayments(index, ' ｶﾌｪ　ａｂｃ ＨＡＲＵ ').map((p) => p.id),
    ['old'],
  );
  assert.deepEqual(searchPayments(index, 'カフェ りく'), []);
  assert.deepEqual(searchPayments(index, '存在しない'), []);
  assert.deepEqual(payments, before);
  assert.equal(searchPayments(index, 'カフェ')[0], payments[0]);
});

test('rebuilt history reflects member renames and edited or deleted payments', () => {
  const renamed = members.map((m) => (m.id === 'b' ? { ...m, name: 'はる' } : m));
  const changed = [{ ...payments[0], memo: '宿泊' }];
  const index = createPaymentSearchIndex(changed, renamed);
  assert.deepEqual(searchPayments(index, 'はる 宿泊'), changed);
  for (const query of ['Haru', 'カフェ', '電車'])
    assert.deepEqual(searchPayments(index, query), []);
});
