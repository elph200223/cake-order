import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatMoney(price: number) {
  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

function formatPickup(date: string, time: string) {
  const d = date?.trim() || "—";
  const t = time?.trim() || "—";
  return `${d} ${t}`;
}

function formatStatus(status: string) {
  if (status === "PENDING_PAYMENT") return "待付款";
  if (status === "PAID") return "已付款";
  if (status === "CANCELLED") return "已取消";
  return status;
}

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: [{ id: "desc" }],
    include: {
      items: true,
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
            先查看目前已建立的訂單資料，下一步再接訂單詳情或狀態操作。
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">目前沒有訂單</h2>
          <p className="mt-2 text-sm text-neutral-500">
            前台建立訂單後，這裡就會顯示。
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
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
                      {formatPickup(order.pickupDate, order.pickupTime)}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-4 text-neutral-800">
                      {formatMoney(order.totalAmount)}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-4 text-neutral-800">
                      {formatStatus(order.status)}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-4 text-neutral-800">
                      {order.items.length}
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