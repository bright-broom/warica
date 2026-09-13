'use client';
import { Pencil, ReceiptText, Trash2, Users, Wallet, History, TriangleAlert } from 'lucide-react';
import { useWarikanStore } from '@/app/useWarikanStore';
import { Avatar, Badge, EmptyState, Panel, SectionHeader } from './ui';
import { useConfirmation } from './ApplicationUI';
import { IconAction } from './IconAction';
import type { Payment } from '@/lib/types';
import { yen } from '@/lib/calculations';

export function PaymentHistory({
  onEdit,
  onRemove,
}: {
  onEdit?: (payment: Payment) => void;
  onRemove?: (id: string) => void;
}) {
  const confirm = useConfirmation();
  const {
    state: { payments, members },
    removePayment,
  } = useWarikanStore();
  return (
    <Panel>
      <SectionHeader icon={History} title="支払いの記録">
        <Badge>{payments.length}件</Badge>
      </SectionHeader>
      {payments.length ? (
        <ul data-testid="payment-list" className="divide-y divide-main/10">
          {[...payments].reverse().map((payment) => {
            const payer = members.find((m) => m.id === payment.payerId);
            return (
              <li
                key={payment.id}
                className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto]"
              >
                <Avatar name={payer?.name ?? '?'} />
                <div className="min-w-0 space-y-2 text-xs text-main/65 wrap-anywhere">
                  <h3 className="text-sm font-semibold text-main">{payment.memo || '立て替え'}</h3>
                  <p className="flex items-start gap-2">
                    <Wallet size={13} className="mt-0.5" aria-hidden="true" />
                    <span>
                      <span className="sr-only">支払者：</span>
                      {payer?.name}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Users size={13} className="mt-0.5" aria-hidden="true" />
                    <span>
                      <span className="sr-only">対象：</span>
                      {payment.participantIds
                        .map((id) => members.find((m) => m.id === id)?.name)
                        .join('、')}
                    </span>
                  </p>
                  {payment.needsReview && (
                    <span className="inline-flex" title="旧データ・対象者を要確認">
                      <TriangleAlert size={14} aria-hidden="true" />
                      <span className="sr-only">旧データ・対象者を要確認</span>
                    </span>
                  )}
                </div>
                <div className="col-start-2 flex flex-wrap items-center justify-between gap-2 sm:col-start-3 sm:flex-col sm:items-end">
                  <strong className="text-lg font-semibold tabular-nums">
                    {yen(payment.amount)}
                  </strong>
                  {onEdit && (
                    <div className="flex">
                      <IconAction
                        label={`${payment.memo || '立て替え'}を編集`}
                        icon={Pencil}
                        onClick={() => onEdit(payment)}
                      />
                      <IconAction
                        label={`${payment.memo || '立て替え'}を削除`}
                        icon={Trash2}
                        onClick={async () => {
                          if (
                            await confirm({
                              title: '支払いを削除',
                              description: `「${payment.memo || '立て替え'}」${yen(payment.amount)}を削除しますか？`,
                              action: '削除する',
                              icon: Trash2,
                            })
                          ) {
                            const removed = removePayment(payment.id);
                            if (removed.ok) onRemove?.(payment.id);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={ReceiptText}>
          <h3 className="sr-only">支払いはありません</h3>
        </EmptyState>
      )}
    </Panel>
  );
}
