import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUS = ["PENDING_PAYMENT", "PAID", "CANCELLED"] as const;

type AllowedStatus = (typeof ALLOWED_STATUS)[number];

function parseOrderId(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function isAllowedStatus(value: string): value is AllowedStatus {
  return ALLOWED_STATUS.includes(value as AllowedStatus);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseOrderId(id);

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "ORDER_ID_INVALID" },
        { status: 400 }
      );
    }

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId } }),
      prisma.order.delete({ where: { id: orderId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/orders/[id] error", error);

    return NextResponse.json(
      { ok: false, error: "DELETE_ORDER_FAILED" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseOrderId(id);

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "ORDER_ID_INVALID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const statusRaw = String(body?.status ?? "").trim();

    if (!isAllowedStatus(statusRaw)) {
      return NextResponse.json(
        { ok: false, error: "STATUS_INVALID" },
        { status: 400 }
      );
    }

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: statusRaw,
      },
      select: {
        id: true,
        orderNo: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      order,
    });
  } catch (error) {
    console.error("PATCH /api/orders/[id] error", error);

    return NextResponse.json(
      { ok: false, error: "UPDATE_ORDER_STATUS_FAILED" },
      { status: 500 }
    );
  }
}