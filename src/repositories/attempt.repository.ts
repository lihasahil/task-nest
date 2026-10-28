import { prisma } from "../db/prisma";

/** One row per try on a route: shows the failover sequence and feeds route health. */
export async function record(
  messageId: string,
  providerId: string,
  success: boolean,
  error: string | null = null,
): Promise<void> {
  await prisma.providerAttempt.create({
    data: { messageId, providerId, success, error },
  });
}
