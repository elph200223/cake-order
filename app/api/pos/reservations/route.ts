import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

function authOk(req: NextRequest): boolean {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === process.env.POS_API_KEY;
}

function toPosFmt(r: {
  id: number;
  posId: string | null;
  customerName: string;
  phone: string;
  adults: number;
  children: number;
  requestDate: string;
  requestTime: string;
  note: string;
  status: string;
  title: string;
  arrivalStatus: string;
  preorderItems: string;
  source: string;
  createdAt: Date;
}) {
  return {
    id: r.posId ?? String(r.id),
    date: r.requestDate,
    time: r.requestTime,
    name: r.customerName,
    title: r.title,
    phone: r.phone,
    adults: r.adults,
    children: r.children,
    note: r.note,
    status: r.arrivalStatus,   // pending / arrived / noShow
    preorderJSON: r.preorderItems,
    source: r.source,
  };
}

// GET /api/pos/reservations?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) return NextResponse.json({ ok: false, error: "MISSING_DATE_RANGE" }, { status: 400 });

  const reservations = await prisma.reservation.findMany({
    where: {
      requestDate: { gte: from, lte: to },
      OR: [
        { status: "CONFIRMED" },
        { source: "pos" },
      ],
    },
    orderBy: [{ requestDate: "asc" }, { requestTime: "asc" }],
  });

  // 為沒有 posId 的訂位補上 UUID
  const withIds = await Promise.all(
    reservations.map(async (r) => {
      if (!r.posId) {
        const posId = randomUUID();
        await prisma.reservation.update({ where: { id: r.id }, data: { posId } });
        return { ...r, posId };
      }

      if (r.posId !== r.posId.toLowerCase()) {
        const lower = r.posId.toLowerCase();
        await prisma.reservation.update({ where: { id: r.id }, data: { posId: lower } });
        return { ...r, posId: lower };
      }

      return r;
    })
  );

  return NextResponse.json({ ok: true, reservations: withIds.map(toPosFmt) });
}

// POST /api/pos/reservations  (POS 新增訂位)
export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json() as { reservation: {
    id: string; date: string; time: string; name: string; title: string;
    phone: string; adults: number; children: number; note: string;
    status: string; preorderJSON: string;
  }};

  const r = body.reservation;
  if (!r) return NextResponse.json({ ok: false, error: "MISSING_DATA" }, { status: 400 });

  const created = await prisma.reservation.create({
    data: {
      posId: r.id.toLowerCase(),
      customerName: r.name,
      phone: r.phone,
      adults: r.adults,
      children: r.children,
      requestDate: r.date,
      requestTime: r.time,
      note: r.note ?? "",
      title: r.title ?? "",
      arrivalStatus: r.status ?? "pending",
      preorderItems: r.preorderJSON ?? "[]",
      source: "pos",
      status: "CONFIRMED",
    },
  });

  return NextResponse.json({ ok: true, id: created.posId ?? String(created.id) });
}
