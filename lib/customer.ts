import { prisma } from "@/lib/prisma";

export async function upsertCustomer(phone: string, name: string): Promise<{ id: number; isMember: boolean }> {
  const existing = await prisma.customer.findUnique({
    where: { phone },
    select: {
      id: true,
      _count: { select: { orders: { where: { status: "PAID" } }, reservations: true } },
    },
  });

  if (existing) {
    if (name && existing.id) {
      await prisma.customer.update({ where: { id: existing.id }, data: { name } });
    }
    const total = existing._count.orders + existing._count.reservations;
    return { id: existing.id, isMember: total >= 1 };
  }

  const created = await prisma.customer.create({ data: { phone, name }, select: { id: true } });
  return { id: created.id, isMember: false };
}
