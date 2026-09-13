import assert from 'node:assert/strict';
import test from 'node:test';
import { currentSettlements, retainPayPayLinks, validatePayPayUrl } from '../src/lib/paypay';
import { emptyState, type WarikanState } from '../src/lib/types';
import { parseState, serializeState } from '../src/lib/storage';

const state: WarikanState = {
  ...emptyState(),
  eventName: '旅行',
  members: [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
  ],
  payments: [
    {
      id: 'p',
      payerId: 'a',
      amount: 3000,
      memo: '',
      participantIds: ['a', 'b'],
      createdAt: new Date().toISOString(),
    },
  ],
};
const link = {
  ...currentSettlements(state)[0],
  url: 'https://qr.paypay.ne.jp/warica-test-request?token=fixture-only',
};

test('PayPay URL validation preserves opaque data and rejects unrelated or unsafe destinations', () => {
  assert.deepEqual(validatePayPayUrl(` ${link.url} `), { ok: true, data: link.url });
  for (const url of [
    'https://paypay.ne.jp.evil.example/request',
    'https://evil-paypay.ne.jp/request',
    'javascript:alert(1)',
    '//qr.paypay.ne.jp/request',
    'http://qr.paypay.ne.jp/request',
    'https://user:pass@qr.paypay.ne.jp/request',
    'https://qr.paypay.ne.jp:8080/request',
    'https://qr.paypay.ne.jp',
    'https://qr.paypay.ne.jp/req\nuest',
    'https://qr.paypay.ne.jp\\@evil.example/request',
    'https://qr.paypay.ne.jp/' + 'a'.repeat(2048),
  ])
    assert.equal(validatePayPayUrl(url).ok, false, url);
});
test('links bind to sender, recipient, names and amount and do not revive after invalidation', () => {
  const linked = { ...state, paypayLinks: [link] };
  assert.deepEqual(retainPayPayLinks(linked), [link]);
  const changed = { ...linked, payments: [{ ...state.payments[0], amount: 4000 }] };
  const pruned = { ...changed, paypayLinks: retainPayPayLinks(changed) };
  assert.deepEqual(pruned.paypayLinks, []);
  assert.deepEqual(retainPayPayLinks({ ...pruned, payments: state.payments }), []);
  assert.deepEqual(
    retainPayPayLinks({ ...linked, members: [{ id: 'a', name: '別人' }, state.members[1]] }),
    [],
  );
  assert.deepEqual(
    retainPayPayLinks({ ...linked, payments: [{ ...state.payments[0], payerId: 'b' }] }),
    [],
  );
  assert.deepEqual(
    retainPayPayLinks({ ...linked, payments: [{ ...state.payments[0], needsReview: true }] }),
    [],
  );
});
test('saved links roundtrip with the ledger and old v3 data still loads', () => {
  const linked = { ...state, paypayLinks: [link] };
  const restored = parseState(serializeState(linked));
  assert.ok(restored.ok);
  assert.deepEqual(restored.data, linked);
  assert.equal(JSON.parse(serializeState(linked)).metadata.version, '3.1.0');
  const old = JSON.parse(serializeState(state));
  old.metadata.version = '3.0.0';
  const previous = parseState(JSON.stringify(old));
  assert.ok(previous.ok);
  assert.deepEqual(previous.data, state);
});
test('a valid checksum cannot import malicious, duplicated or mismatched payment links', () => {
  for (const paypayLinks of [
    [{ ...link, url: 'https://evil.example/request' }],
    [link, link],
    [{ ...link, amount: 1499 }],
    [{ ...link, toId: 'unknown' }],
    [null],
  ]) {
    const raw = serializeState({ ...state, paypayLinks } as WarikanState);
    assert.equal(parseState(raw).ok, false);
  }
});
