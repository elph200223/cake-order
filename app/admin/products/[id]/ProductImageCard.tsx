"use client";

import { useEffect, useState } from "react";
import ImageFocusEditor from "./ImageFocusEditor";
import type { ProductImageItem } from "./ProductImagesSection";

type Props = {
  productId: number;
  image: ProductImageItem;
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

function clampZoom(value?: number | null) {
  if (!Number.isFinite(value)) return 100;
  if ((value ?? 100) < 50) return 50;
  if ((value ?? 100) > 250) return 250;
  return Math.round(value as number);
}

export default function ProductImageCard({
  productId,
  image,
  onChanged,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [cardMsg, setCardMsg] = useState("");
  const [sortValue, setSortValue] = useState(String(image.sort ?? 0));

  useEffect(() => {
    setSortValue(String(image.sort ?? 0));
  }, [image.sort]);

  async function patchImage(payload: {
    focusX?: number;
    focusY?: number;
    zoom?: number;
    isCover?: boolean;
    sort?: number;
  }) {
    setBusy(true);
    setCardMsg("");

    try {
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: image.id,
          ...payload,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; detail?: string }
        | null;

      if (!res.ok || !data?.ok) {
        throw new Error(data?.detail || data?.error || "UPDATE_FAILED");
      }

      setCardMsg("✅ 已更新");
      await onChanged?.();
    } catch (error: unknown) {
      setCardMsg(error instanceof Error ? error.message : "更新失敗");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function deleteImage() {
    if (!confirm("確定要刪除這張圖片？")) return;

    setBusy(true);
    setCardMsg("");

    try {
      const res = await fetch(
        `/api/admin/products/${productId}/images?imageId=${image.id}`,
        {
          method: "DELETE",
        }
      );

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; detail?: string }
        | null;

      if (!res.ok || !data?.ok) {
        throw new Error(data?.detail || data?.error || "DELETE_FAILED");
      }

      setCardMsg("✅ 已刪除圖片");
      await onChanged?.();
    } catch (error: unknown) {
      setCardMsg(error instanceof Error ? error.message : "刪除失敗");
    } finally {
      setBusy(false);
    }
  }

  async function updateSort() {
    const sort = Number(sortValue);

    if (!Number.isFinite(sort)) {
      setCardMsg("sort 必須是數字");
      return;
    }

    await patchImage({ sort: Math.trunc(sort) });
  }

  const savedFocusX = image.focusX ?? 50;
  const savedFocusY = image.focusY ?? 50;
  const savedZoom = clampZoom(image.zoom ?? 100);

  return (
    <article
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: 14,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div style={{ padding: 12 }}>
        <ImageFocusEditor
          imageUrl={image.url}
          alt={image.alt || image.originalName || "商品圖片"}
          initialFocusX={savedFocusX}
          initialFocusY={savedFocusY}
          initialZoom={savedZoom}
          disabled={busy}
          onSave={async (focusX, focusY, zoom) => {
            await patchImage({ focusX, focusY, zoom });
          }}
        />

        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {image.isCover ? (
            <span
              style={{
                display: "inline-block",
                padding: "4px 8px",
                borderRadius: 999,
                background: "#222",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              封面
            </span>
          ) : null}

          {!image.isActive ? (
            <span
              style={{
                display: "inline-block",
                padding: "4px 8px",
                borderRadius: 999,
                background: "#f5f5f5",
                border: "1px solid #ddd",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              已停用
            </span>
          ) : null}

          <span
            style={{
              display: "inline-block",
              padding: "4px 8px",
              borderRadius: 999,
              background: "#f5f5f5",
              border: "1px solid #ddd",
              fontSize: 12,
            }}
          >
            sort {image.sort}
          </span>
        </div>

        <div style={{ marginTop: 10, fontWeight: 700, lineHeight: 1.5 }}>
          {image.alt?.trim() || image.originalName}
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#666",
            lineHeight: 1.7,
            wordBreak: "break-all",
          }}
        >
          <div>原始檔名：{image.originalName}</div>
          <div>
            尺寸：
            {image.width && image.height ? `${image.width} × ${image.height}` : "-"}
          </div>
          <div>大小：{formatBytes(image.sizeBytes)}</div>
          <div>壓縮後：{formatBytes(image.compressedBytes)}</div>
          <div>
            已存中心：X {savedFocusX}% / Y {savedFocusY}%
          </div>
          <div>已存縮放：{savedZoom}%</div>
          <div>縮放範圍：50% ～ 250%</div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "92px minmax(0,1fr) auto",
            gap: 8,
            alignItems: "center",
          }}
        >
          <label style={{ fontSize: 13, color: "#666" }}>圖片排序</label>

          <input
            value={sortValue}
            onChange={(event) => {
              setSortValue(event.target.value);
              setCardMsg("");
            }}
            disabled={busy}
            inputMode="numeric"
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #ddd",
              borderRadius: 10,
              fontSize: 14,
            }}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => void updateSort()}
            style={{
              border: "1px solid #222",
              borderRadius: 10,
              padding: "8px 10px",
              background: "#fff",
              fontWeight: 800,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            更新 sort
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            disabled={busy || image.isCover}
            onClick={() => void patchImage({ isCover: true })}
            style={{
              border: "1px solid #222",
              borderRadius: 10,
              padding: "8px 10px",
              background: "#fff",
              fontWeight: 800,
              cursor: busy || image.isCover ? "not-allowed" : "pointer",
            }}
          >
            設為封面
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void deleteImage()}
            style={{
              border: "1px solid #d33",
              color: "#d33",
              borderRadius: 10,
              padding: "8px 10px",
              background: "#fff",
              fontWeight: 800,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            刪除圖片
          </button>
        </div>

        {cardMsg ? (
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: cardMsg.startsWith("✅") ? "#166534" : "#b00020",
              whiteSpace: "pre-wrap",
            }}
          >
            {cardMsg}
          </div>
        ) : null}
      </div>
    </article>
  );
}