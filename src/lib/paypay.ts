import { calculateMemberBalances, calculateSettlements } from './calculations';
import type { PayPayRequestLink, Result, Settlement, WarikanState } from './types';

export const PAYPAY_GUIDE_URL = 'https://paypay.ne.jp/guide/receive/';

/** Validate the destination domain only. Opaque links do not prove recipient, amount or payment. */
export function validatePayPayUrl(input: string): Result<string> {
  const value = input.trim();
  try {
    if (value.length > 2048 || /[\s\\\u0000-\u001f\u007f]/u.test(value)) throw new Error();
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !(url.hostname === 'paypay.ne.jp' || url.hostname.endsWith('.paypay.ne.jp')) ||
      (url.pathname === '/' && !url.search)
    )
      throw new Error();
    return { ok: true, data: url.href };
  } catch {
    return { ok: false, error: 'PayPayで発行したHTTPSの請求リンクを貼り付けてください。' };
  }
}

export function settlementKey(settlement: Settlement): string {
  return JSON.stringify([
    settlement.fromId,
    settlement.toId,
    settlement.from,
    settlement.to,
    settlement.amount,
  ]);
}

export function currentSettlements(state: WarikanState) {
  return calculateSettlements(calculateMemberBalances(state.members, state.payments));
}

/** Drop invalidated links at the mutation boundary, so reverting an amount cannot revive one. */
export function retainPayPayLinks(state: WarikanState): readonly PayPayRequestLink[] {
  if (state.payments.some((payment) => payment.needsReview)) return [];
  const keys = new Set(currentSettlements(state).map(settlementKey));
  return (state.paypayLinks ?? []).filter((link) => keys.has(settlementKey(link)));
}

export function parsePayPayLinks(
  value: unknown,
  state: WarikanState,
): Result<readonly PayPayRequestLink[]> {
  if (!Array.isArray(value) || value.length > 99)
    return { ok: false, error: 'PayPayリンクの保存データが不正です。' };
  const transfers = new Map(
    currentSettlements(state).map((transfer) => [settlementKey(transfer), transfer]),
  );
  const links: PayPayRequestLink[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof item.url !== 'string')
      return { ok: false, error: 'PayPayリンクの保存データが不正です。' };
    const key = settlementKey(item);
    const transfer = transfers.get(key);
    const url = validatePayPayUrl(item.url);
    if (
      !transfer ||
      !url.ok ||
      seen.has(key) ||
      state.payments.some((payment) => payment.needsReview)
    )
      return { ok: false, error: 'PayPayリンクの宛先・金額・URLを確認できません。' };
    seen.add(key);
    links.push({ ...transfer, url: url.data });
  }
  return { ok: true, data: links };
}
