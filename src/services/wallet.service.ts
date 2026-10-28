import { httpError } from "../common/http-error";
import { Db, tx } from "../db/prisma";
import * as ledgerRepo from "../repositories/ledger.repository";
import * as messageRepo from "../repositories/message.repository";
import * as walletRepo from "../repositories/wallet.repository";

export async function getWallet(userId: string) {
  const wallet = await walletRepo.findByUserId(userId);
  if (!wallet) throw httpError(404, "Wallet not found");
  return {
    balance: wallet.balance,
    recentTransactions: await ledgerRepo.recent(wallet.id, 20),
  };
}

/**
 * Take `amount` credits. Pass the transaction's client so the debit commits (or rolls back)
 * together with the messages it pays for. Throws 402 when the user can't afford it.
 * Returns the wallet id (needed for the ledger rows).
 */
export async function reserve(
  db: Db,
  userId: string,
  amount: number,
): Promise<string> {
  const debited = await walletRepo.debitIfEnough(userId, amount, db);
  if (!debited) {
    const available = await walletRepo.getBalance(userId, db);
    throw httpError(402, "Insufficient credits", {
      required: amount,
      available,
    });
  }
  return debited.walletId;
}

/**
  Mark a pending message failed and give its credits back, ONCE.
 */
export function failAndRefund(
  messageId: string,
  reason: string,
): Promise<boolean> {
  return tx(async (db) => {
    const failed = await messageRepo.failIfPending(messageId, reason, db);
    if (!failed) return false;
    const walletId = await walletRepo.credit(failed.userId, failed.cost, db);
    await ledgerRepo.addRefund(walletId, messageId, failed.cost, db);
    return true;
  });
}
