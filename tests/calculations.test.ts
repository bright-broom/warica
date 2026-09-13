import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  calculateMemberBalances,
  calculatePaymentSplit,
  calculateSettlements,
  settlementText,
} from '../src/lib/calculations';
import { validatePayment, validateMemberName } from '../src/lib/validation';
import { emptyState, type Payment, type Member } from '../src/lib/types';

const members: Member[] = [
  { id: 'a', name: 'あおい' },
  { id: 'b', name: 'はる' },
  { id: 'c', name: 'りく' },
];
function payment(amount: number, participantIds: string[], payerId = 'a'): Payment {
  return {
    id: 'p',
    payerId,
    amount,
    participantIds,
    memo: 'ランチ',
    createdAt: '2026-09-13T00:00:00.000Z',
  };
}

test('only the selected participants bear the cost; a payer can be excluded', () => {
  const balances = calculateMemberBalances(members, [payment(3000, ['b'])]);
  assert.deepEqual(
    balances.map((b) => b.balance),
    [3000, -3000, 0],
  );
  assert.deepEqual(calculateSettlements(balances), [
    { fromId: 'b', toId: 'a', from: 'はる', to: 'あおい', amount: 3000 },
  ]);
});

test('the payer is included in a normal equal split', () => {
  const balances = calculateMemberBalances(members, [payment(3000, ['a', 'b', 'c'])]);
  assert.deepEqual(
    balances.map((b) => b.balance),
    [2000, -1000, -1000],
  );
});

test('spare yen are preserved, including payments smaller than the group', () => {
  assert.deepEqual(calculatePaymentSplit(1000, 3), [334, 333, 333]);
  assert.deepEqual(calculatePaymentSplit(1, 3), [1, 0, 0]);
  assert.deepEqual(
    calculateMemberBalances(members, [payment(1, ['b', 'c'])]).map((b) => b.balance),
    [1, -1, 0],
  );
  for (const [amount, count] of [
    [1.5, 2],
    [Infinity, 2],
    [3, 1.5],
    [3, 0],
    [3, 101],
  ])
    assert.deepEqual(calculatePaymentSplit(amount, count), []);
});

test('one-person reimbursement, multiple payers and equal balances need no false transfers', () => {
  const balances = calculateMemberBalances(members, [
    payment(1000, ['a', 'b'], 'a'),
    payment(1000, ['a', 'b'], 'b'),
    payment(700, ['c'], 'c'),
  ]);
  assert.deepEqual(
    balances.map((b) => b.balance),
    [0, 0, 0],
  );
  assert.deepEqual(calculateSettlements(balances), []);
  assert.deepEqual(calculateMemberBalances([], []), []);
});

test('new members do not retroactively change participants of an existing payment', () => {
  const records = [payment(1001, ['a', 'b'])];
  const before = calculateMemberBalances(members.slice(0, 2), records);
  const after = calculateMemberBalances(members, records);
  assert.deepEqual(after.slice(0, 2), before);
  assert.equal(after[2].balance, 0);
});

test('100 varied ledgers conserve every yen and transfers settle every member', () => {
  let seed = 73;
  const random = (max: number) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % max;
  };
  for (let run = 0; run < 100; run++) {
    const group = Array.from({ length: 2 + random(18) }, (_, i) => ({
      id: String(i),
      name: `member ${i}`,
    }));
    const records = Array.from({ length: 40 }, (_, i) => {
      const subset = group.filter(() => random(3) > 0).map((m) => m.id);
      return {
        ...payment(
          1 + random(1_000_000),
          subset.length ? subset : [group[0].id],
          group[random(group.length)].id,
        ),
        id: String(i),
      };
    });
    const balances = calculateMemberBalances(group, records);
    const total = records.reduce((sum, p) => sum + p.amount, 0);
    assert.equal(
      balances.reduce((sum, b) => sum + b.paid, 0),
      total,
    );
    assert.equal(
      balances.reduce((sum, b) => sum + b.share, 0),
      total,
    );
    assert.equal(
      balances.reduce((sum, b) => sum + b.balance, 0),
      0,
    );
    const remaining = new Map(balances.map((b) => [b.memberId, b.balance]));
    const settlements = calculateSettlements(balances);
    assert.ok(settlements.length <= group.length - 1);
    for (const s of settlements) {
      assert.ok(Number.isSafeInteger(s.amount) && s.amount > 0);
      remaining.set(s.fromId, remaining.get(s.fromId)! + s.amount);
      remaining.set(s.toId, remaining.get(s.toId)! - s.amount);
    }
    assert.ok([...remaining.values()].every((v) => v === 0));
  }
});

test('invalid yen, foreign IDs and duplicate participants cannot enter the ledger', () => {
  for (const amount of [0, -1, 1.5, NaN, Infinity, 1_000_001])
    assert.equal(validatePayment(payment(amount, ['a']), members).ok, false);
  for (const ids of [[], ['a', 'a'], ['missing']])
    assert.equal(validatePayment(payment(10, ids), members).ok, false);
  assert.equal(validatePayment(payment(10, ['a'], 'missing'), members).ok, false);
  assert.equal(validatePayment(payment(10, ['a']), members).ok, true);
  assert.equal(validateMemberName(' あおい ', members).ok, false);
  assert.throws(() => calculateMemberBalances(members, [payment(1, ['missing'])]));
});

test('LINE copy includes exact transfers and preserves a legacy warning', () => {
  const text = settlementText({
    ...emptyState(),
    eventName: '京都旅行',
    members,
    payments: [{ ...payment(3000, ['b']), needsReview: true }],
  });
  assert.match(text, /はる → あおい：¥3,000/);
  assert.doesNotMatch(text, /【支払いの内訳】/);
  assert.match(text, /旧バージョン/);
});
