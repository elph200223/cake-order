"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type ProductImageGalleryItem = {
  id: number;
  url: string;
  alt: string | null;
  focusX: number | null;
  focusY: number | null;
};

type Props = {
  productName: string;
  images: ProductImageGalleryItem[];
};

export default function ProductImageGallery({ productName, images }: Props) {
  const orderedImages = useMemo(() => {
    return images;
  }, [images]);

  const [activeImageId, setActiveImageId] = useState<number | null>(
    orderedImages[0]?.id ?? null
  );

  const activeImage =
    orderedImages.find((image) => image.id === activeImageId) ??
    orderedImages[0] ??
    null;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden bg-neutral-50">
        <div className="relative aspect-[5/4] bg-neutral-100">
          {activeImage ? (
            <>
              <Image
                src={activeImage.url}
                alt={activeImage.alt?.trim() || productName}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 380px"
                className="scale-[1.01] object-cover transition-transform duration-300"
                style={{
                  objectPosition: `${activeImage.focusX ?? 50}% ${activeImage.focusY ?? 50}%`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-neutral-200 text-sm text-neutral-500">
              尚無圖片
            </div>
          )}
        </div>
      </div>

      {orderedImages.length > 1 ? (
        <div className="grid grid-cols-3 gap-2">
          {orderedImages.slice(0, 6).map((image) => {
            const isActive = image.id === activeImage?.id;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveImageId(image.id)}
                className={`group overflow-hidden bg-neutral-50 text-left transition ${
                  isActive
                    ? "ring-1 ring-neutral-900"
                    : "ring-1 ring-transparent hover:ring-neutral-300"
                }`}
                aria-label={`切換到 ${image.alt?.trim() || `${productName} 圖片 ${image.id}`}`}
                aria-pressed={isActive}
              >
                <div className="relative aspect-square bg-neutral-100">
                  <Image
                    src={image.url}
                    alt={image.alt?.trim() || `${productName} 圖片 ${image.id}`}
                    fill
                    sizes="(max-width: 1024px) 33vw, 118px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    style={{
                      objectPosition: `${image.focusX ?? 50}% ${image.focusY ?? 50}%`,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}