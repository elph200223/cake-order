"use client";

import { upload } from "@vercel/blob/client";
import { useMemo, useState } from "react";
import ProductImageCard from "./ProductImageCard";

export type ProductImageItem = {
  id: number;
  productId: number;
  originalName: string;
  mimeType: string;
  storageKey: string;
  url: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  compressedBytes: number | null;
  alt: string;
  sort: number;
  isCover: boolean;
  isActive: boolean;
  focusX: number;
  focusY: number;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  productId: number;
  images: ProductImageItem[];
  onChanged?: () => Promise<void> | void;
};

function formatBytes(value?: number | null) {
  if (!value || value <= 0) return "-";

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 100 ? 0 : size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

export default function ProductImagesSection({
  productId,
  images,
  onChanged,
}: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [makeCover, setMakeCover] = useState(images.length === 0);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [progress, setProgress] = useState<number | null>(null);

  const orderedImages = useMemo(() => {
    return [...images].sort((a, b) => {
      if (a.sort !== b.sort) return a.sort - b.sort;
      return a.id - b.id;
    });
  }, [images]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setMsg("請先選擇圖片檔案");
      return;
    }

    setSubmitting(true);
    setMsg("");
    setProgress(0);

    try {
      const blob = await upload(selectedFile.name, selectedFile, {
        access: "public",
        handleUploadUrl: `/api/admin/products/${productId}/images/upload`,
        multipart: selectedFile.size > 20 * 1024 * 1024,
        clientPayload: JSON.stringify({
          alt: alt.trim(),
          originalName: selectedFile.name,
          makeCover,
        }),
        onUploadProgress: ({ percentage }) => {
          setProgress(percentage);
        },
      });

      setMsg(`✅ 已上傳圖片：${blob.pathname}`);
      setSelectedFile(null);
      setAlt("");
      setMakeCover(false);
      setProgress(100);

      const fileInput = document.getElementById(
        `product-image-file-input-${productId}`
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      await onChanged?.();
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "圖片上傳失敗");
      setProgress(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      style={{
        marginTop: 14,
        border: "1px solid #e5e5e5",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 900 }}>商品圖片</div>
          <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
            可上傳圖片、設定封面，並在固定框內拖移設定顯示中心。
          </div>
        </div>

        <div style={{ fontSize: 13, opacity: 0.75 }}>
          目前共 {orderedImages.length} 張
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "minmax(0,1fr) minmax(220px,320px)",
            alignItems: "start",
          }}
        >
          <div>
            <label
              htmlFor={`product-image-file-input-${productId}`}
              style={{ display: "block", marginBottom: 6, fontSize: 13 }}
            >
              圖片檔案
            </label>

            <input
              id={`product-image-file-input-${productId}`}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={submitting}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
                setMsg("");
                setProgress(null);
              }}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 12,
                fontSize: 14,
                background: "#fff",
              }}
            />

            <div style={{ marginTop: 8, fontSize: 12, color: "#666", lineHeight: 1.6 }}>
              接受 JPG / PNG / WEBP / AVIF，上傳後會壓成 webp。
            </div>
          </div>

          <div>
            <label
              htmlFor={`product-image-alt-input-${productId}`}
              style={{ display: "block", marginBottom: 6, fontSize: 13 }}
            >
              圖片說明（alt）
            </label>

            <input
              id={`product-image-alt-input-${productId}`}
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              disabled={submitting}
              placeholder="例如：六吋草莓鮮奶油蛋糕"
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 12,
                fontSize: 14,
              }}
            />

            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginTop: 10,
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={makeCover}
                disabled={submitting}
                onChange={(event) => setMakeCover(event.target.checked)}
              />
              這張設為封面
            </label>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 13, color: "#666" }}>
            目前檔案：{selectedFile ? selectedFile.name : "尚未選擇"}
            {selectedFile ? `（${formatBytes(selectedFile.size)}）` : ""}
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedFile}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #222",
              background: "#fff",
              fontWeight: 900,
              cursor: submitting || !selectedFile ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "上傳中…" : "上傳商品圖片"}
          </button>
        </div>

        {progress !== null ? (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#666",
                marginBottom: 6,
              }}
            >
              <span>上傳進度</span>
              <span>{Math.round(progress)}%</span>
            </div>

            <div
              style={{
                height: 8,
                background: "#eee",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.max(0, Math.min(progress, 100))}%`,
                  height: "100%",
                  background: "#222",
                }}
              />
            </div>
          </div>
        ) : null}

        {msg ? (
          <div
            style={{
              marginTop: 12,
              whiteSpace: "pre-wrap",
              color: msg.startsWith("✅") ? "#166534" : "#b00020",
            }}
          >
            {msg}
          </div>
        ) : null}
      </form>

      <div style={{ marginTop: 16 }}>
        {orderedImages.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 14 }}>目前還沒有商品圖片</div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            }}
          >
            {orderedImages.map((image) => (
              <ProductImageCard
                key={image.id}
                productId={productId}
                image={image}
                onChanged={onChanged}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}