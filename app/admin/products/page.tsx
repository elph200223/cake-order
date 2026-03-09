import Link from "next/link";

export default function AdminProductsHomePage() {
  return (
    <main style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>商品管理</h1>
        <div style={{ marginTop: 8, color: "#666", fontSize: 14 }}>
          管理商品本身，以及商品的選項設定。
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        <Link
          href="/admin/products/list"
          style={{
            display: "block",
            border: "1px solid #e5e5e5",
            borderRadius: 16,
            padding: 20,
            textDecoration: "none",
            color: "inherit",
            background: "#fff",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            商品列表
          </div>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
            管理商品名稱、slug、基礎價格、上下架狀態，並進入單一商品編輯頁。
          </div>
        </Link>

        <Link
          href="/admin/products/options"
          style={{
            display: "block",
            border: "1px solid #e5e5e5",
            borderRadius: 16,
            padding: 20,
            textDecoration: "none",
            color: "inherit",
            background: "#fff",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            商品選項設定
          </div>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
            管理選項群組、選項內容，以及商品可以使用哪些選項設定。
          </div>
        </Link>
      </div>
    </main>
  );
}