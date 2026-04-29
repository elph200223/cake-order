import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      phone: true,
      name: true,
      note: true,
      createdAt: true,
      _count: { select: { orders: true, reservations: true } },
    },
  });

  return NextResponse.json({ ok: true, customers });
}
