import Link from "next/link";

type Props = {
  searchParams: Promise<{
    orderNo?: string;
  }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { orderNo } = await searchParams;
  const safeOrderNo = orderNo?.trim() || "";

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <section className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
          ✓
        </div>

        <header className="mt-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-950">
            訂單建立成功
          </h1>
          <p className="mt-3 text-sm leading-7 text-neutral-600">
            我們已收到你的訂單資料，請保留訂單編號，後續可用於查詢或聯繫確認。
          </p>
        </header>

        <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
          <p className="text-sm text-neutral-500">訂單編號</p>
          <p className="mt-2 text-2xl font-bold text-neutral-950">
            {safeOrderNo || "—"}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/cakes"
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            繼續選購商品
          </Link>

          <Link
            href="/admin/orders"
            className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white"
          >
            查看訂單列表
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500">
          下一步可再補前台訂單查詢頁，讓一般顧客不必進後台也能查看訂單。
        </p>
      </section>
    </main>
  );
}