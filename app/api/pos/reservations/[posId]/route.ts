import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function authOk(req: NextRequest): boolean {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === process.env.POS_API_KEY;
}

// PATCH /api/pos/reservations/[posId]  (更新訂位)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ posId: string }> }
) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { posId } = await params;
  const body = await req.json() as { reservation: {
    date?: string; time?: string; name?: string; title?: string;
    phone?: string; adults?: number; children?: number; note?: string;
    status?: string; preorderJSON?: string;
  }};

  const r = body.reservation;
  if (!r) return NextResponse.json({ ok: false, error: "MISSING_DATA" }, { status: 400 });

  try {
    await prisma.reservation.update({
      where: { posId },
      data: {
        ...(r.name !== undefined && { customerName: r.name }),
        ...(r.phone !== undefined && { phone: r.phone }),
        ...(r.adults !== undefined && { adults: r.adults }),
        ...(r.children !== undefined && { children: r.children }),
        ...(r.date !== undefined && { requestDate: r.date }),
        ...(r.time !== undefined && { requestTime: r.time }),
        ...(r.note !== undefined && { note: r.note }),
        ...(r.title !== undefined && { title: r.title }),
        ...(r.status !== undefined && { arrivalStatus: r.status }),
        ...(r.preorderJSON !== undefined && { preorderItems: r.preorderJSON }),
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
}

// DELETE /api/pos/reservations/[posId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ posId: string }> }
) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { posId } = await params;

  try {
    await prisma.reservation.delete({ where: { posId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
}
