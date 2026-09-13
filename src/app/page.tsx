'use client';
import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  Coffee,
  Pencil,
  Plus,
  Users,
  X,
  Plane,
  Utensils,
  House,
} from 'lucide-react';
import { IconAction, IconLink } from '@/components/IconAction';
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
      <h1 className="sr-only">メンバー</h1>
      <section className="panel setup-panel">
        <div className="section-heading">
          <span className="section-icon">
            <Coffee size={19} />
          </span>
          <h2 className="sr-only">イベント</h2>
        </div>
        <label htmlFor="event-name" className="sr-only">
          イベント名
        </label>
        <input
          id="event-name"
          className="text-input event-input"
          value={state.eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="イベント名"
          maxLength={50}
          autoComplete="off"
        />
        <div className="suggestions">
          {[
            { label: '週末の旅行', icon: Plane },
            { label: 'みんなでごはん', icon: Utensils },
            { label: 'ホームパーティー', icon: House },
          ].map(({ label, icon }) => (
            <IconAction key={label} label={label} icon={icon} onClick={() => setEventName(label)} />
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <span className="section-icon">
            <Users size={19} />
          </span>
          <h2 className="sr-only">メンバー</h2>
          <span className="count-pill">{state.members.length}人</span>
        </div>
        <form className="member-form" onSubmit={add}>
          <label htmlFor="member-name" className="sr-only">
            メンバーの名前
          </label>
          <input
            id="member-name"
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="名前"
            maxLength={20}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229))
                e.preventDefault();
            }}
          />
          <IconAction
            type="submit"
            label="追加"
            icon={Plus}
            className="primary"
            disabled={!name.trim()}
          />
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
                    <button
                      className="icon-button"
                      aria-label="名前を保存"
                      title="名前を保存"
                      onClick={saveEdit}
                    >
                      <Check size={18} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="編集をキャンセル"
                      title="キャンセル"
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
                      title="編集"
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
                      title="削除"
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
        ) : null}
        {state.members.length < 2 && <p className="minimum-hint">2人以上</p>}
      </section>
      <div className="next-action">
        {ready ? (
          <IconLink
            label="支払いを記録する"
            icon={ArrowRight}
            className="primary next-icon"
            href="/payments"
          />
        ) : (
          <IconAction
            label="支払いを記録する"
            icon={ArrowRight}
            className="primary next-icon"
            disabled
          />
        )}
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
