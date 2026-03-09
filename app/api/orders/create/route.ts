import { NextResponse } from "next/server";

type CreateOrderBody = {
  orderId?: unknown;
  customerName?: unknown;
  customerPhone?: unknown;
  pickupDate?: unknown;
  pickupTime?: unknown;
  items?: unknown;
  subtotal?: unknown;
  note?: unknown;
};

type GasCreateOrderResponse = {
  ok?: boolean;
  error?: unknown;
  [key: string]: unknown;
};

function isCreateOrderBody(value: unknown): value is CreateOrderBody {
  return typeof value === "object" && value !== null;
}

export async function POST(req: Request) {
  try {
    const raw: unknown = await req.json().catch(() => ({}));
    const body: CreateOrderBody = isCreateOrderBody(raw) ? raw : {};

    const gasUrl = process.env.GAS_WEBAPP_URL;
    const apiKey = process.env.GAS_ORDER_API_KEY || "";

    if (!gasUrl) {
      return NextResponse.json(
        { ok: false, error: "Missing GAS_WEBAPP_URL" },
        { status: 500 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing GAS_ORDER_API_KEY" },
        { status: 500 }
      );
    }

    const orderId =
      String(body.orderId ?? "").trim() || `WEB-${Date.now()}`;

    const payload = {
      apiKey,
      orderId,
      customerName: String(body.customerName ?? ""),
      customerPhone: String(body.customerPhone ?? ""),
      pickupDate: String(body.pickupDate ?? ""),
      pickupTime: String(body.pickupTime ?? ""),
      items: Array.isArray(body.items) ? body.items : [],
      subtotal: Number(body.subtotal ?? 0),
      paymentProvider: "paynow",
      paymentStatus: "PENDING",
      transactionId: "",
      note: String(body.note ?? "created_by_web"),
    };

    const resp = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await resp.text();

    let gasBody: GasCreateOrderResponse | string = text;
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null) {
        gasBody = parsed as GasCreateOrderResponse;
      }
    } catch {
      gasBody = text;
    }

    return NextResponse.json(
      { ok: resp.ok, gasStatus: resp.status, gasBody, orderId },
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