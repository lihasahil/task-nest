import { Db, prisma } from "../db/prisma";

export function findByUserId(userId: string, db: Db = prisma) {
  return db.wallet.findUnique({ where: { userId } });
}

export async function getBalance(
  userId: string,
  db: Db = prisma,
): Promise<number> {
  return (await findByUserId(userId, db))?.balance ?? 0;
}

/**
 * Take `amount` credits only if the wallet has enough. Returns null when short.
 *
 * ONE conditional UPDATE does the check and the deduction ("WHERE balance >= amount").
 * Postgres locks the row, so a parallel request waits, then re-checks against the real
 * committed balance. Two requests can never spend the same credits.
 * Call it inside a transaction (pass `db`) so the balance read afterwards is exact.
 */
export async function debitIfEnough(
  userId: string,
  amount: number,
  db: Db = prisma,
): Promise<{ walletId: string; balance: number } | null> {
  const res = await db.wallet.updateMany({
    where: { userId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (res.count === 0) return null;
  const wallet = await db.wallet.findUniqueOrThrow({ where: { userId } });
  return { walletId: wallet.id, balance: wallet.balance };
}

/** Adds credits and returns the wallet id (needed for the ledger row). */
export async function credit(
  userId: string,
  amount: number,
  db: Db = prisma,
): Promise<string> {
  const wallet = await db.wallet.update({
    where: { userId },
    data: { balance: { increment: amount } },
  });
  return wallet.id;
}
