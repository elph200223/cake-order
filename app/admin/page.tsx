import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Cakeorder 後台</h1>

      <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
        <Link href="/admin/products" style={{ textDecoration: "underline" }}>
          商品管理
        </Link>

        <Link href="/admin/option-groups" style={{ textDecoration: "underline" }}>
          選項群組管理
        </Link>

        <Link href="/admin/cakes" style={{ textDecoration: "underline" }}>
          蛋糕整理
        </Link>

        <Link href="/admin/orders" style={{ textDecoration: "underline" }}>
          訂單列表
        </Link>
      </div>
    </div>
  );
}