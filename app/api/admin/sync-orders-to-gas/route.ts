// POST /api/admin/sync-orders-to-gas
// 把本月已付款訂單加總，送給月結 GAS
// 用法：在瀏覽器或 Postman 發 POST，加上 { "adminKey": "你的密鑰" }
// 如需指定月份，可加上 { "year": 2026, "month": 4 }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type MonthTotal = {
  year: number;
  month: number;       // 1~12
  totalAmount: number;
  orderCount: number;
};

function getTaipeiYearMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

export async function POST(req: Request) {
  try {
    // 簡單的管理員驗證
    const body = await req.json().catch(() => ({}));
    const adminKey = (process.env.ADMIN_SYNC_KEY || "").trim();
    if (!adminKey || body.adminKey !== adminKey) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const current = getTaipeiYearMonth();
    const targetYear = Number(body.year || current.year);
    const targetMonth = Number(body.month || current.month);
    if (!targetYear || !targetMonth || targetMonth < 1 || targetMonth > 12) {
      return NextResponse.json({ ok: false, error: "INVALID_YEAR_OR_MONTH" }, { status: 400 });
    }

    const pickupDatePrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}-`;

    // 撈出本月已付款訂單
    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        pickupDate: {
          startsWith: pickupDatePrefix,
        },
      },
      select: {
        orderNo:     true,
        pickupDate:  true,   // "2026-04-15" 格式
        totalAmount: true,
        createdAt:   true,
      },
      orderBy: { pickupDate: "asc" },
    });

    const monthTotal: MonthTotal = {
      year: targetYear,
      month: targetMonth,
      totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      orderCount: orders.length,
    };

    // 傳送給月結 GAS
    const gasUrl = (process.env.GAS_ACCOUNTING_URL || "").trim();
    const gasKey = (process.env.GAS_ACCOUNTING_KEY || "").trim();

    if (!gasUrl || !gasKey) {
      // 沒有設定 GAS，只回傳資料讓你確認
      return NextResponse.json({
        ok: true,
        message: "GAS_ACCOUNTING_URL 尚未設定，以下是計算結果（未送出）",
        totalOrders: orders.length,
        monthTotal,
      });
    }

    // 只同步本月「訂單」欄的金額加總
    const payload = {
      apiKey:        gasKey,
      action:        "syncMonthTotal",
      year:          monthTotal.year,
      month:         monthTotal.month,
      totalAmount:   monthTotal.totalAmount,
      orderCount:    monthTotal.orderCount,
      paymentStatus: "PAID",
      pickupDate:    `${monthTotal.year}-${String(monthTotal.month).padStart(2, "0")}-01`,
      orderId:       `sync-${monthTotal.year}-${monthTotal.month}`,
    };

    const results = [];
    try {
      const r = await fetch(gasUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        cache:   "no-store",
        body:    JSON.stringify(payload),
      });
      const text = await r.text();
      results.push({
        action: "syncMonthTotal",
        month: `${monthTotal.year}/${monthTotal.month}`,
        total: monthTotal.totalAmount,
        status: r.status,
        response: text,
      });
    } catch (err) {
      results.push({
        action: "syncMonthTotal",
        month: `${monthTotal.year}/${monthTotal.month}`,
        total: monthTotal.totalAmount,
        error: String(err),
      });
    }

    return NextResponse.json({
      ok:          true,
      totalOrders: orders.length,
      monthTotal,
      gasResults:  results,
    });

  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
