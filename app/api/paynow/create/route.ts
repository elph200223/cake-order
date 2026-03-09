import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

type CreatePayNowBody = {
  orderId: string;
  dbOrderId?: number | string;
  amount: number;
  itemDesc: string;
  items?: unknown[];
  note?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

type GasUpsertPayload = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  items: unknown[];
  subtotal: number;
  paymentProvider: "paynow";
  paymentStatus: "PENDING";
  note: string;
};

type GasUpsertResponse = {
  ok?: boolean;
  error?: unknown;
};

function isCreatePayNowBody(value: unknown): value is Partial<CreatePayNowBody> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: Request) {
  try {
    const raw: unknown = await req.json().catch(() => ({}));
    const body: Partial<CreatePayNowBody> = isCreatePayNowBody(raw) ? raw : {};

    const orderId = String(body.orderId ?? "").trim();
    const dbOrderId = String(body.dbOrderId ?? "").trim();
    const amount = Number(body.amount);

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "Missing orderId" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    const itemDesc = String(body.itemDesc ?? "").trim() || "Order";

    const baseUrl = mustEnv("BASE_URL");
    const notifyUrl = `${baseUrl}/api/paynow/callback`;

    const returnLookupId = dbOrderId || orderId;
    const returnUrl =
      `${baseUrl}/pay/result?orderId=` + encodeURIComponent(returnLookupId);

    console.log("[paynow-create] baseUrl =", baseUrl);
    console.log(
      "[paynow-create] notifyUrl =",
      notifyUrl,
      "returnUrl =",
      returnUrl
    );

    const customerIn = body.customer ?? {};

    await upsertOrderToGAS({
      orderId,
      customerName: String(customerIn.name ?? ""),
      customerPhone: String(customerIn.phone ?? ""),
      items: Array.isArray(body.items) ? body.items : [],
      subtotal: amount,
      paymentProvider: "paynow",
      paymentStatus: "PENDING",
      note: String(body.note ?? "created"),
    });

    const action = mustEnv("PAYNOW_PAYMENT_ACTION");
    const webNo = mustEnv("PAYNOW_WEB_NO");
    const tradeCode = mustEnv("PAYNOW_MEM_CHECKPW");

    const passCode = sha1Upper(webNo + orderId + String(amount) + tradeCode);

    const fields: Record<string, string> = {
      WebNo: webNo,
      PassCode: passCode,
      OrderNo: orderId,
      ECPlatform: "眷鳥咖啡",
      TotalPrice: String(amount),
      OrderInfo: itemDesc,
      ReceiverName: String(customerIn.name ?? ""),
      ReceiverTel: String(customerIn.phone ?? ""),
      ReceiverEmail: String(customerIn.email ?? ""),
      ReceiverID: String(customerIn.phone ?? "").replace(/\D/g, "") || orderId,
      PayType: "01",
      AtmRespost: "0",
      DeadLine: "0",
      PayEN: "0",
      EPT: "1",
      NotifyURL: notifyUrl,
      ReturnURL: returnUrl,
    };

    return NextResponse.json(
      {
        ok: true,
        orderId,
        dbOrderId: returnLookupId,
        action,
        fields,
        returnUrl,
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

async function upsertOrderToGAS(payload: GasUpsertPayload) {
  const url = mustEnv("GAS_WEBAPP_URL");
  const apiKey = mustEnv("GAS_ORDER_API_KEY");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      ...payload,
    }),
  });

  const text = await res.text();
  let parsed: GasUpsertResponse | null = null;

  try {
    const raw: unknown = JSON.parse(text);
    if (typeof raw === "object" && raw !== null) {
      parsed = raw as GasUpsertResponse;
    }
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    throw new Error("GAS upsert failed: " + res.status + " " + text);
  }

  if (!parsed || parsed.ok !== true) {
    throw new Error(
      "GAS upsert error: " +
        (typeof parsed?.error === "string" ? parsed.error : text)
    );
  }
}

function mustEnv(k: string) {
  const v = process.env[k];
  if (!v) throw new Error("Missing env: " + k);
  return v;
}

function sha1Upper(raw: string) {
  return crypto
    .createHash("sha1")
    .update(raw, "utf8")
    .digest("hex")
    .toUpperCase();
}