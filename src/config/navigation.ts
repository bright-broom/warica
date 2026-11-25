import { ArrowRightLeft, ReceiptText, Users, type LucideIcon } from 'lucide-react';
import type { WarikanState } from '@/lib/domain/types';

export const routes = {
  members: '/',
  payments: '/payments',
  result: '/result',
} as const;

export type Step = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** この画面を開ける条件を満たしているか */
  ready: boolean;
  /** 開けないときに出す見出し・理由・戻り先 */
  blockedTitle?: string;
  blockedReason?: string;
  recoveryLabel?: string;
  recoveryHref?: string;
};

/** 3つの画面の順番と、それぞれを開ける条件。ナビゲーションと各画面の案内はここから作る。 */
export function navigation(state: WarikanState): readonly Step[] {
  const setupReady = !!state.eventName.trim() && state.members.length >= 2;
  return [
    { href: routes.members, label: 'メンバー', icon: Users, ready: true },
    {
      href: routes.payments,
      label: '支払い',
      icon: ReceiptText,
      ready: setupReady,
      blockedTitle: 'メンバー未登録',
      blockedReason: '支払いを記録するには、イベント名と2人以上のメンバーが必要です。',
      recoveryLabel: 'メンバーを登録する',
      recoveryHref: routes.members,
    },
    {
      href: routes.result,
      label: '精算結果',
      icon: ArrowRightLeft,
      ready: setupReady && state.payments.length > 0,
      blockedTitle: '支払い未登録',
      blockedReason: setupReady
        ? '精算結果は、支払いを1件以上記録すると表示されます。'
        : '精算するには、先にイベント名と2人以上のメンバーを登録してください。',
      recoveryLabel: setupReady ? '支払いを記録する' : 'メンバーを登録する',
      recoveryHref: setupReady ? routes.payments : routes.members,
    },
  ];
}
