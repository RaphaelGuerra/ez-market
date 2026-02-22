import { prisma } from "../../db/prisma.js";

export async function getOrCreateActiveCart(userId: string) {
  const existing = await prisma.cart.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { catalogItem: true } } }
  });

  if (existing) {
    return existing;
  }

  return prisma.cart.create({
    data: { userId },
    include: { items: { include: { catalogItem: true } } }
  });
}
