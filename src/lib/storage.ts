import { parsePayPayLinks } from './paypay';
import { emptyState, type WarikanState, type Result, type Payment } from './types';
import { MAX_MEMBERS, MAX_PAYMENTS, validateMemberName, validatePayment } from './validation';

// Keep the existing keys so that existing browser data can be migrated.
export const STORAGE_KEY = 'warican-app-data-v2';
export const BACKUP_KEY = 'warican-backup-v2';
export const MAX_FILE_SIZE = 2 * 1024 * 1024;
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export const STORAGE_CONFLICT_MESSAGE =
  '別の画面で保存データが変更されました。この画面の入力は保持しています。必要ならバックアップしてから、最新の保存データを読み込んでください。';
type SaveResult =
  | { ok: true; data: string }
  | { ok: false; error: string; code: 'conflict' | 'invalid' | 'unavailable' };
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const validId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 100;
const validDate = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

function checksum(data: unknown): string {
  const text = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(16);
}

export function serializeState(state: WarikanState): string {
  return JSON.stringify(
    {
      metadata: { version: '3.1.0', timestamp: Date.now(), checksum: checksum(state) },
      data: state,
    },
    null,
    2,
  );
}

/** Validate every field before accepting a local record or imported backup. */
export function parseState(raw: string): Result<WarikanState> {
  try {
    if (new Blob([raw]).size > MAX_FILE_SIZE)
      throw new Error('ファイルが大きすぎます（上限2MB）。');
    const container: unknown = JSON.parse(raw);
    if (!object(container) || !object(container.metadata) || !object(container.data))
      throw new Error('WARICAのバックアップファイルを選択してください。');
    const { metadata, data } = container;
    if (
      !['2.0.0', '3.0.0', '3.1.0'].includes(String(metadata.version)) ||
      !Number.isFinite(metadata.timestamp) ||
      metadata.checksum !== checksum(data)
    )
      throw new Error('データの形式、バージョン、または整合性を確認できません。');
    if (
      typeof data.eventName !== 'string' ||
      data.eventName.length > 50 ||
      !Array.isArray(data.members) ||
      data.members.length > MAX_MEMBERS ||
      !Array.isArray(data.payments) ||
      data.payments.length > MAX_PAYMENTS ||
      !validDate(data.lastUpdated)
    )
      throw new Error('イベントデータが不正です。');
    const members: WarikanState['members'][number][] = [];
    for (const item of data.members) {
      if (
        !object(item) ||
        !validId(item.id) ||
        typeof item.name !== 'string' ||
        members.some((m) => m.id === item.id)
      )
        throw new Error('メンバーデータが不正です。');
      const result = validateMemberName(item.name, members);
      if (!result.ok) throw new Error(result.error);
      members.push({ id: item.id, name: result.data });
    }
    const payments: Payment[] = [];
    for (const item of data.payments) {
      if (
        !object(item) ||
        !validId(item.id) ||
        payments.some((p) => p.id === item.id) ||
        !validId(item.payerId) ||
        typeof item.amount !== 'number' ||
        !validDate(item.createdAt) ||
        (item.memo !== undefined && typeof item.memo !== 'string') ||
        (item.needsReview !== undefined && typeof item.needsReview !== 'boolean')
      )
        throw new Error('支払いデータが不正です。');
      const legacy = metadata.version === '2.0.0' && item.participantIds === undefined;
      const participantIds = legacy ? members.map((m) => m.id) : item.participantIds;
      if (!Array.isArray(participantIds) || !participantIds.every(validId))
        throw new Error('割り勘の対象者が不正です。');
      const result = validatePayment(
        {
          payerId: item.payerId,
          amount: item.amount,
          memo: (item.memo as string) ?? '',
          participantIds,
        },
        members,
      );
      if (!result.ok) throw new Error(result.error);
      payments.push({
        ...result.data,
        id: item.id,
        createdAt: item.createdAt,
        ...(legacy || item.needsReview ? { needsReview: true } : {}),
      });
    }
    const state: WarikanState = {
      eventName: data.eventName,
      members,
      payments,
      lastUpdated: data.lastUpdated,
    };
    if (data.paypayLinks !== undefined) {
      const links = parsePayPayLinks(data.paypayLinks, state);
      if (!links.ok) throw new Error(links.error);
      return { ok: true, data: { ...state, paypayLinks: links.data } };
    }
    return { ok: true, data: state };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof SyntaxError
          ? 'ファイルを読み取れません。元のデータは変更していません。'
          : error instanceof Error
            ? error.message
            : 'データを読み取れません。',
    };
  }
}

export type LoadResult = Result<{ state: WarikanState; raw: string | null; recovered: boolean }>;
export function loadFromStorage(storage?: StoragePort): LoadResult {
  try {
    storage ??= window.localStorage;
    const raw = storage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = parseState(raw);
      if (parsed.ok) return { ok: true, data: { state: parsed.data, raw, recovered: false } };
    }
    const backup = storage.getItem(BACKUP_KEY);
    if (backup !== null) {
      const parsed = parseState(backup);
      if (parsed.ok) return { ok: true, data: { state: parsed.data, raw, recovered: true } };
    }
    if (raw !== null || backup !== null)
      return {
        ok: false,
        error: '保存データを読み取れません。元のデータを保護するため、自動保存を停止しました。',
      };
    return { ok: true, data: { state: emptyState(), raw: null, recovered: false } };
  } catch {
    return {
      ok: false,
      error:
        'このブラウザの保存データにアクセスできません。ブラウザの設定を確認して再試行してください。',
    };
  }
}

/** Compare before writing to avoid silently overwriting another tab's changes. */
export function saveToStorage(
  state: WarikanState,
  expectedRaw: string | null,
  storage?: StoragePort,
): SaveResult {
  try {
    storage ??= window.localStorage;
    const previous = storage.getItem(STORAGE_KEY);
    if (previous !== expectedRaw)
      return {
        ok: false,
        code: 'conflict',
        error: STORAGE_CONFLICT_MESSAGE,
      };
    const serialized = serializeState(state);
    const validated = parseState(serialized);
    if (!validated.ok) return { ...validated, code: 'invalid' };
    // Preserve the previous valid snapshot; never replace a good backup with corrupt data.
    if (previous !== null && parseState(previous).ok) {
      try {
        storage.setItem(BACKUP_KEY, previous);
      } catch {
        /* Main save can still succeed if storage is nearly full. */
      }
    }
    storage.setItem(STORAGE_KEY, serialized);
    return { ok: true, data: serialized };
  } catch {
    return {
      ok: false,
      code: 'unavailable',
      error:
        'ブラウザに保存できませんでした。入力はこの画面に残っています。再試行するか、バックアップを保存してください。',
    };
  }
}
