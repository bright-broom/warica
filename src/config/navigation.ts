import { ArrowRightLeft, ReceiptText, Users } from 'lucide-react';
import type { WarikanState } from '@/lib/types';

export const routes = {
  members: '/',
  payments: '/payments',
  result: '/result',
} as const;

export function navigation(state: WarikanState) {
  const setupReady = !!state.eventName.trim() && state.members.length >= 2;
  return [
    { href: routes.members, label: 'メンバー', icon: Users, ready: true },
    {
      href: routes.payments,
      label: '支払い',
      icon: ReceiptText,
      ready: setupReady,
      blockedTitle: 'メンバー未登録',
      recoveryLabel: 'メンバーを登録する',
      recoveryHref: routes.members,
    },
    {
      href: routes.result,
      label: '精算結果',
      icon: ArrowRightLeft,
      ready: setupReady && state.payments.length > 0,
      blockedTitle: '支払い未登録',
      recoveryLabel: '支払いを記録する',
      recoveryHref: setupReady ? routes.payments : routes.members,
    },
  ];
}
