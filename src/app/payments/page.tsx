'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Wallet, ReceiptText } from 'lucide-react';
import { IconAction, IconLink } from '@/components/IconAction';
import { AppShell } from '@/components/AppShell';
import { PaymentEditor } from '@/components/PaymentEditor';
import { PaymentHistory } from '@/components/PaymentHistory';
import { useWarikanStore } from '../useWarikanStore';
import type { Payment } from '@/lib/types';
import { yen } from '@/lib/calculations';

function Payments() {
  const { state, total } = useWarikanStore();
  const [editing, setEditing] = useState<Payment>();
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState('');
  if (!state.eventName.trim() || state.members.length < 2)
    return (
      <div className="empty-state">
        <h1>メンバー未登録</h1>
        <IconLink label="メンバーを登録する" icon={ArrowRight} className="primary" href="/" />
      </div>
    );
  function complete() {
    setMessage(editing ? '支払いを更新しました。' : '支払いを追加しました。');
    setEditing(undefined);
    setFormKey((k) => k + 1);
  }
  return (
    <>
      <h1 className="sr-only">支払い</h1>
      <div className="total-strip">
        <div>
          <span title="立て替え合計">
            <Wallet size={20} aria-hidden="true" />
            <span className="sr-only">立て替え合計</span>
          </span>
          <strong>{yen(total)}</strong>
        </div>
        <span className="count-pill" aria-label={`${state.payments.length}件の支払い`}>
          <ReceiptText size={14} aria-hidden="true" />
          {state.payments.length}
        </span>
      </div>
      {state.payments.some((p) => p.needsReview) && (
        <div className="notice">旧データは全員で仮計算。対象者を確認してください。</div>
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
      <div className="next-action">
        <IconLink href="/" label="メンバーに戻る" icon={ArrowLeft} />
        {state.payments.length ? (
          <IconLink
            href="/result"
            label="精算結果を見る"
            icon={ArrowRight}
            className="primary next-icon"
          />
        ) : (
          <IconAction
            label="精算結果を見る"
            icon={ArrowRight}
            className="primary next-icon"
            disabled
          />
        )}
      </div>
    </>
  );
}
export default function PaymentsPage() {
  return (
    <AppShell>
      <Payments />
    </AppShell>
  );
}
