import { ProductType } from "@prisma/client";
import { notFound } from "next/navigation";
import { getCatalogProductBySlugAndType } from "@/lib/catalog";
import CakeOptionSelector from "@/app/cakes/[slug]/CakeOptionSelector";
import ProductImageGallery from "@/app/cakes/[slug]/ProductImageGallery";

function formatBasePrice(price: number) {
  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

function getProductDescription(product: unknown) {
  if (!product || typeof product !== "object") return "";

  const raw = (product as Record<string, unknown>).description;
  if (typeof raw !== "string") return "";

  return raw.trim();
}

export default async function CoffeeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getCatalogProductBySlugAndType(slug, ProductType.COFFEE);

  if (!product) {
    notFound();
  }

  const images = product.images;
  const mainImage = product.coverImage ?? images[0] ?? null;
  const galleryImages = mainImage
    ? [mainImage, ...images.filter((image) => image.id !== mainImage.id)]
    : images;

  const productDescription = getProductDescription(product);

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-12 text-neutral-800">
      <div className="mx-auto max-w-[980px]">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-[11px] tracking-[0.22em] text-neutral-500">
            NOSTALGIA COFFEE ROASTERY
          </div>
          <h1 className="mt-4 font-serif text-2xl font-medium tracking-[0.08em] text-neutral-900">
            咖啡訂購
          </h1>
        </div>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="space-y-3">
            <ProductImageGallery
              productName={product.name}
              images={galleryImages.map((image) => ({
                id: image.id,
                url: image.url,
                alt: image.alt ?? null,
                focusX: image.focusX ?? null,
                focusY: image.focusY ?? null,
              }))}
            />

            {productDescription ? (
              <section className="bg-neutral-50 px-5 py-5">
                <div className="border-b border-neutral-200 pb-3">
                  <h3 className="text-[11px] tracking-[0.22em] text-neutral-500">
                    COFFEE DESCRIPTION
                  </h3>
                </div>

                <div className="pt-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-700">
                    {productDescription}
                  </p>
                </div>
              </section>
            ) : null}
          </div>

          <div className="bg-neutral-50 px-6 py-6 md:px-8 md:py-8">
            <div className="border-b border-neutral-200 pb-5">
              <div className="text-[11px] tracking-[0.22em] text-neutral-500">
                COFFEE
              </div>
              <h2 className="mt-3 font-serif text-2xl font-medium tracking-[0.08em] text-neutral-900">
                {product.name}
              </h2>
              <p className="mt-4 text-xl font-medium tracking-[0.03em] text-neutral-900">
                {formatBasePrice(product.basePrice)}
              </p>
              <p className="mt-4 text-sm leading-7 text-neutral-600">
                請先選擇規格與加購項目，確認金額後再加入購物車或前往結帳。
              </p>
            </div>

            <CakeOptionSelector
              productId={product.id}
              productName={product.name}
              basePrice={product.basePrice}
              optionGroups={product.optionGroups}
            />
          </div>
        </section>
      </div>
    </main>
  );
}