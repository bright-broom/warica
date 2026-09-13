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
} from 'lucide-react';
import { IconAction } from './IconAction';
import {
  ActionRow,
  Badge,
  Field,
  Help,
  Notice,
  Panel,
  SectionHeader,
  SelectInput,
  TextInput,
} from './ui';
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
    <Panel id="payment-editor" className="scroll-mt-6">
      <SectionHeader icon={ReceiptText} title={payment ? '支払いを編集' : '支払いを追加'}>
        {payment && <IconAction label="編集をキャンセル" icon={X} onClick={onCancel} />}
      </SectionHeader>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="payer" label="支払った人" icon={UserRound}>
            <SelectInput id="payer" value={payerId} onChange={(e) => setPayer(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field id="amount" label="金額" icon={Banknote}>
            <div className="relative">
              <span
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-main/60"
                aria-hidden="true"
              >
                ¥
              </span>
              <TextInput
                id="amount"
                className="pl-9 font-semibold tabular-nums"
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                aria-describedby="amount-hint"
              />
            </div>
          </Field>
        </div>
        <p id="amount-hint" className="sr-only">
          1〜1,000,000円・整数で入力
        </p>
        <Field id="memo" label="何の支払い？">
          <TextInput
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={100}
            placeholder="内容（任意）"
          />
        </Field>
        <fieldset className="min-w-0 border-t border-main/10 pt-2">
          <legend title="割り勘に含める人" className="pr-3">
            <Users size={18} aria-hidden="true" />
            <span className="sr-only">割り勘に含める人</span>
          </legend>
          <div className="flex justify-end">
            <IconAction
              label={selected.length === members.length ? '全員の選択を解除' : '全員を選択'}
              icon={selected.length === members.length ? Square : ListChecks}
              onClick={() =>
                setParticipants(selected.length === members.length ? [] : members.map((m) => m.id))
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <label
                key={m.id}
                className="relative flex min-h-control max-w-full cursor-pointer items-center gap-2 rounded-control border border-main/15 px-3 py-2 text-sm transition-colors has-checked:border-main/30 has-checked:bg-accent/30 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-main"
              >
                <input
                  className="peer absolute inset-0 size-full cursor-pointer opacity-0"
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
                <span
                  className="flex size-4 shrink-0 items-center justify-center rounded border border-main/30 text-transparent peer-checked:border-main peer-checked:bg-main peer-checked:text-accent"
                  aria-hidden="true"
                >
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="min-w-0 wrap-anywhere">{m.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="rounded-control bg-accent/15 p-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge aria-label={`${selected.length}人で割り勘`}>
              <Users size={16} aria-hidden="true" />
              {selected.length}
            </Badge>
            <strong className="text-base font-semibold tabular-nums sm:text-lg">
              {shares.length
                ? shares[0] === shares[shares.length - 1]
                  ? yen(shares[0])
                  : `${yen(shares[shares.length - 1])}〜${yen(shares[0])}`
                : '—'}
              <span className="text-xs font-normal text-main/60"> / 人</span>
            </strong>
          </div>
          <Help label="計算ルール">
            端数は対象者の登録順に1円ずつ配分。金額は1〜1,000,000円の整数。
          </Help>
        </div>
        {error && <Notice alert>{error}</Notice>}
        <ActionRow>
          <IconAction
            type="submit"
            label={payment ? '変更を保存する' : 'この支払いを追加する'}
            icon={payment ? Check : Plus}
            variant="primary"
            disabled={!valid || !selected.length || !payerId}
          />
        </ActionRow>
      </form>
    </Panel>
  );
}
