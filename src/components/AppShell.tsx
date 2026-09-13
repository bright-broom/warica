'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCheck,
  RotateCcw,
  ShieldCheck,
  Split,
  Users,
  Wallet,
  ArrowRight,
  MoreHorizontal,
  RefreshCw,
  CirclePlus,
} from 'lucide-react';
import { usePaymentWorkspace } from './PaymentWorkspace';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';
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
  const path = usePathname(),
    router = useRouter();
  const store = useWarikanStore();
  const confirm = useConfirmation();
  const workspace = usePaymentWorkspace();
  const { state, isLoaded, loadBlocked, storageError, notice, total } = store;
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const allowReload = useRef(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const pendingReset = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const steps = navigation(state);
  const current = steps.find((step) => step.href === path);
  const saveLabel = !isLoaded
    ? '読み込み中'
    : storageError || workspace.storageError
      ? '未保存・要確認'
      : 'このブラウザに保存';
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
  function refresh() {
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

  async function reset() {
    if (
      !(await confirm({
        title: '新しいイベント',
        description: 'メンバー・支払い・入力途中の下書きをすべて消去します。元には戻せません。',
        action: '新しく始める',
        icon: RotateCcw,
      }))
    )
      return;
    const result = store.resetAll();
    if (result.ok) {
      router.push(routes.members);
      setMessage('');
    } else setMessage(result.error);
  }

  return (
    <div
      className="mx-auto min-h-dvh max-w-6xl px-4 sm:px-8 lg:px-12"
      data-testid="app-shell"
      inert={menuOpen || undefined}
    >
      <a
        className="sr-only z-50 rounded-control bg-accent p-4 focus:not-sr-only focus:fixed focus:top-4"
        href="#main"
      >
        本文へ移動
      </a>
      <header className="flex h-20 items-center justify-between sm:h-24">
        <Link
          href={routes.members}
          className="flex items-center gap-3 text-3xl font-bold tracking-tight"
          aria-label="WARICA ホーム"
        >
          <span className="flex size-10 items-center justify-center rounded-control bg-accent">
            <Split size={22} strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span>
            warica<span className="text-main/40">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <span
            className="flex size-control items-center justify-center text-muted-foreground"
            role="status"
            title={saveLabel}
          >
            {!isLoaded ? (
              <Spinner className="size-5 motion-reduce:animate-none" aria-hidden="true" />
            ) : storageError || workspace.storageError ? (
              <RotateCcw size={20} aria-hidden="true" />
            ) : (
              <CheckCheck size={20} aria-hidden="true" />
            )}
            <span className="sr-only">{saveLabel}</span>
          </span>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                ref={menuTrigger}
                variant="ghost"
                size="icon"
                aria-label="メニュー"
                title="メニュー"
              >
                <MoreHorizontal className="size-5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={(event) => {
                if (!pendingReset.current) return;
                event.preventDefault();
                pendingReset.current = false;
                menuTrigger.current?.focus();
                void reset();
              }}
            >
              <DropdownMenuItem disabled={!isLoaded || loadBlocked} onSelect={refresh}>
                <RefreshCw aria-hidden="true" />
                リフレッシュ
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!isLoaded || loadBlocked}
                onSelect={() => {
                  pendingReset.current = true;
                }}
              >
                <CirclePlus aria-hidden="true" />
                新しく始める
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
        <aside className="contents lg:sticky lg:top-8 lg:block lg:min-w-0">
          <nav
            aria-label="割り勘の手順"
            className="fixed right-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-4 z-40 mx-auto max-w-sm rounded-panel border border-main/15 bg-sub/95 p-2 shadow-xl shadow-main/10 backdrop-blur-lg lg:static lg:max-w-none lg:bg-sub lg:shadow-none"
          >
            <ol className="grid grid-cols-3 gap-2">
              {steps.map((step) => {
                const active = path === step.href;
                const style = cx(
                  'flex h-14 w-full items-center justify-center rounded-control transition-colors',
                  active ? 'bg-accent text-main' : 'text-muted-foreground hover:bg-main/5',
                );
                return (
                  <li key={step.href}>
                    {step.ready && isLoaded && !loadBlocked ? (
                      <Button asChild variant={active ? 'default' : 'ghost'} className={style}>
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
                        variant={active ? 'default' : 'ghost'}
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
        <main id="main" tabIndex={-1} className="min-w-0 space-y-5 pb-32 sm:space-y-6 lg:pb-8">
          {(storageError || workspace.storageError) && (
            <Notice alert>
              {storageError && <p>{storageError}</p>}
              {workspace.storageError && <p>{workspace.storageError}</p>}
              <div className="flex flex-wrap gap-2">
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
            children
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
