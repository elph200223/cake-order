import Image from "next/image";
import Link from "next/link";
import { getCatalogProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

function formatPrice(price: number) {
  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

export default async function CakesPage() {
  const products = await getCatalogProducts();

  return (
    <main className="min-h-screen bg-stone-50 text-stone-800">
      <div className="mx-auto max-w-[1280px] px-5 py-7 sm:px-8 lg:px-10">
        <header className="border-b border-stone-200 pb-4">
          <p className="text-[10px] tracking-[0.32em] text-stone-500">
            CAKE ORDER
          </p>
          <h1
            className="mt-2 text-[22px] font-medium tracking-[0.08em] text-stone-800 sm:text-[28px]"
            style={{
              fontFamily:
                '"Noto Serif TC","Iowan Old Style","Palatino Linotype","Times New Roman",serif',
            }}
          >
            蛋糕訂購
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-stone-600">
            請先選擇商品，下一步可查看規格與加購選項。
          </p>
        </header>

        <div className="pt-6">
          <div className="mb-5">
            <Link
              href="/"
              className="text-[13px] tracking-[0.08em] text-stone-500 transition hover:text-stone-800"
            >
              ← 返回首頁
            </Link>
          </div>

          {products.length === 0 ? (
            <section className="border border-stone-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-lg font-semibold tracking-[0.06em] text-stone-900">
                目前沒有可販售商品
              </h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                請先到後台啟用商品後再返回查看。
              </p>
            </section>
          ) : (
            <section className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="mx-auto w-full max-w-[220px] border border-stone-200 bg-white transition duration-200 hover:border-stone-400 hover:shadow-[0_10px_24px_rgba(0,0,0,0.04)]"
                >
                  <Link href={`/cakes/${product.slug}`} className="block h-full">
                    <div className="relative aspect-[4/4.6] bg-stone-100">
                      {product.coverImage ? (
                        <Image
                          src={product.coverImage.url}
                          alt={product.coverImage.alt?.trim() || product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 220px"
                          className="object-cover"
                          style={{
                            objectPosition: `${product.coverImage.focusX ?? 50}% ${product.coverImage.focusY ?? 50}%`,
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[12px] tracking-[0.08em] text-stone-400">
                          尚無圖片
                        </div>
                      )}
                    </div>

                    <div className="p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="line-clamp-2 text-[13px] font-medium leading-[1.35rem] tracking-[0.02em] text-stone-900">
                          {product.name}
                        </h2>
                        <span className="shrink-0 pt-[1px] text-[11px] font-medium text-stone-700">
                          {formatPrice(product.basePrice)}
                        </span>
                      </div>

                      <p className="mt-1 text-[10px] leading-4 text-stone-500">
                        查看規格與加購
                      </p>

                      <div className="mt-2.5 inline-flex items-center text-[10px] font-medium tracking-[0.1em] text-stone-800">
                        查看商品
                        <span className="ml-1">→</span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}