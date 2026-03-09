import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

type CreatePayNowBody = {
  orderId: string; // 這裡實際上是給 PayNow / callback 用的 orderNo
  dbOrderId?: number | string; // 這裡才是你 Prisma 數字主鍵，給 returnUrl 查詢用
  amount: number;
  itemDesc: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;

    const orderId = String(body?.orderId ?? "").trim();
    const dbOrderId = String(body?.dbOrderId ?? "").trim();
    const amount = Number(body?.amount);

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

    const itemDesc = String(body?.itemDesc ?? "").trim() || "Order";

    const baseUrl = mustEnv("BASE_URL");
    const notifyUrl = baseUrl + "/api/paynow/callback";

    // returnUrl 應該優先帶回 Prisma 數字主鍵，讓 /pay/result 可直接查
    const returnLookupId = dbOrderId || orderId;
    const returnUrl =
      baseUrl + "/pay/result?orderId=" + encodeURIComponent(returnLookupId);

    console.log("[paynow-create] baseUrl =", baseUrl);
    console.log(
      "[paynow-create] notifyUrl =",
      notifyUrl,
      "returnUrl =",
      returnUrl
    );

    const customerIn = body?.customer ?? {};

    await upsertOrderToGAS({
      orderId,
      customerName: String(customerIn?.name ?? ""),
      customerPhone: String(customerIn?.phone ?? ""),
      items: body?.items ?? [],
      subtotal: amount,
      paymentProvider: "paynow",
      paymentStatus: "PENDING",
      note: String(body?.note ?? "created"),
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

      ReceiverName: String(customerIn?.name ?? ""),
      ReceiverTel: String(customerIn?.phone ?? ""),
      ReceiverEmail: String(customerIn?.email ?? ""),
      ReceiverID: String(customerIn?.phone ?? "").replace(/\D/g, "") || orderId,

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
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

async function upsertOrderToGAS(payload: any) {
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
  let j: any = null;
  try {
    j = JSON.parse(text);
  } catch {}

  if (!res.ok) {
    throw new Error("GAS upsert failed: " + res.status + " " + text);
  }
  if (!j || j.ok !== true) {
    throw new Error("GAS upsert error: " + (j?.error || text));
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

function renderAutoPostForm(action: string, fields: Record<string, string>) {
  const inputs = Object.keys(fields)
    .map((k) => {
      const v = fields[k] ?? "";
      return (
        '<input type="hidden" name="' +
        escapeHtml(k) +
        '" value="' +
        escapeHtml(v) +
        '" />'
      );
    })
    .join("\\n");

  return (
    "<!doctype html>\\n" +
    '<html lang="zh-Hant">\\n' +
    "<head>\\n" +
    '  <meta charset="utf-8" />\\n' +
    '  <meta name="viewport" content="width=device-width,initial-scale=1" />\\n' +
    "  <title>Redirecting…</title>\\n" +
    "</head>\\n" +
    "<body>\\n" +
    '  <p style="font-family: system-ui; padding: 16px;">正在前往付款頁…</p>\\n' +
    '  <form id="f" method="post" action="' +
    escapeHtml(action) +
    '">\\n' +
    "    " +
    inputs +
    "\\n" +
    "  </form>\\n" +
    "  <script>document.getElementById('f').submit();</script>\\n" +
    "</body>\\n" +
    "</html>"
  );
}

function escapeHtml(s: string) {
  const str = String(s);
  return str
    .split("&")
    .join("&amp;")
    .split("<")
    .join("&lt;")
    .split(">")
    .join("&gt;")
    .split('"')
    .join("&quot;")
    .split("'")
    .join("&#039;");
}