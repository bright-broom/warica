'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
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
        <h1>まずは、メンバーを登録</h1>
        <p>イベント名と2人以上のメンバーが必要です。</p>
        <Link className="button primary" href="/">
          メンバーを登録する
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  function complete() {
    setMessage(editing ? '支払いを更新しました。' : '支払いを追加しました。');
    setEditing(undefined);
    setFormKey((k) => k + 1);
  }
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">02 — THE PAYMENTS</p>
        <h1>立て替えた分を、記録。</h1>
        <p>
          誰が、何に、いくら払った？
          <br className="mobile-break" />
          割り勘する人は、支払いごとに選べます。
        </p>
      </div>
      <div className="total-strip">
        <div>
          <span>これまでの立て替え</span>
          <strong>{yen(total)}</strong>
        </div>
        <span className="count-pill">{state.payments.length}件の支払い</span>
      </div>
      {state.payments.some((p) => p.needsReview) && (
        <div className="notice">
          旧バージョンには対象者の記録がないため、全員を仮設定しています。該当する支払いを編集して、対象者を確認してください。端数は支払いごとに再計算されます。
        </div>
      )}
      <PaymentEditor
        key={`${editing?.id ?? 'new'}-${formKey}`}
        payment={editing}
        onDone={complete}
        onCancel={() => setEditing(undefined)}
      />
      <p className="form-message" role="status">
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
        <Link href="/" className="back-link">
          <ArrowLeft size={16} />
          メンバーに戻る
        </Link>
        {state.payments.length ? (
          <Link className="button primary large-button" href="/result">
            精算結果を見る
            <ArrowRight size={18} />
          </Link>
        ) : (
          <button className="button primary large-button" disabled>
            精算結果を見る
            <ArrowRight size={18} />
          </button>
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
