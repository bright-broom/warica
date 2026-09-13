import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  captureDraftSelection,
  emptyWorkspace,
  readDraft,
  serializeDraft,
} from '../src/lib/payment-draft';

const members = [
  { id: 'a', name: 'あおい' },
  { id: 'b', name: 'はる' },
];

test('draft restoration retains invalid input and separate new and editing drafts', () => {
  const value = emptyWorkspace();
  value.draft = { payerId: 'a', amount: '1.5', memo: '入力途中', participantIds: [] };
  value.editing = {
    id: 'payment',
    draft: { ...value.draft, amount: '1200', participantIds: ['a'] },
  };
  assert.deepEqual(readDraft(serializeDraft(value, 'event-1'), 'event-1', members), {
    ok: true,
    data: value,
  });
  assert.deepEqual(readDraft(serializeDraft(value, 'event-1'), 'event-2', members), {
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
    assert.equal(readDraft(raw, 'event', members).ok, false);
  }
  assert.deepEqual(readDraft(null, 'event', members), { ok: true, data: emptyWorkspace() });
});

test('captured choices survive roster additions and removals without substituting a payer', () => {
  const blank = emptyWorkspace().draft;
  const captured = captureDraftSelection({ ...blank, amount: '1001' }, members);
  assert.equal(captured.payerId, 'a');
  assert.deepEqual(captured.participantIds, ['a', 'b']);
  const changed = [members[1], { id: 'c', name: 'りく' }];
  assert.deepEqual(captureDraftSelection(captured, changed), captured);
  assert.deepEqual(
    captureDraftSelection({ ...captured, participantIds: [] }, changed).participantIds,
    [],
  );
  assert.equal(blank.participantIds, null);
  assert.equal(blank.payerId, '');
});

test('legacy active drafts capture defaults but untouched drafts remain ready for the current roster', () => {
  const blank = emptyWorkspace();
  assert.deepEqual(readDraft(serializeDraft(blank, 'event'), 'event', members), {
    ok: true,
    data: blank,
  });
  const legacy = {
    draft: { ...blank.draft, memo: '入力途中' },
    editing: { id: 'payment', draft: { ...blank.draft, amount: '1001' } },
  };
  const result = readDraft(serializeDraft(legacy, 'event'), 'event', members);
  assert.ok(result.ok);
  assert.equal(result.data.draft.payerId, 'a');
  assert.deepEqual(result.data.draft.participantIds, ['a', 'b']);
  assert.equal(result.data.editing?.draft.payerId, 'a');
  assert.deepEqual(result.data.editing?.draft.participantIds, ['a', 'b']);
  assert.equal(legacy.draft.payerId, '');
});

test('restored explicit selections retain removed member IDs for review in both drafts', () => {
  const draft = { ...emptyWorkspace().draft, payerId: 'deleted', participantIds: ['deleted', 'a'] };
  const workspace = { draft, editing: { id: 'payment', draft: { ...draft, amount: '1000' } } };
  assert.deepEqual(readDraft(serializeDraft(workspace, 'event'), 'event', members), {
    ok: true,
    data: workspace,
  });
});
