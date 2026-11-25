'use client';
import { useId, useRef, useState, type FormEvent } from 'react';
import { Check, ExternalLink, Link2, Pencil, Trash2 } from 'lucide-react';
import { useWarikanStore } from '@/state/warikan-store';
import { PAYPAY_GUIDE_URL, settlementKey } from '@/lib/domain/paypay';
import type { Settlement } from '@/lib/domain/types';
import { yen } from '@/lib/domain/calculations';
import { ActionButton } from '@/components/actions';
import { Field, Help, Notice, TextInput } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

export function PayPayTransfer({ settlement }: { settlement: Settlement }) {
  const store = useWarikanStore();
  const link = store.state.paypayLinks?.find(
    (item) => settlementKey(item) === settlementKey(settlement),
  );
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const inputId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const label = `${settlement.from}から${settlement.to}へのPayPay`;
  const needsReview = store.state.payments.some((payment) => payment.needsReview);

  function close() {
    setOpen(false);
    setError('');
    trigger.current?.focus();
  }
  function edit() {
    setInput(link?.url ?? '');
    setError('');
    setOpen(true);
  }
  function save(event: FormEvent) {
    event.preventDefault();
    const result = store.savePayPayLink(settlement, input);
    if (result.ok) close();
    else setError(result.error);
  }
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="col-span-full min-w-0">
      <div className="flex flex-wrap items-center justify-end gap-1">
        {link && (
          <Button asChild variant="outline" className="gap-2 rounded-control">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              aria-label={`${label}を開く`}
              onClick={(event) => {
                if (!store.preparePayPayHandoff(settlement, link.url)) {
                  event.preventDefault();
                  setError('保存と精算内容を確認してから、もう一度開いてください。');
                }
              }}
            >
              PayPayを開く <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </Button>
        )}
        <Button
          ref={trigger}
          variant={link ? 'ghost' : 'outline'}
          size={link ? 'icon' : 'default'}
          className="gap-2 rounded-control"
          aria-label={`${label}請求リンクを${link ? '編集' : '登録'}`}
          aria-expanded={open}
          aria-controls={`${inputId}-editor`}
          onClick={open ? close : edit}
          disabled={needsReview}
          title={needsReview ? '先に旧データの対象者を確認してください' : undefined}
        >
          {link ? (
            <Pencil className="size-5" aria-hidden="true" />
          ) : (
            <>
              <Link2 className="size-4" aria-hidden="true" />
              請求リンクを登録
            </>
          )}
        </Button>
      </div>
      {link && !open && (
        <p className="mt-2 text-right text-xs text-muted-foreground">宛先・金額はPayPayで確認</p>
      )}
      {error && !open && (
        <div className="mt-2">
          <Notice alert>{error}</Notice>
        </div>
      )}
      <CollapsibleContent id={`${inputId}-editor`}>
        <form
          onSubmit={save}
          className="mt-3 space-y-3 rounded-control border border-border bg-muted p-3"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              close();
            }
          }}
        >
          <p className="text-sm leading-6 wrap-anywhere">
            {settlement.to}が{yen(settlement.amount)}で作成した請求リンク
          </p>
          <Field id={inputId} label="PayPay請求リンク">
            <TextInput
              id={inputId}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={2048}
              placeholder="https://…"
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? `${inputId}-error` : undefined}
            />
          </Field>
          {error && (
            <p id={`${inputId}-error`} role="alert" className="text-sm font-medium text-main">
              {error}
            </p>
          )}
          <div className="ml-auto flex w-fit flex-col items-stretch gap-2 sm:flex-row-reverse sm:items-center">
            <ActionButton
              type="submit"
              icon={Check}
              variant="primary"
              aria-label="請求リンクを登録する"
              disabled={!input.trim()}
            >
              登録する
            </ActionButton>
            <ActionButton variant="ghost" aria-label="リンク編集をキャンセル" onClick={close}>
              キャンセル
            </ActionButton>
            {link && (
              <ActionButton
                icon={Trash2}
                variant="ghost"
                aria-label={`${label}請求リンクを削除`}
                onClick={() => {
                  const result = store.removePayPayLink(settlement);
                  if (result.ok) close();
                  else setError(result.error);
                }}
              >
                リンクを削除
              </ActionButton>
            )}
          </div>
          <Help label="請求リンクの作り方">
            受け取る人がPayPayで本人確認を済ませ、LINEのトークで「＋」→「送る・受け取る」→「請求リンクを作成」。精算額で作成し、共有されたリンクを貼り付けてください。
            <a
              href={PAYPAY_GUIDE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 underline underline-offset-4"
            >
              公式ガイド
            </a>
          </Help>
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}
