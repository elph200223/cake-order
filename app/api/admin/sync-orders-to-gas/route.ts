// POST /api/admin/sync-orders-to-gas
// 一次把所有已付款訂單按月份加總，送給月結 GAS
// 用法：在瀏覽器或 Postman 發 POST，加上 { "adminKey": "你的密鑰" }

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

export async function POST(req: Request) {
  try {
    // 簡單的管理員驗證
    const body = await req.json().catch(() => ({}));
    const adminKey = (process.env.ADMIN_SYNC_KEY || "").trim();
    if (!adminKey || body.adminKey !== adminKey) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 撈出所有已付款訂單
    const orders = await prisma.order.findMany({
      where: { status: OrderStatus.PAID },
      select: {
        orderNo:     true,
        pickupDate:  true,   // "2026-04-15" 格式
        totalAmount: true,
        createdAt:   true,
      },
      orderBy: { pickupDate: "asc" },
    });

    // 按年月分組加總（用 pickupDate 判斷月份）
    const monthMap: Record<string, MonthTotal> = {};

    orders.forEach(order => {
      const dateStr = order.pickupDate?.trim();
      if (!dateStr) return;

      // 解析日期：支援 "2026-04-15" 或 "2026/04/15"
      const parts = dateStr.replace(/\//g, "-").split("-");
      if (parts.length < 2) return;

      const year  = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      if (!year || !month) return;

      const key = `${year}-${month}`;
      if (!monthMap[key]) {
        monthMap[key] = { year, month, totalAmount: 0, orderCount: 0 };
      }
      monthMap[key].totalAmount += order.totalAmount;
      monthMap[key].orderCount  += 1;
    });

    const monthTotals = Object.values(monthMap).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );

    // 傳送給月結 GAS
    const gasUrl = (process.env.GAS_ACCOUNTING_URL || "").trim();
    const gasKey = (process.env.GAS_ACCOUNTING_KEY || "").trim();

    if (!gasUrl || !gasKey) {
      // 沒有設定 GAS，只回傳資料讓你確認
      return NextResponse.json({
        ok: true,
        message: "GAS_ACCOUNTING_URL 尚未設定，以下是計算結果（未送出）",
        totalOrders: orders.length,
        monthTotals,
      });
    }

    // 逐月傳送給 GAS
    const results = [];
    for (const mt of monthTotals) {
      const payload = {
        apiKey:        gasKey,
        action:        "syncMonthTotal",   // GAS 用這個識別是歷史同步
        year:          mt.year,
        month:         mt.month,
        totalAmount:   mt.totalAmount,
        orderCount:    mt.orderCount,
        paymentStatus: "PAID",
        pickupDate:    `${mt.year}-${String(mt.month).padStart(2, "0")}-01`,
        orderId:       `sync-${mt.year}-${mt.month}`,
      };

      try {
        const r    = await fetch(gasUrl, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          cache:   "no-store",
          body:    JSON.stringify(payload),
        });
        const text = await r.text();
        results.push({ month: `${mt.year}/${mt.month}`, total: mt.totalAmount, status: r.status, response: text });
      } catch (err) {
        results.push({ month: `${mt.year}/${mt.month}`, total: mt.totalAmount, error: String(err) });
      }
    }

    return NextResponse.json({
      ok:          true,
      totalOrders: orders.length,
      monthTotals,
      gasResults:  results,
    });

  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
