"use client";

import { useMemo, useState } from "react";
import {
  buildCheckoutOrderPayload,
  validateCheckoutCustomerInput,
  type CheckoutCustomerInput,
} from "@/lib/checkout";
import { clearCart, type CartState } from "@/lib/cart";

type Props = {
  cart: CartState;
  totalAmount: number;
};

const PICKUP_TIME_OPTIONS = [
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

type SubmitState =
  | { status: "idle"; message: string }
  | { status: "submitting"; message: string }
  | { status: "success"; message: string; orderNo: string }
  | { status: "error"; message: string };

function formatMoney(price: number) {
  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CheckoutCustomerForm({ cart, totalAmount }: Props) {
  const [form, setForm] = useState<CheckoutCustomerInput>({
    customerName: "",
    phone: "",
    pickupDate: "",
    pickupTime: "",
    note: "",
  });
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: "",
  });

  const validation = useMemo(() => {
    return validateCheckoutCustomerInput(form);
  }, [form]);

  const isFormValid = useMemo(() => {
    return (
      !validation.errors.customerName &&
      !validation.errors.phone &&
      !validation.errors.pickupDate &&
      !validation.errors.pickupTime
    );
  }, [validation]);

  const orderPayload = useMemo(() => {
    return buildCheckoutOrderPayload(cart, form);
  }, [cart, form]);

  function updateField<K extends keyof CheckoutCustomerInput>(
    key: K,
    value: CheckoutCustomerInput[K]
  ) {
    setSubmitState({ status: "idle", message: "" });
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit() {
    if (!isFormValid) {
      setSubmitState({
        status: "error",
        message: "請先完成姓名、電話、取貨日期與取貨時間。",
      });
      return;
    }

    if (cart.items.length === 0) {
      setSubmitState({
        status: "error",
        message: "購物車是空的，無法建立訂單。",
      });
      return;
    }

    setSubmitState({
      status: "submitting",
      message: "建立訂單中…",
    });

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "CREATE_ORDER_FAILED");
      }

      clearCart();

      setSubmitState({
        status: "success",
        message: "訂單已建立成功。",
        orderNo: data.order?.orderNo ?? "",
      });
    } catch (error: any) {
      setSubmitState({
        status: "error",
        message: error?.message ? String(error.message) : "建立訂單失敗。",
      });
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-lg font-semibold text-neutral-900">顧客資料</h2>
        <p className="mt-1 text-sm text-neutral-500">
          請填寫取貨資訊並送出訂單。
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-1">
          <label
            htmlFor="customerName"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            姓名
          </label>
          <input
            id="customerName"
            type="text"
            value={form.customerName}
            onChange={(e) => updateField("customerName", e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
            placeholder="請輸入訂購人姓名"
          />
          {validation.errors.customerName ? (
            <p className="mt-2 text-sm text-red-600">
              {validation.errors.customerName}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-1">
          <label
            htmlFor="phone"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            電話
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
            placeholder="請輸入聯絡電話"
          />
          {validation.errors.phone ? (
            <p className="mt-2 text-sm text-red-600">{validation.errors.phone}</p>
          ) : null}
        </div>

        <div className="md:col-span-1">
          <label
            htmlFor="pickupDate"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            取貨日期
          </label>
          <input
            id="pickupDate"
            type="date"
            min={getTodayString()}
            value={form.pickupDate}
            onChange={(e) => updateField("pickupDate", e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
          />
          {validation.errors.pickupDate ? (
            <p className="mt-2 text-sm text-red-600">
              {validation.errors.pickupDate}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-1">
          <label
            htmlFor="pickupTime"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            取貨時間
          </label>
          <select
            id="pickupTime"
            value={form.pickupTime}
            onChange={(e) => updateField("pickupTime", e.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
          >
            <option value="">請選擇取貨時間</option>
            {PICKUP_TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-neutral-500">
            可選時段為 13:00～20:00，每個整點。
          </p>
          {validation.errors.pickupTime ? (
            <p className="mt-2 text-sm text-red-600">
              {validation.errors.pickupTime}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-1">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-sm text-neutral-500">目前訂單金額</p>
            <p className="mt-1 text-xl font-bold text-neutral-950">
              {formatMoney(totalAmount)}
            </p>
          </div>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="note"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            備註
          </label>
          <textarea
            id="note"
            value={form.note}
            onChange={(e) => updateField("note", e.target.value)}
            className="min-h-[120px] w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
            placeholder="可填寫蠟燭、餐具、特殊需求等"
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!isFormValid || submitState.status === "submitting"}
        >
          {submitState.status === "submitting" ? "建立訂單中…" : "建立訂單"}
        </button>

        {submitState.status === "error" ? (
          <p className="mt-3 text-sm text-red-600">{submitState.message}</p>
        ) : null}

        {submitState.status === "success" ? (
          <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
            <p className="text-sm font-medium text-green-700">
              {submitState.message}
            </p>
            <p className="mt-1 text-sm text-green-700">
              訂單編號：{submitState.orderNo || "—"}
            </p>
            <p className="mt-1 text-sm text-green-700">
              購物車已清空，重新整理後會顯示空購物車狀態。
            </p>
          </div>
        ) : null}

        {submitState.status === "idle" && !isFormValid ? (
          <p className="mt-3 text-sm text-red-600">
            請先完成姓名、電話、取貨日期與取貨時間。
          </p>
        ) : null}

        {submitState.status === "idle" && isFormValid ? (
          <p className="mt-3 text-sm text-green-700">
            顧客資料已完成，可建立訂單。
          </p>
        ) : null}
      </div>
    </section>
  );
}