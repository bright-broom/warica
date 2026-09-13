import type { Member, PaymentInput, Result } from './types';

const MAX_AMOUNT = 1_000_000;
export const MAX_MEMBERS = 100;
export const MAX_PAYMENTS = 10_000;

export function validateMemberName(name: string, members: readonly Member[]): Result<string> {
  const value = name.trim();
  if (!value || value.length > 20)
    return { ok: false, error: '名前は1〜20文字で入力してください。' };
  if (members.some((m) => m.name.toLocaleLowerCase() === value.toLocaleLowerCase())) {
    return { ok: false, error: '同じ名前が登録されています。区別できる名前にしてください。' };
  }
  return { ok: true, data: value };
}

export function validateAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount >= 1 && amount <= MAX_AMOUNT;
}

export function validatePayment(
  input: PaymentInput,
  members: readonly Member[],
): Result<PaymentInput> {
  const ids = new Set(members.map((m) => m.id));
  if (!ids.has(input.payerId)) return { ok: false, error: '支払った人を選択してください。' };
  if (!validateAmount(input.amount))
    return { ok: false, error: '金額は1〜1,000,000円の整数で入力してください。' };
  if (
    !input.participantIds.length ||
    new Set(input.participantIds).size !== input.participantIds.length ||
    input.participantIds.some((id) => !ids.has(id))
  ) {
    return { ok: false, error: '割り勘に含める人を1人以上選択してください。' };
  }
  if (input.memo.length > 100) return { ok: false, error: '内容は100文字以内で入力してください。' };
  // Member registration order makes the allocation of spare yen deterministic.
  return {
    ok: true,
    data: {
      ...input,
      memo: input.memo.trim(),
      participantIds: members.filter((m) => input.participantIds.includes(m.id)).map((m) => m.id),
    },
  };
}
