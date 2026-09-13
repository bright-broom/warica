'use client';
import { useRef, useState, type FormEvent } from 'react';
import {
  Check,
  Plus,
  ReceiptText,
  X,
  ListChecks,
  Square,
  Users,
  UserRound,
  Utensils,
  BedDouble,
  TrainFront,
  Coffee,
} from 'lucide-react';
import { IconAction } from './IconAction';
import { Field, Help, Notice, Panel, SectionHeader, SelectInput, TextInput } from './ui';
import { usePaymentWorkspace } from './PaymentWorkspace';
import { useWarikanStore } from '@/app/useWarikanStore';
import { calculatePaymentSplit, yen } from '@/lib/calculations';
import { validateAmount } from '@/lib/validation';
import { normalizeYenInput } from '@/lib/input';

export function PaymentEditor({
  onDone,
}: {
  onDone: (result: { amount: number; edited: boolean }) => void;
}) {
  const {
    state: { members },
    savePayment,
  } = useWarikanStore();
  const workspace = usePaymentWorkspace();
  const { draft, editingId, updateDraft } = workspace;
  const { amount, memo } = draft;
  const payerId = members.some((member) => member.id === draft.payerId)
    ? draft.payerId
    : (members[0]?.id ?? '');
  const participants = draft.participantIds ?? members.map((member) => member.id);
  const selected = members.filter((member) => participants.includes(member.id));
  const amountRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const valid = validateAmount(Number(amount));
  const shares = valid ? calculatePaymentSplit(Number(amount), selected.length) : [];
  const amountError = amount.trim() && !valid ? '1〜1,000,000円の整数' : '';
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = savePayment(
      {
        payerId,
        amount: Number(amount),
        memo,
        participantIds: selected.map((member) => member.id),
      },
      editingId,
    );
    if (result.ok) {
      workspace.complete();
      setError('');
      onDone({ amount: Number(amount), edited: !!editingId });
      amountRef.current?.focus();
    } else setError(result.error);
  }
  return (
    <Panel id="payment-editor" className="scroll-mt-6">
      <SectionHeader icon={ReceiptText} title={editingId ? '支払いを編集' : '支払いを追加'}>
        {editingId && (
          <IconAction
            label="編集をキャンセル"
            icon={X}
            onClick={() => {
              workspace.cancelEditing();
              setError('');
            }}
          />
        )}
      </SectionHeader>
      <form onSubmit={submit} className="space-y-4">
        <Field id="amount" label="金額">
          <div className="relative">
            <span
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xl text-main/50"
              aria-hidden="true"
            >
              ¥
            </span>
            <TextInput
              ref={amountRef}
              id="amount"
              variant="amount"
              type="text"
              inputMode="decimal"
              enterKeyHint="next"
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.nativeEvent.isComposing &&
                  event.keyCode !== 229
                ) {
                  event.preventDefault();
                  document.getElementById('memo')?.focus();
                }
              }}
              value={amount}
              onChange={(e) => updateDraft({ amount: normalizeYenInput(e.target.value) })}
              placeholder="0"
              aria-invalid={!!amountError}
              aria-describedby="amount-hint"
            />
          </div>
        </Field>
        <p id="amount-hint" className={amountError ? 'text-xs text-main/70' : 'sr-only'}>
          {amountError || '1〜1,000,000円・整数で入力'}
        </p>
        <div className="relative">
          <label
            htmlFor="payer"
            title="支払った人"
            className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-main/60"
          >
            <UserRound size={18} aria-hidden="true" />
            <span className="sr-only">支払った人</span>
          </label>
          <SelectInput
            id="payer"
            className="pl-11"
            value={payerId}
            onChange={(e) => updateDraft({ payerId: e.target.value })}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </SelectInput>
        </div>
        <Field id="memo" label="何の支払い？">
          <TextInput
            id="memo"
            value={memo}
            onChange={(e) => updateDraft({ memo: e.target.value })}
            maxLength={100}
            placeholder="内容（任意）"
          />
        </Field>
        <div className="flex gap-1" role="group" aria-label="支払い内容の候補">
          {[
            { label: '食事', icon: Utensils },
            { label: '宿泊', icon: BedDouble },
            { label: '交通', icon: TrainFront },
            { label: 'カフェ', icon: Coffee },
          ].map(({ label, icon }) => (
            <IconAction
              key={label}
              label={label}
              icon={icon}
              aria-pressed={memo === label}
              onClick={() => updateDraft({ memo: label })}
            />
          ))}
        </div>
        <fieldset className="min-w-0 border-t border-main/10 pt-2">
          <legend className="sr-only">割り勘に含める人</legend>
          <div className="mb-2 flex items-center justify-between">
            <span
              className="flex items-center gap-2 text-xs text-main/65 tabular-nums"
              aria-label={`${selected.length}人を選択`}
            >
              <Users size={18} aria-hidden="true" />
              {selected.length} / {members.length}
            </span>
            <IconAction
              label={selected.length === members.length ? '全員の選択を解除' : '全員を選択'}
              icon={selected.length === members.length ? Square : ListChecks}
              onClick={() =>
                updateDraft({
                  participantIds:
                    selected.length === members.length ? [] : members.map((member) => member.id),
                })
              }
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {members.map((member) => (
              <label
                key={member.id}
                className="relative flex min-h-control max-w-full cursor-pointer items-center gap-2 rounded-control border border-main/15 px-2 py-2 text-sm transition-colors has-checked:border-main/30 has-checked:bg-accent/30 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-main"
              >
                <input
                  className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                  type="checkbox"
                  checked={participants.includes(member.id)}
                  onChange={(e) =>
                    updateDraft({
                      participantIds: e.target.checked
                        ? [...participants, member.id]
                        : participants.filter((id) => id !== member.id),
                    })
                  }
                />
                <span
                  className="flex size-4 shrink-0 items-center justify-center rounded border border-main/30 text-transparent peer-checked:border-main peer-checked:bg-main peer-checked:text-accent"
                  aria-hidden="true"
                >
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="min-w-0 wrap-anywhere">{member.name}</span>
              </label>
            ))}
          </div>
          {!selected.length && (
            <p className="mt-3 text-xs text-main/70" role="status">
              対象者を選択
            </p>
          )}
        </fieldset>
        {error && <Notice alert>{error}</Notice>}
        <div className="flex items-center justify-between gap-3 border-t border-main/10 pt-4">
          <div className="min-w-0" aria-live="polite">
            <strong className="block text-lg font-semibold tracking-tight tabular-nums wrap-anywhere">
              {shares.length
                ? shares[0] === shares[shares.length - 1]
                  ? yen(shares[0])
                  : `${yen(shares[shares.length - 1])}〜${yen(shares[0])}`
                : '—'}
            </strong>
            <span className="text-xs text-main/60">/ 人</span>
          </div>
          <IconAction
            type="submit"
            label={editingId ? '変更を保存する' : 'この支払いを追加する'}
            icon={editingId ? Check : Plus}
            variant="primary"
            disabled={!valid || !selected.length || !payerId}
          />
        </div>
      </form>
      <Help label="計算ルール">
        端数は対象者の登録順に1円ずつ配分。金額は1〜1,000,000円の整数。
      </Help>
    </Panel>
  );
}
