'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  CheckCheck,
  RotateCcw,
  ShieldCheck,
  Split,
} from 'lucide-react';
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
    { href: '/', label: 'メンバー', ready: true },
    { href: '/payments', label: '支払い', ready: setupReady },
    { href: '/result', label: '精算結果', ready: setupReady && state.payments.length > 0 },
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
        <span className={`save-status ${storageError ? 'has-error' : ''}`} role="status">
          {storageError ? <RotateCcw size={14} /> : <CheckCheck size={15} />}
          {!isLoaded ? '読み込み中' : storageError ? '未保存・要確認' : 'このブラウザに保存'}
        </span>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-top">
            <p className="eyebrow">SPLIT WELL. STAY CLOSE.</p>
            <p className="sidebar-heading">
              楽しい時間を、
              <br />
              気持ちよく締めよう。
            </p>
          </div>
          <nav aria-label="割り勘の手順">
            <ol className="steps">
              {steps.map((step, i) => (
                <li key={step.href} className={active === i ? 'active' : ''}>
                  {step.ready && isLoaded && !loadBlocked ? (
                    <Link href={step.href} aria-current={active === i ? 'step' : undefined}>
                      <span className="step-number">
                        {i < active ? <Check size={16} /> : `0${i + 1}`}
                      </span>
                      <span>{step.label}</span>
                      <span className="step-dot" />
                    </Link>
                  ) : (
                    <span className="step-disabled">
                      <span className="step-number">0{i + 1}</span>
                      {step.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <div className="event-summary">
            <span className="eyebrow">YOUR EVENT</span>
            <h2>{state.eventName || '新しい集まり'}</h2>
            <div className="avatar-stack">
              {state.members.slice(0, 5).map((m, i) => (
                <Avatar key={m.id} name={m.name} index={i} />
              ))}
              {!state.members.length && (
                <span className="small muted">メンバーを追加してスタート</span>
              )}
            </div>
            <dl>
              <div>
                <dt>メンバー</dt>
                <dd>
                  {state.members.length}
                  <span>人</span>
                </dd>
              </div>
              <div>
                <dt>立て替え合計</dt>
                <dd>{yen(total)}</dd>
              </div>
            </dl>
          </div>
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <p>
              アカウント登録は不要。
              <br />
              入力内容はブラウザ内に保存されます。
            </p>
          </div>
        </aside>
        <main id="main" className="main-content">
          {storageError && (
            <div className="notice error" role="alert">
              <p>{storageError}</p>
              <button className="button small-button secondary" onClick={store.retryStorage}>
                保存を再試行
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          {!isLoaded ? (
            <div className="loading" role="status">
              イベントを読み込んでいます…
            </div>
          ) : loadBlocked ? (
            <div className="empty-state">
              <ShieldCheck size={36} />
              <h1>保存データを確認してください</h1>
              <p>
                データへのアクセスが戻るまで、入力を停止しています。
                <br />
                ブラウザの設定を確認して再試行するか、下の「読み込む」からバックアップを復元してください。
              </p>
            </div>
          ) : (
            children
          )}
          <footer className="workspace-footer">
            <div className="footer-tools">
              <button onClick={download} disabled={!isLoaded || loadBlocked}>
                <ArrowDownToLine size={15} />
                バックアップ
              </button>
              <button onClick={() => inputRef.current?.click()} disabled={!isLoaded}>
                <ArrowUpFromLine size={15} />
                読み込む
              </button>
              <button onClick={reset} disabled={!isLoaded || loadBlocked}>
                <RotateCcw size={14} />
                新しく始める
              </button>
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
            <span className="footer-signature">LESS MATH, MORE MEMORIES.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
