'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Coffee, Pencil, Plus, Users, X } from 'lucide-react';
import { AppShell, Avatar } from '@/components/AppShell';
import { useWarikanStore } from './useWarikanStore';

function MemberSetup() {
  const { state, setEventName, addMember, editMember, removeMember } = useWarikanStore();
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const ready = !!state.eventName.trim() && state.members.length >= 2;
  function add(event: FormEvent) {
    event.preventDefault();
    const result = addMember(name);
    if (result.ok) {
      setName('');
      setError('');
    } else setError(result.error);
  }
  function saveEdit() {
    if (!editId) return;
    const result = editMember(editId, editName);
    if (result.ok) {
      setEditId(null);
      setError('');
    } else setError(result.error);
  }
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">01 — THE PEOPLE</p>
        <h1>今日は、誰と？</h1>
        <p>
          旅行も、ごはんも、いつもの集まりも。
          <br className="mobile-break" />
          まずはイベントとメンバーを登録しましょう。
        </p>
      </div>
      <section className="panel setup-panel">
        <div className="section-heading">
          <span className="section-icon">
            <Coffee size={19} />
          </span>
          <h2>集まりの名前</h2>
          <span className="field-meta">あとから変更できます</span>
        </div>
        <label htmlFor="event-name" className="sr-only">
          イベント名
        </label>
        <input
          id="event-name"
          className="text-input event-input"
          value={state.eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="例：週末の京都旅行"
          maxLength={50}
          autoComplete="off"
        />
        <div className="suggestions">
          <span>たとえば</span>
          {['週末の旅行', 'みんなでごはん', 'ホームパーティー'].map((label) => (
            <button key={label} onClick={() => setEventName(label)}>
              {label}
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <span className="section-icon">
            <Users size={19} />
          </span>
          <h2>参加するメンバー</h2>
          <span className="count-pill">{state.members.length}人</span>
        </div>
        <p className="section-description">自分の名前も忘れずに。2人から始められます。</p>
        <form className="member-form" onSubmit={add}>
          <label htmlFor="member-name" className="sr-only">
            メンバーの名前
          </label>
          <input
            id="member-name"
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="名前を入力"
            maxLength={20}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229))
                e.preventDefault();
            }}
          />
          <button className="button primary" disabled={!name.trim()}>
            <Plus size={18} />
            <span>追加</span>
          </button>
        </form>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {state.members.length ? (
          <ul className="member-list">
            {state.members.map((member, i) => (
              <li key={member.id}>
                {editId === member.id ? (
                  <div className="member-edit">
                    <label htmlFor="edit-member" className="sr-only">
                      新しい名前
                    </label>
                    <input
                      id="edit-member"
                      className="text-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={20}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                          e.preventDefault();
                          saveEdit();
                        }
                        if (e.key === 'Escape') setEditId(null);
                      }}
                    />
                    <button className="icon-button" aria-label="名前を保存" onClick={saveEdit}>
                      <Check size={18} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="編集をキャンセル"
                      onClick={() => setEditId(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Avatar name={member.name} index={i} />
                    <span className="member-name">{member.name}</span>
                    <button
                      className="icon-button"
                      aria-label={`${member.name}の名前を編集`}
                      onClick={() => {
                        setEditId(member.id);
                        setEditName(member.name);
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${member.name}を削除`}
                      onClick={() => {
                        const result = removeMember(member.id);
                        setError(result.ok ? '' : result.error);
                      }}
                    >
                      <X size={17} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="member-empty">
            <span className="empty-avatars">
              <span>A</span>
              <span>B</span>
              <span>＋</span>
            </span>
            <p>楽しい時間を過ごすメンバーを追加しよう。</p>
          </div>
        )}
        <div className="panel-footnote">
          <span className={`status-dot ${state.members.length >= 2 ? 'ready' : ''}`} />
          {state.members.length >= 2
            ? `${state.members.length}人のメンバーを登録しました`
            : `あと${2 - state.members.length}人追加すると、次へ進めます`}
        </div>
      </section>
      <div className="next-action">
        <p>
          {ready
            ? '準備できました。立て替えた支払いを記録しましょう。'
            : 'イベント名と2人以上のメンバーを入力してください。'}
        </p>
        {ready ? (
          <Link className="button primary large-button" href="/payments">
            支払いを記録する
            <ArrowRight size={18} />
          </Link>
        ) : (
          <button className="button primary large-button" disabled>
            支払いを記録する
            <ArrowRight size={18} />
          </button>
        )}
      </div>
      <div className="how-it-works">
        <span>名前を登録</span>
        <ArrowRight size={14} />
        <span>支払いを記録</span>
        <ArrowRight size={14} />
        <span>すっきり精算</span>
      </div>
    </>
  );
}
export default function HomePage() {
  return (
    <AppShell>
      <MemberSetup />
    </AppShell>
  );
}
