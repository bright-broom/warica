'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, MoveUpRight } from 'lucide-react';
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
        <h1>支払いを記録してから精算</h1>
        <p>メンバーを登録し、立て替えた支払いを追加してください。</p>
        <Link className="button primary" href="/payments">
          支払いを記録する
          <ArrowRight size={16} />
        </Link>
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
      <div className="page-heading">
        <p className="eyebrow">03 — ALL SQUARE</p>
        <h1>お会計、すっきり。</h1>
        <p>
          立て替えをまとめて、やり取りを少なく。
          <br className="mobile-break" />
          この金額を送れば、みんなの精算が完了です。
        </p>
      </div>
      {state.payments.some((p) => p.needsReview) && (
        <div className="notice">
          旧データの対象者が未確認です。<Link href="/payments">支払いを編集して確認</Link>
          してから、この結果を使ってください。
        </div>
      )}
      <section className="result-hero">
        <div>
          <span className="eyebrow">{state.eventName}</span>
          <p>みんなで使った金額</p>
          <strong>{yen(total)}</strong>
          <span className="result-meta">
            {state.members.length}人 · {state.payments.length}件の支払い
          </span>
        </div>
        <div className="result-seal" aria-hidden="true">
          <Check size={34} strokeWidth={1.5} />
          <span>ALL SQUARE</span>
        </div>
      </section>
      <section className="panel transfer-panel">
        <div className="section-heading">
          <h2>この順番で、精算しよう</h2>
          <span className="count-pill">{settlements.length}件の送金</span>
        </div>
        <p className="section-description">実際の送金は、現金やお好きな決済アプリで。</p>
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
            <h3>送金は不要です</h3>
            <p>全員の立て替えと負担額が一致しています。</p>
          </div>
        )}
        <button className="button primary full-width" onClick={() => void copy()}>
          <Copy size={17} />
          精算結果をコピー
        </button>
        <p className="form-message" role="status">
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
          <h2>一人ひとりの内訳</h2>
          <span className="small muted">支払額 − 負担額</span>
        </div>
        <div className="balance-table">
          <div className="balance-table-head">
            <span>メンバー</span>
            <span>支払った額</span>
            <span>自分の負担</span>
            <span>精算する額</span>
          </div>
          {balances.map((b, i) => (
            <div className="balance-row" key={b.memberId}>
              <div className="balance-member">
                <Avatar name={b.memberName} index={i} />
                <span>{b.memberName}</span>
              </div>
              <div>
                <span className="mobile-label">支払った額</span>
                {yen(b.paid)}
              </div>
              <div>
                <span className="mobile-label">自分の負担</span>
                {yen(b.share)}
              </div>
              <div className={b.balance > 0 ? 'receive' : b.balance < 0 ? 'pay' : 'muted'}>
                <strong>{yen(Math.abs(b.balance))}</strong>
                <small>{b.balance > 0 ? '受け取る' : b.balance < 0 ? '支払う' : '精算不要'}</small>
              </div>
            </div>
          ))}
        </div>
        <p className="table-footnote">
          端数は、支払いごとに対象者の登録順で1円ずつ配分しています。
        </p>
      </section>
      <PaymentHistory />
      <div className="next-action">
        <Link href="/payments" className="back-link">
          <ArrowLeft size={16} />
          支払いを追加・編集する
        </Link>
        <span className="small muted">また次の、楽しい集まりで。</span>
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
