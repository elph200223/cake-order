import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type CheckoutOrderPayload } from "@/lib/checkout";
import { isPickupSelectionValid } from "@/lib/pickup-rules";

type PickupBlockDateRow = {
  date: string;
  reason: string;
};

type PickupBlockDateDelegate = {
  findMany: (args: {
    where?: {
      isActive?: boolean;
    };
    orderBy?: {
      date?: "asc" | "desc";
    };
    select?: {
      date?: boolean;
      reason?: boolean;
    };
  }) => Promise<PickupBlockDateRow[]>;
};

function getPickupBlockDateDelegate() {
  const prismaRecord = prisma as unknown as Record<string, unknown>;
  const delegate = prismaRecord["pickupBlockDate"];

  if (!delegate) {
    throw new Error("PICKUP_BLOCK_DATE_MODEL_UNAVAILABLE");
  }

  return delegate as PickupBlockDateDelegate;
}

function getTodayOrderPrefix() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getDate()}`.padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

async function generateOrderNo() {
  const prefix = getTodayOrderPrefix();

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

function normalizePayload(body: CheckoutOrderPayload) {
  return {
    customerName: body.customerName.trim(),
    phone: body.phone.trim(),
    email: body.email.trim(),
    pickupDate: body.pickupDate.trim(),
    pickupTime: body.pickupTime.trim(),
    note: body.note.trim(),
    totalAmount: Number(body.totalAmount || 0),
    items: Array.isArray(body.items) ? body.items : [],
  };
}

function validatePayload(body: CheckoutOrderPayload) {
  const normalized = normalizePayload(body);

  if (!normalized.customerName) {
    return "CUSTOMER_NAME_REQUIRED";
  }

  if (!normalized.phone) {
    return "PHONE_REQUIRED";
  }

  if (!normalized.email) {
    return "EMAIL_REQUIRED";
  }

  if (!normalized.pickupDate) {
    return "PICKUP_DATE_REQUIRED";
  }

  if (!normalized.pickupTime) {
    return "PICKUP_TIME_REQUIRED";
  }

  if (normalized.items.length === 0) {
    return "ITEMS_REQUIRED";
  }

  if (normalized.totalAmount <= 0) {
    return "TOTAL_AMOUNT_INVALID";
  }

  for (const item of normalized.items) {
    if (!item.productName?.trim()) {
      return "ITEM_NAME_REQUIRED";
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return "ITEM_QUANTITY_INVALID";
    }

    if (!Number.isInteger(item.subtotal) || item.subtotal < 0) {
      return "ITEM_SUBTOTAL_INVALID";
    }
  }

  return null;
}

function buildOrderItemName(item: CheckoutOrderPayload["items"][number]) {
  if (!item.options.length) {
    return item.productName;
  }

  const optionText = item.options
    .map((option) => `${option.optionGroupName}：${option.optionName}`)
    .join(" / ");

  return `${item.productName}（${optionText}）`;
}

async function getActivePickupBlockDates() {
  const pickupBlockDateModel = getPickupBlockDateDelegate();

  const rows = await pickupBlockDateModel.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      date: "asc",
    },
    select: {
      date: true,
      reason: true,
    },
  });

  return rows.map((row) => ({
    date: row.date,
    reason: row.reason,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutOrderPayload;
    const error = validatePayload(body);

    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    const payload = normalizePayload(body);
    const blockedDates = await getActivePickupBlockDates();

    const pickupValidation = isPickupSelectionValid({
      date: payload.pickupDate,
      time: payload.pickupTime,
      blockedDates,
    });

    if (!pickupValidation.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: pickupValidation.error,
        },
        { status: 400 }
      );
    }

    const orderNo = await generateOrderNo();

    const order = await prisma.order.create({
      data: {
        orderNo,
        customer: payload.customerName,
        phone: payload.phone,
        email: payload.email,
        pickupDate: payload.pickupDate,
        pickupTime: payload.pickupTime,
        note: payload.note,
        totalAmount: payload.totalAmount,
        items: {
          create: payload.items.map((item) => ({
            name: buildOrderItemName(item),
            price: item.subtotal,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        customer: order.customer,
        phone: order.phone,
        email: order.email,
        pickupDate: order.pickupDate,
        pickupTime: order.pickupTime,
        note: order.note,
        totalAmount: order.totalAmount,
        status: order.status,
        items: order.items,
      },
    });
  } catch (error) {
    console.error("POST /api/orders error", error);

    return NextResponse.json(
      {
        ok: false,
        error: "CREATE_ORDER_FAILED",
      },
      { status: 500 }
    );
  }
}