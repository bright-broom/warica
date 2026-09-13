'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useWarikanStore } from '@/app/useWarikanStore';
import type { Payment } from '@/lib/types';
import {
  DRAFT_KEY,
  emptyWorkspace,
  readDraft,
  serializeDraft,
  type DraftWorkspace,
  type PaymentDraft,
} from '@/lib/payment-draft';

function useWorkspace() {
  const store = useWarikanStore();
  const [value, setValue] = useState(emptyWorkspace);
  const current = useRef(value);
  const revision = useRef<number | null>(null);
  const readBlocked = useRef(false);
  const [storageError, setStorageError] = useState('');

  function persist(next = current.current): boolean {
    if (readBlocked.current) return false;
    try {
      window.sessionStorage.setItem(
        DRAFT_KEY,
        serializeDraft(next, store.getCurrentState().lastUpdated),
      );
      setStorageError('');
      return true;
    } catch {
      setStorageError('下書きを保存できません。再読み込みせずに保存を再試行してください。');
      return false;
    }
  }
  function restore(): boolean {
    try {
      const result = readDraft(
        window.sessionStorage.getItem(DRAFT_KEY),
        store.getCurrentState().lastUpdated,
      );
      if (!result.ok) throw new Error(result.error);
      current.current = result.data;
      setValue(result.data);
      readBlocked.current = false;
      setStorageError('');
      return true;
    } catch {
      readBlocked.current = true;
      setStorageError('下書きを読み込めません。再読み込みせずに保存を再試行してください。');
      return false;
    }
  }
  // The provider persists across routes. Initial hydration restores the tab's draft;
  // explicit event replacement clears it, including imports of the same event.
  useEffect(() => {
    if (!store.isLoaded || store.loadBlocked) return;
    if (revision.current === null && store.eventRevision === 0) restore();
    else if (revision.current !== store.eventRevision) {
      current.current = emptyWorkspace();
      setValue(current.current);
      readBlocked.current = false;
      persist();
    } else if (!readBlocked.current) persist();
    revision.current = store.eventRevision;
    // Store functions read current refs; these lifecycle transitions are the dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.isLoaded, store.loadBlocked, store.eventRevision, store.state.lastUpdated]);

  function update(next: DraftWorkspace) {
    current.current = next;
    setValue(next);
    persist(next);
  }
  return {
    draft: value.editing?.draft ?? value.draft,
    editingId: value.editing?.id,
    storageError,
    readBlocked: readBlocked.current,
    retryStorage() {
      return readBlocked.current ? restore() : persist();
    },
    discardDrafts(): boolean {
      // Called only after explicit confirmation. Keep memory intact if deletion fails.
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        setStorageError('下書きを消去できません。現在の入力は保持しています。');
        return false;
      }
      current.current = emptyWorkspace();
      setValue(current.current);
      readBlocked.current = false;
      setStorageError('');
      return true;
    },
    updateDraft(patch: Partial<PaymentDraft>) {
      const previous = current.current;
      update(
        previous.editing
          ? {
              ...previous,
              editing: { ...previous.editing, draft: { ...previous.editing.draft, ...patch } },
            }
          : { ...previous, draft: { ...previous.draft, ...patch } },
      );
    },
    startEditing(payment: Payment) {
      update({
        ...current.current,
        editing: {
          id: payment.id,
          draft: {
            payerId: payment.payerId,
            amount: String(payment.amount),
            memo: payment.memo,
            participantIds: payment.participantIds,
          },
        },
      });
    },
    cancelEditing() {
      update({ ...current.current, editing: null });
    },
    complete() {
      const previous = current.current;
      update(
        previous.editing
          ? { ...previous, editing: null }
          : { ...previous, draft: { ...previous.draft, amount: '', memo: '' } },
      );
    },
  };
}
const WorkspaceContext = createContext<ReturnType<typeof useWorkspace> | null>(null);
export function PaymentWorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}
export function usePaymentWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error('PaymentWorkspaceProvider is required');
  return workspace;
}
