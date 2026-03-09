"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { fetchOrderDetail, updateOrderStatus } from "@/lib/order-api";
import { formatOrderDateTime, formatOrderMoney } from "@/lib/order-format";
import {
  ORDER_STATUS_OPTIONS,
  OrderStatusValue,
  getOrderStatusLabel,
} from "@/lib/order-status";
import type { OrderDetail } from "@/lib/order-types";

type Props = {
  params: Promise<{ id: string }>;
};

function parseOrderId(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default function AdminOrderDetailPage({ params }: Props) {
  const { id } = use(params);
  const parsedOrderId = parseOrderId(id);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatusValue | "">("");
  const [submitState, setSubmitState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message: string;
  }>({
    status: "idle",
    message: "",
  });

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        if (!parsedOrderId) {
          throw new Error("ORDER_ID_INVALID");
        }

        const detail = await fetchOrderDetail(parsedOrderId);
        if (!mounted) return;

        setOrder(detail);
        setStatus(detail.status);
      } catch (error: unknown) {
        if (!mounted) return;
        setSubmitState({
          status: "error",
          message: error instanceof Error ? error.message : "讀取訂單失敗",
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      mounted = false;
    };
  }, [parsedOrderId]);

  async function handleUpdateStatus() {
    if (!parsedOrderId || !status) {
      setSubmitState({
        status: "error",
        message: "訂單狀態資料不完整",
      });
      return;
    }

    setSubmitState({
      status: "submitting",
      message: "更新狀態中…",
    });

    try {
      await updateOrderStatus(parsedOrderId, status);

      const detail = await fetchOrderDetail(parsedOrderId);
      setOrder(detail);
      setStatus(detail.status);

      setSubmitState({
        status: "success",
        message: "訂單狀態已更新。",
      });
    } catch (error: unknown) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "更新狀態失敗。",
      });
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-neutral-500">讀取訂單中…</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6">
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            ← 回訂單列表
          </Link>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {submitState.message || "找不到訂單"}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/admin/orders"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          ← 回訂單列表
        </Link>
      </div>

      <header className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-neutral-500">訂單編號</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-950">
              {order.orderNo}
            </h1>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-sm text-neutral-500">目前狀態</p>
            <p className="mt-1 text-base font-semibold text-neutral-900">
              {getOrderStatusLabel(order.status)}
            </p>
          </div>
        </div>
      </header>

      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">狀態更新</h2>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatusValue)}
            className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
          >
            {ORDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleUpdateStatus}
            disabled={submitState.status === "submitting"}
            className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitState.status === "submitting" ? "更新中…" : "更新狀態"}
          </button>
        </div>

        {submitState.status === "error" ? (
          <p className="mt-3 text-sm text-red-600">{submitState.message}</p>
        ) : null}

        {submitState.status === "success" ? (
          <p className="mt-3 text-sm text-green-700">{submitState.message}</p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">顧客資訊</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">姓名</span>
                <span className="font-medium text-neutral-900">{order.customer}</span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">電話</span>
                <span className="font-medium text-neutral-900">{order.phone}</span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">取貨日期</span>
                <span className="font-medium text-neutral-900">
                  {order.pickupDate || "—"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">取貨時間</span>
                <span className="font-medium text-neutral-900">
                  {order.pickupTime || "—"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-neutral-500">備註</span>
                <span className="max-w-[70%] whitespace-pre-wrap text-right font-medium text-neutral-900">
                  {order.note?.trim() ? order.note : "—"}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">訂單資訊</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">建立時間</span>
                <span className="font-medium text-neutral-900">
                  {formatOrderDateTime(order.createdAt)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">更新時間</span>
                <span className="font-medium text-neutral-900">
                  {formatOrderDateTime(order.updatedAt)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">品項數</span>
                <span className="font-medium text-neutral-900">
                  {order.items.length}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-neutral-500">總金額</span>
                <span className="text-base font-semibold text-neutral-950">
                  {formatOrderMoney(order.totalAmount)}
                </span>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">訂單品項</h2>

          <div className="mt-4 space-y-4">
            {order.items.length === 0 ? (
              <p className="text-sm text-neutral-500">此訂單目前沒有品項資料。</p>
            ) : (
              order.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-neutral-100 bg-neutral-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900">
                        {item.name}
                      </h3>
                      <p className="mt-2 text-sm text-neutral-500">
                        單項金額 {formatOrderMoney(item.price)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-neutral-500">數量</p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">
                        {item.qty}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}