import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatOrderMoney, formatOrderPickup } from "@/lib/order-format";
import {
  ORDER_STATUS_OPTIONS,
  OrderStatusFilter,
  getOrderStatusLabel,
  normalizeOrderStatusFilter,
} from "@/lib/order-status";
import { WalkInOrderButton } from "./WalkInOrderModal";
import { DeleteOrderButton } from "./DeleteOrderButton";

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    pickupFrom?: string;
    pickupTo?: string;
  }>;
};

function buildFilterHref(nextStatus: OrderStatusFilter, q: string, dateFrom: string, dateTo: string, pickupFrom: string, pickupTo: string) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (nextStatus !== "ALL") params.set("status", nextStatus);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  if (pickupFrom) params.set("pickupFrom", pickupFrom);
  if (pickupTo) params.set("pickupTo", pickupTo);
  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

function parseDateParam(raw: string | undefined): Date | undefined {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? undefined : d;
}

function isValidDateStr(raw: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw);
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const params = await searchParams;

  const q = (params.q || "").trim();
  const status = normalizeOrderStatusFilter((params.status || "").trim());
  const dateFrom = (params.dateFrom || "").trim();
  const dateTo = (params.dateTo || "").trim();
  const pickupFrom = (params.pickupFrom || "").trim();
  const pickupTo = (params.pickupTo || "").trim();

  const fromDate = parseDateParam(dateFrom);
  const toDate = parseDateParam(dateTo)
    ? (() => { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); return d; })()
    : undefined;

  const dateFilter = fromDate || toDate
    ? {
        createdAt: {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {}),
        },
      }
    : {};

  // pickupDate is a String field (YYYY-MM-DD), gte/lte works lexicographically
  const pickupFilter = pickupFrom || pickupTo
    ? {
        pickupDate: {
          ...(isValidDateStr(pickupFrom) ? { gte: pickupFrom } : {}),
          ...(isValidDateStr(pickupTo) ? { lte: pickupTo } : {}),
        },
      }
    : {};

  const baseWhere = {
    ...(status !== "ALL" ? { status } : {}),
    ...dateFilter,
    ...pickupFilter,
    ...(q
      ? {
          OR: [
            { orderNo: { contains: q } },
            { customer: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
  };

  const hasDateFilter = Boolean(fromDate || toDate || pickupFrom || pickupTo);

  // Run orders fetch and PAID aggregate in parallel
  const [orders, paidAggregate] = await Promise.all([
    prisma.order.findMany({
      where: baseWhere,
      orderBy: [{ id: "desc" }],
      include: {
        _count: { select: { items: true } },
      },
      take: 200,
    }),
    hasDateFilter
      ? prisma.order.aggregate({
          where: { ...dateFilter, ...pickupFilter, status: "PAID" },
          _sum: { totalAmount: true },
          _count: { id: true },
        })
      : null,
  ]);

  const paidTotal = paidAggregate?._sum?.totalAmount ?? 0;
  const paidCount = paidAggregate?._count?.id ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            ← 回後台首頁
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950">
            訂單列表
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            可用訂單編號、客人姓名、電話、Email 搜尋，並依狀態篩選。
          </p>
        </div>
        <WalkInOrderButton />
      </div>

      {/* 篩選區 */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <form action="/admin/orders" className="space-y-4">
          {/* 搜尋 + 狀態 */}
          <div className="grid gap-4 md:grid-cols-[1fr_220px_120px]">
            <div>
              <label htmlFor="q" className="mb-2 block text-sm font-medium text-neutral-800">
                搜尋
              </label>
              <input
                id="q"
                name="q"
                type="text"
                defaultValue={q}
                placeholder="輸入訂單編號、客人姓名、電話或 Email"
                className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
              />
            </div>

            <div>
              <label htmlFor="status" className="mb-2 block text-sm font-medium text-neutral-800">
                狀態
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status}
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
              >
                <option value="ALL">全部狀態</option>
                {ORDER_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white"
              >
                套用
              </button>
            </div>
          </div>

          {/* 下單日期範圍 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="dateFrom" className="mb-2 block text-sm font-medium text-neutral-800">
                下單日期（起）
              </label>
              <input
                id="dateFrom"
                name="dateFrom"
                type="date"
                defaultValue={dateFrom}
                className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
              />
            </div>
            <div>
              <label htmlFor="dateTo" className="mb-2 block text-sm font-medium text-neutral-800">
                下單日期（迄）
              </label>
              <input
                id="dateTo"
                name="dateTo"
                type="date"
                defaultValue={dateTo}
                className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
              />
            </div>
          </div>

          {/* 取貨日期範圍 */}
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <label htmlFor="pickupFrom" className="mb-2 block text-sm font-medium text-neutral-800">
                取貨日期（起）
              </label>
              <input
                id="pickupFrom"
                name="pickupFrom"
                type="date"
                defaultValue={pickupFrom}
                className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
              />
            </div>
            <div>
              <label htmlFor="pickupTo" className="mb-2 block text-sm font-medium text-neutral-800">
                取貨日期（迄）
              </label>
              <input
                id="pickupTo"
                name="pickupTo"
                type="date"
                defaultValue={pickupTo}
                className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
              />
            </div>
            <div className="flex items-end">
              <Link
                href="/admin/orders"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 whitespace-nowrap"
              >
                清除條件
              </Link>
            </div>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={buildFilterHref("ALL", q, dateFrom, dateTo, pickupFrom, pickupTo)}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm ${
              status === "ALL"
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            全部
          </Link>

          {ORDER_STATUS_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={buildFilterHref(option.value, q, dateFrom, dateTo, pickupFrom, pickupTo)}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm ${
                status === option.value
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </section>

      {/* 金額統計（只在有日期範圍時顯示） */}
      {hasDateFilter && (
        <section className="mb-6">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">
              已付款金額合計（符合篩選條件）
              {(dateFrom || dateTo) && (
                <span className="ml-2 text-neutral-400">
                  下單：{dateFrom || "—"} ～ {dateTo || "—"}
                </span>
              )}
              {(pickupFrom || pickupTo) && (
                <span className="ml-2 text-neutral-400">
                  取貨：{pickupFrom || "—"} ～ {pickupTo || "—"}
                </span>
              )}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
              NT$ {paidTotal.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-neutral-400">{paidCount} 筆已付款訂單</p>
          </div>
        </section>
      )}

      {orders.length === 0 ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">
            找不到符合條件的訂單
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            請調整搜尋關鍵字或篩選條件。
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            <div>
              目前顯示{" "}
              <span className="font-semibold text-neutral-900">{orders.length}</span>{" "}
              筆
            </div>
            <div>排序：最新訂單在前</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-neutral-50">
                <tr className="text-left">
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">訂單編號</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">客人</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">電話</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">Email</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">取貨時間</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">金額</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">狀態</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">品項數</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">備註</th>
                  <th className="border-b border-neutral-200 px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="align-top">
                    <td className="border-b border-neutral-100 px-4 py-4 font-medium text-neutral-900">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="underline decoration-neutral-300 underline-offset-4 hover:text-neutral-600"
                      >
                        {order.orderNo}
                      </Link>
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-4 text-neutral-800">{order.customer}</td>
                    <td className="border-b border-neutral-100 px-4 py-4 text-neutral-800">{order.phone}</td>
                    <td className="border-b border-neutral-100 px-4 py-4 text-neutral-800">
                      <span className="block min-w-[220px] break-all">
                        {order.email?.trim() ? order.email : "—"}
                      </span>
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-4 text-neutral-800">
                      {formatOrderPickup(order.pickupDate, order.pickupTime)}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-4 text-neutral-800">
                      {formatOrderMoney(order.totalAmount)}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-4 text-neutral-800">
                      {getOrderStatusLabel(order.status)}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-4 text-neutral-800">
                      {order._count.items}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-4 text-neutral-800">
                      {order.note?.trim() ? order.note : "—"}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-4">
                      <DeleteOrderButton orderId={order.id} orderNo={order.orderNo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
