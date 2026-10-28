import { prisma } from "./prisma";

/** The mock routes */
export async function seedProviders(): Promise<void> {
  await prisma.smsProvider.createMany({
    data: [
      { name: "ROUTE_A", priority: 1, balance: 10000, failureRate: 0.3 },
      { name: "ROUTE_B", priority: 2, balance: 10000, failureRate: 0.1 },
      { name: "ROUTE_C", priority: 3, balance: 10000, failureRate: 0.05 },
    ],
    skipDuplicates: true,
  });
}
