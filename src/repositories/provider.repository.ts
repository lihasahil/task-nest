import { prisma } from "../db/prisma";
import { ProviderHealthRow, ProviderRow } from "../types/models";

/** Enabled routes, best priority (lowest number) first. */
export function findEnabled(): Promise<ProviderRow[]> {
  return prisma.smsProvider.findMany({
    where: { enabled: true },
    orderBy: { priority: "asc" },
  });
}

export async function getBalance(providerId: string): Promise<number> {
  const row = await prisma.smsProvider.findUniqueOrThrow({
    where: { id: providerId },
    select: { balance: true },
  });
  return row.balance;
}

/** Reserve `parts` of a route's balance (conditional update, so two sends can't spend the same units). */
export async function reserveBalance(
  providerId: string,
  parts: number,
): Promise<boolean> {
  const res = await prisma.smsProvider.updateMany({
    where: { id: providerId, balance: { gte: parts } },
    data: { balance: { decrement: parts } },
  });
  return res.count === 1;
}

export async function releaseBalance(
  providerId: string,
  parts: number,
): Promise<void> {
  await prisma.smsProvider.update({
    where: { id: providerId },
    data: { balance: { increment: parts } },
  });
}

/** Every route with its success/failure counts over the last 24 hours. */
export async function healthStats(): Promise<ProviderHealthRow[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [providers, grouped] = await Promise.all([
    prisma.smsProvider.findMany({ orderBy: { priority: "asc" } }),
    prisma.providerAttempt.groupBy({
      by: ["providerId", "success"],
      where: { attemptedAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);
  const count = (id: string, ok: boolean) =>
    grouped.find((g) => g.providerId === id && g.success === ok)?._count._all ??
    0;
  return providers.map((p) => ({
    ...p,
    successes: count(p.id, true),
    failures: count(p.id, false),
  }));
}
