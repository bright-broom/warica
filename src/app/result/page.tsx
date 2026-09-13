'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  MoveUpRight,
  Users,
  ReceiptText,
  ArrowRightLeft,
  ChartNoAxesColumn,
  Info,
} from 'lucide-react';
import { IconAction, IconLink } from '@/components/IconAction';
import { AppShell, Avatar } from '@/components/AppShell';
import { PaymentHistory } from '@/components/PaymentHistory';
import { useWarikanStore } from '../useWarikanStore';
import { settlementText, yen } from '@/lib/calculations';

function Results() {
  const { state, balances, settlements, total } = useWarikanStore();
  const [message, setMessage] = useState('');
  const [showText, setShowText] = useState(false);
  if (!state.payments.length || state.members.length < 2 || !state.eventName.trim())
    return (
      <div className="empty-state">
        <h1>支払い未登録</h1>
        <IconLink label="支払いを記録する" icon={ArrowRight} className="primary" href="/payments" />
      </div>
    );
  const text = settlementText(state);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('精算結果をコピーしました。チャットに貼り付けて共有できます。');
    } catch {
      setShowText(true);
      setMessage('コピーできませんでした。下のテキストを選択してコピーしてください。');
    }
  }
  return (
    <>
      <h1 className="sr-only">精算</h1>
      {state.payments.some((p) => p.needsReview) && (
        <div className="notice">
          旧データは全員で仮計算。<Link href="/payments">対象者を確認</Link>してください。
        </div>
      )}
      <section className="result-hero">
        <div>
          <span className="eyebrow">{state.eventName}</span>
          <p>合計</p>
          <strong>{yen(total)}</strong>
          <span className="result-meta">
            <span aria-label={`${state.members.length}人`}>
              <Users size={14} aria-hidden="true" />
              {state.members.length}
            </span>
            <span aria-label={`${state.payments.length}件の支払い`}>
              <ReceiptText size={14} aria-hidden="true" />
              {state.payments.length}
            </span>
          </span>
        </div>
      </section>
      <section className="panel transfer-panel">
        <div className="section-heading">
          <ArrowRightLeft size={20} aria-hidden="true" />
          <h2 className="sr-only">送金</h2>
          <span className="count-pill">{settlements.length}件</span>
        </div>
        {settlements.length ? (
          <ol className="transfer-list">
            {settlements.map((s, i) => (
              <li key={`${s.fromId}-${s.toId}`}>
                <span className="transfer-number">{String(i + 1).padStart(2, '0')}</span>
                <div className="transfer-people">
                  <span>{s.from}</span>
                  <ArrowRight size={18} />
                  <span>{s.to}</span>
                </div>
                <strong>{yen(s.amount)}</strong>
                <MoveUpRight className="transfer-icon" size={18} />
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state compact">
            <Check size={30} />
            <h3>精算不要</h3>
          </div>
        )}
        <div className="form-actions">
          <IconAction
            label="精算結果をコピー"
            icon={message && !showText ? Check : Copy}
            className="primary"
            onClick={() => void copy()}
          />
        </div>
        <p className={showText ? 'form-message' : 'sr-only'} role="status">
          {message}
        </p>
        {showText && (
          <div className="field">
            <label htmlFor="share-text">共有用テキスト</label>
            <textarea
              id="share-text"
              className="text-input share-text"
              value={text}
              readOnly
              onFocus={(e) => e.target.select()}
            />
          </div>
        )}
      </section>
      <section className="panel">
        <div className="section-heading">
          <ChartNoAxesColumn size={20} aria-hidden="true" />
          <h2 className="sr-only">内訳</h2>
        </div>
        <div className="balance-table">
          <div className="balance-table-head">
            <span>メンバー</span>
            <span>支払</span>
            <span>負担</span>
            <span>差額</span>
          </div>
          {balances.map((b, i) => (
            <div className="balance-row" key={b.memberId}>
              <div className="balance-member">
                <Avatar name={b.memberName} index={i} />
                <span>{b.memberName}</span>
              </div>
              <div>
                <span className="mobile-label">支払</span>
                {yen(b.paid)}
              </div>
              <div>
                <span className="mobile-label">負担</span>
                {yen(b.share)}
              </div>
              <div className={b.balance > 0 ? 'receive' : b.balance < 0 ? 'pay' : 'muted'}>
                <strong>{yen(Math.abs(b.balance))}</strong>
                <small>{b.balance > 0 ? '受け取る' : b.balance < 0 ? '支払う' : '精算不要'}</small>
              </div>
            </div>
          ))}
        </div>
        <details className="calculation-help">
          <summary aria-label="精算について" title="精算について">
            <Info size={16} aria-hidden="true" />
          </summary>
          <p>端数は支払いごとに対象者の登録順で1円ずつ配分。送金は各自で行ってください。</p>
        </details>
      </section>
      <PaymentHistory />
      <div className="next-action">
        <IconLink href="/payments" label="支払いを追加・編集する" icon={ArrowLeft} />
      </div>
    </>
  );
}
export default function ResultPage() {
  return (
    <AppShell>
      <Results />
    </AppShell>
  );
}
