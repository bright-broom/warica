type MemberId = string;
type PaymentId = string;

export interface Member {
  readonly id: MemberId;
  readonly name: string;
}

export interface Payment {
  readonly id: PaymentId;
  readonly payerId: MemberId;
  readonly amount: number;
  readonly participantIds: readonly MemberId[];
  readonly memo: string;
  readonly createdAt: string;
  /** Old records did not store participants; ask the user to review them. */
  readonly needsReview?: boolean;
}

export type PaymentInput = Omit<Payment, 'id' | 'createdAt' | 'needsReview'>;

export interface WarikanState {
  readonly eventName: string;
  readonly members: readonly Member[];
  readonly payments: readonly Payment[];
  readonly lastUpdated: string;
  readonly paypayLinks?: readonly PayPayRequestLink[];
}

export interface MemberBalance {
  readonly memberId: MemberId;
  readonly memberName: string;
  readonly paid: number;
  readonly share: number;
  readonly balance: number;
}

export interface Settlement {
  readonly fromId: MemberId;
  readonly toId: MemberId;
  readonly from: string;
  readonly to: string;
  readonly amount: number;
}

export interface PayPayRequestLink extends Settlement {
  readonly url: string;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export const emptyState = (): WarikanState => ({
  eventName: '',
  members: [],
  payments: [],
  lastUpdated: new Date().toISOString(),
});

/** Stable identity until the first edit lets an initial payment draft survive reloads. */
export const initialState = (): WarikanState => ({
  eventName: 'みんなでごはん',
  members: [
    { id: 'initial-a', name: 'A' },
    { id: 'initial-b', name: 'B' },
  ],
  payments: [],
  lastUpdated: '1970-01-01T00:00:00.000Z',
});
