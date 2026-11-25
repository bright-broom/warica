'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy } from 'lucide-react';
import { ActionButton, ActionLink, IconAction } from '@/components/actions';
import {
  ActionRow,
  Avatar,
  Badge,
  EmptyState,
  Field,
  Help,
  Notice,
  PageHeader,
  Panel,
  SectionHeader,
  TextArea,
} from '@/components/ui';
import { PayPayTransfer } from '@/components/result/PayPayTransfer';
import { PaymentHistory } from '@/components/payments/PaymentHistory';
import { routes } from '@/config/navigation';
import { useWarikanStore } from '@/state/warikan-store';
import { settlementKey } from '@/lib/domain/paypay';
import type { MemberBalance, Settlement } from '@/lib/domain/types';
import { settlementText, yen } from '@/lib/domain/calculations';
import { scrollToContent } from '@/lib/scroll';

export default function ResultPage() {
  const { state, balances, settlements, total } = useWarikanStore();
  const [message, setMessage] = useState('');
  const [showText, setShowText] = useState(false);
  const [shareText, setShareText] = useState('');
  const [copiedText, setCopiedText] = useState('');
  const text = settlementText(state);
  function transferText(settlement: Settlement) {
    const link = state.paypayLinks?.find(
      (item) => settlementKey(item) === settlementKey(settlement),
    );
    return `${state.eventName}\n${settlement.from} → ${settlement.to}：${yen(settlement.amount)}${link ? `\n${link.url}` : ''}`;
  }
  async function copy(value = text) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedText(value);
      setShowText(false);
      setMessage('コピーしました。LINEなどに貼り付けて送れます。');
    } catch {
      setShareText(value);
      setShowText(true);
      setMessage('コピーできませんでした。下のテキストを選択してコピーしてください。');
      // 行ごとのコピーから出したときも、代わりの文章が見える位置まで動かす
      requestAnimationFrame(() => scrollToContent(document.getElementById('share-text'), 'smooth'));
    }
  }
  return (
    <>
      <PageHeader step="ステップ 3 / 3" title="精算結果">
        この通りに送金すると、全員の負担がそろいます。送金はPayPayや振込などで各自が行い、このアプリはお金を動かしません。
      </PageHeader>
      {state.payments.some((p) => p.needsReview) && (
        <Notice>
          以前のバージョンの記録は、対象者を全員として仮に計算しています。
          <Link className="underline underline-offset-4" href={routes.payments}>
            支払いの画面で対象者を確認
          </Link>
          してください。
        </Notice>
      )}
      <Panel tone="inverse" aria-label="精算の概要">
        <p className="text-sm text-sub/80 wrap-anywhere">{state.eventName}</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:items-end sm:gap-x-8">
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-sub/80">立て替え合計</dt>
            <dd className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
              {yen(total)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-sub/80">メンバー</dt>
            <dd className="text-lg tabular-nums">{state.members.length}人</dd>
          </div>
          <div>
            <dt className="text-xs text-sub/80">支払い</dt>
            <dd className="text-lg tabular-nums">{state.payments.length}件</dd>
          </div>
        </dl>
      </Panel>
      <Panel>
        <SectionHeader
          title="送金"
          description="「から」の人が「へ」の人に送ります。送金は最大で「人数−1」件にまとめています。"
        >
          <Badge>{settlements.length}件</Badge>
        </SectionHeader>
        <div className="mb-4 flex justify-end">
          <ActionButton
            icon={copiedText === text ? Check : Copy}
            variant="primary"
            aria-label="送金一覧を一括コピー"
            onClick={() => void copy()}
          >
            一括コピー
          </ActionButton>
        </div>
        {/* コピーの結果と、コピーできなかったときの文章は、押したボタンのすぐ下に出す */}
        <p className={message ? '-mt-2 mb-4 text-sm leading-6' : 'sr-only'} role="status">
          {message}
        </p>
        {showText && (
          <div className="mb-5">
            <Field id="share-text" label="共有用テキスト">
              <TextArea
                id="share-text"
                value={shareText}
                readOnly
                onFocus={(e) => e.target.select()}
              />
            </Field>
          </div>
        )}
        {settlements.length ? (
          <ol data-testid="transfer-list" className="divide-y divide-border">
            {settlements.map((settlement) => (
              <li
                key={`${state.eventName}-${settlementKey(settlement)}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 py-4 first:pt-0"
              >
                {/* スマホでは「Aから」「Bへ」の2行。長い名前でも矢印だけが行に取り残されない */}
                <p className="min-w-0 pt-2 font-semibold leading-7 wrap-anywhere">
                  <NameWith name={settlement.from} particle="から" />
                  <br className="sm:hidden" />
                  <ArrowRight
                    size={16}
                    className="mx-1.5 hidden align-[-2px] text-muted-foreground sm:inline"
                    aria-hidden="true"
                  />
                  <NameWith name={settlement.to} particle="へ" />
                </p>
                <div className="flex items-center gap-1">
                  <strong className="text-lg font-semibold tabular-nums">
                    {yen(settlement.amount)}
                  </strong>
                  <IconAction
                    label={`${settlement.from}から${settlement.to}への送金をコピー`}
                    icon={copiedText === transferText(settlement) ? Check : Copy}
                    onClick={() => void copy(transferText(settlement))}
                  />
                </div>
                <PayPayTransfer settlement={settlement} />
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState icon={Check} title="精算不要" headingLevel={3}>
            全員の支払った額と負担額が一致しています。送金はいりません。
          </EmptyState>
        )}
      </Panel>
      <Panel>
        <SectionHeader
          title="一人ずつの内訳"
          description="支払った額から負担額を引いた差が、受け取る額・送る額になります。"
        />
        <div className="divide-y divide-border">
          {balances.map((balance) => (
            <BalanceRow key={balance.memberId} balance={balance} />
          ))}
        </div>
        <Help label="精算について">
          各支払いを対象者だけで均等に分け、割り切れない1円は対象者の登録順に配分します。受け取る額・送る額の大きい人から順に相殺するため、送金は最大で人数−1件です。
        </Help>
      </Panel>
      <PaymentHistory />
      <ActionRow>
        <ActionLink href={routes.payments} icon={ArrowLeft}>
          支払いを追加・編集する
        </ActionLink>
      </ActionRow>
    </>
  );
}

/** 名前の最後の1文字と助詞をつなげ、「へ」だけが次の行に落ちないようにする */
function NameWith({ name, particle }: { name: string; particle: string }) {
  const chars = Array.from(name);
  const last = chars.pop() ?? '';
  return (
    <>
      {chars.join('')}
      <span className="whitespace-nowrap">
        {last}
        <span className="font-normal text-muted-foreground"> {particle}</span>
      </span>
    </>
  );
}

function BalanceRow({ balance }: { balance: MemberBalance }) {
  const status = balance.balance > 0 ? '受け取る' : balance.balance < 0 ? '送る' : '精算不要';
  return (
    <div
      data-testid="balance-row"
      className="grid min-w-0 gap-3 py-4 first:pt-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:items-center"
    >
      <div className="flex min-w-0 items-center gap-3 font-medium">
        <Avatar name={balance.memberName} />
        <span className="min-w-0 wrap-anywhere">{balance.memberName}</span>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm tabular-nums">
        <div>
          <dt className="text-xs text-muted-foreground">支払った額</dt>
          <dd className="wrap-anywhere">{yen(balance.paid)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">負担額</dt>
          <dd className="wrap-anywhere">{yen(balance.share)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{status}</dt>
          <dd className="font-semibold wrap-anywhere">
            {balance.balance === 0 ? '—' : yen(Math.abs(balance.balance))}
          </dd>
        </div>
      </dl>
    </div>
  );
}
