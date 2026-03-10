"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ProductCreateResponse = {
  ok?: boolean;
  error?: unknown;
  detail?: unknown;
  product?: {
    id: number;
    name: string;
    slug: string;
    basePrice: number;
    isActive: boolean;
  };
};

function isProductCreateResponse(value: unknown): value is ProductCreateResponse {
  return typeof value === "object" && value !== null;
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildFallbackSlug(name: string) {
  const base = slugify(name);
  if (base) return base;

  const stamp = Date.now().toString(36);
  return `product-${stamp}`;
}

export default function NewProductPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [basePrice, setBasePrice] = useState("1000");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const inputStyle = useMemo<React.CSSProperties>(
    () => ({
      width: "100%",
      padding: 10,
      border: "1px solid #ddd",
      borderRadius: 12,
      fontSize: 14,
    }),
    []
  );

  async function onSave() {
    setMsg("");
    setLoading(true);

    try {
      const n = name.trim();
      if (!n) throw new Error("請輸入名稱");

      const manualSlug = slug.trim();
      const finalSlug = manualSlug || buildFallbackSlug(n);

      if (!finalSlug) {
        throw new Error("Slug 產生失敗，請手動輸入英文 slug");
      }

      const p = Number(basePrice);
      if (!Number.isFinite(p) || p < 0) {
        throw new Error("基本價格不正確");
      }

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          slug: finalSlug,
          basePrice: p,
          isActive,
        }),
      });

      const raw: unknown = await res.json().catch(() => null);
      const data = isProductCreateResponse(raw) ? raw : null;

      if (!res.ok || !data || data.ok !== true || !data.product?.id) {
        const errorText =
          typeof data?.detail === "string"
            ? data.detail
            : typeof data?.error === "string"
              ? data.error
              : "CREATE_FAILED";

        throw new Error(errorText);
      }

      router.push(`/admin/products/${data.product.id}`);
      router.refresh();
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>新增商品</h1>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>名稱</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
          Slug（唯一）
        </label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="例如：strawberry-shortcake-6in"
          style={inputStyle}
        />
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, whiteSpace: "pre-wrap" }}>
          留空會自動產生。
          {"\n"}
          如果名稱是中文，系統會改用安全的 fallback slug，不會因為自動 slug 為空而失敗。
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
          基本價格（basePrice）
        </label>
        <input
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          inputMode="numeric"
          style={inputStyle}
        />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <input
          id="isActive"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <label htmlFor="isActive" style={{ fontSize: 14, fontWeight: 700 }}>
          上架（isActive）
        </label>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #222",
            background: "#fff",
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "儲存中…" : "儲存並前往圖片設定"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          返回列表
        </button>
      </div>

      {msg ? (
        <div style={{ marginTop: 12, color: "#b00020", whiteSpace: "pre-wrap" }}>{msg}</div>
      ) : null}
    </main>
  );
}