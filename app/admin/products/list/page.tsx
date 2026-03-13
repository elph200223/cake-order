import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      images: {
        where: {
          isActive: true,
        },
        orderBy: [{ isCover: "desc" }, { sort: "asc" }, { id: "asc" }],
        take: 1,
      },
    },
  });

  return (
    <main style={{ padding: 16, maxWidth: 1180, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Products</h1>
          <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
            共 {products.length} 筆
          </div>
        </div>

        <Link
          href="/admin/products/new"
          style={{
            display: "inline-block",
            padding: "10px 12px",
            border: "1px solid #222",
            borderRadius: 12,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ＋ 新增商品
        </Link>
      </div>

      <div
        style={{
          marginTop: 14,
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#fafafa", textAlign: "left" }}>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 96 }}>
                圖片
              </th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 80 }}>
                ID
              </th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>名稱</th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Slug</th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 120 }}>
                價格
              </th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 120 }}>
                狀態
              </th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 140 }}>
                操作
              </th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => {
              const cover = p.images[0] ?? null;
              return (
                <tr key={p.id}>
                  <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
                    <div
                      style={{
                        position: "relative",
                        width: 64,
                        height: 64,
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "#f3f3f3",
                        border: "1px solid #eee",
                      }}
                    >
                      {cover ? (
                        <Image
                          src={cover.url}
                          alt={cover.alt || p.name}
                          fill
                          sizes="64px"
                          style={{
                            objectFit: "cover",
                            objectPosition: `${cover.focusX ?? 50}% ${cover.focusY ?? 50}%`,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            color: "#888",
                            textAlign: "center",
                            lineHeight: 1.4,
                            padding: 6,
                          }}
                        >
                          無圖片
                        </div>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{p.id}</td>

                  <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1", fontWeight: 700 }}>
                    <div>{p.name}</div>
                    {cover?.isCover ? (
                      <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>已設定封面</div>
                    ) : null}
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1", opacity: 0.85 }}>
                    {p.slug}
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{p.basePrice}</td>

                  <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid #ddd",
                        background: p.isActive ? "#fff" : "#f5f5f5",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {p.isActive ? "上架" : "下架"}
                    </span>
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
                    <Link
                      href={`/admin/products/${p.id}`}
                      style={{ textDecoration: "underline", fontWeight: 700 }}
                    >
                      編輯
                    </Link>
                  </td>
                </tr>
              );
            })}

            {products.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 16, opacity: 0.75 }}>
                  目前沒有商品，點右上角「新增商品」開始。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}