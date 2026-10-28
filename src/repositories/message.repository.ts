import { randomUUID } from "crypto";
import { Db, prisma } from "../db/prisma";
import { Prisma } from "../generated/prisma/client";
import {
  LogFilters,
  MessageLog,
  MessageStatus,
  PaidMessage,
} from "../types/models";

/** Insert one pending row per recipient. */
export async function createMany(
  userId: string,
  recipients: string[],
  body: string,
  parts: number,
  cost: number,
  db: Db = prisma,
): Promise<PaidMessage[]> {
  const rows = recipients.map((recipient) => ({
    id: randomUUID(),
    userId,
    recipient,
    body,
    parts,
    cost,
  }));
  await db.smsMessage.createMany({ data: rows });
  return rows.map(({ id, recipient, body, parts }) => ({
    id,
    recipient,
    body,
    parts,
  }));
}

export async function markSent(
  messageId: string,
  providerId: string,
): Promise<void> {
  await prisma.smsMessage.update({
    where: { id: messageId },
    data: { status: "sent", providerId, sentAt: new Date() },
  });
}

/**
 * pending -> failed. Only ONE caller can win this flip, which is what makes refunds
 * happen exactly once. Returns who to refund, or null if the message was not pending.
 */
export async function failIfPending(
  messageId: string,
  reason: string,
  db: Db = prisma,
): Promise<{ userId: string; cost: number } | null> {
  const res = await db.smsMessage.updateMany({
    where: { id: messageId, status: "pending" },
    data: { status: "failed", failureReason: reason },
  });
  if (res.count === 0) return null;
  return db.smsMessage.findUniqueOrThrow({
    where: { id: messageId },
    select: { userId: true, cost: true },
  });
}

export async function findStalePendingIds(
  olderThanMinutes: number,
  limit: number,
): Promise<string[]> {
  const rows = await prisma.smsMessage.findMany({
    where: {
      status: "pending",
      createdAt: { lt: new Date(Date.now() - olderThanMinutes * 60_000) },
    },
    select: { id: true },
    take: limit,
  });
  return rows.map((r) => r.id);
}

/** Paginated history for one user, with every provider attempt per message. */
export async function search(
  userId: string,
  f: LogFilters,
  page: number,
  limit: number,
): Promise<{ rows: MessageLog[]; total: number }> {
  const where: Prisma.SmsMessageWhereInput = { userId };
  if (f.status) where.status = f.status;

  const createdAt: Prisma.DateTimeFilter = {};
  if (f.from) createdAt.gte = f.from;
  if (f.to) {
    if (f.toExclusive) createdAt.lt = f.to;
    else createdAt.lte = f.to;
  }
  if (createdAt.gte || createdAt.lt || createdAt.lte)
    where.createdAt = createdAt;

  if (f.recipientExact) where.recipient = f.recipientExact;
  else if (f.recipientContains)
    where.recipient = { contains: f.recipientContains };

  const [total, rows] = await prisma.$transaction([
    prisma.smsMessage.count({ where }),
    prisma.smsMessage.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        provider: { select: { name: true } },
        attempts: {
          orderBy: { attemptedAt: "asc" },
          include: { provider: { select: { name: true } } },
        },
      },
    }),
  ]);

  return {
    total,
    rows: rows.map((m) => ({
      id: m.id,
      recipient: m.recipient,
      body: m.body,
      parts: m.parts,
      cost: m.cost,
      status: m.status as MessageStatus,
      route: m.provider?.name ?? null,
      failureReason: m.failureReason,
      createdAt: m.createdAt,
      sentAt: m.sentAt,
      attempts: m.attempts.map((a) => ({
        route: a.provider.name,
        success: a.success,
        error: a.error,
        at: a.attemptedAt,
      })),
    })),
  };
}
