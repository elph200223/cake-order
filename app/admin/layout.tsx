"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 路由切換時自動關閉抽屜
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      {/* ── 手機 sticky header ── */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 md:hidden">
        <button
          aria-label="開啟選單"
          onClick={() => setOpen(true)}
          className="flex flex-col justify-center gap-[5px] p-1"
        >
          <span className="block h-[2px] w-5 bg-neutral-700" />
          <span className="block h-[2px] w-5 bg-neutral-700" />
          <span className="block h-[2px] w-5 bg-neutral-700" />
        </button>
        <span className="text-xs font-semibold tracking-widest text-neutral-400">ADMIN</span>
      </header>

      {/* ── 手機 overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── 側欄 ── */}
      <aside
        className={[
          // 手機：fixed 抽屜，靠左滑入滑出
          "fixed inset-y-0 left-0 z-40 w-52 shrink-0 border-r border-neutral-200 bg-neutral-50 px-4 py-6",
          "transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          // 桌機：relative，還原 transform，永遠顯示
          "md:relative md:translate-x-0",
        ].join(" ")}
      >
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

      {/* ── 主內容 ── */}
      <main className="min-w-0 flex-1 pt-12 md:pt-0">{children}</main>
    </div>
  );
}
