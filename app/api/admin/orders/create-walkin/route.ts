import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function generateOrderNo() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getDate()}`.padStart(2, "0");
  const prefix = `${yyyy}${mm}${dd}`;

  const latest = await prisma.order.findFirst({
    where: {
      orderNo: {
        startsWith: `CK${prefix}-`,
      },
    },
    orderBy: {
      orderNo: "desc",
    },
    select: {
      orderNo: true,
    },
  });

  if (!latest) {
    return `CK${prefix}-0001`;
  }

  const raw = latest.orderNo.split("-")[1] ?? "0000";
  const next = String(Number(raw) + 1).padStart(4, "0");
  return `CK${prefix}-${next}`;
}

type WalkInItem = {
  name: string;
  price: number;
  quantity: number;
};

type WalkInPayload = {
  customerName: string;
  phone: string;
  pickupDate: string;
  pickupTime: string;
  note?: string;
  items: WalkInItem[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WalkInPayload;

    const customerName = body.customerName?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const pickupDate = body.pickupDate?.trim() ?? "";
    const pickupTime = body.pickupTime?.trim() ?? "";
    const note = body.note?.trim() ?? "";
    const items: WalkInItem[] = Array.isArray(body.items) ? body.items : [];

    if (!customerName) {
      return NextResponse.json(
        { ok: false, error: "CUSTOMER_NAME_REQUIRED" },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { ok: false, error: "PHONE_REQUIRED" },
        { status: 400 }
      );
    }
    if (!pickupDate) {
      return NextResponse.json(
        { ok: false, error: "PICKUP_DATE_REQUIRED" },
        { status: 400 }
      );
    }
    if (!pickupTime) {
      return NextResponse.json(
        { ok: false, error: "PICKUP_TIME_REQUIRED" },
        { status: 400 }
      );
    }
    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "ITEMS_REQUIRED" },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.name?.trim()) {
        return NextResponse.json(
          { ok: false, error: "ITEM_NAME_REQUIRED" },
          { status: 400 }
        );
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return NextResponse.json(
          { ok: false, error: "ITEM_QUANTITY_INVALID" },
          { status: 400 }
        );
      }
      if (!Number.isInteger(item.price) || item.price < 0) {
        return NextResponse.json(
          { ok: false, error: "ITEM_PRICE_INVALID" },
          { status: 400 }
        );
      }
    }

    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const orderNo = await generateOrderNo();

    const order = await prisma.order.create({
      data: {
        orderNo,
        customer: customerName,
        phone,
        email: "",
        pickupDate,
        pickupTime,
        note,
        totalAmount,
        status: "PAID",
        items: {
          create: items.map((item) => ({
            name: item.name.trim(),
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      select: {
        id: true,
        orderNo: true,
      },
    });

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    console.error("POST /api/admin/orders/create-walkin error", error);
    return NextResponse.json(
      { ok: false, error: "CREATE_ORDER_FAILED" },
      { status: 500 }
    );
  }
}
