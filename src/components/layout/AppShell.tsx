'use client';
import Link from 'next/link';
import { toast } from 'sonner';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpFromLine,
  Check,
  FileWarning,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Split,
  Trash2,
} from 'lucide-react';
import { usePaymentWorkspace } from '@/state/payment-workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useConfirmation } from '@/components/layout/ApplicationUI';
import { ActionButton, ActionLink } from '@/components/actions';
import { EmptyState, Notice, cx } from '@/components/ui';
import { navigation, routes, type Step } from '@/config/navigation';
import { useWarikanStore } from '@/state/warikan-store';
import { MAX_FILE_SIZE, parseState, serializeState } from '@/lib/persistence/storage';
import { yen } from '@/lib/domain/calculations';

export function AppShell({ children }: { children: ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);
  const path = usePathname(),
    router = useRouter();
  const store = useWarikanStore();
  const confirm = useConfirmation();
  const workspace = usePaymentWorkspace();
  const { state, isLoaded, loadBlocked, storageError, storageConflict, notice, total } = store;
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const steps = navigation(state);
  const current = steps.find((step) => step.href === path);
  const usable = isLoaded && !loadBlocked;
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [path, store.eventRevision]);
  useEffect(() => {
    if (!storageError && !workspace.storageError) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [storageError, workspace.storageError]);

  function retry() {
    store.retryStorage();
    workspace.retryStorage();
  }
  async function loadLatest() {
    if (
      !(await confirm({
        title: '最新の保存データ',
        description:
          'この画面の未保存変更と下書きを破棄して、最新の保存内容を読み込みます。必要なら先にバックアップしてください。',
        action: '最新を読み込む',
        icon: RefreshCw,
      }))
    )
      return;
    const result = store.loadLatest(workspace.discardDrafts);
    setMessage(result.ok ? '' : result.error);
    if (result.ok) router.push(routes.members);
  }
  async function resetPayments() {
    if (storageConflict) {
      await loadLatest();
      return;
    }
    if (
      !(await confirm({
        title: '支払いをリセット',
        description:
          '支払い履歴・精算結果・入力中の下書きを消します。イベント名とメンバーは残ります。',
        action: 'リセットする',
        icon: RotateCcw,
      }))
    )
      return;
    const result = store.resetPayments();
    setMessage(result.ok ? '' : result.error);
    if (!result.ok) return;
    const ready = navigation(store.getCurrentState()).find(
      (step) => step.href === routes.payments,
    )!.ready;
    router.push(ready ? routes.payments : routes.members);
    toast.success('支払いをリセットしました');
  }
  async function discardBrokenDraft() {
    if (
      !(await confirm({
        title: '下書きを破棄',
        description:
          'このタブに残っている読み込めない下書きを消して、入力を再開します。登録済みの支払いとメンバーは消えません。',
        action: '下書きを破棄する',
        icon: Trash2,
      }))
    )
      return;
    if (workspace.discardDrafts()) setMessage('下書きを破棄しました。入力を再開できます。');
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([serializeState(state)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `warica-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('バックアップをダウンロードしました。');
  }

  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_FILE_SIZE) {
        setMessage('ファイルは2MB以内で選択してください。');
        return;
      }
      const raw = await file.text();
      const validated = parseState(raw);
      if (!validated.ok) {
        setMessage(validated.error);
        return;
      }
      if (
        !(await confirm({
          title: 'バックアップを読み込む',
          description: `「${validated.data.eventName || '名称未設定'}」で現在のイベントを置き換えます。必要なデータは先にバックアップしてください。`,
          action: '読み込む',
          icon: ArrowUpFromLine,
        }))
      )
        return;
      const result = store.importBackup(raw);
      setMessage(result.ok ? 'バックアップを読み込みました。' : result.error);
      if (result.ok) router.push(routes.members);
    } catch {
      setMessage('ファイルを読み込めませんでした。もう一度選択してください。');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div
      className="mx-auto min-h-dvh max-w-6xl px-4 max-lg:flex max-lg:h-dvh max-lg:flex-col sm:px-8 lg:px-12"
      data-testid="app-shell"
    >
      <a
        className="sr-only z-50 rounded-control bg-main p-4 text-sub focus:not-sr-only focus:fixed focus:top-4"
        href="#main"
      >
        本文へ移動
      </a>
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 sm:h-20">
        <Link
          href={routes.members}
          className="flex min-w-0 items-center gap-2.5 rounded-control"
          aria-label="WARICA メンバーの画面へ"
        >
          <span className="flex size-9 items-center justify-center rounded-control accent-surface">
            <Split size={20} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight">warica</span>
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">
            割り勘の精算
          </span>
        </Link>
        <Button
          variant="ghost"
          className="h-control min-w-control gap-2 px-3 text-sm text-muted-foreground disabled:opacity-40"
          aria-label="支払いをリセット"
          title="支払いをリセット"
          disabled={!usable}
          onClick={(event) => {
            event.currentTarget.focus();
            void resetPayments();
          }}
        >
          <RotateCcw className="size-[18px]" aria-hidden="true" />
          <span className="hidden sm:inline">支払いをリセット</span>
        </Button>
      </header>
      <Progress steps={steps} path={path} />
      <div className="grid min-h-0 items-start gap-6 max-lg:flex-1 max-lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:sticky lg:top-8 lg:block lg:min-w-0">
          <nav data-ui="navigation" aria-label="割り勘の手順">
            <ol className="grid gap-1">
              {steps.map((step, index) => {
                const active = path === step.href;
                const content = (
                  <>
                    <StepNumber index={index} active={active} />
                    <span>{step.label}</span>
                  </>
                );
                const style = cx(
                  'flex h-12 w-full items-center gap-3 rounded-control px-3 text-sm font-semibold',
                  active && 'accent-soft',
                );
                return (
                  <li key={step.href}>
                    {step.ready && usable ? (
                      <Link
                        href={step.href}
                        className={cx(style, !active && 'hover:bg-muted')}
                        aria-current={active ? 'step' : undefined}
                      >
                        {content}
                      </Link>
                    ) : (
                      <span
                        className={cx(style, 'cursor-not-allowed text-muted-foreground')}
                        aria-disabled="true"
                        title={step.blockedTitle}
                      >
                        {content}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
          <dl
            aria-label="イベントの概要"
            className="mt-6 space-y-3 border-t border-border px-3 pt-6 text-sm"
          >
            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">イベント</dt>
              <dd className="font-semibold wrap-anywhere">{state.eventName || '未設定'}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-xs text-muted-foreground">メンバー</dt>
              <dd className="tabular-nums">{state.members.length}人</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-xs text-muted-foreground">支払い</dt>
              <dd className="tabular-nums">{state.payments.length}件</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-xs text-muted-foreground">立て替え合計</dt>
              <dd className="font-semibold tabular-nums">{yen(total)}</dd>
            </div>
          </dl>
        </aside>
        <main
          ref={mainRef}
          id="main"
          tabIndex={-1}
          className="relative min-h-0 min-w-0 space-y-4 scroll-pt-4 scroll-pb-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] outline-none max-lg:h-full max-lg:overflow-x-hidden max-lg:overflow-y-auto max-lg:overscroll-x-none sm:space-y-5 lg:pb-12"
        >
          {(storageError || workspace.storageError) && (
            <Notice alert>
              {storageError && <p>{storageError}</p>}
              {workspace.storageError && <p>{workspace.storageError}</p>}
              <div className="mt-3 ml-auto flex w-fit flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                {storageConflict && (
                  <ActionButton
                    icon={RefreshCw}
                    variant="primary"
                    onClick={() => void loadLatest()}
                  >
                    最新の保存データを読み込む
                  </ActionButton>
                )}
                <ActionButton icon={RotateCcw} onClick={retry}>
                  保存を再試行
                </ActionButton>
                <ActionButton icon={ArrowDownToLine} onClick={download} disabled={!usable}>
                  バックアップを書き出す
                </ActionButton>
                <ActionButton
                  icon={ArrowUpFromLine}
                  onClick={() => inputRef.current?.click()}
                  disabled={!isLoaded}
                >
                  バックアップを読み込む
                </ActionButton>
              </div>
            </Notice>
          )}
          {notice && <Notice>{notice}</Notice>}
          {message && <Notice>{message}</Notice>}
          {!isLoaded ? (
            <div className="flex justify-center py-20" role="status">
              <Spinner className="size-6 motion-reduce:animate-none" aria-hidden="true" />
              <span className="sr-only">読み込み中</span>
            </div>
          ) : loadBlocked ? (
            <EmptyState icon={ShieldCheck} title="保存データを確認してください" headingLevel={1}>
              このブラウザに保存されたデータを読み込めませんでした。元のデータは消していません。保存を再試行するか、書き出しておいたバックアップを読み込んでください。
            </EmptyState>
          ) : workspace.readBlocked && path !== routes.result ? (
            <EmptyState
              icon={FileWarning}
              title="下書きを確認してください"
              headingLevel={1}
              action={
                <>
                  {path !== routes.members && (
                    <ActionLink href={routes.members} icon={ArrowLeft}>
                      メンバーに戻る
                    </ActionLink>
                  )}
                  <ActionButton icon={Trash2} onClick={() => void discardBrokenDraft()}>
                    下書きを破棄して再開
                  </ActionButton>
                </>
              }
            >
              このタブの入力途中の下書きを読み込めませんでした。保存を再試行しても戻らないときは、下書きを破棄して入力を再開できます。登録済みの支払いは消えません。
            </EmptyState>
          ) : current && !current.ready && current.blockedTitle ? (
            <EmptyState
              icon={current.icon}
              title={current.blockedTitle}
              headingLevel={1}
              action={
                <ActionLink
                  href={current.recoveryHref!}
                  icon={ArrowRight}
                  trailingIcon
                  variant="primary"
                >
                  {current.recoveryLabel}
                </ActionLink>
              }
            >
              {current.blockedReason}
            </EmptyState>
          ) : (
            <Fragment key={store.eventRevision}>{children}</Fragment>
          )}
          <Input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            aria-label="バックアップファイル"
            className="hidden"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </main>
      </div>
    </div>
  );
}

function StepNumber({ index, active }: { index: number; active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
        active ? 'bg-main text-sub' : 'border border-input',
      )}
    >
      {index + 1}
    </span>
  );
}

/**
 * スマホ用の進み具合。見るためのもので、押す操作は持たない
 * （移動は各画面の右下の「次へ・戻る」に集める。親指の届く範囲に操作をまとめるため）。
 */
function Progress({ steps, path }: { steps: readonly Step[]; path: string }) {
  const currentIndex = steps.findIndex((step) => step.href === path);
  return (
    <ol
      aria-label="進み具合"
      className="mb-3 grid shrink-0 grid-cols-3 gap-1 text-xs font-semibold lg:hidden"
    >
      {steps.map((step, index) => {
        const active = index === currentIndex;
        // 前の段階でも、次の段階を開ける条件を満たしていなければ完了とは示さない
        const done = currentIndex > index && !!steps[index + 1]?.ready;
        return (
          <li
            key={step.href}
            aria-current={active ? 'step' : undefined}
            className={cx(
              'flex h-9 items-center gap-1.5 rounded-control px-2',
              active ? 'accent-soft text-main' : 'text-muted-foreground',
            )}
          >
            {done ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-main text-sub">
                <Check className="size-3" aria-hidden="true" />
                <span className="sr-only">完了：</span>
              </span>
            ) : (
              <span
                aria-hidden="true"
                className={cx(
                  'flex size-5 items-center justify-center rounded-full tabular-nums',
                  active ? 'bg-main text-sub' : 'border border-input',
                )}
              >
                {index + 1}
              </span>
            )}
            <span className="truncate">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
