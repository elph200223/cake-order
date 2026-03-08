"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  formatOrderDate,
  formatOrderDateTime,
  formatOrderMoney,
} from "@/lib/order-format";
import { getOrderStatusLabel } from "@/lib/order-status";
import type { OrderDetail } from "@/lib/order-types";

type QueryState =
  | { status: "idle"; message: "" }
  | { status: "loading"; message: string }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

export default function OrdersPage() {
  const [orderNo, setOrderNo] = useState("");
  const [phone, setPhone] = useState("");
  const [queryState, setQueryState] = useState<QueryState>({
    status: "idle",
    message: "",
  });
  const [order, setOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialOrderNo = (params.get("orderNo") || "").trim();

    if (initialOrderNo) {
      setOrderNo(initialOrderNo);
    }
  }, []);

  const isSubmitting = queryState.status === "loading";

  const canSubmit = useMemo(() => {
    return orderNo.trim() !== "" && phone.trim() !== "";
  }, [orderNo, phone]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedOrderNo = orderNo.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedOrderNo || !trimmedPhone) {
      setOrder(null);
      setQueryState({
        status: "error",
        message: "請輸入訂單編號與手機號碼。",
      });
      return;
    }

    setOrder(null);
    setQueryState({
      status: "loading",
      message: "查詢訂單中…",
    });

    try {
      const params = new URLSearchParams({
        orderNo: trimmedOrderNo,
        phone: trimmedPhone,
      });

      const res = await fetch(`/api/orders/get?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setQueryState({
          status: "error",
          message:
            data?.error === "ORDER_NOT_FOUND"
              ? "查無此訂單，請確認訂單編號與手機號碼是否正確。"
              : "訂單查詢失敗，請稍後再試。",
        });
        return;
      }

      setOrder(data.order as OrderDetail);
      setQueryState({
        status: "success",
        message: "已找到訂單。",
      });
    } catch (error) {
      console.error("Order query failed:", error);
      setOrder(null);
      setQueryState({
        status: "error",
        message: "訂單查詢失敗，請稍後再試。",
      });
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">訂單查詢</h1>
        <p className="mt-2 text-sm text-neutral-600">
          請輸入訂單編號與下單手機號碼查詢您的訂單狀態。
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="orderNo"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              訂單編號
            </label>
            <input
              id="orderNo"
              type="text"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              placeholder="例如：CAKE202603070001"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              手機號碼
            </label>
            <input
              id="phone"
              type="text"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="例如：0912345678"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "查詢中…" : "查詢訂單"}
          </button>
        </form>

        {queryState.status !== "idle" ? (
          <p
            className={`mt-4 text-sm ${
              queryState.status === "error"
                ? "text-red-600"
                : queryState.status === "success"
                  ? "text-emerald-600"
                  : "text-neutral-600"
            }`}
          >
            {queryState.message}
          </p>
        ) : null}
      </section>

      {order ? (
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
            <h2 className="text-lg font-semibold">訂單明細</h2>
            <p className="text-sm text-neutral-600">訂單編號：{order.orderNo}</p>
          </div>

          <div className="grid gap-3 py-4 text-sm text-neutral-800 sm:grid-cols-2">
            <div>
              <div className="text-neutral-500">狀態</div>
              <div className="mt-1 font-medium">
                {getOrderStatusLabel(order.status)}
              </div>
            </div>

            <div>
              <div className="text-neutral-500">顧客姓名</div>
              <div className="mt-1 font-medium">{order.customer || "-"}</div>
            </div>

            <div>
              <div className="text-neutral-500">手機號碼</div>
              <div className="mt-1 font-medium">{order.phone || "-"}</div>
            </div>

            <div>
              <div className="text-neutral-500">取貨日期</div>
              <div className="mt-1 font-medium">
                {formatOrderDate(order.pickupDate)}
              </div>
            </div>

            <div>
              <div className="text-neutral-500">取貨時間</div>
              <div className="mt-1 font-medium">{order.pickupTime || "-"}</div>
            </div>

            <div>
              <div className="text-neutral-500">建立時間</div>
              <div className="mt-1 font-medium">
                {formatOrderDateTime(order.createdAt)}
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-4">
            <div className="mb-3 text-sm font-medium text-neutral-800">
              訂購項目
            </div>

            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 px-4 py-3"
                >
                  <div>
                    <div className="font-medium text-neutral-900">{item.name}</div>
                    <div className="mt-1 text-sm text-neutral-500">
                      數量：{item.qty}
                    </div>
                  </div>

                  <div className="shrink-0 text-sm font-medium text-neutral-800">
                    {formatOrderMoney(item.price * item.qty)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-neutral-200 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-neutral-800">備註</div>
                <div className="mt-1 text-sm text-neutral-600">
                  {order.note?.trim() ? order.note : "無"}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-neutral-500">訂單總金額</div>
                <div className="mt-1 text-lg font-semibold text-neutral-900">
                  {formatOrderMoney(order.totalAmount)}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}