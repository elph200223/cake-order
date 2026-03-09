import type { CheckoutOrderPayload } from "@/lib/checkout";
import type { OrderStatusValue } from "@/lib/order-status";

export type SubmitOrderSuccess = {
  ok: true;
  orderId: number;
  orderNo: string;
  status: OrderStatusValue;
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

    if (!res.ok || !data?.ok || !data?.order) {
      return {
        ok: false,
        error: data?.error || "CREATE_ORDER_FAILED",
      };
    }

    return {
      ok: true,
      orderId: Number(data.order.id),
      orderNo: String(data.order.orderNo ?? ""),
      status: data.order.status,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message ? String(error.message) : "CREATE_ORDER_FAILED",
    };
  }
}