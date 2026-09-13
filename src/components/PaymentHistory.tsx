'use client';
import { Pencil, ReceiptText, Trash2 } from 'lucide-react';
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
        <h2>支払いの記録</h2>
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
                  <p>{members[index]?.name}が支払い</p>
                  <p className="payment-participants">
                    対象：
                    {p.participantIds
                      .map((id) => members.find((m) => m.id === id)?.name)
                      .join('、')}
                  </p>
                  {p.needsReview && <span className="review-badge">旧データ・対象者を要確認</span>}
                </div>
                <div className="payment-right">
                  <strong>{yen(p.amount)}</strong>
                  {onEdit && (
                    <div className="payment-tools">
                      <button
                        className="icon-button"
                        aria-label={`${p.memo || '立て替え'}を編集`}
                        onClick={() => onEdit(p)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`${p.memo || '立て替え'}を削除`}
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
          <h3>最初の支払いを記録しよう</h3>
          <p>
            立て替えた人と金額を入力すると、
            <br />
            ここに支払いがまとまります。
          </p>
        </div>
      )}
    </section>
  );
}
