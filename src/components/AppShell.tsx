'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCheck,
  RotateCcw,
  ShieldCheck,
  Split,
  Users,
  ReceiptText,
  ArrowRightLeft,
  Wallet,
  LoaderCircle,
} from 'lucide-react';
import { IconAction } from './IconAction';
import { useWarikanStore } from '@/app/useWarikanStore';
import { MAX_FILE_SIZE, parseState, serializeState } from '@/lib/storage';
import { yen } from '@/lib/calculations';

export function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  return (
    <span aria-hidden="true" className={`avatar avatar-${index % 5}`}>
      {Array.from(name)[0] || '?'}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    router = useRouter();
  const store = useWarikanStore();
  const { state, isLoaded, loadBlocked, storageError, notice, total } = store;
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const setupReady = !!state.eventName.trim() && state.members.length >= 2;
  const steps = [
    { href: '/', label: 'メンバー', icon: Users, ready: true },
    { href: '/payments', label: '支払い', icon: ReceiptText, ready: setupReady },
    {
      href: '/result',
      label: '精算結果',
      icon: ArrowRightLeft,
      ready: setupReady && state.payments.length > 0,
    },
  ];
  const active = Math.max(
    0,
    steps.findIndex((s) => s.href === path),
  );

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
        !window.confirm(
          `「${validated.data.eventName || '名称未設定'}」を読み込みます。現在のイベントを置き換えてよいですか？必要なデータは先にバックアップを保存してください。`,
        )
      )
        return;
      const result = store.importBackup(raw);
      setMessage(result.ok ? 'バックアップを読み込みました。' : result.error);
      if (result.ok) router.push('/');
    } catch {
      setMessage('ファイルを読み込めませんでした。もう一度選択してください。');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function reset() {
    if (
      !window.confirm(
        '新しいイベントを始めますか？現在の入力をクリアします。必要な場合は先にバックアップを保存してください。',
      )
    )
      return;
    const result = store.resetAll();
    if (result.ok) {
      router.push('/');
      setMessage('');
    } else setMessage(result.error);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="WARICA ホーム">
          <span className="brand-mark">
            <Split size={20} strokeWidth={2.5} />
          </span>
          warica<span className="brand-dot">.</span>
        </Link>
        <span
          className={`save-status ${storageError ? 'has-error' : ''}`}
          role="status"
          title={!isLoaded ? '読み込み中' : storageError ? '未保存・要確認' : 'このブラウザに保存'}
        >
          {!isLoaded ? (
            <LoaderCircle size={20} aria-hidden="true" />
          ) : storageError ? (
            <RotateCcw size={20} aria-hidden="true" />
          ) : (
            <CheckCheck size={20} aria-hidden="true" />
          )}
          <span className="sr-only">
            {!isLoaded ? '読み込み中' : storageError ? '未保存・要確認' : 'このブラウザに保存'}
          </span>
        </span>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <nav aria-label="割り勘の手順">
            <ol className="steps">
              {steps.map((step, i) => (
                <li key={step.href} className={active === i ? 'active' : ''}>
                  {step.ready && isLoaded && !loadBlocked ? (
                    <Link
                      href={step.href}
                      aria-label={step.label}
                      title={step.label}
                      aria-current={active === i ? 'step' : undefined}
                    >
                      <step.icon size={22} aria-hidden="true" />
                    </Link>
                  ) : (
                    <button
                      className="step-disabled"
                      aria-label={step.label}
                      title={step.label}
                      disabled
                    >
                      <step.icon size={22} aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <div className="event-summary">
            {state.eventName && <h2>{state.eventName}</h2>}
            <div className="avatar-stack">
              {state.members.slice(0, 5).map((m, i) => (
                <Avatar key={m.id} name={m.name} index={i} />
              ))}
            </div>
            <dl>
              <div>
                <dt title="メンバー">
                  <Users size={16} aria-hidden="true" />
                  <span className="sr-only">メンバー</span>
                </dt>
                <dd>
                  {state.members.length}
                  <span>人</span>
                </dd>
              </div>
              <div>
                <dt title="立て替え合計">
                  <Wallet size={16} aria-hidden="true" />
                  <span className="sr-only">立て替え合計</span>
                </dt>
                <dd>{yen(total)}</dd>
              </div>
            </dl>
          </div>
        </aside>
        <main id="main" className="main-content">
          {storageError && (
            <div className="notice error" role="alert">
              <p>{storageError}</p>
              <IconAction
                label="保存を再試行"
                icon={RotateCcw}
                className="secondary"
                onClick={store.retryStorage}
              />
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          {!isLoaded ? (
            <div className="loading" role="status">
              <LoaderCircle size={24} aria-hidden="true" />
              <span className="sr-only">読み込み中</span>
            </div>
          ) : loadBlocked ? (
            <div className="empty-state">
              <ShieldCheck size={36} />
              <h1>保存データを確認してください</h1>
              <p>再試行するか、バックアップを読み込んでください。</p>
            </div>
          ) : (
            children
          )}
          <footer className="workspace-footer">
            <div className="footer-tools">
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
              <IconAction
                label="新しく始める"
                icon={RotateCcw}
                onClick={reset}
                disabled={!isLoaded || loadBlocked}
              />
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              aria-label="バックアップファイル"
              className="sr-only"
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
            <p className="footer-message" role="status">
              {message}
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
