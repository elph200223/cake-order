import Link from "next/link";

const adminItems = [
  {
    title: "版面設定",
    description: "管理首頁主圖等站點圖片",
    href: "/admin/site-images",
  },
  {
    title: "商品管理",
    description: "管理商品資料與售價",
    href: "/admin/products",
  },
  {
    title: "選項群組管理",
    description: "管理商品可搭配的選項群組",
    href: "/admin/option-groups",
  },
  {
    title: "店休日管理",
    description: "設定每月店休日與前台禁選日期",
    href: "/admin/cakes",
  },
  {
    title: "訂單列表",
    description: "查看與處理訂單",
    href: "/admin/orders",
  },
];

export default function AdminHomePage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8 text-stone-800">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 border-b border-stone-200 pb-5">
          <p className="text-[11px] tracking-[0.28em] text-stone-500">ADMIN</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[0.08em]">
            Cakeorder 後台
          </h1>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            請從這裡進入各個管理頁面。
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {adminItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-300 hover:bg-stone-100"
            >
              <div className="text-lg font-semibold tracking-[0.06em] text-stone-900">
                {item.title}
              </div>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                {item.description}
              </p>
              <div className="mt-5 text-sm font-medium tracking-[0.08em] text-stone-500">
                進入頁面
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}