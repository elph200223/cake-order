"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CheckoutCartItems from "./CheckoutCartItems";
import CheckoutCustomerForm from "./CheckoutCustomerForm";
import {
  decrementCartItemQuantity,
  getCartTotalAmount,
  incrementCartItemQuantity,
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

  const totalAmount = useMemo(() => getCartTotalAmount(cart), [cart]);

  function handleRemoveItem(itemId: string) {
    const nextCart = removeCartItem(itemId);
    setCart(nextCart);
  }

  function handleIncreaseQuantity(itemId: string) {
    const nextCart = incrementCartItemQuantity(itemId);
    setCart(nextCart);
  }

  function handleDecreaseQuantity(itemId: string) {
    const nextCart = decrementCartItemQuantity(itemId);
    setCart(nextCart);
  }

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-neutral-100 px-5 py-12 text-neutral-800">
        <div className="mx-auto max-w-[980px]">
          <div className="mx-auto max-w-xl bg-neutral-50 px-8 py-12 text-center">
            <div className="text-[11px] tracking-[0.22em] text-neutral-500">
              NOSTALGIA COFFEE ROASTERY
            </div>
            <h1 className="mt-4 font-serif text-2xl font-medium tracking-[0.08em] text-neutral-900">
              結帳
            </h1>
            <p className="mt-4 text-sm leading-8 text-neutral-600">
              載入購物車中…
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-12 text-neutral-800">
      <div className="mx-auto max-w-[980px]">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-[11px] tracking-[0.22em] text-neutral-500">
            NOSTALGIA COFFEE ROASTERY
          </div>
          <h1 className="mt-4 font-serif text-2xl font-medium tracking-[0.08em] text-neutral-900">
            結帳
          </h1>
          <p className="mt-4 text-sm leading-8 text-neutral-600">
            先確認商品與金額，再填寫取貨資訊並進入付款流程。
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/cakes"
            className="inline-flex text-sm text-neutral-500 transition hover:text-neutral-900"
          >
            ← 返回蛋糕列表
          </Link>
        </div>

        {cart.items.length === 0 ? (
          <section className="mx-auto mt-6 max-w-xl bg-neutral-50 px-8 py-12 text-center">
            <h2 className="font-serif text-xl font-medium tracking-[0.06em] text-neutral-900">
              購物車目前是空的
            </h2>
            <p className="mt-3 text-sm leading-8 text-neutral-600">
              請先到商品頁加入蛋糕與規格選項。
            </p>

            <div className="mt-8">
              <Link
                href="/cakes"
                className="inline-flex items-center justify-center bg-neutral-900 px-5 py-3 text-sm font-medium tracking-[0.06em] text-white transition hover:bg-neutral-800"
              >
                去選購蛋糕
              </Link>
            </div>
          </section>
        ) : (
          <section className="mx-auto mt-6 max-w-[920px]">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_620px] lg:items-start lg:justify-center lg:gap-8">
              <div className="w-full bg-neutral-50 px-5 py-6">
                <CheckoutCartItems
                  items={cart.items}
                  onRemove={handleRemoveItem}
                  onDecreaseQuantity={handleDecreaseQuantity}
                  onIncreaseQuantity={handleIncreaseQuantity}
                />
              </div>

              <div className="w-full bg-neutral-50 px-6 py-6 md:px-8 md:py-8">
                <CheckoutCustomerForm cart={cart} totalAmount={totalAmount} />
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}