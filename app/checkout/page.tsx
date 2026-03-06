"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCartItemCount, getCartTotalAmount, readCart, type CartState } from "@/lib/cart";

function formatMoney(price: number) {
  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartState>({ items: [] });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const nextCart = readCart();
    setCart(nextCart);
    setHydrated(true);
  }, []);

  const itemCount = useMemo(() => getCartItemCount(cart), [cart]);
  const totalAmount = useMemo(() => getCartTotalAmount(cart), [cart]);

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-950">結帳</h1>
        <p className="mt-4 text-sm text-neutral-500">載入購物車中…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6">
        <Link href="/cakes" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← 返回蛋糕列表
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-950">結帳</h1>
        <p className="mt-2 text-sm text-neutral-600">
          先確認商品、規格與金額，下一步再接顧客資料與建立訂單。
        </p>
      </header>

      {cart.items.length === 0 ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">購物車目前是空的</h2>
          <p className="mt-2 text-sm text-neutral-500">
            請先到商品頁加入蛋糕與規格選項。
          </p>

          <div className="mt-6">
            <Link
              href="/cakes"
              className="inline-flex items-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white"
            >
              去選購蛋糕
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            {cart.items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">
                      {item.productName}
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      基本價格 {formatMoney(item.basePrice)}
                    </p>
                  </div>

                  <div className="text-sm text-neutral-600">
                    數量 <span className="font-semibold text-neutral-900">{item.quantity}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {item.options.length === 0 ? (
                    <p className="text-sm text-neutral-400">無加購或規格選項</p>
                  ) : (
                    item.options.map((option) => (
                      <div
                        key={`${item.id}-${option.optionGroupId}-${option.optionId}`}
                        className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            {option.optionGroupName}
                          </p>
                          <p className="mt-1 text-sm text-neutral-600">{option.optionName}</p>
                        </div>

                        <div className="ml-4 shrink-0 text-sm font-medium text-neutral-700">
                          {option.priceDelta === 0
                            ? "不加價"
                            : option.priceDelta > 0
                              ? `+${formatMoney(option.priceDelta).replace("NT$ ", "NT$ ")}`
                              : `-${formatMoney(Math.abs(option.priceDelta)).replace("NT$ ", "NT$ ")}`}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
                  <span className="text-sm text-neutral-500">此項目小計</span>
                  <span className="text-base font-semibold text-neutral-950">
                    {formatMoney(item.subtotal)}
                  </span>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">訂單摘要</h2>

            <div className="mt-4 space-y-3 border-b border-neutral-100 pb-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">商品總件數</span>
                <span className="font-medium text-neutral-900">{itemCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500">購物車項目數</span>
                <span className="font-medium text-neutral-900">{cart.items.length}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-base font-semibold text-neutral-900">總金額</span>
              <span className="text-xl font-bold text-neutral-950">
                {formatMoney(totalAmount)}
              </span>
            </div>

            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white"
              disabled
            >
              下一步會接顧客資料表單
            </button>

            <p className="mt-3 text-sm text-neutral-500">
              目前此頁先完成購物車讀取與摘要顯示。
            </p>
          </aside>
        </section>
      )}
    </main>
  );
}