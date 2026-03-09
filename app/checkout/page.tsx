"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CheckoutCartItems from "./CheckoutCartItems";
import CheckoutCustomerForm from "./CheckoutCustomerForm";
import CheckoutSummary from "./CheckoutSummary";
import {
  clearCart,
  getCartItemCount,
  getCartTotalAmount,
  readCart,
  removeCartItem,
  type CartState,
} from "@/lib/cart";

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartState>({ items: [] });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextCart = readCart();
      setCart(nextCart);
      setHydrated(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const itemCount = useMemo(() => getCartItemCount(cart), [cart]);
  const totalAmount = useMemo(() => getCartTotalAmount(cart), [cart]);

  function handleRemoveItem(itemId: string) {
    const nextCart = removeCartItem(itemId);
    setCart(nextCart);
  }

  function handleClearCart() {
    const nextCart = clearCart();
    setCart(nextCart);
  }

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-950">結帳</h1>
        <p className="mt-4 text-sm text-neutral-500">載入購物車中…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <Link href="/cakes" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← 返回蛋糕列表
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-950">結帳</h1>
        <p className="mt-2 text-sm text-neutral-600">
          先確認商品、規格與金額，再填寫顧客資料。下一步才接建立訂單。
        </p>
      </header>

      {cart.items.length === 0 ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">購物車目前是空的</h2>
          <p className="mt-2 text-sm text-neutral-500">請先到商品頁加入蛋糕與規格選項。</p>

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
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <CheckoutCartItems items={cart.items} onRemove={handleRemoveItem} />

            <CheckoutCustomerForm cart={cart} totalAmount={totalAmount} />
          </div>

          <CheckoutSummary
            itemCount={itemCount}
            cartItemCount={cart.items.length}
            totalAmount={totalAmount}
            onClear={handleClearCart}
          />
        </section>
      )}
    </main>
  );
}