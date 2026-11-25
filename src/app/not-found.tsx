'use client';
import { ArrowRight, MapPinOff } from 'lucide-react';
import { ActionLink } from '@/components/actions';
import { EmptyState } from '@/components/ui';
import { routes } from '@/config/navigation';

export default function NotFound() {
  return (
    <EmptyState
      icon={MapPinOff}
      title="ページが見つかりません"
      headingLevel={1}
      action={
        <ActionLink href={routes.members} icon={ArrowRight} trailingIcon variant="primary">
          メンバーの画面へ
        </ActionLink>
      }
    >
      URL
      が変わったか、入力が間違っている可能性があります。入力したデータはこのブラウザに残っています。
    </EmptyState>
  );
}
