"use client";

import { useMemo, useState } from "react";
import {
  buildCheckoutOrderPayload,
  validateCheckoutCustomerInput,
  type CheckoutCustomerInput,
} from "@/lib/checkout";
import { clearCart, type CartState } from "@/lib/cart";
import { submitOrder } from "@/lib/order-submit";

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
  | { status: "error"; message: string };

type PayNowCreateSuccess = {
  ok: true;
  orderId: string;
  dbOrderId?: string;
  action: string;
  fields: Record<string, string>;
  returnUrl?: string;
};

type PayNowCreateFailure = {
  ok: false;
  error: string;
};

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

function buildPayNowItemDesc(cart: CartState) {
  const names = cart.items.map((item) => item.productName).filter(Boolean);

  if (names.length === 0) {
    return "Cake Order";
  }

  const summary = names.slice(0, 3).join("、");
  return names.length > 3 ? `${summary} 等商品` : summary;
}

async function createPayNowPayment(input: {
  orderNo: string;
  dbOrderId: number;
  amount: number;
  customerName: string;
  phone: string;
  email: string;
  note: string;
  items: CartState["items"];
}): Promise<PayNowCreateSuccess | PayNowCreateFailure> {
  try {
    const res = await fetch("/api/paynow/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: input.orderNo,
        dbOrderId: input.dbOrderId,
        amount: input.amount,
        itemDesc: buildPayNowItemDesc({ items: input.items }),
        customer: {
          name: input.customerName,
          phone: input.phone,
          email: input.email,
        },
        items: input.items,
        note: input.note,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data?.ok || !data?.action || !data?.fields) {
      return {
        ok: false,
        error: data?.error || "CREATE_PAYNOW_PAYMENT_FAILED",
      };
    }

    return {
      ok: true,
      orderId: String(data.orderId ?? ""),
      dbOrderId: data?.dbOrderId ? String(data.dbOrderId) : undefined,
      action: String(data.action),
      fields: data.fields as Record<string, string>,
      returnUrl: data?.returnUrl ? String(data.returnUrl) : undefined,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message
        ? String(error.message)
        : "CREATE_PAYNOW_PAYMENT_FAILED",
    };
  }
}

function submitPostForm(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.style.display = "none";

  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value ?? "";
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

export default function CheckoutCustomerForm({ cart, totalAmount }: Props) {
  const [form, setForm] = useState<CheckoutCustomerInput>({
    customerName: "",
    phone: "",
    email: "",
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
      !validation.errors.email &&
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
        message: "請先完成姓名、電話、Email、取貨日期與取貨時間。",
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

    const result = await submitOrder(orderPayload);

    if (!result.ok) {
      setSubmitState({
        status: "error",
        message: result.error || "建立訂單失敗。",
      });
      return;
    }

    setSubmitState({
      status: "submitting",
      message: "前往付款頁…",
    });

    const payNowResult = await createPayNowPayment({
      orderNo: result.orderNo,
      dbOrderId: result.orderId,
      amount: totalAmount,
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      note: form.note.trim(),
      items: cart.items,
    });

    if (!payNowResult.ok) {
      setSubmitState({
        status: "error",
        message: payNowResult.error || "建立付款失敗。",
      });
      return;
    }

    clearCart();
    submitPostForm(payNowResult.action, payNowResult.fields);
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

        <div className="md:col-span-2">
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
            placeholder="請輸入 Email"
          />
          {validation.errors.email ? (
            <p className="mt-2 text-sm text-red-600">{validation.errors.email}</p>
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
          {submitState.status === "submitting" ? "處理中…" : "前往付款"}
        </button>

        {submitState.status === "error" ? (
          <p className="mt-3 text-sm text-red-600">{submitState.message}</p>
        ) : null}

        {submitState.status === "idle" && !isFormValid ? (
          <p className="mt-3 text-sm text-red-600">
            請先完成姓名、電話、Email、取貨日期與取貨時間。
          </p>
        ) : null}

        {submitState.status === "idle" && isFormValid ? (
          <p className="mt-3 text-sm text-green-700">
            顧客資料已完成，可前往付款。
          </p>
        ) : null}
      </div>
    </section>
  );
}