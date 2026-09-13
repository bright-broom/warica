'use client';
import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
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
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { FieldSet, FieldLegend } from './ui/field';
import { NativeSelectOption } from './ui/native-select';
import { IconChoices } from './IconChoices';
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
  const payerMissing = !!draft.payerId && !members.some((member) => member.id === draft.payerId);
  const payerId = members.some((member) => member.id === draft.payerId)
    ? draft.payerId
    : payerMissing
      ? ''
      : (members[0]?.id ?? '');
  const participants = draft.participantIds ?? members.map((member) => member.id);
  const selected = members.filter((member) => participants.includes(member.id));
  const missingParticipants = participants.some(
    (id) => !members.some((member) => member.id === id),
  );
  const amountRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (!editingId) return;
    // Focus with the updated form before paint, never after the user starts typing elsewhere.
    amountRef.current?.focus({ preventScroll: true });
    amountRef.current?.select();
  }, [editingId]);
  const [error, setError] = useState('');
  const valid = validateAmount(Number(amount));
  const shares =
    valid && !missingParticipants ? calculatePaymentSplit(Number(amount), selected.length) : [];
  const amountError = amount.trim() && !valid ? '1〜1,000,000円の整数' : '';
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = savePayment(
      {
        payerId,
        amount: Number(amount),
        memo,
        participantIds: participants,
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
        {(payerMissing || missingParticipants) && (
          <Notice>削除されたメンバーが選択されています。支払者・対象者を確認してください。</Notice>
        )}
        <Field id="amount" label="金額">
          <div className="relative">
            <span
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xl text-muted-foreground"
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
        <p id="amount-hint" className={amountError ? 'text-xs text-muted-foreground' : 'sr-only'}>
          {amountError || '1〜1,000,000円・整数で入力'}
        </p>
        <div className="relative">
          <Label
            htmlFor="payer"
            title="支払った人"
            className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-muted-foreground"
          >
            <UserRound size={18} aria-hidden="true" />
            <span className="sr-only">支払った人</span>
          </Label>
          <SelectInput
            id="payer"
            className="pl-11"
            value={payerId}
            onChange={(e) => updateDraft({ payerId: e.target.value })}
          >
            {payerMissing && (
              <NativeSelectOption value="" disabled>
                支払った人を選択
              </NativeSelectOption>
            )}
            {members.map((member) => (
              <NativeSelectOption key={member.id} value={member.id}>
                {member.name}
              </NativeSelectOption>
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
        <IconChoices
          label="支払い内容の候補"
          value={memo}
          onValueChange={(memo) => updateDraft({ memo })}
          choices={[
            { label: '食事', icon: Utensils },
            { label: '宿泊', icon: BedDouble },
            { label: '交通', icon: TrainFront },
            { label: 'カフェ', icon: Coffee },
          ]}
        />
        <FieldSet className="block min-w-0 gap-0 border-t border-main/10 pt-2">
          <FieldLegend className="sr-only">割り勘に含める人</FieldLegend>
          <div className="mb-2 flex items-center justify-between">
            <span
              className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums"
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
          <div className="grid gap-1.5">
            {members.map((member) => (
              <Label
                key={member.id}
                htmlFor={`participant-${member.id}`}
                className="relative flex min-h-control max-w-full cursor-pointer flex-row-reverse items-center gap-3 rounded-control border border-main/15 pl-3 pr-0 text-sm transition-colors has-data-[state=checked]:border-main/30 has-data-[state=checked]:accent-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-main"
              >
                <Checkbox
                  id={`participant-${member.id}`}
                  className="relative size-control rounded-control border-0 shadow-none data-[state=checked]:bg-main/0 after:absolute after:inset-3.5 after:rounded-sm after:border after:border-main/40 data-[state=checked]:text-main data-[state=checked]:after:border-main [&_svg]:size-4"
                  checked={participants.includes(member.id)}
                  onCheckedChange={(checked) =>
                    updateDraft({
                      participantIds:
                        checked === true
                          ? [...participants, member.id]
                          : participants.filter((id) => id !== member.id),
                    })
                  }
                />
                <span className="min-w-0 flex-1 wrap-anywhere">{member.name}</span>
              </Label>
            ))}
          </div>
          {!selected.length && (
            <p className="mt-3 text-xs text-muted-foreground" role="status">
              対象者を選択
            </p>
          )}
          {missingParticipants && (
            <div className="mt-2 flex justify-end">
              <IconAction
                label="対象者の変更を確認"
                icon={Check}
                variant="primary"
                disabled={!selected.length}
                onClick={() => {
                  updateDraft({ participantIds: selected.map((member) => member.id) });
                  setError('');
                }}
              />
            </div>
          )}
        </FieldSet>
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
            <span className="text-xs text-muted-foreground">/ 人</span>
          </div>
          <IconAction
            type="submit"
            label={editingId ? '変更を保存する' : 'この支払いを追加する'}
            icon={editingId ? Check : Plus}
            variant="primary"
            disabled={!valid || !selected.length || !payerId || missingParticipants}
          />
        </div>
      </form>
      <Help label="計算ルール">
        端数は対象者の登録順に1円ずつ配分。金額は1〜1,000,000円の整数。
      </Help>
    </Panel>
  );
}
