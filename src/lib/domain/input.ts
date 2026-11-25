/**
 * 金額欄に入れられる文字数。最大額「1,000,000」（9文字）に前後の空白などの余裕を持たせた値。
 * これより長い貼り付けは切り詰め、読み戻せない下書きを作らない（WAR-002）。
 */
export const MAX_AMOUNT_INPUT_LENGTH = 20;

/** 全角数字と、正しく3桁区切りされた貼り付けを半角の数字列にそろえる。丸めはしない。 */
export function normalizeYenInput(value: string): string {
  const normalized = value.normalize('NFKC').trim().slice(0, MAX_AMOUNT_INPUT_LENGTH);
  return /^\d{1,3}(,\d{3})+$/.test(normalized) ? normalized.replaceAll(',', '') : normalized;
}

/**
 * 入力文字列を円の整数として読む。10進の数字だけを受け付け、
 * `Number()` が解釈する指数（1e3）・16進（0x10）・符号・小数・空白は金額として扱わない（WAR-001）。
 */
export function parseYenAmount(value: string): number | null {
  const normalized = normalizeYenInput(value);
  if (!/^\d+$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) ? amount : null;
}
