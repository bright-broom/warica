'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  emptyState,
  type WarikanState,
  type PaymentInput,
  type Result,
  type Settlement,
} from '@/lib/types';
import {
  loadFromStorage,
  saveToStorage,
  parseState,
  serializeState,
  MAX_FILE_SIZE,
  STORAGE_KEY,
} from '@/lib/storage';
import { MAX_MEMBERS, MAX_PAYMENTS, validateMemberName, validatePayment } from '@/lib/validation';
import {
  currentSettlements,
  retainPayPayLinks,
  settlementKey,
  validatePayPayUrl,
} from '@/lib/paypay';
import { calculateMemberBalances, calculateSettlements } from '@/lib/calculations';

function useStore() {
  const [state, setState] = useState<WarikanState>(() => emptyState());
  const stateRef = useRef(state);
  const rawRef = useRef<string | null>(null);
  const [isLoaded, setLoaded] = useState(false);
  const [loadBlocked, setLoadBlocked] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [storageConflict, setStorageConflict] = useState(false);
  const [notice, setNotice] = useState('');
  // Only explicit replacement resets drafts and page inputs; initial load/retry can restore them.
  const [eventRevision, setEventRevision] = useState(0);

  function load() {
    const result = loadFromStorage();
    if (result.ok) {
      rawRef.current = result.data.raw;
      stateRef.current = result.data.state;
      setState(result.data.state);
      setStorageError('');
      setStorageConflict(false);
      setLoadBlocked(false);
      setNotice(
        result.data.recovered
          ? '直前のバックアップから復元しました。最新の入力が含まれているか確認してください。'
          : '',
      );
    } else {
      setStorageError(result.error);
      setLoadBlocked(true);
    }
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, []);

  function persist(next: WarikanState, expectedRaw = rawRef.current): boolean {
    const result = saveToStorage(next, expectedRaw);
    if (result.ok) {
      rawRef.current = result.data;
      setStorageError('');
      setStorageConflict(false);
      return true;
    }
    setStorageError(result.error);
    setStorageConflict(result.code === 'conflict');
    return false;
  }

  function commit(next: WarikanState): Result<void> {
    if (!isLoaded || loadBlocked)
      return { ok: false, error: '保存データの読み込みを完了してください。' };
    const updated = {
      ...next,
      ...(next.paypayLinks ? { paypayLinks: retainPayPayLinks(next) } : {}),
      lastUpdated: new Date().toISOString(),
    };
    if (new Blob([serializeState(updated)]).size > MAX_FILE_SIZE) {
      return {
        ok: false,
        error:
          'イベントの保存容量（2MB）に達しました。バックアップを保存して、新しいイベントを始めてください。',
      };
    }
    // One provider owns the state across routes. Synchronous saving also covers immediate reloads.
    stateRef.current = updated;
    setState(updated);
    persist(updated);
    return { ok: true, data: undefined };
  }

  // Replacing an event is destructive: durable storage must succeed before publishing
  // the new state or clearing drafts. Ordinary edits deliberately retain unsaved input.
  function replaceEvent(
    next: WarikanState,
    expectedRaw = rawRef.current,
    nextNotice = '',
  ): Result<void> {
    if (!isLoaded) return { ok: false, error: '保存データの読み込みを完了してください。' };
    // A fresh stamp also invalidates old session drafts if clearing them fails.
    // Avoid collisions with the current/imported event, even within one millisecond.
    let timestamp = Date.now();
    const previousStamps = [stateRef.current.lastUpdated, next.lastUpdated].map(Date.parse);
    while (previousStamps.includes(timestamp)) timestamp += 1;
    const updated = { ...next, lastUpdated: new Date(timestamp).toISOString() };
    if (!persist(updated, expectedRaw))
      return {
        ok: false,
        error: 'イベントを保存できませんでした。現在のデータと下書きを保持しています。',
      };
    stateRef.current = updated;
    setState(updated);
    setEventRevision((revision) => revision + 1);
    setLoadBlocked(false);
    setNotice(nextNotice);
    return { ok: true, data: undefined };
  }

  const balances = useMemo(
    () => calculateMemberBalances(state.members, state.payments),
    [state.members, state.payments],
  );
  const settlements = useMemo(() => calculateSettlements(balances), [balances]);

  return {
    state,
    getCurrentState: () => stateRef.current,
    eventRevision,
    isLoaded,
    loadBlocked,
    storageError,
    storageConflict,
    notice,
    balances,
    settlements,
    total: state.payments.reduce((sum, p) => sum + p.amount, 0),
    retryStorage: () => (loadBlocked ? load() : persist(stateRef.current)),
    loadLatest(beforeReplace: () => boolean): Result<void> {
      if (!isLoaded || loadBlocked)
        return { ok: false, error: '保存データの読み込みを完了してください。' };
      // Validate first, then clear the user's draft, then publish the snapshot.
      // Never write the selected snapshot back over another tab's newer data.
      const latest = loadFromStorage();
      if (!latest.ok) {
        setStorageError(latest.error);
        return latest;
      }
      if (!beforeReplace())
        return { ok: false, error: '下書きを消去できませんでした。現在の入力を保持しています。' };
      rawRef.current = latest.data.raw;
      stateRef.current = latest.data.state;
      setState(latest.data.state);
      setStorageError('');
      setStorageConflict(false);
      setNotice(
        latest.data.recovered ? '直前のバックアップから復元しました。内容を確認してください。' : '',
      );
      setEventRevision((revision) => revision + 1);
      return { ok: true, data: undefined };
    },
    setEventName(name: string) {
      return commit({ ...stateRef.current, eventName: name.slice(0, 50) });
    },
    addMember(name: string): Result<void> {
      const current = stateRef.current;
      if (current.members.length >= MAX_MEMBERS)
        return { ok: false, error: 'メンバーは100人まで登録できます。' };
      const result = validateMemberName(name, current.members);
      if (!result.ok) return result;
      return commit({
        ...current,
        members: [...current.members, { id: crypto.randomUUID(), name: result.data }],
      });
    },
    editMember(id: string, name: string): Result<void> {
      const current = stateRef.current;
      const result = validateMemberName(
        name,
        current.members.filter((m) => m.id !== id),
      );
      if (!result.ok) return result;
      return commit({
        ...current,
        members: current.members.map((m) => (m.id === id ? { ...m, name: result.data } : m)),
      });
    },
    removeMember(id: string): Result<void> {
      const current = stateRef.current;
      if (current.payments.some((p) => p.payerId === id || p.participantIds.includes(id)))
        return {
          ok: false,
          error: '支払いに含まれるメンバーです。先に該当する支払いを編集・削除してください。',
        };
      return commit({ ...current, members: current.members.filter((m) => m.id !== id) });
    },
    savePayment(input: PaymentInput, id?: string): Result<void> {
      const current = stateRef.current;
      if (!id && current.payments.length >= MAX_PAYMENTS)
        return { ok: false, error: '支払いは10,000件まで登録できます。' };
      const result = validatePayment(input, current.members);
      if (!result.ok) return result;
      if (id && !current.payments.some((p) => p.id === id))
        return { ok: false, error: '編集する支払いが見つかりません。' };
      const payments = id
        ? current.payments.map((p) =>
            p.id === id ? { ...result.data, id, createdAt: p.createdAt } : p,
          )
        : [
            ...current.payments,
            { ...result.data, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ];
      return commit({ ...current, payments });
    },
    removePayment(id: string) {
      return commit({
        ...stateRef.current,
        payments: stateRef.current.payments.filter((p) => p.id !== id),
      });
    },
    savePayPayLink(settlement: Settlement, input: string): Result<void> {
      const current = stateRef.current;
      const transfer = currentSettlements(current).find(
        (item) => settlementKey(item) === settlementKey(settlement),
      );
      if (!transfer || current.payments.some((payment) => payment.needsReview))
        return { ok: false, error: '精算内容が変わりました。支払いを確認してください。' };
      const url = validatePayPayUrl(input);
      if (!url.ok) return url;
      return commit({
        ...current,
        paypayLinks: [
          ...(current.paypayLinks ?? []).filter(
            (item) => settlementKey(item) !== settlementKey(settlement),
          ),
          { ...transfer, url: url.data },
        ],
      });
    },
    removePayPayLink(settlement: Settlement) {
      return commit({
        ...stateRef.current,
        paypayLinks: (stateRef.current.paypayLinks ?? []).filter(
          (item) => settlementKey(item) !== settlementKey(settlement),
        ),
      });
    },
    preparePayPayHandoff(settlement: Settlement, url: string): boolean {
      const current = stateRef.current;
      const linked = retainPayPayLinks(current).some(
        (item) => settlementKey(item) === settlementKey(settlement) && item.url === url,
      );
      if (!linked || !validatePayPayUrl(url).ok || loadBlocked || !isLoaded) return false;
      // Recheck storage before leaving, including changes made by another tab.
      return persist(current);
    },
    resetAll(): Result<void> {
      if (!isLoaded || loadBlocked)
        return { ok: false, error: '保存データを読み込んでからやり直してください。' };
      return replaceEvent(emptyState());
    },
    importBackup(raw: string): Result<void> {
      const result = parseState(raw);
      if (!result.ok) return result;
      let expectedRaw = rawRef.current;
      if (loadBlocked) {
        // The file has been validated and the user explicitly confirmed replacement.
        // Keep the provider's storage baseline unchanged until the write succeeds.
        try {
          expectedRaw = window.localStorage.getItem(STORAGE_KEY);
        } catch {
          return {
            ok: false,
            error: 'ブラウザの保存領域にアクセスできません。設定を確認してください。',
          };
        }
      }
      return replaceEvent(
        result.data,
        expectedRaw,
        loadBlocked ? 'バックアップファイルから復元しました。' : '',
      );
    },
  };
}

const StoreContext = createContext<ReturnType<typeof useStore> | null>(null);
export function WarikanProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
export function useWarikanStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('WarikanProvider is required');
  return store;
}
