'use client';
import { Pencil, ReceiptText, Trash2, Users, Wallet, History, TriangleAlert } from 'lucide-react';
import { useWarikanStore } from '@/app/useWarikanStore';
import { Avatar } from './AppShell';
import type { Payment } from '@/lib/types';
import { yen } from '@/lib/calculations';

export function PaymentHistory({ onEdit }: { onEdit?: (payment: Payment) => void }) {
  const {
    state: { payments, members },
    removePayment,
  } = useWarikanStore();
  return (
    <section className="panel">
      <div className="section-heading">
        <History size={20} aria-hidden="true" />
        <h2 className="sr-only">支払いの記録</h2>
        <span className="count-pill">{payments.length}件</span>
      </div>
      {payments.length ? (
        <ul className="payment-list">
          {[...payments].reverse().map((p) => {
            const index = members.findIndex((m) => m.id === p.payerId);
            return (
              <li key={p.id}>
                <Avatar name={members[index]?.name ?? '?'} index={index} />
                <div className="payment-details">
                  <h3>{p.memo || '立て替え'}</h3>
                  <p className="icon-detail">
                    <Wallet size={12} aria-hidden="true" />
                    <span className="sr-only">支払者：</span>
                    {members[index]?.name}
                  </p>
                  <p className="payment-participants icon-detail">
                    <Users size={12} aria-hidden="true" />
                    <span className="sr-only">対象：</span>
                    {p.participantIds
                      .map((id) => members.find((m) => m.id === id)?.name)
                      .join('、')}
                  </p>
                  {p.needsReview && (
                    <span className="review-badge" title="旧データ・対象者を要確認">
                      <TriangleAlert size={14} aria-hidden="true" />
                      <span className="sr-only">旧データ・対象者を要確認</span>
                    </span>
                  )}
                </div>
                <div className="payment-right">
                  <strong>{yen(p.amount)}</strong>
                  {onEdit && (
                    <div className="payment-tools">
                      <button
                        className="icon-button"
                        aria-label={`${p.memo || '立て替え'}を編集`}
                        title="編集"
                        onClick={() => onEdit(p)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`${p.memo || '立て替え'}を削除`}
                        title="削除"
                        onClick={() => {
                          if (
                            window.confirm(
                              `「${p.memo || '立て替え'}」${yen(p.amount)}を削除しますか？`,
                            )
                          )
                            removePayment(p.id);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty-state compact">
          <ReceiptText size={32} />
          <h3 className="sr-only">支払いはありません</h3>
        </div>
      )}
    </section>
  );
}
