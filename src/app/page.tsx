'use client';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Check, House, Pencil, Plane, Plus, Utensils, X } from 'lucide-react';
import { ChoiceChips } from '@/components/ChoiceChips';
import { ActionButton, ActionLink, IconAction } from '@/components/actions';
import {
  ActionRow,
  Avatar,
  Badge,
  Field,
  Notice,
  PageHeader,
  Panel,
  SectionHeader,
  TextInput,
} from '@/components/ui';
import { Label } from '@/components/ui/label';
import { navigation, routes } from '@/config/navigation';
import { isSharedStorageError, useWarikanStore } from '@/state/warikan-store';
import type { Result } from '@/lib/domain/types';

const EVENT_CHOICES = [
  { label: '週末の旅行', icon: Plane },
  { label: 'みんなでごはん', icon: Utensils },
  { label: 'ホームパーティー', icon: House },
];

/** IME の変換確定の Enter で送信しない */
const composing = (e: React.KeyboardEvent) => e.nativeEvent.isComposing || e.keyCode === 229;

export default function MembersPage() {
  const { state, setEventName, addMember, editMember, removeMember } = useWarikanStore();
  const [name, setName] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const payments = navigation(state).find((step) => step.href === routes.payments)!;
  // 保存容量の超過などは画面上部の共通の案内に出るので、ここでは重ねて出さない
  const show = (result: Result<void>) =>
    setError(result.ok || isSharedStorageError(result.error) ? '' : result.error);

  function add(event: FormEvent) {
    event.preventDefault();
    const result = addMember(name);
    show(result);
    if (result.ok) {
      setName('');
      nameRef.current?.focus();
    }
  }
  function saveEdit() {
    if (!editId) return;
    const result = editMember(editId, editName);
    show(result);
    if (result.ok) setEditId(null);
  }
  return (
    <>
      <PageHeader step="ステップ 1 / 3" title="メンバー">
        旅行や食事の立て替えを記録して、誰が誰にいくら送ればよいかを計算します。ログインは不要で、入力はこのブラウザの中だけに保存されます。
      </PageHeader>
      <Panel>
        <Field id="event-name" label="イベント名">
          <TextInput
            id="event-name"
            className="text-lg font-semibold"
            value={state.eventName}
            onChange={(e) => show(setEventName(e.target.value))}
            placeholder="例：京都旅行"
            maxLength={50}
            autoComplete="off"
          />
        </Field>
        <div className="mt-3 flex justify-end sm:justify-start">
          <ChoiceChips
            label="イベント名の候補"
            value={state.eventName}
            onValueChange={(value) => show(setEventName(value))}
            choices={EVENT_CHOICES}
          />
        </div>
      </Panel>
      <Panel>
        <SectionHeader
          title="メンバー"
          description="割り勘する人を2人以上登録します。名前は精算結果やコピーした文章に出ます。"
        >
          <Badge>{state.members.length}人</Badge>
        </SectionHeader>
        <form className="flex items-end gap-2" onSubmit={add}>
          <div className="min-w-0 flex-1">
            <Field id="member-name" label="メンバーの名前">
              <TextInput
                id="member-name"
                ref={nameRef}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="例：あおい"
                maxLength={20}
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && composing(e)) e.preventDefault();
                }}
              />
            </Field>
          </div>
          <ActionButton type="submit" icon={Plus} disabled={!name.trim()}>
            追加
          </ActionButton>
        </form>
        {error && (
          <div className="mt-3">
            <Notice alert>{error}</Notice>
          </div>
        )}
        {state.members.length ? (
          <ul data-testid="member-list" className="mt-5 divide-y divide-border">
            {state.members.map((member) => (
              <li key={member.id} className="flex min-h-14 min-w-0 items-center gap-2 py-2">
                {editId === member.id ? (
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <Label htmlFor="edit-member" className="sr-only">
                      新しい名前
                    </Label>
                    <TextInput
                      id="edit-member"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={20}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !composing(e)) {
                          e.preventDefault();
                          saveEdit();
                        }
                        if (e.key === 'Escape') setEditId(null);
                      }}
                    />
                    <IconAction
                      label="名前を保存"
                      icon={Check}
                      variant="primary"
                      onClick={saveEdit}
                    />
                    <IconAction label="編集をキャンセル" icon={X} onClick={() => setEditId(null)} />
                  </div>
                ) : (
                  <>
                    <Avatar name={member.name} />
                    <span className="min-w-0 flex-1 font-medium wrap-anywhere">{member.name}</span>
                    <IconAction
                      icon={Pencil}
                      label={`${member.name}の名前を編集`}
                      onClick={() => {
                        setEditId(member.id);
                        setEditName(member.name);
                        setError('');
                      }}
                    />
                    <IconAction
                      icon={X}
                      label={`${member.name}を削除`}
                      onClick={() => show(removeMember(member.id))}
                    />
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">まだメンバーがいません。</p>
        )}
      </Panel>
      {!payments.ready && (
        <p className="px-1 text-right text-sm text-muted-foreground" role="status">
          {payments.blockedReason}
        </p>
      )}
      <ActionRow>
        {payments.ready ? (
          <ActionLink href={routes.payments} icon={ArrowRight} trailingIcon variant="primary">
            支払いを記録する
          </ActionLink>
        ) : (
          <ActionButton icon={ArrowRight} trailingIcon variant="primary" disabled>
            支払いを記録する
          </ActionButton>
        )}
      </ActionRow>
    </>
  );
}
