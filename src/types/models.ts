export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  credits: number; // the wallet balance
}

export interface ProviderRow {
  id: string;
  name: string;
  priority: number;
  balance: number;
  failureRate: number;
  enabled: boolean;
}

export type MessageStatus = 'pending' | 'sent' | 'failed';

/** A message that has been charged and is waiting to be delivered. */
export interface PaidMessage {
  id: string;
  recipient: string;
  body: string;
  parts: number;
}

export interface LogFilters {
  status?: MessageStatus;
  from?: Date;
  to?: Date;
  toExclusive?: boolean;
  recipientExact?: string;
  recipientContains?: string;
}

export interface MessageLog {
  id: string;
  recipient: string;
  body: string;
  parts: number;
  cost: number;
  status: MessageStatus;
  route: string | null;
  failureReason: string | null;
  createdAt: Date;
  sentAt: Date | null;
  attempts: { route: string; success: boolean; error: string | null; at: Date }[];
}

export interface ProviderHealthRow extends ProviderRow {
  successes: number;
  failures: number;
}
