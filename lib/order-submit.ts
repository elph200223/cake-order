import type { CheckoutOrderPayload } from "@/lib/checkout";

export type SubmitOrderSuccess = {
  ok: true;
  orderNo: string;
};

export type SubmitOrderFailure = {
  ok: false;
  error: string;
};

export type SubmitOrderResult = SubmitOrderSuccess | SubmitOrderFailure;

export async function submitOrder(
  payload: CheckoutOrderPayload
): Promise<SubmitOrderResult> {
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || "CREATE_ORDER_FAILED",
      };
    }

    return {
      ok: true,
      orderNo: data?.order?.orderNo ?? "",
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message ? String(error.message) : "CREATE_ORDER_FAILED",
    };
  }
}