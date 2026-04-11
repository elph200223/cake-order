import Link from "next/link";

const NAV_ITEMS = [
  { title: "後台首頁", href: "/admin" },
  { title: "訂單列表", href: "/admin/orders" },
  { title: "商品管理", href: "/admin/products" },
  { title: "選項群組管理", href: "/admin/option-groups" },
  { title: "店休日管理", href: "/admin/cakes" },
  { title: "版面設定", href: "/admin/site-images" },
  { title: "訂位管理", href: "/admin/reservations" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-52 shrink-0 border-r border-neutral-200 bg-neutral-50 px-4 py-6">
        <p className="mb-5 text-xs font-semibold tracking-widest text-neutral-400">
          ADMIN
        </p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900"
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}