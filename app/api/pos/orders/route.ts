import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function authOk(req: NextRequest): boolean {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === process.env.POS_API_KEY;
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // "2026-04-07"
  const to = searchParams.get("to");     // "2026-04-11"

  if (!from || !to) {
    return NextResponse.json(
      { ok: false, error: "MISSING_DATE_RANGE" },
      { status: 400 }
    );
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        status: "PAID",
        pickupDate: {
          gte: from,
          lte: to,
        },
      },
      include: {
        items: true,
      },
      orderBy: [
        { pickupDate: "asc" },
        { pickupTime: "asc" },
      ],
    });

    return NextResponse.json({
      ok: true,
      orders: orders.map((o) => ({
        id: o.id,
        orderNo: o.orderNo,
        customer: o.customer,
        phone: o.phone,
        pickupDate: o.pickupDate,
        pickupTime: o.pickupTime,
        note: o.note,
        totalAmount: o.totalAmount,
        items: o.items.map((i) => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
      })),
    });
  } catch (error) {
    console.error("GET /api/pos/orders error", error);
    return NextResponse.json(
      { ok: false, error: "FETCH_FAILED" },
      { status: 500 }
    );
  }
}
