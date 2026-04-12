import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? from;

  const reservations = await prisma.reservation.findMany({
    where: {
      requestDate: { gte: from, lte: to },
      OR: [{ status: "CONFIRMED" }, { source: "pos" }],
    },
    orderBy: [{ requestDate: "asc" }, { requestTime: "asc" }],
  });

  const withIds = await Promise.all(
    reservations.map(async (r) => {
      if (r.posId) return r;
      const posId = randomUUID();
      await prisma.reservation.update({ where: { id: r.id }, data: { posId } });
      return { ...r, posId };
    })
  );

  return NextResponse.json({
    ok: true,
    reservations: withIds.map((r) => ({
      id: r.posId!,
      date: r.requestDate,
      time: r.requestTime,
      name: r.customerName,
      title: r.title,
      phone: r.phone,
      adults: r.adults,
      children: r.children,
      note: r.note,
      status: r.arrivalStatus,
      source: r.source,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    date: string; time: string; name: string; title: string;
    phone: string; adults: number; children: number; note: string;
  };

  const created = await prisma.reservation.create({
    data: {
      posId: randomUUID(),
      customerName: body.name,
      phone: body.phone ?? "",
      adults: body.adults ?? 1,
      children: body.children ?? 0,
      requestDate: body.date,
      requestTime: body.time,
      note: body.note ?? "",
      title: body.title ?? "",
      arrivalStatus: "pending",
      preorderItems: "[]",
      source: "pos",
      status: "CONFIRMED",
    },
  });

  return NextResponse.json({ ok: true, id: created.posId });
}
