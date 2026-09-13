'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Wallet, ReceiptText } from 'lucide-react';
import { IconAction, IconLink } from '@/components/IconAction';
import { ActionRow, Badge, Notice } from '@/components/ui';
import { Feedback } from '@/components/ui/Feedback';
import { usePaymentWorkspace } from '@/components/PaymentWorkspace';
import { PaymentEditor } from '@/components/PaymentEditor';
import { PaymentHistory } from '@/components/PaymentHistory';
import { routes } from '@/config/navigation';
import { useWarikanStore } from '../useWarikanStore';
import { yen } from '@/lib/calculations';

export default function PaymentsPage() {
  const { state, total } = useWarikanStore();
  const workspace = usePaymentWorkspace();
  const [feedback, setFeedback] = useState<{ id: number; message: string } | null>(null);
  function complete({ amount, edited }: { amount: number; edited: boolean }) {
    setFeedback((current) => ({
      id: (current?.id ?? 0) + 1,
      message: `${yen(amount)} ${edited ? '更新しました' : '追加しました'}`,
    }));
  }
  return (
    <>
      <h1 className="sr-only">支払い</h1>
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-3" aria-label="立て替え合計">
          <Wallet size={22} aria-hidden="true" />
          <strong className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
            {yen(total)}
          </strong>
        </div>
        <Badge aria-label={`${state.payments.length}件の支払い`}>
          <ReceiptText size={14} aria-hidden="true" />
          {state.payments.length}
        </Badge>
      </div>
      {state.payments.some((p) => p.needsReview) && (
        <Notice>旧データは全員で仮計算。対象者を確認してください。</Notice>
      )}
      <PaymentEditor onDone={complete} />
      {feedback && <Feedback key={feedback.id} message={feedback.message} />}
      {!!state.payments.length && (
        <PaymentHistory
          onEdit={(payment) => {
            workspace.startEditing(payment);
            document
              .getElementById('payment-editor')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            requestAnimationFrame(() => {
              const input = document.getElementById('amount') as HTMLInputElement | null;
              input?.focus({ preventScroll: true });
              input?.select();
            });
          }}
          onRemove={(id) => {
            if (workspace.editingId === id) workspace.cancelEditing();
          }}
        />
      )}
      <ActionRow>
        <IconLink href={routes.members} label="メンバーに戻る" icon={ArrowLeft} />
        {state.payments.length ? (
          <IconLink
            href={routes.result}
            label="精算結果を見る"
            icon={ArrowRight}
            variant="primary"
            size="large"
          />
        ) : (
          <IconAction
            label="精算結果を見る"
            icon={ArrowRight}
            variant="primary"
            size="large"
            disabled
          />
        )}
      </ActionRow>
    </>
  );
}
