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
import { ActionRow, Avatar, Badge, Notice, Panel, SectionHeader, TextInput } from '@/components/ui';
import { navigation, routes } from '@/config/navigation';
import { useWarikanStore } from './useWarikanStore';

export default function HomePage() {
  const { state, setEventName, addMember, editMember, removeMember } = useWarikanStore();
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const ready = navigation(state).find((step) => step.href === routes.payments)!.ready;
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
      <Panel tone="soft">
        <SectionHeader icon={Coffee} title="イベント" />
        <label htmlFor="event-name" className="sr-only">
          イベント名
        </label>
        <TextInput
          id="event-name"
          className="border-main/10 bg-sub/70 text-lg font-semibold"
          value={state.eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="イベント名"
          maxLength={50}
          autoComplete="off"
        />
        <div className="mt-3 flex gap-2">
          {[
            { label: '週末の旅行', icon: Plane },
            { label: 'みんなでごはん', icon: Utensils },
            { label: 'ホームパーティー', icon: House },
          ].map(({ label, icon }) => (
            <IconAction key={label} label={label} icon={icon} onClick={() => setEventName(label)} />
          ))}
        </div>
      </Panel>
      <Panel>
        <SectionHeader icon={Users} title="メンバー">
          <Badge>{state.members.length}人</Badge>
        </SectionHeader>
        <form className="flex items-center gap-2" onSubmit={add}>
          <label htmlFor="member-name" className="sr-only">
            メンバーの名前
          </label>
          <TextInput
            id="member-name"
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
            variant="primary"
            disabled={!name.trim()}
          />
        </form>
        {error && <Notice alert>{error}</Notice>}
        {state.members.length ? (
          <ul data-testid="member-list" className="mt-5 divide-y divide-main/10">
            {state.members.map((member) => (
              <li key={member.id} className="flex min-w-0 items-center gap-2 py-2">
                {editId === member.id ? (
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <label htmlFor="edit-member" className="sr-only">
                      新しい名前
                    </label>
                    <TextInput
                      id="edit-member"
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
                    <IconAction label="名前を保存" icon={Check} onClick={saveEdit} />
                    <IconAction label="編集をキャンセル" icon={X} onClick={() => setEditId(null)} />
                  </div>
                ) : (
                  <>
                    <Avatar name={member.name} />
                    <span className="min-w-0 flex-1 text-sm font-medium wrap-anywhere">
                      {member.name}
                    </span>
                    <IconAction
                      icon={Pencil}
                      label={`${member.name}の名前を編集`}
                      onClick={() => {
                        setEditId(member.id);
                        setEditName(member.name);
                      }}
                    />
                    <IconAction
                      icon={X}
                      label={`${member.name}を削除`}
                      onClick={() => {
                        const result = removeMember(member.id);
                        setError(result.ok ? '' : result.error);
                      }}
                    />
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {state.members.length < 2 && <p className="mt-4 text-xs text-main/60">2人以上</p>}
      </Panel>
      <ActionRow>
        {ready ? (
          <IconLink
            label="支払いを記録する"
            icon={ArrowRight}
            variant="primary"
            size="large"
            href={routes.payments}
          />
        ) : (
          <IconAction
            label="支払いを記録する"
            icon={ArrowRight}
            variant="primary"
            size="large"
            disabled
          />
        )}
      </ActionRow>
    </>
  );
}
