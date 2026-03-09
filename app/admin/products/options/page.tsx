"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Product = {
  id: number;
  name: string;
  slug: string;
};

type OptionGroup = {
  id: number;
  name: string;
};

type Binding = {
  id: number;
  productId: number;
  optionGroupId: number;
  sort: number;
};

export default function AdminProductOptionsMatrixPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const [resProducts, resGroups] = await Promise.all([
        fetch("/api/admin/products", { cache: "no-store" }),
        fetch("/api/admin/option-groups", { cache: "no-store" }),
      ]);

      const productsData = await resProducts.json();
      const groupsData = await resGroups.json();

      if (!productsData?.ok) throw new Error(productsData?.detail || productsData?.error || "LOAD_PRODUCTS_FAILED");
      if (!groupsData?.ok) throw new Error(groupsData?.detail || groupsData?.error || "LOAD_GROUPS_FAILED");

      const ps: Product[] = productsData.products || [];
      const gs: OptionGroup[] = groupsData.groups || [];

      setProducts(ps);
      setGroups(gs);

      const allBindingsArrays = await Promise.all(
        ps.map(async (p) => {
          const res = await fetch(`/api/admin/product-option-groups?productId=${p.id}`, {
            cache: "no-store",
          });
          const data = await res.json();
          if (!data?.ok) throw new Error(data?.detail || data?.error || "LOAD_BINDINGS_FAILED");
          return (data.bindings || []) as Binding[];
        })
      );

      setBindings(allBindingsArrays.flat());
    } catch (e: any) {
      setMsg(e?.message ? String(e.message) : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function findBinding(productId: number, optionGroupId: number) {
    return bindings.find((b) => b.productId === productId && b.optionGroupId === optionGroupId) || null;
  }

  async function toggleBinding(productId: number, optionGroupId: number, checked: boolean) {
    const key = `${productId}-${optionGroupId}`;
    setBusyKey(key);
    setMsg("");

    try {
      const existing = findBinding(productId, optionGroupId);

      if (checked) {
        if (existing) return;

        const res = await fetch("/api/admin/product-option-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            optionGroupId,
            sort: 0,
          }),
        });

        const data = await res.json();
        if (!data?.ok) throw new Error(data?.detail || data?.error || "BIND_FAILED");
      } else {
        if (!existing) return;

        const res = await fetch(`/api/admin/product-option-groups/${existing.id}`, {
          method: "DELETE",
        });

        const data = await res.json();
        if (!data?.ok) throw new Error(data?.detail || data?.error || "UNBIND_FAILED");
      }

      await load();
    } catch (e: any) {
      setMsg(e?.message ? String(e.message) : "更新失敗");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}>
        <div>
          <Link href="/admin" style={{ textDecoration: "underline", fontWeight: 700 }}>
            ← 回後台首頁
          </Link>
          <h1 style={{ marginTop: 10, fontSize: 22, fontWeight: 900 }}>商品選項設定</h1>
          <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
            勾選每個商品要使用哪些選項群組
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/admin/options"
            style={{
              padding: "10px 12px",
              border: "1px solid #222",
              borderRadius: 12,
              textDecoration: "none",
              color: "inherit",
              fontWeight: 800,
            }}
          >
            新增群組 / 管理選項
          </Link>

          <Link
            href="/admin/products"
            style={{
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: 12,
              textDecoration: "none",
              color: "inherit",
              fontWeight: 700,
            }}
          >
            回商品管理
          </Link>
        </div>
      </div>

      {msg ? (
        <div style={{ marginTop: 12, color: "#b00020", whiteSpace: "pre-wrap" }}>{msg}</div>
      ) : null}

      <div
        style={{
          marginTop: 14,
          border: "1px solid #e5e5e5",
          borderRadius: 18,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `280px repeat(${Math.max(groups.length, 1)}, minmax(180px, 1fr))`,
            background: "#fafafa",
            borderBottom: "1px solid #eee",
          }}
        >
          <div style={{ padding: 18, fontWeight: 900 }}>商品</div>

          {groups.map((g) => (
            <div
              key={g.id}
              style={{
                padding: 18,
                fontWeight: 900,
                borderLeft: "1px solid #f1f1f1",
              }}
            >
              <Link
                href={`/admin/options/${g.id}`}
                style={{ textDecoration: "underline", color: "inherit" }}
              >
                {g.name}
              </Link>
            </div>
          ))}

          {groups.length === 0 ? (
            <div style={{ padding: 18, opacity: 0.75 }}>尚未建立群組</div>
          ) : null}
        </div>

        {loading ? (
          <div style={{ padding: 18, opacity: 0.75 }}>Loading…</div>
        ) : products.length === 0 ? (
          <div style={{ padding: 18, opacity: 0.75 }}>尚未建立商品</div>
        ) : groups.length === 0 ? (
          <div style={{ padding: 18, opacity: 0.75 }}>
            尚未建立任何群組，請先到「新增群組 / 管理選項」建立。
          </div>
        ) : (
          products.map((p) => (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: `280px repeat(${groups.length}, minmax(180px, 1fr))`,
                borderBottom: "1px solid #f5f5f5",
              }}
            >
              <div style={{ padding: 18 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{p.name}</div>
                <div style={{ marginTop: 6, opacity: 0.65 }}>{p.slug}</div>
                <div style={{ marginTop: 8 }}>
                  <Link
                    href={`/admin/products/${p.id}`}
                    style={{ textDecoration: "underline", fontWeight: 700 }}
                  >
                    編輯商品
                  </Link>
                </div>
              </div>

              {groups.map((g) => {
                const binding = findBinding(p.id, g.id);
                const checked = Boolean(binding);
                const key = `${p.id}-${g.id}`;
                const busy = busyKey === key;

                return (
                  <div
                    key={g.id}
                    style={{
                      padding: 18,
                      borderLeft: "1px solid #f8f8f8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy}
                      onChange={(e) => toggleBinding(p.id, g.id, e.target.checked)}
                      style={{ width: 20, height: 20 }}
                    />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </main>
  );
}