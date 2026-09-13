import { strict as assert } from 'node:assert';
import test from 'node:test';
import { emptyWorkspace, readDraft, serializeDraft } from '../src/lib/payment-draft';

test('draft restoration retains invalid input and separate new and editing drafts', () => {
  const value = emptyWorkspace();
  value.draft = { payerId: 'a', amount: '1.5', memo: '入力途中', participantIds: [] };
  value.editing = {
    id: 'payment',
    draft: { ...value.draft, amount: '1200', participantIds: ['a'] },
  };
  assert.deepEqual(readDraft(serializeDraft(value, 'event-1'), 'event-1'), {
    ok: true,
    data: value,
  });
  assert.deepEqual(readDraft(serializeDraft(value, 'event-1'), 'event-2'), {
    ok: true,
    data: emptyWorkspace(),
  });
});
test('malformed draft structures are rejected without silently becoming empty inputs', () => {
  for (const raw of [
    '{bad',
    'null',
    '{}',
    JSON.stringify({
      version: 1,
      eventStamp: 'event',
      workspace: { draft: { amount: 123 }, editing: null },
    }),
  ]) {
    assert.equal(readDraft(raw, 'event').ok, false);
  }
  assert.deepEqual(readDraft(null, 'event'), { ok: true, data: emptyWorkspace() });
});
