import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseOrderId(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// GET /api/orders/get?orderId=123
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawOrderId = String(searchParams.get("orderId") ?? "").trim();
    const orderId = parseOrderId(rawOrderId);

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "Missing orderId" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          orderBy: [{ id: "asc" }],
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        order: {
          id: order.id,
          orderNo: order.orderNo,
          customer: order.customer,
          phone: order.phone,
          pickupDate: order.pickupDate,
          pickupTime: order.pickupTime,
          note: order.note,
          status: order.status,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          items: order.items,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}