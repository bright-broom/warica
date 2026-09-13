import type { Member, Payment, MemberBalance, Settlement, WarikanState } from './types';

/** Allocate whole yen without losing money. Earlier participants take the spare yen. */
export function calculatePaymentSplit(amount: number, count: number): readonly number[] {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count > 100
  )
    return [];
  const base = Math.floor(amount / count);
  return Array.from({ length: count }, (_, i) => base + (i < amount % count ? 1 : 0));
}

export function calculateMemberBalances(
  members: readonly Member[],
  payments: readonly Payment[],
): readonly MemberBalance[] {
  const balances = new Map(
    members.map((m) => [
      m.id,
      { memberId: m.id, memberName: m.name, paid: 0, share: 0, balance: 0 },
    ]),
  );
  for (const payment of payments) {
    const payer = balances.get(payment.payerId);
    if (
      !payer ||
      !Number.isSafeInteger(payment.amount) ||
      payment.amount < 1 ||
      !payment.participantIds.length ||
      new Set(payment.participantIds).size !== payment.participantIds.length ||
      payment.participantIds.some((id) => !balances.has(id))
    ) {
      throw new Error('支払いデータが不正です。');
    }
    payer.paid += payment.amount;
    const shares = calculatePaymentSplit(payment.amount, payment.participantIds.length);
    if (!shares.length) throw new Error('対象人数が不正です。');
    payment.participantIds.forEach((id, i) => {
      balances.get(id)!.share += shares[i];
    });
  }
  return [...balances.values()].map((b) => ({ ...b, balance: b.paid - b.share }));
}

/** Greedy netting: at most n - 1 transfers, not a guarantee of the global minimum. */
export function calculateSettlements(balances: readonly MemberBalance[]): readonly Settlement[] {
  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ ...b, remaining: b.balance }))
    .sort((a, b) => b.remaining - a.remaining);
  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ ...b, remaining: -b.balance }))
    .sort((a, b) => b.remaining - a.remaining);
  const settlements: Settlement[] = [];
  let c = 0,
    d = 0;
  while (c < creditors.length && d < debtors.length) {
    const creditor = creditors[c],
      debtor = debtors[d];
    const amount = Math.min(creditor.remaining, debtor.remaining);
    settlements.push({
      fromId: debtor.memberId,
      toId: creditor.memberId,
      from: debtor.memberName,
      to: creditor.memberName,
      amount,
    });
    creditor.remaining -= amount;
    debtor.remaining -= amount;
    if (creditor.remaining === 0) c++;
    if (debtor.remaining === 0) d++;
  }
  return settlements;
}

export const yen = (value: number): string => `¥${value.toLocaleString('ja-JP')}`;

export function settlementText(state: WarikanState): string {
  const balances = calculateMemberBalances(state.members, state.payments);
  const transfers = calculateSettlements(balances);
  return [
    `${state.eventName || '割り勘'}｜精算結果`,
    `合計 ${yen(state.payments.reduce((sum, p) => sum + p.amount, 0))} / ${state.members.length}人 / ${state.payments.length}件`,
    '',
    ...(transfers.length
      ? transfers.map((s) => `${s.from} → ${s.to}：${yen(s.amount)}`)
      : ['送金は不要です。']),
    '',
    '【支払いの内訳】',
    ...state.payments.map(
      (p) =>
        `${p.memo || '立て替え'}：${yen(p.amount)}（${state.members.find((m) => m.id === p.payerId)?.name}が支払い / 対象：${p.participantIds.map((id) => state.members.find((m) => m.id === id)?.name).join('、')}）`,
    ),
    ...(state.payments.some((p) => p.needsReview)
      ? ['', '※ 旧バージョンの記録があります。割り勘の対象者を確認してください。']
      : []),
    '',
    '1円未満の端数は、支払いごとに対象者の登録順で1円ずつ配分しています。',
    'WARICAで計算（送金は各自で行ってください）',
  ].join('\n');
}
