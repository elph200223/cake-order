import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const gasUrl = process.env.GAS_WEBAPP_URL;
    const apiKey = process.env.GAS_ORDER_API_KEY || "";
    if (!gasUrl) return NextResponse.json({ ok: false, error: "Missing GAS_WEBAPP_URL" }, { status: 500 });
    if (!apiKey) return NextResponse.json({ ok: false, error: "Missing GAS_ORDER_API_KEY" }, { status: 500 });

    // 你網站自己的 orderId（非常重要：要跟你送 PayNow 的 OrderNo 同一個）
    const orderId = String(body.orderId || "").trim() || `WEB-${Date.now()}`;

    const payload = {
      apiKey,
      orderId,
      customerName: body.customerName || "",
      customerPhone: body.customerPhone || "",
      pickupDate: body.pickupDate || "",
      pickupTime: body.pickupTime || "",
      items: body.items || [],
      subtotal: body.subtotal ?? 0,
      paymentProvider: "paynow",
      paymentStatus: "PENDING",
      transactionId: "",
      note: body.note || "created_by_web",
    };

    const resp = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await resp.text();
    let gasBody: any = text;
    try { gasBody = JSON.parse(text); } catch {}

    return NextResponse.json({ ok: resp.ok, gasStatus: resp.status, gasBody, orderId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
