import { Db, prisma } from "../db/prisma";

/** One DEBIT row per message. */
export async function addDebits(
  walletId: string,
  messageIds: string[],
  costEach: number,
  db: Db = prisma,
): Promise<void> {
  await db.creditTransaction.createMany({
    data: messageIds.map((messageId) => ({
      walletId,
      messageId,
      amount: -costEach,
      type: "DEBIT" as const,
    })),
  });
}

export async function addRefund(
  walletId: string,
  messageId: string,
  amount: number,
  db: Db = prisma,
): Promise<void> {
  await db.creditTransaction.create({
    data: { walletId, messageId, amount, type: "REFUND" },
  });
}

export function recent(walletId: string, limit: number) {
  return prisma.creditTransaction.findMany({
    where: { walletId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: { type: true, amount: true, messageId: true, createdAt: true },
  });
}
