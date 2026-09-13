import type { Result } from './types';

export const DRAFT_KEY = 'warica-payment-draft-v1';
export type PaymentDraft = {
  payerId: string;
  amount: string;
  memo: string;
  participantIds: readonly string[] | null;
};
export type DraftWorkspace = {
  draft: PaymentDraft;
  editing: { id: string; draft: PaymentDraft } | null;
};
export const emptyWorkspace = (): DraftWorkspace => ({
  draft: { payerId: '', amount: '', memo: '', participantIds: null },
  editing: null,
});

function isDraft(value: unknown): value is PaymentDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.payerId === 'string' &&
    draft.payerId.length <= 100 &&
    typeof draft.amount === 'string' &&
    draft.amount.length <= 10000 &&
    typeof draft.memo === 'string' &&
    draft.memo.length <= 100 &&
    (draft.participantIds === null ||
      (Array.isArray(draft.participantIds) &&
        draft.participantIds.length <= 100 &&
        draft.participantIds.every((id) => typeof id === 'string' && id.length <= 100)))
  );
}

export function readDraft(raw: string | null, eventStamp: string): Result<DraftWorkspace> {
  if (!raw) return { ok: true, data: emptyWorkspace() };
  try {
    const record = JSON.parse(raw);
    if (record?.version !== 1 || typeof record.eventStamp !== 'string') throw new Error();
    // A changed event in another tab must never receive this tab's old inputs.
    if (record.eventStamp !== eventStamp) return { ok: true, data: emptyWorkspace() };
    const value = record.workspace;
    if (
      !value ||
      !isDraft(value.draft) ||
      (value.editing !== null &&
        (!value.editing ||
          typeof value.editing.id !== 'string' ||
          value.editing.id.length > 100 ||
          !isDraft(value.editing.draft)))
    )
      throw new Error();
    return { ok: true, data: value };
  } catch {
    return { ok: false, error: '下書きを読み込めません。保存領域の内容は保持しています。' };
  }
}

export function serializeDraft(workspace: DraftWorkspace, eventStamp: string) {
  return JSON.stringify({ version: 1, eventStamp, workspace });
}
