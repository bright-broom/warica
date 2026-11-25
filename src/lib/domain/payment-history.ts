import type { Member, Payment } from './types';

const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase();

/** Index all records in display order; filtering must never affect settlement inputs. */
export function createPaymentSearchIndex(payments: readonly Payment[], members: readonly Member[]) {
  const names = new Map(members.map((member) => [member.id, member.name]));
  return [...payments].reverse().map((payment) => ({
    payment,
    text: normalize(
      [
        payment.memo,
        names.get(payment.payerId),
        ...payment.participantIds.map((id) => names.get(id)),
      ]
        .filter(Boolean)
        .join(' '),
    ),
  }));
}

export function searchPayments(index: ReturnType<typeof createPaymentSearchIndex>, query: string) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return index
    .filter(({ text }) => terms.every((term) => text.includes(term)))
    .map(({ payment }) => payment);
}
