import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: true;
  };
}>;

function parseOrderId(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizePhone(raw: string) {
  return raw.replace(/\D/g, "");
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function buildResponseOrder(order: OrderWithItems) {
  return {
    id: order.id,
    orderNo: order.orderNo,
    customer: order.customer,
    phone: order.phone,
    pickupDate: toIsoString(order.pickupDate),
    pickupTime: order.pickupTime ?? "",
    note: order.note ?? "",
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: toIsoString(order.createdAt),
    updatedAt: toIsoString(order.updatedAt),
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: item.quantity,
    })),
  };
}

// GET /api/orders/get?orderId=123
// GET /api/orders/get?orderNo=CAKE202603070001&phone=0912345678
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const rawOrderId = String(searchParams.get("orderId") ?? "").trim();
    const rawOrderNo = String(searchParams.get("orderNo") ?? "").trim();
    const rawPhone = String(searchParams.get("phone") ?? "").trim();

    const orderId = parseOrderId(rawOrderId);
    const normalizedPhone = normalizePhone(rawPhone);

    let order: OrderWithItems | null = null;

    if (orderId) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            orderBy: [{ id: "asc" }],
          },
        },
      });
    } else if (rawOrderNo && normalizedPhone) {
      order = await prisma.order.findUnique({
        where: { orderNo: rawOrderNo },
        include: {
          items: {
            orderBy: [{ id: "asc" }],
          },
        },
      });

      if (order) {
        const orderPhone = normalizePhone(String(order.phone ?? ""));
        if (orderPhone !== normalizedPhone) {
          order = null;
        }
      }
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing orderId or orderNo+phone",
        },
        { status: 400 }
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          error: "ORDER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const responseOrder = buildResponseOrder(order);

    return NextResponse.json(
      {
        ok: true,
        status: responseOrder.status,
        order: responseOrder,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}