"use client";

import Link from "next/link";

export type ProductType = "CAKE" | "COFFEE";

type Props = {
  productId: number;
  currentSlug: string;
  name: string;
  slug: string;
  productType: ProductType | "";
  basePrice: string;
  description: string;
  isActive: boolean;
  inputStyle: React.CSSProperties;
  textareaStyle: React.CSSProperties;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onProductTypeChange: (value: ProductType | "") => void;
  onBasePriceChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onIsActiveChange: (value: boolean) => void;
};

function getFrontendPath(productType: ProductType | "", slug: string) {
  if (!slug) return "";
  return productType === "COFFEE" ? `/coffee/${slug}` : `/cakes/${slug}`;
}

function getDescriptionLabel(productType: ProductType | "") {
  return productType === "COFFEE" ? "咖啡簡介" : "蛋糕簡介";
}

function getDescriptionPlaceholder(productType: ProductType | "") {
  return productType === "COFFEE"
    ? "這裡可輸入咖啡介紹、風味描述、烘焙程度、沖煮建議等內容。"
    : "這裡可輸入蛋糕介紹、口感描述、尺寸提醒、保存建議等內容。";
}

export default function ProductBasicFormSection({
  productId,
  currentSlug,
  name,
  slug,
  productType,
  basePrice,
  description,
  isActive,
  inputStyle,
  textareaStyle,
  onNameChange,
  onSlugChange,
  onProductTypeChange,
  onBasePriceChange,
  onDescriptionChange,
  onIsActiveChange,
}: Props) {
  const finalSlug = slug || currentSlug;
  const frontendPath = getFrontendPath(productType, finalSlug);

  return (
    <section style={{ marginTop: 14, border: "1px solid #e5e5e5", borderRadius: 14, padding: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>
        商品基本資料（ID {productId}）
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>名稱</label>
          <input value={name} onChange={(e) => onNameChange(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>basePrice</label>
          <input
            value={basePrice}
            onChange={(e) => onBasePriceChange(e.target.value)}
            style={inputStyle}
            inputMode="numeric"
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>商品分類</label>
          <select
            value={productType}
            onChange={(e) => onProductTypeChange(e.target.value as ProductType | "")}
            style={inputStyle}
          >
            <option value="">請選擇分類</option>
            <option value="CAKE">蛋糕</option>
            <option value="COFFEE">咖啡</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>目前前台路徑</label>
          <div
            style={{
              ...inputStyle,
              display: "flex",
              alignItems: "center",
              background: "#fafafa",
              color: frontendPath ? "#222" : "#999",
            }}
          >
            {frontendPath || "請先選擇分類並確認 slug"}
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
            slug（網址用，必須唯一）
          </label>
          <input value={slug} onChange={(e) => onSlugChange(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
            {getDescriptionLabel(productType)}
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            style={textareaStyle}
            placeholder={getDescriptionPlaceholder(productType)}
          />
        </div>

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => onIsActiveChange(e.target.checked)}
            />
            上架（isActive）
          </label>

          {frontendPath ? (
            <Link
              href={frontendPath}
              style={{ textDecoration: "underline", fontWeight: 800 }}
              target="_blank"
            >
              打開前台商品頁
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}