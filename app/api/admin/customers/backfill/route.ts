import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_KEY = process.env.ADMIN_SYNC_KEY ?? "";

export async function POST(req: NextRequest) {
  const { adminKey } = (await req.json()) as { adminKey?: string };
  if (!adminKey || adminKey !== ADMIN_KEY) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 收集所有有 phone 的訂單和訂位
  const [orders, reservations] = await Promise.all([
    prisma.order.findMany({ select: { id: true, phone: true, customer: true } }),
    prisma.reservation.findMany({ select: { id: true, phone: true, customerName: true } }),
  ]);

  // 以 phone 為 key 收集 name
  const phoneMap = new Map<string, string>();
  for (const o of orders) {
    if (o.phone && !phoneMap.has(o.phone)) phoneMap.set(o.phone, o.customer);
  }
  for (const r of reservations) {
    if (r.phone && !phoneMap.has(r.phone)) phoneMap.set(r.phone, r.customerName);
  }

  let created = 0;
  let linked = 0;

  for (const [phone, name] of phoneMap) {
    const customer = await prisma.customer.upsert({
      where: { phone },
      create: { phone, name },
      update: {},
      select: { id: true },
    });

    const [oResult, rResult] = await Promise.all([
      prisma.order.updateMany({ where: { phone, customerId: null }, data: { customerId: customer.id } }),
      prisma.reservation.updateMany({ where: { phone, customerId: null }, data: { customerId: customer.id } }),
    ]);

    created++;
    linked += oResult.count + rResult.count;
  }

  return NextResponse.json({ ok: true, customers: created, recordsLinked: linked });
}
