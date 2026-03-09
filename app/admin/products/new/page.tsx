"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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

      const s = (slug || slugify(n)).trim();
      if (!s) throw new Error("請輸入 slug（或讓系統自動產生）");

      const p = Number(basePrice);
      if (!Number.isFinite(p) || p < 0) throw new Error("basePrice 金額不正確");

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, slug: s, basePrice: p, isActive }),
      });

      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "CREATE_FAILED");

      router.push("/admin/products");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ? String(e.message) : "儲存失敗");
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
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
          留空會用名稱自動產生（英文/數字/連字號）。
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>基本價格（basePrice）</label>
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
          {loading ? "儲存中…" : "儲存"}
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