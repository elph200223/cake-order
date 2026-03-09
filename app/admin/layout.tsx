import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 220,
          borderRight: "1px solid #ddd",
          padding: 16,
          background: "#fafafa",
        }}
      >
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>後台管理</h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/admin">首頁</Link>
          <Link href="/admin/orders">訂單管理</Link>
          <Link href="/admin/products">商品管理</Link>
          <Link href="/admin/pickup-settings">取貨設定</Link>
          <Link href="/admin/payments">金流管理</Link>
          <Link href="/admin/settings">系統設定</Link>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}