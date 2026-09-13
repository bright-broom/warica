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
import { emptyState, type WarikanState, type PaymentInput, type Result } from '@/lib/types';
import {
  loadFromStorage,
  saveToStorage,
  parseState,
  serializeState,
  MAX_FILE_SIZE,
  STORAGE_KEY,
} from '@/lib/storage';
import { MAX_MEMBERS, MAX_PAYMENTS, validateMemberName, validatePayment } from '@/lib/validation';
import { calculateMemberBalances, calculateSettlements } from '@/lib/calculations';

function useStore() {
  const [state, setState] = useState<WarikanState>(() => emptyState());
  const stateRef = useRef(state);
  const rawRef = useRef<string | null>(null);
  const [isLoaded, setLoaded] = useState(false);
  const [loadBlocked, setLoadBlocked] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [notice, setNotice] = useState('');
  const [eventRevision, setEventRevision] = useState(0);

  function load() {
    const result = loadFromStorage();
    if (result.ok) {
      rawRef.current = result.data.raw;
      stateRef.current = result.data.state;
      setState(result.data.state);
      setEventRevision((revision) => revision + 1);
      setStorageError('');
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

  function persist(next: WarikanState): boolean {
    const result = saveToStorage(next, rawRef.current);
    if (result.ok) {
      rawRef.current = result.data;
      setStorageError('');
      return true;
    }
    setStorageError(result.error);
    return false;
  }

  function commit(next: WarikanState): Result<void> {
    if (!isLoaded || loadBlocked)
      return { ok: false, error: '保存データの読み込みを完了してください。' };
    const updated = { ...next, lastUpdated: new Date().toISOString() };
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

  const balances = useMemo(
    () => calculateMemberBalances(state.members, state.payments),
    [state.members, state.payments],
  );
  const settlements = useMemo(() => calculateSettlements(balances), [balances]);

  return {
    state,
    eventRevision,
    isLoaded,
    loadBlocked,
    storageError,
    notice,
    balances,
    settlements,
    total: state.payments.reduce((sum, p) => sum + p.amount, 0),
    retryStorage: () => (loadBlocked ? load() : persist(stateRef.current)),
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
    resetAll(): Result<void> {
      if (!isLoaded || loadBlocked)
        return { ok: false, error: '保存データを読み込んでからやり直してください。' };
      const next = emptyState();
      // Never discard the current event if storing the reset fails.
      if (!persist(next))
        return {
          ok: false,
          error: '新しいイベントを保存できませんでした。現在のデータを保持しています。',
        };
      stateRef.current = next;
      setState(next);
      setEventRevision((revision) => revision + 1);
      setNotice('');
      return { ok: true, data: undefined };
    },
    importBackup(raw: string): Result<void> {
      const result = parseState(raw);
      if (!result.ok) return result;
      if (loadBlocked) {
        // The file has been validated and the user explicitly confirmed replacement.
        try {
          rawRef.current = window.localStorage.getItem(STORAGE_KEY);
        } catch {
          return {
            ok: false,
            error: 'ブラウザの保存領域にアクセスできません。設定を確認してください。',
          };
        }
        if (!persist(result.data))
          return {
            ok: false,
            error: 'バックアップを保存できませんでした。元のデータは変更していません。',
          };
        stateRef.current = result.data;
        setState(result.data);
        setEventRevision((revision) => revision + 1);
        setLoadBlocked(false);
        setNotice('バックアップファイルから復元しました。');
        return { ok: true, data: undefined };
      }
      const imported = commit(result.data);
      if (imported.ok) setEventRevision((revision) => revision + 1);
      return imported;
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
