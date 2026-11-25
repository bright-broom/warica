/** Normalize Japanese digits and correctly grouped pasted yen, without rounding. */
export function normalizeYenInput(value: string): string {
  const normalized = value.normalize('NFKC').trim();
  return /^\d{1,3}(,\d{3})+$/.test(normalized) ? normalized.replaceAll(',', '') : normalized;
}
