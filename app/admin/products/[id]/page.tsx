"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProductBasicFormSection, {
  type ProductType,
} from "./ProductBasicFormSection";
import ProductImagesSection, {
  type ProductImageItem,
} from "./ProductImagesSection";

type Product = {
  id: number;
  name: string;
  slug: string;
  productType: ProductType;
  basePrice: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  images?: ProductImageItem[];
};

type OptionGroup = {
  id: number;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  sort: number;
  isActive: boolean;
};

type Binding = {
  id: number;
  productId: number;
  optionGroupId: number;
  sort: number;
  optionGroup: OptionGroup;
};

type ProductResponse = {
  ok?: boolean;
  product?: Product;
  error?: unknown;
  detail?: unknown;
};

type GroupsResponse = {
  ok?: boolean;
  groups?: OptionGroup[];
  error?: unknown;
  detail?: unknown;
};

type BindingsResponse = {
  ok?: boolean;
  bindings?: Binding[];
  error?: unknown;
  detail?: unknown;
};

type MutationResponse = {
  ok?: boolean;
  error?: unknown;
  detail?: unknown;
};

function isProductResponse(value: unknown): value is ProductResponse {
  return typeof value === "object" && value !== null;
}

function isGroupsResponse(value: unknown): value is GroupsResponse {
  return typeof value === "object" && value !== null;
}

function isBindingsResponse(value: unknown): value is BindingsResponse {
  return typeof value === "object" && value !== null;
}

function isMutationResponse(value: unknown): value is MutationResponse {
  return typeof value === "object" && value !== null;
}

