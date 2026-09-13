'use client';
import { useState, type FormEvent } from 'react';
import {
  Check,
  Plus,
  ReceiptText,
  X,
  ListChecks,
  Square,
  Users,
  UserRound,
  Banknote,
  Info,
} from 'lucide-react';
import { IconAction } from './IconAction';
import { useWarikanStore } from '@/app/useWarikanStore';
import type { Payment } from '@/lib/types';
import { calculatePaymentSplit, yen } from '@/lib/calculations';
import { validateAmount } from '@/lib/validation';

export function PaymentEditor({
  payment,
  onDone,
  onCancel,
}: {
  payment?: Payment;
  onDone: () => void;
  onCancel: () => void;
}) {
  const {
    state: { members },
    savePayment,
  } = useWarikanStore();
  const [payerId, setPayer] = useState(payment?.payerId ?? members[0]?.id ?? '');
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '');
  const [memo, setMemo] = useState(payment?.memo ?? '');
  const [participants, setParticipants] = useState<readonly string[]>(
    payment?.participantIds ?? members.map((m) => m.id),
  );
  const [error, setError] = useState('');
  const selected = members.filter((m) => participants.includes(m.id));
  const valid = validateAmount(Number(amount));
  const shares = valid ? calculatePaymentSplit(Number(amount), selected.length) : [];
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = savePayment(
      { payerId, amount: Number(amount), memo, participantIds: selected.map((m) => m.id) },
      payment?.id,
    );
    if (result.ok) onDone();
    else setError(result.error);
  }
  return (
    <section className="panel" id="payment-editor">
      <div className="section-heading">
        <span className="section-icon">
          <ReceiptText size={19} />
        </span>
        <h2 className="sr-only">{payment ? '支払いを編集' : '支払いを追加'}</h2>
        {payment && <IconAction label="編集をキャンセル" icon={X} onClick={onCancel} />}
      </div>
      <form onSubmit={submit} className="payment-form">
        <div className="form-row">
          <div className="field">
            <label htmlFor="payer" title="支払った人">
              <UserRound size={17} aria-hidden="true" />
              <span className="sr-only">支払った人</span>
            </label>
            <select
              id="payer"
              className="text-input"
              value={payerId}
              onChange={(e) => setPayer(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="amount" title="金額">
              <Banknote size={17} aria-hidden="true" />
              <span className="sr-only">金額</span>
            </label>
            <div className="amount-input">
              <span>¥</span>
              <input
                id="amount"
                className="text-input"
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                aria-describedby="amount-hint"
              />
            </div>
          </div>
        </div>
        <p id="amount-hint" className="sr-only">
          1〜1,000,000円・整数で入力
        </p>
        <div className="field">
          <label htmlFor="memo" className="sr-only">
            何の支払い？
          </label>
          <input
            id="memo"
            className="text-input"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={100}
            placeholder="内容（任意）"
          />
        </div>
        <fieldset className="participants">
          <legend title="割り勘に含める人">
            <Users size={18} aria-hidden="true" />
            <span className="sr-only">割り勘に含める人</span>
          </legend>
          <div className="participants-hint">
            <IconAction
              label={selected.length === members.length ? '全員の選択を解除' : '全員を選択'}
              icon={selected.length === members.length ? Square : ListChecks}
              onClick={() =>
                setParticipants(selected.length === members.length ? [] : members.map((m) => m.id))
              }
            />
          </div>
          <div className="participant-grid">
            {members.map((m) => (
              <label
                key={m.id}
                className={`participant-chip ${participants.includes(m.id) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={participants.includes(m.id)}
                  onChange={(e) =>
                    setParticipants(
                      e.target.checked
                        ? [...participants, m.id]
                        : participants.filter((id) => id !== m.id),
                    )
                  }
                />
                <span className="checkbox-visual">
                  <Check size={12} />
                </span>
                <span>{m.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="split-preview" aria-live="polite">
          <div>
            <span className="split-count" aria-label={`${selected.length}人で割り勘`}>
              <Users size={16} aria-hidden="true" />
              {selected.length}
            </span>
            <strong>
              {shares.length
                ? shares[0] === shares[shares.length - 1]
                  ? yen(shares[0])
                  : `${yen(shares[shares.length - 1])}〜${yen(shares[0])}`
                : '—'}
              <span> / 人</span>
            </strong>
          </div>
          <details className="calculation-help">
            <summary aria-label="計算ルール" title="計算ルール">
              <Info size={16} aria-hidden="true" />
            </summary>
            <p>端数は対象者の登録順に1円ずつ配分。金額は1〜1,000,000円の整数。</p>
          </details>
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <IconAction
            type="submit"
            label={payment ? '変更を保存する' : 'この支払いを追加する'}
            icon={payment ? Check : Plus}
            className="primary"
            disabled={!valid || !selected.length || !payerId}
          />
        </div>
      </form>
    </section>
  );
}
