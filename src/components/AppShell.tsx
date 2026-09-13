'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  ShieldCheck,
  Split,
  Users,
  Wallet,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { usePaymentWorkspace } from './PaymentWorkspace';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Spinner } from './ui/spinner';
import { useConfirmation } from './ApplicationUI';
import { IconAction, IconLink } from './IconAction';
import { Avatar, EmptyState, Notice, cx } from './ui';
import { navigation, routes } from '@/config/navigation';
import { useWarikanStore } from '@/app/useWarikanStore';
import { MAX_FILE_SIZE, parseState, serializeState } from '@/lib/storage';
import { yen } from '@/lib/calculations';

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
  const allowReload = useRef(false);
  const steps = navigation(state);
  const current = steps.find((step) => step.href === path);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [path, store.eventRevision]);
  useEffect(() => {
    if (!storageError && !workspace.storageError) return;
    const protect = (event: BeforeUnloadEvent) => {
      if (allowReload.current) return;
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
  async function refresh() {
    if (storageConflict) {
      await loadLatest();
      return;
    }
    const saved = store.retryStorage();
    const draftSaved = workspace.retryStorage();
    if (saved && draftSaved) {
      allowReload.current = true;
      window.location.reload();
    }
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
        className="sr-only z-50 rounded-control accent-surface p-4 focus:not-sr-only focus:fixed focus:top-4"
        href="#main"
      >
        本文へ移動
      </a>
      <header className="flex h-18 shrink-0 items-center justify-between sm:h-22">
        <div className="relative flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
          <Link
            href={routes.members}
            className="absolute inset-0 hidden rounded-control lg:block"
            aria-label="WARICA ホーム"
          />
          <span
            data-ui="brand-mark"
            className="flex size-10 items-center justify-center rounded-control accent-surface"
          >
            <Split size={22} strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span>
            warica<span className="text-main/40">.</span>
          </span>
        </div>
        <IconAction
          label="リフレッシュ"
          icon={RefreshCw}
          variant="secondary"
          disabled={!isLoaded || loadBlocked}
          onClick={(event) => {
            event.currentTarget.focus();
            void refresh();
          }}
        />
      </header>
      <div className="grid min-h-0 items-start gap-6 max-lg:flex-1 max-lg:grid-rows-[minmax(0,1fr)] max-lg:pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
        <aside className="contents lg:sticky lg:top-8 lg:block lg:min-w-0">
          <nav
            data-ui="navigation"
            aria-label="割り勘の手順"
            className="fixed right-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 w-[10.5rem] rounded-panel backdrop-blur-lg lg:static lg:w-full"
          >
            <ol className="grid grid-cols-3 gap-1 lg:gap-2">
              {steps.map((step) => {
                const active = path === step.href;
                const style = cx(
                  'flex h-12 w-full items-center justify-center rounded-control transition-shadow lg:h-14',
                  active ? 'accent-surface text-main' : 'text-main',
                );
                return (
                  <li key={step.href}>
                    {step.ready && isLoaded && !loadBlocked ? (
                      <Button asChild variant={active ? 'default' : 'secondary'} className={style}>
                        <Link
                          href={step.href}
                          className={style}
                          aria-label={step.label}
                          title={step.label}
                          aria-current={active ? 'step' : undefined}
                        >
                          <step.icon className="size-[22px]" aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant={active ? 'default' : 'secondary'}
                        className={cx(style, 'disabled:cursor-not-allowed disabled:opacity-30')}
                        aria-label={step.label}
                        title={step.label}
                        disabled
                      >
                        <step.icon className="size-[22px]" aria-hidden="true" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="mt-8 hidden space-y-6 px-2 lg:block">
            {state.eventName && (
              <h2 className="text-sm font-semibold leading-6 wrap-anywhere">{state.eventName}</h2>
            )}
            <div className="flex -space-x-2">
              {state.members.slice(0, 5).map((member) => (
                <Avatar key={member.id} name={member.name} />
              ))}
            </div>
            <dl className="space-y-4 text-sm tabular-nums">
              <div className="flex items-center justify-between gap-2">
                <dt title="メンバー">
                  <Users size={17} aria-hidden="true" />
                  <span className="sr-only">メンバー</span>
                </dt>
                <dd>
                  {state.members.length}
                  <span className="ml-1 text-xs text-muted-foreground">人</span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt title="立て替え合計">
                  <Wallet size={17} aria-hidden="true" />
                  <span className="sr-only">立て替え合計</span>
                </dt>
                <dd className="font-semibold">{yen(total)}</dd>
              </div>
            </dl>
          </div>
        </aside>
        <main
          ref={mainRef}
          id="main"
          tabIndex={-1}
          className="min-h-0 min-w-0 space-y-4 scroll-pt-4 scroll-pb-6 pb-6 max-lg:h-full max-lg:overflow-y-auto sm:space-y-5 lg:pb-8"
        >
          {(storageError || workspace.storageError) && (
            <Notice alert>
              {storageError && <p>{storageError}</p>}
              {workspace.storageError && <p>{workspace.storageError}</p>}
              <div className="ml-auto flex max-w-[6.5rem] flex-wrap justify-end gap-2 sm:max-w-none">
                {storageConflict && (
                  <IconAction
                    label="最新の保存データを読み込む"
                    icon={RefreshCw}
                    variant="primary"
                    onClick={() => void loadLatest()}
                  />
                )}
                <IconAction
                  label="保存を再試行"
                  icon={RotateCcw}
                  variant="secondary"
                  onClick={retry}
                />
                <IconAction
                  label="バックアップ"
                  icon={ArrowDownToLine}
                  onClick={download}
                  disabled={!isLoaded || loadBlocked}
                />
                <IconAction
                  label="読み込む"
                  icon={ArrowUpFromLine}
                  onClick={() => inputRef.current?.click()}
                  disabled={!isLoaded}
                />
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
            <EmptyState icon={ShieldCheck}>
              <h1>保存データを確認してください</h1>
              <p>再試行するか、バックアップを読み込んでください。</p>
            </EmptyState>
          ) : workspace.readBlocked && path !== routes.result ? (
            <EmptyState icon={ShieldCheck}>
              <h1>下書きを確認してください</h1>
              <p>保存を再試行すると入力を再開できます。</p>
            </EmptyState>
          ) : current && !current.ready && current.blockedTitle ? (
            <EmptyState icon={current.icon}>
              <h1>{current.blockedTitle}</h1>
              <IconLink
                label={current.recoveryLabel}
                href={current.recoveryHref}
                icon={ArrowRight}
                variant="primary"
              />
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
