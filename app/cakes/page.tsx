import Link from "next/link";
import { getCatalogProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

function formatPrice(price: number) {
  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

export default async function CakesPage() {
  const products = await getCatalogProducts();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">蛋糕訂購</h1>
        <p className="mt-2 text-sm text-neutral-600">
          請先選擇商品，下一步可查看規格與加購選項。
        </p>
      </header>

      {products.length === 0 ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-neutral-900">目前沒有可販售商品</h2>
          <p className="mt-2 text-sm text-neutral-600">
            請先到後台啟用商品後再返回查看。
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <Link href={`/cakes/${product.slug}`} className="block h-full">
                <div className="flex aspect-[4/3] items-center justify-center bg-neutral-100 text-sm text-neutral-400">
                  尚無圖片
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-xl font-semibold text-neutral-900">
                      {product.name}
                    </h2>
                    <span className="shrink-0 text-sm font-semibold text-neutral-700">
                      {formatPrice(product.basePrice)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-neutral-500">
                    點擊查看可選規格與加購項目。
                  </p>

                  <div className="mt-5 inline-flex items-center text-sm font-medium text-neutral-900">
                    查看商品詳情
                    <span className="ml-1">→</span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}