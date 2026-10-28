import { prisma } from "../db/prisma";
import { UserRow } from "../types/models";

/** Creates the user together with their wallet */
export async function create(
  email: string,
  passwordHash: string,
  credits: number,
): Promise<UserRow | null> {
  try {
    const user = await prisma.user.create({
      data: { email, passwordHash, wallet: { create: { balance: credits } } },
      include: { wallet: true },
    });
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      credits: user.wallet?.balance ?? 0,
    };
  } catch (err: any) {
    if (err?.code === "P2002") return null;
    throw err;
  }
}

export async function findByEmail(email: string): Promise<UserRow | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { wallet: true },
  });
  return (
    user && {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      credits: user.wallet?.balance ?? 0,
    }
  );
}
