'use client';
import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { BedDouble, Check, Coffee, Plus, TrainFront, Utensils, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FieldSet, FieldLegend } from '@/components/ui/field';
import { NativeSelectOption } from '@/components/ui/native-select';
import { ChoiceChips } from '@/components/ChoiceChips';
import { ActionButton, IconAction } from '@/components/actions';
import { Field, Help, Notice, Panel, SectionHeader, SelectInput, TextInput } from '@/components/ui';
import { usePaymentWorkspace } from '@/state/payment-workspace';
import { isSharedStorageError, useWarikanStore } from '@/state/warikan-store';
import { calculatePaymentSplit, yen } from '@/lib/domain/calculations';
import { validateAmount } from '@/lib/domain/validation';
import { MAX_AMOUNT_INPUT_LENGTH, normalizeYenInput, parseYenAmount } from '@/lib/domain/input';

const MEMO_CHOICES = [
  { label: '食事', icon: Utensils },
  { label: '宿泊', icon: BedDouble },
  { label: '交通', icon: TrainFront },
  { label: 'カフェ', icon: Coffee },
];

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
  const allSelected = selected.length === members.length;
  const missingParticipants = participants.some(
    (id) => !members.some((member) => member.id === id),
  );
  const amountRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (!editingId) return;
    // 編集を始めたら、描画前に金額欄へフォーカスを移す（入力を始めた後で奪わない）
    amountRef.current?.focus({ preventScroll: true });
    amountRef.current?.select();
  }, [editingId]);
  const [error, setError] = useState('');
  const parsed = parseYenAmount(amount);
  const valid = parsed !== null && validateAmount(parsed);
  const shares =
    valid && !missingParticipants ? calculatePaymentSplit(parsed, selected.length) : [];
  const amountError = amount.trim() && !valid ? '1〜1,000,000円の整数で入力してください' : '';
  const blocker = !amount.trim()
    ? '金額を入力してください'
    : amountError
      ? ''
      : !payerId
        ? '支払った人を選んでください'
        : !selected.length
          ? '割り勘に含める人を選んでください'
          : missingParticipants
            ? '対象者の変更を確認してください'
            : '';

  function submit(event: FormEvent) {
    event.preventDefault();
    if (parsed === null) return;
    const result = savePayment(
      { payerId, amount: parsed, memo, participantIds: participants },
      editingId,
    );
    if (result.ok) {
      workspace.complete();
      setError('');
      onDone({ amount: parsed, edited: !!editingId });
      amountRef.current?.focus();
    } else setError(isSharedStorageError(result.error) ? '' : result.error);
  }
  return (
    <Panel id="payment-editor" className="scroll-mt-6" data-editing={editingId ? 'yes' : 'no'}>
      <SectionHeader
        title={editingId ? '支払いを編集' : '支払いを追加'}
        description={
          editingId
            ? '内容を直して「変更を保存」を押すと、精算結果に反映されます。'
            : '1回の立て替えを1件として記録します。'
        }
      >
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
      <form onSubmit={submit} className="space-y-5" noValidate>
        {(payerMissing || missingParticipants) && (
          <Notice alert>
            削除されたメンバーが選ばれています。支払った人と対象者を選び直してください。
          </Notice>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
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
                inputMode="numeric"
                enterKeyHint="next"
                autoComplete="off"
                maxLength={MAX_AMOUNT_INPUT_LENGTH}
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
            <p
              id="amount-hint"
              className={
                amountError ? 'text-sm font-medium text-main' : 'text-xs text-muted-foreground'
              }
            >
              {amountError || '1〜1,000,000円の整数。全角数字や「12,800」の貼り付けも使えます'}
            </p>
          </Field>
          <Field id="payer" label="支払った人">
            <SelectInput
              id="payer"
              className="h-16 text-lg font-semibold"
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
          </Field>
        </div>
        <div className="space-y-3">
          <Field id="memo" label="何の支払い？" hint="任意">
            <TextInput
              id="memo"
              value={memo}
              onChange={(e) => updateDraft({ memo: e.target.value })}
              maxLength={100}
              placeholder="例：1日目の夕食"
            />
          </Field>
          <div className="flex justify-end sm:justify-start">
            <ChoiceChips
              label="支払い内容の候補"
              value={memo}
              onValueChange={(memo) => updateDraft({ memo })}
              choices={MEMO_CHOICES}
            />
          </div>
        </div>
        <FieldSet className="block min-w-0 gap-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <FieldLegend className="mb-0 text-sm font-semibold">
              割り勘に含める人
              <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                {selected.length} / {members.length}人
              </span>
            </FieldLegend>
            <ActionButton
              className="ml-auto h-11 px-3 text-sm"
              variant="ghost"
              onClick={() =>
                updateDraft({
                  participantIds: allSelected ? [] : members.map((member) => member.id),
                })
              }
            >
              {allSelected ? '全員の選択を解除' : '全員を選択'}
            </ActionButton>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {members.map((member) => (
              <Label
                key={member.id}
                htmlFor={`participant-${member.id}`}
                className="relative flex min-h-control max-w-full cursor-pointer flex-row-reverse items-center gap-3 rounded-control pr-0 pl-3 text-sm font-medium has-data-[state=checked]:accent-faint has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-main"
              >
                <Checkbox
                  id={`participant-${member.id}`}
                  className="relative size-control rounded-control border-0 shadow-none after:absolute after:inset-3.5 after:rounded-sm after:border after:border-input data-[state=checked]:bg-transparent data-[state=checked]:text-main data-[state=checked]:after:border-main [&_svg]:size-4"
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
          {missingParticipants && (
            <div className="mt-2 flex justify-end">
              <ActionButton
                icon={Check}
                variant="primary"
                disabled={!selected.length}
                onClick={() => {
                  updateDraft({ participantIds: selected.map((member) => member.id) });
                  setError('');
                }}
              >
                対象者の変更を確認
              </ActionButton>
            </div>
          )}
        </FieldSet>
        {error && <Notice alert>{error}</Notice>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0" aria-live="polite">
            <span className="block text-xs text-muted-foreground">1人あたり</span>
            <strong className="block text-xl font-semibold tracking-tight tabular-nums wrap-anywhere">
              {shares.length
                ? shares[0] === shares[shares.length - 1]
                  ? yen(shares[0])
                  : `${yen(shares[shares.length - 1])}〜${yen(shares[0])}`
                : '—'}
            </strong>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            <ActionButton
              type="submit"
              icon={editingId ? Check : Plus}
              variant="primary"
              disabled={!!blocker || !valid}
              aria-describedby={blocker ? 'payment-blocker' : undefined}
            >
              {editingId ? '変更を保存する' : 'この支払いを追加する'}
            </ActionButton>
            {blocker && (
              <p id="payment-blocker" className="text-xs text-muted-foreground">
                {blocker}
              </p>
            )}
          </div>
        </div>
      </form>
      <Help label="計算ルール">
        端数は対象者の登録順に1円ずつ配分。金額は1〜1,000,000円の整数。
      </Help>
    </Panel>
  );
}
