import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogProductBySlug } from "@/lib/catalog";
import CakeOptionSelector from "./CakeOptionSelector";

function formatBasePrice(price: number) {
  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

export default async function CakeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6">
        <Link href="/cakes" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← 返回蛋糕列表
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex aspect-[4/3] items-center justify-center bg-neutral-100 text-sm text-neutral-400">
              尚無圖片
            </div>
          </div>
        </div>

        <div>
          <header className="border-b border-neutral-200 pb-6">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-950">
              {product.name}
            </h1>

            <p className="mt-3 text-lg font-semibold text-neutral-900">
              {formatBasePrice(product.basePrice)}
            </p>

            <p className="mt-4 text-sm leading-7 text-neutral-500">
              請先選擇規格與加購項目，確認價格後再進入下一步購買流程。
            </p>
          </header>

          <CakeOptionSelector
            productId={product.id}
            productName={product.name}
            basePrice={product.basePrice}
            optionGroups={product.optionGroups}
          />
        </div>
      </section>
    </main>
  );
}