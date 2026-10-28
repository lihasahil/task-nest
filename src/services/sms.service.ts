import { httpError } from "../common/http-error";
import { config } from "../config";
import { tx } from "../db/prisma";
import * as ledgerRepo from "../repositories/ledger.repository";
import * as messageRepo from "../repositories/message.repository";
import * as walletRepo from "../repositories/wallet.repository";
import { LogFilters } from "../types/models";
import { INVALID_NUMBER_REASON, normalizeNepaliNumber } from "../utils/phone";
import { countSms } from "../utils/sms-counter";
import { LogsQuery } from "../validators/sms.validator";
import { deliver } from "./sender.service";
import * as walletService from "./wallet.service";

export async function send(userId: string, to: string[], message: string) {
  // 1. Validate + normalise. One bad number rejects everything, nothing is charged.
  const recipients: string[] = [];
  const invalid: { index: number; input: string; reason: string }[] = [];
  to.forEach((raw, index) => {
    const n = normalizeNepaliNumber(raw);
    if (n) recipients.push(n);
    else invalid.push({ index, input: raw, reason: INVALID_NUMBER_REASON });
  });
  if (invalid.length)
    throw httpError(400, `${invalid.length} invalid phone number(s)`, {
      invalidNumbers: invalid,
    });

  // 2. Parts and cost: 1 credit per part per recipient.
  const count = countSms(message);
  if (count.parts > config.maxPartsPerMessage) {
    throw httpError(
      400,
      `message is ${count.parts} SMS parts; the maximum is ${config.maxPartsPerMessage}`,
    );
  }
  const cost = count.parts * config.creditsPerPart;
  const totalCost = cost * recipients.length;

  // 3. One SHORT transaction: reserve credits + create pending messages + DEBIT ledger rows.
  const created = await tx(async (db) => {
    const walletId = await walletService.reserve(db, userId, totalCost);
    const rows = await messageRepo.createMany(
      userId,
      recipients,
      message,
      count.parts,
      cost,
      db,
    );
    await ledgerRepo.addDebits(
      walletId,
      rows.map((r) => r.id),
      cost,
      db,
    );
    return rows;
  });

  // 4. Deliver OUTSIDE the transaction, one message at a time.
  const messages: {
    id: string;
    to: string;
    status: string;
    route: string | null;
  }[] = [];
  for (const m of created) {
    const result = await deliver(m);
    messages.push({
      id: m.id,
      to: m.recipient,
      status: result.status,
      route: result.route,
    });
  }

  return {
    encoding: count.encoding,
    partsPerMessage: count.parts,
    totalCost,
    sent: messages.filter((m) => m.status === "sent").length,
    failed: messages.filter((m) => m.status === "failed").length,
    balance: await walletRepo.getBalance(userId),
    messages,
  };
}

export async function logs(userId: string, q: LogsQuery) {
  const filters: LogFilters = {
    status: q.status,
    from: q.from,
    to: q.to,
    toExclusive: q.toExclusive,
  };
  if (q.number) {
    const exact = normalizeNepaliNumber(q.number);
    const digits = q.number.replace(/\D/g, "");
    if (exact) filters.recipientExact = exact;
    else if (digits) filters.recipientContains = digits;
  }

  const { rows, total } = await messageRepo.search(
    userId,
    filters,
    q.page,
    q.limit,
  );
  return {
    data: rows,
    meta: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.ceil(total / q.limit),
    },
  };
}

/**
 * Crash recovery. A request that died after charging but before delivering leaves `pending`
 * messages. On startup, fail and refund the stale ones so credits are never stuck.
 */
export async function recoverPending(): Promise<number> {
  const ids = await messageRepo.findStalePendingIds(2, 1000);
  for (const id of ids)
    await walletService.failAndRefund(id, "Interrupted by a server restart");
  return ids.length;
}
