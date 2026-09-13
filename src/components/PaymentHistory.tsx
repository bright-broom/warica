'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pencil,
  ReceiptText,
  Trash2,
  Users,
  Wallet,
  History,
  TriangleAlert,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useWarikanStore } from '@/app/useWarikanStore';
import { Avatar, Badge, EmptyState, Panel, SectionHeader, TextInput } from './ui';
import { useConfirmation } from './ApplicationUI';
import { IconAction } from './IconAction';
import type { Payment } from '@/lib/types';
import { yen } from '@/lib/calculations';
import { createPaymentSearchIndex, searchPayments } from '@/lib/payment-history';
import { scrollToContent } from '@/lib/scroll';

const PAGE_SIZE = 20;

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
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const names = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members],
  );
  const index = useMemo(() => createPaymentSearchIndex(payments, members), [payments, members]);
  const matching = useMemo(() => searchPayments(index, query), [index, query]);
  const lastPage = Math.max(0, Math.ceil(matching.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);
  const start = currentPage * PAGE_SIZE;
  const visible = matching.slice(start, start + PAGE_SIZE);
  useEffect(() => {
    setPage((current) => Math.min(current, lastPage));
  }, [lastPage]);
  function changePage(next: number) {
    setPage(next);
    sectionRef.current?.focus({ preventScroll: true });
    scrollToContent(sectionRef.current);
  }
  return (
    <section
      ref={sectionRef}
      aria-label="支払いの記録"
      tabIndex={-1}
      className="scroll-mt-4 outline-none"
    >
      <Panel>
        <SectionHeader icon={History} title="支払いの記録">
          <Badge>{payments.length}件</Badge>
        </SectionHeader>
        <div className="mb-3 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <TextInput
              ref={searchRef}
              type="search"
              aria-label="支払いの履歴を内容・名前で検索"
              placeholder="内容・名前で検索"
              className="pr-10 [&::-webkit-search-cancel-button]:appearance-none"
              value={query}
              maxLength={100}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          {query && (
            <IconAction
              label="履歴の検索をクリア"
              icon={X}
              onClick={() => {
                setQuery('');
                setPage(0);
                searchRef.current?.focus();
              }}
            />
          )}
        </div>
        <p
          role="status"
          aria-atomic="true"
          className="mb-4 text-right text-xs text-muted-foreground tabular-nums"
        >
          <span className="sr-only">表示中：</span>
          {matching.length
            ? `${start + 1}–${start + visible.length} / ${matching.length}件`
            : '0件'}
        </p>
        {visible.length ? (
          <ul data-testid="payment-list" className="divide-y divide-main/10">
            {visible.map((payment) => {
              const payer = names.get(payment.payerId);
              return (
                <li
                  key={payment.id}
                  className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto]"
                >
                  <Avatar name={payer ?? '?'} />
                  <div className="min-w-0 space-y-2 text-xs text-muted-foreground wrap-anywhere">
                    <h3 className="text-sm font-semibold text-main">
                      {payment.memo || '立て替え'}
                    </h3>
                    <p className="flex items-start gap-2">
                      <Wallet size={13} className="mt-0.5" aria-hidden="true" />
                      <span>
                        <span className="sr-only">支払者：</span>
                        {payer}
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <Users size={13} className="mt-0.5" aria-hidden="true" />
                      <span>
                        <span className="sr-only">対象：</span>
                        {payment.participantIds.map((id) => names.get(id)).join('、')}
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
                      <div className="ml-auto flex">
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
          <EmptyState icon={query ? Search : ReceiptText}>
            <h3>{query ? '見つかりませんでした' : '支払いはありません'}</h3>
          </EmptyState>
        )}
        {lastPage > 0 && (
          <nav
            aria-label="支払い履歴のページ"
            className="mt-5 flex items-center justify-end gap-2 border-t border-main/10 pt-3"
          >
            <span
              className="mr-1 text-xs text-muted-foreground tabular-nums"
              aria-label={`${lastPage + 1}ページ中${currentPage + 1}ページ`}
            >
              {currentPage + 1} / {lastPage + 1}
            </span>
            <IconAction
              label="新しい支払いのページ"
              icon={ChevronLeft}
              disabled={currentPage === 0}
              onClick={() => changePage(currentPage - 1)}
            />
            <IconAction
              label="古い支払いのページ"
              icon={ChevronRight}
              disabled={currentPage === lastPage}
              onClick={() => changePage(currentPage + 1)}
            />
          </nav>
        )}
      </Panel>
    </section>
  );
}
