'use client';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/actions';
import { ActionRow, Notice, PageHeader } from '@/components/ui';
import { PaymentEditor } from '@/components/payments/PaymentEditor';
import { PaymentHistory } from '@/components/payments/PaymentHistory';
import { routes } from '@/config/navigation';
import { usePaymentWorkspace } from '@/state/payment-workspace';
import { useWarikanStore } from '@/state/warikan-store';
import { yen } from '@/lib/domain/calculations';
import { scrollToContent } from '@/lib/scroll';

export default function PaymentsPage() {
  const { state, total } = useWarikanStore();
  const workspace = usePaymentWorkspace();
  function complete({ amount, edited }: { amount: number; edited: boolean }) {
    toast.success(`${yen(amount)} ${edited ? '更新しました' : '追加しました'}`);
  }
  return (
    <>
      <PageHeader step="ステップ 2 / 3" title="支払い">
        誰かが立て替えた支払いを、1件ずつ記録します。続けて追加するときは、支払った人と対象者を引き継ぎます。
      </PageHeader>
      <dl
        aria-label="記録した支払い"
        className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-1 text-sm"
      >
        <div className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">立て替え合計</dt>
          <dd className="text-xl font-semibold tabular-nums">{yen(total)}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">記録</dt>
          <dd className="tabular-nums">{state.payments.length}件</dd>
        </div>
      </dl>
      {state.payments.some((p) => p.needsReview) && (
        <Notice>
          以前のバージョンで記録した支払いは、対象者を全員として仮に計算しています。各支払いを編集して対象者を確認してください。
        </Notice>
      )}
      <PaymentEditor onDone={complete} />
      {!!state.payments.length && (
        <PaymentHistory
          onEdit={(payment) => {
            workspace.startEditing(payment);
            scrollToContent(document.getElementById('payment-editor'), 'smooth');
          }}
          onRemove={(id) => {
            if (workspace.editingId === id) workspace.cancelEditing();
          }}
        />
      )}
      <ActionRow>
        <ActionLink href={routes.members} icon={ArrowLeft} variant="ghost">
          メンバーに戻る
        </ActionLink>
        {state.payments.length ? (
          <ActionLink href={routes.result} icon={ArrowRight} trailingIcon variant="primary">
            精算結果を見る
          </ActionLink>
        ) : (
          <ActionButton icon={ArrowRight} trailingIcon variant="primary" disabled>
            精算結果を見る
          </ActionButton>
        )}
      </ActionRow>
    </>
  );
}
