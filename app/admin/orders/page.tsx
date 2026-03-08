import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  formatOrderMoney,
  formatOrderPickup,
} from "@/lib/order-format";
import {
  ORDER_STATUS_OPTIONS,
  OrderStatusFilter,
  getOrderStatusLabel,
  normalizeOrderStatusFilter,
} from "@/lib/order-status";

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

function buildFilterHref(nextStatus: OrderStatusFilter, q: string) {
  const params = new URLSearchParams();

  if (q.trim()) {
    params.set("q", q.trim());
  }

  if (nextStatus !== "ALL") {
    params.set("status", nextStatus);
  }

  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const params = await searchParams;

  const q = (params.q || "").trim();
  const status = normalizeOrderStatusFilter((params.status || "").trim());

  const orders = await prisma.order.findMany({
    where: {
      ...(status !== "ALL" ? { status } : {}),
      ...(q
        ? {
            OR: [
              {
                orderNo: {
                  contains: q,
                },
              },
              {
                customer: {
                  contains: q,
                },
              },
              {
                phone: {
                  contains: q,
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ id: "desc" }],
    include: {
      _count: {
        select: {
          items: true,
        },
      },
    },
    take: 100,
  });

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
            可用訂單編號、客人姓名、電話搜尋，並依狀態篩選。
          </p>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <form
          action="/admin/orders"
          className="grid gap-4 md:grid-cols-[1fr_220px_120px]"
        >
          <div>
            <label
              htmlFor="q"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              搜尋
            </label>
            <input
              id="q"
              name="q"
              type="text"
              defaultValue={q}
              placeholder="輸入訂單編號、客人姓名或電話"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
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

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white"
            >
              套用
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={buildFilterHref("ALL", q)}
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
              href={buildFilterHref(option.value, q)}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm ${
                status === option.value
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {option.label}
            </Link>
          ))}

          {(q || status !== "ALL") && (
            <Link
              href="/admin/orders"
              className="inline-flex items-center rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              清除條件
            </Link>
          )}
        </div>
      </section>

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
              <span className="font-semibold text-neutral-900">
                {orders.length}
              </span>{" "}
              筆
            </div>
            <div>排序：最新訂單在前</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-neutral-50">
                <tr className="text-left">
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">
                    訂單編號
                  </th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">
                    客人
                  </th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">
                    電話
                  </th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">
                    取貨時間
                  </th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">
                    金額
                  </th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">
                    狀態
                  </th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">
                    品項數
                  </th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">
                    備註
                  </th>
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
                    <td className="border-b border-neutral-100 px-4 py-4 text-neutral-800">
                      {order.customer}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-4 text-neutral-800">
                      {order.phone}
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