import { createMockProvider, SmsProvider } from "../providers/mock-provider";
import * as attemptRepo from "../repositories/attempt.repository";
import * as messageRepo from "../repositories/message.repository";
import * as providerRepo from "../repositories/provider.repository";
import { PaidMessage, ProviderRow } from "../types/models";
import * as walletService from "./wallet.service";

export interface DeliveryResult {
  status: "sent" | "failed";
  route: string | null;
}

/** Everything deliver() needs from the outside. Unit tests pass fakes instead. */
export interface SenderDeps {
  findEnabledProviders(): Promise<ProviderRow[]>;
  buildRoute(row: ProviderRow): SmsProvider;
  reserveBalance(providerId: string, parts: number): Promise<boolean>;
  releaseBalance(providerId: string, parts: number): Promise<void>;
  recordAttempt(
    messageId: string,
    providerId: string,
    success: boolean,
    error?: string | null,
  ): Promise<void>;
  markSent(messageId: string, providerId: string): Promise<void>;
  refund(messageId: string, reason: string): Promise<boolean>;
}

const defaultDeps: SenderDeps = {
  findEnabledProviders: providerRepo.findEnabled,
  buildRoute: (row) => createMockProvider(row, providerRepo.getBalance),
  reserveBalance: providerRepo.reserveBalance, 
  releaseBalance: providerRepo.releaseBalance,
  recordAttempt: attemptRepo.record,
  markSent: messageRepo.markSent,
  refund: walletService.failAndRefund,
};

/**
 * Delivers ONE already-paid message: try routes by priority, first success wins (the charge
 * stays), and if every route fails the message is failed and refunded once.
 * Runs outside any database transaction because provider calls can be slow.
 */
export async function deliver(
  msg: PaidMessage,
  deps: SenderDeps = defaultDeps,
): Promise<DeliveryResult> {
  const reasons: string[] = [];

  // Read fresh each time, so changes to the providers table apply immediately.
  for (const row of await deps.findEnabledProviders()) {
    const route = deps.buildRoute(row);

    // Skip routes that can't afford the message (nothing tried, so no attempt is logged).
    if (
      (await route.getBalance()) < msg.parts ||
      !(await deps.reserveBalance(route.id, msg.parts))
    ) {
      reasons.push(`${route.name}: insufficient route balance`);
      continue;
    }

    try {
      await route.send({ to: msg.recipient, text: msg.body, parts: msg.parts });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await deps.releaseBalance(route.id, msg.parts); // failed: give the route's balance back
      await deps.recordAttempt(msg.id, route.id, false, reason);
      reasons.push(reason);
      continue; // fail over to the next route
    }

    // First success: keep the charge and the route's deduction.
    await deps.recordAttempt(msg.id, route.id, true);
    await deps.markSent(msg.id, route.id);
    return { status: "sent", route: route.name };
  }

  await deps.refund(
    msg.id,
    reasons.length
      ? `All routes failed: ${reasons.join("; ")}`
      : "No enabled routes",
  );
  return { status: "failed", route: null };
}
