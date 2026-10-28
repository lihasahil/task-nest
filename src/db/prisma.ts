import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "../config";
import { Prisma, PrismaClient } from "../generated/prisma/client";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.databaseUrl }),
});

export type Db = Prisma.TransactionClient;

export function tx<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}
