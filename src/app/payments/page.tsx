'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Wallet, ReceiptText } from 'lucide-react';
import { IconAction, IconLink } from '@/components/IconAction';
import { ActionRow, Badge, Notice, Panel } from '@/components/ui';
import { PaymentEditor } from '@/components/PaymentEditor';
import { PaymentHistory } from '@/components/PaymentHistory';
import { routes } from '@/config/navigation';
import { useWarikanStore } from '../useWarikanStore';
import type { Payment } from '@/lib/types';
import { yen } from '@/lib/calculations';

export default function PaymentsPage() {
  const { state, total } = useWarikanStore();
  const [editing, setEditing] = useState<Payment>();
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState('');
  function complete() {
    setMessage(editing ? '支払いを更新しました。' : '支払いを追加しました。');
    setEditing(undefined);
    setFormKey((k) => k + 1);
  }
  return (
    <>
      <h1 className="sr-only">支払い</h1>
      <Panel tone="soft" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3" aria-label="立て替え合計">
          <Wallet size={22} aria-hidden="true" />
          <strong className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {yen(total)}
          </strong>
        </div>
        <Badge aria-label={`${state.payments.length}件の支払い`}>
          <ReceiptText size={14} aria-hidden="true" />
          {state.payments.length}
        </Badge>
      </Panel>
      {state.payments.some((p) => p.needsReview) && (
        <Notice>旧データは全員で仮計算。対象者を確認してください。</Notice>
      )}
      <PaymentEditor
        key={`${editing?.id ?? 'new'}-${formKey}`}
        payment={editing}
        onDone={complete}
        onCancel={() => setEditing(undefined)}
      />
      <p className="sr-only" role="status">
        {message}
      </p>
      <PaymentHistory
        onEdit={(p) => {
          setEditing(p);
          setMessage('');
          document
            .getElementById('payment-editor')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />
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
