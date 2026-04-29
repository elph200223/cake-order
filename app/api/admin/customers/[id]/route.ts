import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id: Number(id) },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, orderNo: true, pickupDate: true, pickupTime: true,
          totalAmount: true, status: true, createdAt: true,
          items: { select: { name: true, quantity: true, price: true } },
        },
      },
      reservations: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, requestDate: true, requestTime: true,
          adults: true, children: true, note: true, status: true, createdAt: true,
        },
      },
    },
  });

  if (!customer) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true, customer });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { note } = (await req.json()) as { note?: string };

  const customer = await prisma.customer.update({
    where: { id: Number(id) },
    data: { note: note ?? "" },
    select: { id: true, note: true },
  });

  return NextResponse.json({ ok: true, customer });
}
