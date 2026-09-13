'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Users,
  ReceiptText,
  ArrowRightLeft,
  ChartNoAxesColumn,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { IconAction, IconLink } from '@/components/IconAction';
import {
  ActionRow,
  Avatar,
  Badge,
  EmptyState,
  Field,
  Help,
  Notice,
  Panel,
  SectionHeader,
  TextArea,
} from '@/components/ui';
import { PaymentHistory } from '@/components/PaymentHistory';
import { routes } from '@/config/navigation';
import { useWarikanStore } from '../useWarikanStore';
import { settlementText, yen } from '@/lib/calculations';

export default function ResultPage() {
  const { state, balances, settlements, total } = useWarikanStore();
  const [message, setMessage] = useState('');
  const [showText, setShowText] = useState(false);
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
        <Notice>
          旧データは全員で仮計算。
          <Link className="underline underline-offset-4" href={routes.payments}>
            対象者を確認
          </Link>
          してください。
        </Notice>
      )}
      <Panel tone="inverse" className="space-y-5 py-8 sm:py-10">
        <p className="text-sm text-sub/75 wrap-anywhere">{state.eventName}</p>
        <div>
          <span className="sr-only">合計</span>
          <strong className="text-4xl font-semibold tracking-tight tabular-nums sm:text-6xl">
            {yen(total)}
          </strong>
        </div>
        <div className="flex items-center gap-5 text-sm text-accent tabular-nums">
          <span className="flex items-center gap-2" aria-label={`${state.members.length}人`}>
            <Users size={16} aria-hidden="true" />
            {state.members.length}
          </span>
          <span
            className="flex items-center gap-2"
            aria-label={`${state.payments.length}件の支払い`}
          >
            <ReceiptText size={16} aria-hidden="true" />
            {state.payments.length}
          </span>
        </div>
      </Panel>
      <Panel>
        <SectionHeader icon={ArrowRightLeft} title="送金">
          <Badge>{settlements.length}件</Badge>
        </SectionHeader>
        {settlements.length ? (
          <ol data-testid="transfer-list" className="divide-y divide-main/10">
            {settlements.map((settlement, i) => (
              <li
                key={`${settlement.fromId}-${settlement.toId}`}
                className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-5 first:pt-0 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto]"
              >
                <span className="text-xs text-main/45 tabular-nums" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_1rem_minmax(0,1fr)] items-center gap-2 text-sm font-medium wrap-anywhere">
                  <span>{settlement.from}</span>
                  <ArrowRight size={16} aria-label="から" />
                  <span>{settlement.to}</span>
                </div>
                <strong className="col-start-2 w-fit rounded-control bg-accent/25 px-3 py-2 text-lg font-semibold tabular-nums sm:col-start-3">
                  {yen(settlement.amount)}
                </strong>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState icon={Check}>
            <h3>精算不要</h3>
          </EmptyState>
        )}
        <ActionRow>
          <IconAction
            label="精算結果をコピー"
            icon={message && !showText ? Check : Copy}
            variant="primary"
            onClick={() => void copy()}
          />
        </ActionRow>
        <p className={showText ? 'my-4 text-sm leading-6' : 'sr-only'} role="status">
          {message}
        </p>
        {showText && (
          <Field id="share-text" label="共有用テキスト">
            <TextArea id="share-text" value={text} readOnly onFocus={(e) => e.target.select()} />
          </Field>
        )}
      </Panel>
      <Panel>
        <SectionHeader icon={ChartNoAxesColumn} title="内訳" />
        <div className="divide-y divide-main/10">
          {balances.map((balance) => {
            const status =
              balance.balance > 0 ? '受け取る' : balance.balance < 0 ? '支払う' : '精算不要';
            const StatusIcon =
              balance.balance > 0 ? ArrowDownLeft : balance.balance < 0 ? ArrowUpRight : Check;
            return (
              <div
                data-testid="balance-row"
                key={balance.memberId}
                className="grid min-w-0 gap-4 py-5 first:pt-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3 text-sm font-medium">
                  <Avatar name={balance.memberName} />
                  <span className="min-w-0 wrap-anywhere">{balance.memberName}</span>
                </div>
                <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)] items-start gap-2 text-xs tabular-nums">
                  <div className="space-y-2">
                    <dt className="text-main/60">支払</dt>
                    <dd className="wrap-anywhere">{yen(balance.paid)}</dd>
                  </div>
                  <div className="space-y-2">
                    <dt className="text-main/60">負担</dt>
                    <dd className="wrap-anywhere">{yen(balance.share)}</dd>
                  </div>
                  <div className="space-y-1.5">
                    <dt className="flex items-center gap-1" title={status}>
                      <StatusIcon size={16} aria-hidden="true" />
                      <span className="sr-only">{status}</span>
                    </dt>
                    <dd className="font-semibold wrap-anywhere">
                      {yen(Math.abs(balance.balance))}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
        <Help label="精算について">
          端数は支払いごとに対象者の登録順で1円ずつ配分。送金は各自で行ってください。
        </Help>
      </Panel>
      <PaymentHistory />
      <ActionRow>
        <IconLink href={routes.payments} label="支払いを追加・編集する" icon={ArrowLeft} />
      </ActionRow>
    </>
  );
}
