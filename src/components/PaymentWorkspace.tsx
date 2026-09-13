'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { useWarikanStore } from '@/app/useWarikanStore';
import type { Payment } from '@/lib/types';

export type PaymentDraft = {
  payerId: string;
  amount: string;
  memo: string;
  // null follows the current member list until the user customizes it.
  participantIds: readonly string[] | null;
};
const emptyDraft = (): PaymentDraft => ({
  payerId: '',
  amount: '',
  memo: '',
  participantIds: null,
});

function useWorkspace() {
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState<{ id: string; draft: PaymentDraft } | null>(null);
  return {
    draft: editing?.draft ?? draft,
    editingId: editing?.id,
    updateDraft(patch: Partial<PaymentDraft>) {
      if (editing)
        setEditing((current) => current && { ...current, draft: { ...current.draft, ...patch } });
      else setDraft((current) => ({ ...current, ...patch }));
    },
    startEditing(payment: Payment) {
      setEditing({
        id: payment.id,
        draft: {
          payerId: payment.payerId,
          amount: String(payment.amount),
          memo: payment.memo,
          participantIds: payment.participantIds,
        },
      });
    },
    cancelEditing() {
      setEditing(null);
    },
    complete() {
      if (editing) setEditing(null);
      else setDraft((current) => ({ ...current, amount: '', memo: '' }));
    },
  };
}
const WorkspaceContext = createContext<ReturnType<typeof useWorkspace> | null>(null);
function DraftProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}

/** Route changes preserve inputs; replacing the event starts a fresh workspace. */
export function PaymentWorkspaceProvider({ children }: { children: ReactNode }) {
  const { eventRevision } = useWarikanStore();
  return <DraftProvider key={eventRevision}>{children}</DraftProvider>;
}
export function usePaymentWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error('PaymentWorkspaceProvider is required');
  return workspace;
}
