import { ProviderRow } from "../types/models";

/** What the sender needs from any SMS route (mock today, a real vendor tomorrow). */
export interface SmsProvider {
  readonly id: string;
  readonly name: string;
  getBalance(): Promise<number>;
  send(input: {
    to: string;
    text: string;
    parts: number;
  }): Promise<{ providerMessageId: string }>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A fake SMS route: fails with probability `row.failureRate`. `random` is injectable for tests. */
export function createMockProvider(
  row: ProviderRow,
  readBalance: (providerId: string) => Promise<number>,
  random: () => number = Math.random,
): SmsProvider {
  return {
    id: row.id,
    name: row.name,
    getBalance: () => readBalance(row.id),
    async send() {
      await sleep(5 + Math.floor(random() * 20));
      if (random() < row.failureRate)
        throw new Error(`${row.name}: simulated route failure`);
      return { providerMessageId: `${row.name}-${Date.now()}` };
    },
  };
}
