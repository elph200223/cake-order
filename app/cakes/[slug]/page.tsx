import Image from "next/image";
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

  const images = product.images;
  const mainImage = product.coverImage ?? images[0] ?? null;
  const galleryImages = mainImage
    ? [
        mainImage,
        ...images.filter((image) => image.id !== mainImage.id),
      ]
    : images;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6">
        <Link href="/cakes" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← 返回蛋糕列表
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="relative aspect-[4/3]">
              {mainImage ? (
                <Image
                  src={mainImage.url}
                  alt={mainImage.alt?.trim() || product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover"
                  style={{
                    objectPosition: `${mainImage.focusX ?? 50}% ${mainImage.focusY ?? 50}%`,
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-neutral-100 text-sm text-neutral-400">
                  尚無圖片
                </div>
              )}
            </div>
          </div>

          {galleryImages.length > 1 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {galleryImages.slice(1).map((image) => (
                <div
                  key={image.id}
                  className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
                >
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={image.url}
                      alt={image.alt?.trim() || `${product.name} 圖片 ${image.id}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 240px"
                      className="object-cover"
                      style={{
                        objectPosition: `${image.focusX ?? 50}% ${image.focusY ?? 50}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
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