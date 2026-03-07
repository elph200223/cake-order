import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function formatMoney(price: number) {
  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

function formatStatus(status: string) {
  if (status === "PENDING_PAYMENT") return "待付款";
  if (status === "PAID") return "已付款";
  if (status === "CANCELLED") return "已取消";
  return status;
}

function parseOrderId(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = parseOrderId(id);

  if (!orderId) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        orderBy: [{ id: "asc" }],
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/admin/orders"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          ← 回訂單列表
        </Link>
      </div>

      <header className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-neutral-500">訂單編號</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-950">
              {order.orderNo}
            </h1>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-sm text-neutral-500">狀態</p>
            <p className="mt-1 text-base font-semibold text-neutral-900">
              {formatStatus(order.status)}
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">顧客資訊</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">姓名</span>
                <span className="font-medium text-neutral-900">{order.customer}</span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">電話</span>
                <span className="font-medium text-neutral-900">{order.phone}</span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">取貨日期</span>
                <span className="font-medium text-neutral-900">
                  {order.pickupDate || "—"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">取貨時間</span>
                <span className="font-medium text-neutral-900">
                  {order.pickupTime || "—"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-neutral-500">備註</span>
                <span className="max-w-[70%] whitespace-pre-wrap text-right font-medium text-neutral-900">
                  {order.note?.trim() ? order.note : "—"}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">訂單資訊</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">建立時間</span>
                <span className="font-medium text-neutral-900">
                  {new Date(order.createdAt).toLocaleString("zh-TW")}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">更新時間</span>
                <span className="font-medium text-neutral-900">
                  {new Date(order.updatedAt).toLocaleString("zh-TW")}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">品項數</span>
                <span className="font-medium text-neutral-900">
                  {order.items.length}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-neutral-500">總金額</span>
                <span className="text-base font-semibold text-neutral-950">
                  {formatMoney(order.totalAmount)}
                </span>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">訂單品項</h2>

          <div className="mt-4 space-y-4">
            {order.items.length === 0 ? (
              <p className="text-sm text-neutral-500">此訂單目前沒有品項資料。</p>
            ) : (
              order.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-neutral-100 bg-neutral-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900">
                        {item.name}
                      </h3>
                      <p className="mt-2 text-sm text-neutral-500">
                        單項金額 {formatMoney(item.price)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-neutral-500">數量</p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">
                        {item.quantity}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}