"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildCheckoutOrderPayload,
  validateCheckoutCustomerInput,
  type CheckoutCustomerInput,
} from "@/lib/checkout";
import { clearCart, type CartState } from "@/lib/cart";
import { submitOrder } from "@/lib/order-submit";
import {
  PICKUP_TIME_OPTIONS,
  evaluatePickupDateRules,
  getEarliestPickupDateString,
  type PickupBlockedDateItem,
} from "@/lib/pickup-rules";
import PickupDateCalendar from "./PickupDateCalendar";
import { createPayNowPayment, submitPostForm } from "./createPayNowPayment";

type Props = {
  cart: CartState;
  totalAmount: number;
};

type SubmitState =
  | { status: "idle"; message: string }
  | { status: "submitting"; message: string }
  | { status: "error"; message: string };

type PickupBlockDatesApiResponse = {
  ok?: boolean;
  blockedDates?: {
    id?: unknown;
    date?: unknown;
    reason?: unknown;
  }[];
  error?: unknown;
};

function formatMoney(price: number) {
  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

function formatOrderErrorMessage(error: string) {
  switch (error) {
    case "PICKUP_DATE_INVALID":
      return "取貨日期格式不正確。";
    case "PICKUP_DATE_LEAD_TIME_REQUIRED":
      return "蛋糕需於兩天前預訂，今天起三天後才可取貨。";
    case "PICKUP_DATE_BLOCKED":
      return "該日期為店休日，無法選擇取貨。";
    case "PICKUP_TIME_NOT_ALLOWED":
      return "該日期的取貨時間不可選。若為店休日隔天，只能選 13:00 後。";
    case "PICKUP_TIME_REQUIRED":
      return "請選擇取貨時間。";
    case "CREATE_ORDER_FAILED":
      return "建立訂單失敗。";
    default:
      return error || "建立訂單失敗。";
  }
}

function isDateBefore(a: string, b: string) {
  return a.localeCompare(b) < 0;
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
  const [blockedDates, setBlockedDates] = useState<PickupBlockedDateItem[]>([]);
  const [pickupRulesLoading, setPickupRulesLoading] = useState(true);
  const [pickupRulesError, setPickupRulesError] = useState("");

  const earliestPickupDate = useMemo(() => getEarliestPickupDateString(), []);

  useEffect(() => {
    let active = true;

    async function loadPickupRules() {
      setPickupRulesLoading(true);
      setPickupRulesError("");

      try {
        const res = await fetch("/api/pickup-block-dates", {
          method: "GET",
          cache: "no-store",
        });

        const raw: unknown = await res.json().catch(() => null);
        const data: PickupBlockDatesApiResponse =
          typeof raw === "object" && raw !== null ? (raw as PickupBlockDatesApiResponse) : {};

        if (!res.ok || data.ok !== true) {
          throw new Error(
            typeof data.error === "string" ? data.error : "LIST_FAILED"
          );
        }

        const nextBlockedDates: PickupBlockedDateItem[] = Array.isArray(data.blockedDates)
          ? data.blockedDates
              .map((item) => ({
                date: typeof item.date === "string" ? item.date : "",
                reason: typeof item.reason === "string" ? item.reason : "",
              }))
              .filter((item) => item.date)
          : [];

        if (!active) return;

        setBlockedDates(nextBlockedDates);
      } catch (error: unknown) {
        if (!active) return;

        setBlockedDates([]);
        setPickupRulesError(
          error instanceof Error ? error.message : "LIST_FAILED"
        );
      } finally {
        if (!active) return;
        setPickupRulesLoading(false);
      }
    }

    void loadPickupRules();

    return () => {
      active = false;
    };
  }, []);

  const validation = useMemo(() => {
    return validateCheckoutCustomerInput(form);
  }, [form]);

  const pickupRuleEvaluation = useMemo(() => {
    if (!form.pickupDate) {
      return null;
    }

    return evaluatePickupDateRules({
      date: form.pickupDate,
      blockedDates,
    });
  }, [blockedDates, form.pickupDate]);

  const availablePickupTimes = useMemo(() => {
    if (!form.pickupDate) {
      return [...PICKUP_TIME_OPTIONS];
    }

    if (!pickupRuleEvaluation || pickupRuleEvaluation.isDateBlocked) {
      return [];
    }

    return pickupRuleEvaluation.availableTimes;
  }, [form.pickupDate, pickupRuleEvaluation]);

  const pickupDateRuleError = useMemo(() => {
    if (!form.pickupDate || !pickupRuleEvaluation?.isDateBlocked) {
      return "";
    }

    return formatOrderErrorMessage(pickupRuleEvaluation.blockedReason);
  }, [form.pickupDate, pickupRuleEvaluation]);

  const pickupTimeRuleError = useMemo(() => {
    if (!form.pickupDate || !form.pickupTime) {
      return "";
    }

    if (availablePickupTimes.includes(form.pickupTime)) {
      return "";
    }

    return "該日期的取貨時間不可選。若為店休日隔天，只能選 13:00 後。";
  }, [availablePickupTimes, form.pickupDate, form.pickupTime]);

  const isFormValid = useMemo(() => {
    return (
      !validation.errors.customerName &&
      !validation.errors.phone &&
      !validation.errors.email &&
      !validation.errors.pickupDate &&
      !validation.errors.pickupTime &&
      !pickupDateRuleError &&
      !pickupTimeRuleError
    );
  }, [pickupDateRuleError, pickupTimeRuleError, validation]);

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

  function updatePickupDate(value: string) {
    setSubmitState({ status: "idle", message: "" });

    if (isDateBefore(value, earliestPickupDate)) {
      setForm((prev) => ({
        ...prev,
        pickupDate: "",
        pickupTime: "",
      }));
      return;
    }

    const evaluation = value
      ? evaluatePickupDateRules({
          date: value,
          blockedDates,
        })
      : null;

    setForm((prev) => {
      const nextPickupTime =
        evaluation &&
        !evaluation.isDateBlocked &&
        evaluation.availableTimes.includes(prev.pickupTime)
          ? prev.pickupTime
          : "";

      return {
        ...prev,
        pickupDate: value,
        pickupTime: nextPickupTime,
      };
    });
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
        message: formatOrderErrorMessage(result.error),
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
    <section className="bg-transparent p-0">
      <div className="pb-3">
        <h2 className="text-base font-semibold text-neutral-900">顧客資料</h2>
        <p className="mt-1 text-xs text-neutral-500">請填寫取貨資訊並送出訂單。</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="md:col-span-1">
          <label
            htmlFor="customerName"
            className="mb-1.5 block text-sm font-medium text-neutral-700"
          >
            姓名
          </label>
          <input
            id="customerName"
            type="text"
            value={form.customerName}
            onChange={(e) => updateField("customerName", e.target.value)}
            className="w-full bg-white px-3 py-2.5 text-sm outline-none ring-1 ring-inset ring-neutral-300 transition focus:ring-neutral-900"
            placeholder="請輸入訂購人姓名"
          />
          {validation.errors.customerName ? (
            <p className="mt-1.5 text-sm text-red-600">
              {validation.errors.customerName}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-1">
          <label
            htmlFor="phone"
            className="mb-1.5 block text-sm font-medium text-neutral-700"
          >
            電話
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className="w-full bg-white px-3 py-2.5 text-sm outline-none ring-1 ring-inset ring-neutral-300 transition focus:ring-neutral-900"
            placeholder="請輸入聯絡電話"
          />
          {validation.errors.phone ? (
            <p className="mt-1.5 text-sm text-red-600">{validation.errors.phone}</p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-neutral-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full bg-white px-3 py-2.5 text-sm outline-none ring-1 ring-inset ring-neutral-300 transition focus:ring-neutral-900"
            placeholder="請輸入 Email"
          />
          {validation.errors.email ? (
            <p className="mt-1.5 text-sm text-red-600">{validation.errors.email}</p>
          ) : null}
        </div>

        <PickupDateCalendar
          value={form.pickupDate}
          blockedDates={blockedDates}
          loading={pickupRulesLoading}
          loadError={pickupRulesError}
          errorMessage={pickupDateRuleError}
          fallbackErrorMessage={validation.errors.pickupDate}
          onChange={updatePickupDate}
        />

        <div className="md:col-span-1">
          <label
            htmlFor="pickupTime"
            className="mb-1.5 block text-sm font-medium text-neutral-700"
          >
            取貨時間
          </label>
          <select
            id="pickupTime"
            value={form.pickupTime}
            onChange={(e) => updateField("pickupTime", e.target.value)}
            className="w-full bg-white px-3 py-2.5 text-sm outline-none ring-1 ring-inset ring-neutral-300 transition focus:ring-neutral-900"
            disabled={!form.pickupDate || !!pickupDateRuleError}
          >
            <option value="">請選擇取貨時間</option>
            {availablePickupTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-neutral-500">
            可選時段為 13:00～20:00；店休日隔天僅提供 13:00 後取貨。
          </p>
          {pickupRuleEvaluation?.timeRestrictedAfterHoliday && !pickupDateRuleError ? (
            <p className="mt-1.5 text-sm text-amber-700">
              此日期為店休日隔天，僅可選 13:00 後時段。
            </p>
          ) : null}
          {pickupTimeRuleError ? (
            <p className="mt-1.5 text-sm text-red-600">{pickupTimeRuleError}</p>
          ) : validation.errors.pickupTime ? (
            <p className="mt-1.5 text-sm text-red-600">
              {validation.errors.pickupTime}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-1">
          <div className="bg-neutral-50 px-3 py-2.5">
            <p className="text-xs text-neutral-500">目前訂單金額</p>
            <p className="mt-1 text-lg font-bold text-neutral-950">
              {formatMoney(totalAmount)}
            </p>
          </div>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="note"
            className="mb-1.5 block text-sm font-medium text-neutral-700"
          >
            備註
          </label>
          <textarea
            id="note"
            value={form.note}
            onChange={(e) => updateField("note", e.target.value)}
            className="min-h-[96px] w-full bg-white px-3 py-2.5 text-sm outline-none ring-1 ring-inset ring-neutral-300 transition focus:ring-neutral-900"
            placeholder="備註請先與我們討論，單方面要求不予理會。"
          />
        </div>
      </div>

      <div className="mt-4 bg-neutral-50 p-3">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!isFormValid || submitState.status === "submitting"}
        >
          {submitState.status === "submitting" ? "處理中…" : "前往付款"}
        </button>

        {submitState.status === "error" ? (
          <p className="mt-2 text-sm text-red-600">{submitState.message}</p>
        ) : null}

        {submitState.status === "idle" && !isFormValid ? (
          <p className="mt-2 text-sm text-red-600">
            請先完成姓名、電話、Email、合法的取貨日期與取貨時間。
          </p>
        ) : null}

        {submitState.status === "idle" && isFormValid ? (
          <p className="mt-2 text-sm text-green-700">
            顧客資料已完成，可前往付款。
          </p>
        ) : null}
      </div>
    </section>
  );
}