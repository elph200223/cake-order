import Image from "next/image";
import Link from "next/link";
import { ProductType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ProductRowActions from "./ProductRowActions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    type?: string;
    action?: string;
  }>;
};

function parseProductType(raw?: string): ProductType | null {
  if (raw === ProductType.CAKE || raw === ProductType.COFFEE) {
    return raw;
  }
  return null;
}

function getTypeLabel(productType: ProductType) {
  return productType === ProductType.COFFEE ? "咖啡" : "蛋糕";
}

function getFrontendPath(productType: ProductType, slug: string) {
  return productType === ProductType.COFFEE ? `/coffee/${slug}` : `/cakes/${slug}`;
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedType = parseProductType(resolvedSearchParams?.type);
  const action = resolvedSearchParams?.action;

  const products = await prisma.product.findMany({
    where: selectedType
      ? {
          productType: selectedType,
        }
      : undefined,
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

  const counts = await prisma.product.groupBy({
    by: ["productType"],
    _count: {
      _all: true,
    },
  });

  const cakeCount =
    counts.find((item) => item.productType === ProductType.CAKE)?._count._all ?? 0;
  const coffeeCount =
    counts.find((item) => item.productType === ProductType.COFFEE)?._count._all ?? 0;

  return (
    <main style={{ padding: 16, maxWidth: 1180, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Products</h1>
          <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
            共 {products.length} 筆
            {selectedType ? `｜目前篩選：${getTypeLabel(selectedType)}` : "｜目前篩選：全部"}
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

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          href="/admin/products/list"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 999,
            textDecoration: "none",
            fontWeight: 700,
            color: "#222",
            background: selectedType == null ? "#f3f3f3" : "#fff",
          }}
        >
          全部 ({cakeCount + coffeeCount})
        </Link>

        <Link
          href="/admin/products/list?type=CAKE"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 999,
            textDecoration: "none",
            fontWeight: 700,
            color: "#222",
            background: selectedType === ProductType.CAKE ? "#f3f3f3" : "#fff",
          }}
        >
          蛋糕 ({cakeCount})
        </Link>

        <Link
          href="/admin/products/list?type=COFFEE"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 999,
            textDecoration: "none",
            fontWeight: 700,
            color: "#222",
            background: selectedType === ProductType.COFFEE ? "#f3f3f3" : "#fff",
          }}
        >
          咖啡 ({coffeeCount})
        </Link>
      </div>

      {action === "deleted" ? (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e8d7a0",
            background: "#fff8df",
            color: "#7a5b00",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ✅ 品項已刪除
        </div>
      ) : null}

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
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 110 }}>
                分類
              </th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>名稱</th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Slug</th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 120 }}>
                價格
              </th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 120 }}>
                狀態
              </th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 280 }}>
                操作
              </th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => {
              const cover = p.images[0] ?? null;
              const frontendPath = getFrontendPath(p.productType, p.slug);

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

                  <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid #ddd",
                        background: "#fff",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {getTypeLabel(p.productType)}
                    </span>
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1", fontWeight: 700 }}>
                    <div>{p.name}</div>
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1", opacity: 0.85 }}>
                    {p.slug}
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
                    {p.basePrice}
                  </td>

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
                    <ProductRowActions
                      productId={p.id}
                      productName={p.name}
                      isActive={p.isActive}
                      frontendPath={frontendPath}
                    />
                  </td>
                </tr>
              );
            })}

            {products.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 16, opacity: 0.75 }}>
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