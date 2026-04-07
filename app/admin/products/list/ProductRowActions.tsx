"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type MutationResponse = {
  ok?: boolean;
  error?: unknown;
  detail?: unknown;
};

function isMutationResponse(value: unknown): value is MutationResponse {
  return typeof value === "object" && value !== null;
}

export default function ProductRowActions({
  productId,
  productName,
  isActive,
  frontendPath,
}: {
  productId: number;
  productName: string;
  isActive: boolean;
  frontendPath: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const raw: unknown = await res.json().catch(() => null);
      const data = isMutationResponse(raw) ? raw : null;
      if (!data || data.ok !== true) {
        throw new Error(String(data?.detail ?? data?.error ?? "UPDATE_FAILED"));
      }

      alert(`✅ 已${isActive ? "下架" : "上架"}：${productName}`);
      router.refresh();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "操作失敗");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct() {
    if (!confirm(`確定刪除「${productName}」？此操作不可復原。`)) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });
      const raw: unknown = await res.json().catch(() => null);
      const data = isMutationResponse(raw) ? raw : null;
      if (!data || data.ok !== true) {
        throw new Error(String(data?.detail ?? data?.error ?? "DELETE_FAILED"));
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set("action", "deleted");
      params.set("t", String(Date.now()));
      router.replace(`${pathname}?${params.toString()}`);
      router.refresh();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "刪除失敗");
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <Link href={`/admin/products/${productId}`} style={{ textDecoration: "underline", fontWeight: 700 }}>
        編輯
      </Link>

      <Link href={frontendPath} target="_blank" style={{ textDecoration: "underline", fontWeight: 700 }}>
        前台
      </Link>

      <button
        type="button"
        disabled={busy}
        onClick={toggleActive}
        style={{
          border: "1px solid #222",
          borderRadius: 10,
          padding: "6px 10px",
          background: "#fff",
          fontWeight: 800,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "處理中…" : isActive ? "下架" : "上架"}
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={deleteProduct}
        style={{
          border: "1px solid #d33",
          borderRadius: 10,
          padding: "6px 10px",
          background: "#fff",
          color: "#d33",
          fontWeight: 800,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "處理中…" : "刪除"}
      </button>
    </div>
  );
}