function parseId(raw: string | string[] | undefined): number | null {
  if (!raw) return null;
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

export default function AdminEditProductPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const id = parseId(params?.id);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [product, setProduct] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [productType, setProductType] = useState<ProductType | "">("");
  const [basePrice, setBasePrice] = useState("0");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);

  const [allGroups, setAllGroups] = useState<OptionGroup[]>([]);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [bindingBusy, setBindingBusy] = useState(false);
  const [addGroupId, setAddGroupId] = useState<string>("");

  const inputStyle = useMemo<React.CSSProperties>(
    () => ({
      width: "100%",
      padding: 10,
      border: "1px solid #ddd",
      borderRadius: 12,
      fontSize: 14,
      background: "#fff",
    }),
    []
  );

  const textareaStyle = useMemo<React.CSSProperties>(
    () => ({
      width: "100%",
      minHeight: 140,
      padding: 10,
      border: "1px solid #ddd",
      borderRadius: 12,
      fontSize: 14,
      lineHeight: 1.7,
      resize: "vertical",
      fontFamily: "inherit",
      background: "#fff",
    }),
    []
  );

  const loadAll = useCallback(async () => {
    setMsg("");
    setLoading(true);

    try {
      if (id == null) throw new Error("ID 不正確");

      const resP = await fetch(`/api/admin/products/${id}`, { cache: "no-store" });
      const rawP: unknown = await resP.json().catch(() => null);
      const dataP = isProductResponse(rawP) ? rawP : null;
      if (!dataP || dataP.ok !== true || !dataP.product) {
        throw new Error(String(dataP?.detail ?? dataP?.error ?? "LOAD_PRODUCT_FAILED"));
      }

      const p = dataP.product;
      setProduct(p);
      setName(p.name ?? "");
      setSlug(p.slug ?? "");
      setProductType(p.productType ?? "");
      setBasePrice(String(p.basePrice ?? 0));
      setDescription(p.description ?? "");
      setIsActive(Boolean(p.isActive));

      const resG = await fetch(`/api/admin/option-groups`, { cache: "no-store" });
      const rawG: unknown = await resG.json().catch(() => null);
      const dataG = isGroupsResponse(rawG) ? rawG : null;
      if (!dataG || dataG.ok !== true) {
        throw new Error(String(dataG?.detail ?? dataG?.error ?? "LOAD_GROUPS_FAILED"));
      }
      setAllGroups(Array.isArray(dataG.groups) ? dataG.groups : []);

      const resB = await fetch(`/api/admin/product-option-groups?productId=${id}`, {
        cache: "no-store",
      });
      const rawB: unknown = await resB.json().catch(() => null);
      const dataB = isBindingsResponse(rawB) ? rawB : null;
      if (!dataB || dataB.ok !== true) {
        throw new Error(String(dataB?.detail ?? dataB?.error ?? "LOAD_BINDINGS_FAILED"));
      }
      setBindings(Array.isArray(dataB.bindings) ? dataB.bindings : []);
    } catch (error: unknown) {
      setProduct(null);
      setMsg(error instanceof Error ? error.message : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function saveProduct() {
    setMsg("");
    setSavingProduct(true);

    try {
      if (id == null) throw new Error("ID 不正確");

      const n = name.trim();
      const s = slug.trim();
      const price = Number(basePrice);

      if (!productType) throw new Error("請選擇商品分類");
      if (!n) throw new Error("請輸入商品名稱");
      if (!s) throw new Error("請輸入 slug（網址用）");
      if (!Number.isFinite(price) || price < 0) throw new Error("basePrice 金額不正確");

      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          slug: s,
          productType,
          basePrice: Math.trunc(price),
          description: description.trim(),
          isActive,
        }),
      });

      const raw: unknown = await res.json().catch(() => null);
      const data = isMutationResponse(raw) ? raw : null;
      if (!data || data.ok !== true) {
        throw new Error(String(data?.detail ?? data?.error ?? "UPDATE_FAILED"));
      }

      await loadAll();
      setMsg("✅ 已儲存商品");
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setSavingProduct(false);
    }
  }

  async function deleteProduct() {
    setMsg("");
    setDeletingProduct(true);

    try {
      if (id == null) throw new Error("ID 不正確");
      if (!confirm("確定要刪除這個商品？（不可復原）")) return;

      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const raw: unknown = await res.json().catch(() => null);
      const data = isMutationResponse(raw) ? raw : null;
      if (!data || data.ok !== true) {
        throw new Error(String(data?.detail ?? data?.error ?? "DELETE_FAILED"));
      }

      router.push("/admin/products");
      router.refresh();
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "刪除失敗");
    } finally {
      setDeletingProduct(false);
    }
  }

  async function addBinding() {
    setMsg("");
    setBindingBusy(true);

    try {
      if (id == null) throw new Error("ID 不正確");
      const ogid = Number(addGroupId);
      if (!Number.isInteger(ogid)) throw new Error("請先選擇要綁定的群組");

      const res = await fetch(`/api/admin/product-option-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, optionGroupId: ogid, sort: 0 }),
      });

      const raw: unknown = await res.json().catch(() => null);
      const data = isMutationResponse(raw) ? raw : null;
      if (!data || data.ok !== true) {
        throw new Error(String(data?.detail ?? data?.error ?? "BIND_FAILED"));
      }

      setAddGroupId("");
      await loadAll();
      setMsg("✅ 已綁定群組");
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "綁定失敗");
    } finally {
      setBindingBusy(false);
    }
  }

  async function removeBinding(bindingId: number) {
    setMsg("");
    if (!confirm("確定解除綁定這個群組？")) return;

    setBindingBusy(true);
    try {
      const res = await fetch(`/api/admin/product-option-groups/${bindingId}`, {
        method: "DELETE",
      });
      const raw: unknown = await res.json().catch(() => null);
      const data = isMutationResponse(raw) ? raw : null;
      if (!data || data.ok !== true) {
        throw new Error(String(data?.detail ?? data?.error ?? "UNBIND_FAILED"));
      }

      await loadAll();
      setMsg("✅ 已解除綁定");
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "解除綁定失敗");
    } finally {
      setBindingBusy(false);
    }
  }

  async function updateBindingSort(bindingId: number, sort: number) {
    setMsg("");
    setBindingBusy(true);

    try {
      const res = await fetch(`/api/admin/product-option-groups/${bindingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort }),
      });
      const raw: unknown = await res.json().catch(() => null);
      const data = isMutationResponse(raw) ? raw : null;
      if (!data || data.ok !== true) {
        throw new Error(String(data?.detail ?? data?.error ?? "SORT_UPDATE_FAILED"));
      }

      await loadAll();
      setMsg("✅ 已更新排序");
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "更新排序失敗");
    } finally {
      setBindingBusy(false);
    }
  }

  const boundIds = new Set(bindings.map((b) => b.optionGroupId));
  const availableGroups = allGroups.filter((g) => !boundIds.has(g.id));

  if (loading) {
    return (
      <main style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
        <div style={{ opacity: 0.75 }}>Loading…</div>
      </main>
    );
  }

  if (!product) {
    return (
      <main style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
        <Link href="/admin/products" style={{ textDecoration: "underline", fontWeight: 700 }}>
          ← 回商品列表
        </Link>
        <div style={{ marginTop: 12, color: "#b00020", whiteSpace: "pre-wrap" }}>
          {msg || "找不到商品"}
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}>
        <div>
          <Link href="/admin/products" style={{ textDecoration: "underline", fontWeight: 700 }}>
            ← 回商品列表
          </Link>
          <h1 style={{ marginTop: 10, fontSize: 20, fontWeight: 900 }}>
            編輯商品：{product.name} (ID {product.id})
          </h1>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={saveProduct}
            disabled={savingProduct}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #222",
              background: "#fff",
              fontWeight: 900,
              cursor: savingProduct ? "not-allowed" : "pointer",
            }}
          >
            {savingProduct ? "儲存中…" : "儲存商品"}
          </button>

          <button
            type="button"
            onClick={deleteProduct}
            disabled={deletingProduct}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #d33",
              color: "#d33",
              background: "#fff",
              fontWeight: 900,
              cursor: deletingProduct ? "not-allowed" : "pointer",
            }}
          >
            {deletingProduct ? "刪除中…" : "刪除商品"}
          </button>
        </div>
      </div>

      <ProductBasicFormSection
        productId={product.id}
        currentSlug={product.slug}
        name={name}
        slug={slug}
        productType={productType}
        basePrice={basePrice}
        description={description}
        isActive={isActive}
        inputStyle={inputStyle}
        textareaStyle={textareaStyle}
        onNameChange={setName}
        onSlugChange={setSlug}
        onProductTypeChange={setProductType}
        onBasePriceChange={setBasePrice}
        onDescriptionChange={setDescription}
        onIsActiveChange={setIsActive}
      />

      <ProductImagesSection
        productId={product.id}
        images={Array.isArray(product.images) ? product.images : []}
        onChanged={loadAll}
      />

      <section style={{ marginTop: 14, border: "1px solid #e5e5e5", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900 }}>綁定選項群組（OptionGroup）</div>
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
              綁定後，前台會用這些群組讓客人選尺寸/口味/加購…
            </div>
          </div>

          <Link href="/admin/options" style={{ textDecoration: "underline", fontWeight: 800 }}>
            去管理群組/選項
          </Link>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={addGroupId}
            onChange={(e) => setAddGroupId(e.target.value)}
            style={{
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 12,
              fontSize: 14,
              minWidth: 260,
              background: "#fff",
            }}
          >
            <option value="">選擇要綁定的群組…</option>
            {availableGroups.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name} (ID {g.id})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={addBinding}
            disabled={bindingBusy}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #222",
              background: "#fff",
              fontWeight: 900,
              cursor: bindingBusy ? "not-allowed" : "pointer",
            }}
          >
            綁定
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          {bindings.length === 0 ? (
            <div style={{ opacity: 0.75 }}>尚未綁定任何群組</div>
          ) : (
            <div style={{ border: "1px solid #eee", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#fafafa", textAlign: "left" }}>
                    <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 70 }}>ID</th>
                    <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>群組</th>
                    <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 110 }}>sort</th>
                    <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 180 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {bindings.map((b) => (
                    <BindingRow
                      key={b.id}
                      binding={b}
                      busy={bindingBusy}
                      onSort={(sort) => updateBindingSort(b.id, sort)}
                      onRemove={() => removeBinding(b.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {msg ? <div style={{ marginTop: 12, whiteSpace: "pre-wrap", color: "#b00020" }}>{msg}</div> : null}
    </main>
  );
}

function BindingRow({
  binding,
  busy,
  onSort,
  onRemove,
}: {
  binding: Binding;
  busy: boolean;
  onSort: (sort: number) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [sort, setSort] = useState(String(binding.sort));
  const [rowBusy, setRowBusy] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 8,
    border: "1px solid #ddd",
    borderRadius: 10,
    fontSize: 14,
    background: "#fff",
  };

  return (
    <tr>
      <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{binding.id}</td>
      <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1", fontWeight: 900 }}>
        {binding.optionGroup?.name ?? `OptionGroup ${binding.optionGroupId}`}
      </td>
      <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
        <input value={sort} onChange={(e) => setSort(e.target.value)} style={inputStyle} inputMode="numeric" />
      </td>
      <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={busy || rowBusy}
            onClick={async () => {
              setRowBusy(true);
              try {
                await onSort(Number(sort));
              } finally {
                setRowBusy(false);
              }
            }}
            style={{
              border: "1px solid #222",
              borderRadius: 10,
              padding: "6px 10px",
              background: "#fff",
              fontWeight: 800,
            }}
          >
            更新 sort
          </button>

          <button
            type="button"
            disabled={busy || rowBusy}
            onClick={async () => {
              setRowBusy(true);
              try {
                await onRemove();
              } finally {
                setRowBusy(false);
              }
            }}
            style={{
              border: "1px solid #d33",
              color: "#d33",
              borderRadius: 10,
              padding: "6px 10px",
              background: "#fff",
              fontWeight: 800,
            }}
          >
            解除綁定
          </button>
        </div>
      </td>
    </tr>
  );
}