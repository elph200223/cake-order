import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/orders/get?orderId=xxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = String(searchParams.get("orderId") ?? "").trim();

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "Missing orderId" }, { status: 400 });
    }

    const gasUrl = process.env.GAS_WEBAPP_URL;
    const apiKey = process.env.GAS_ORDER_API_KEY;

    if (!gasUrl) {
      return NextResponse.json({ ok: false, error: "Missing GAS_WEBAPP_URL" }, { status: 500 });
    }
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Missing GAS_ORDER_API_KEY" }, { status: 500 });
    }

    const resp = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        apiKey,
        action: "getOrderStatus",
        orderId,
      }),
    });

    const text = await resp.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // 非 JSON（不該發生，仍保留錯誤資訊）
      return NextResponse.json(
        { ok: false, error: "GAS returned non-JSON", gasStatus: resp.status, gasBody: text },
        { status: 502 }
      );
    }

    // GAS HTTP 不成功
    if (!resp.ok) {
      return NextResponse.json(
        { ok: false, error: "GAS http error", gasStatus: resp.status, gasBody: data },
        { status: 502 }
      );
    }

    // GAS 業務不成功
    if (!data || data.ok !== true) {
      return NextResponse.json(
        { ok: false, error: data?.error || "GAS error", gasStatus: resp.status, gasBody: data },
        { status: 502 }
      );
    }

    // ✅ 穩定回傳格式：前端只要吃這個
    return NextResponse.json(
      { ok: true, orderId, status: String(data.status || "UNKNOWN").toUpperCase() },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}