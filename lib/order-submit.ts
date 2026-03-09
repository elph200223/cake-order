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

type CreateOrderApiResponse = {
  ok?: boolean;
  error?: unknown;
  order?: {
    id?: unknown;
    orderNo?: unknown;
    status?: unknown;
  };
};

function isOrderStatusValue(value: unknown): value is OrderStatusValue {
  return (
    value === "PENDING_PAYMENT" ||
    value === "PENDING" ||
    value === "PAID" ||
    value === "FAILED" ||
    value === "CANCELLED"
  );
}

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

    const raw: unknown = await res.json().catch(() => null);
    const data: CreateOrderApiResponse =
      typeof raw === "object" && raw !== null ? (raw as CreateOrderApiResponse) : {};

    if (!res.ok || data.ok !== true || !data.order) {
      return {
        ok: false,
        error:
          typeof data.error === "string" ? data.error : "CREATE_ORDER_FAILED",
      };
    }

    const orderId = Number(data.order.id);
    const orderNo =
      typeof data.order.orderNo === "string" ? data.order.orderNo : "";
    const status = isOrderStatusValue(data.order.status)
      ? data.order.status
      : "PENDING_PAYMENT";

    if (!Number.isFinite(orderId) || !orderNo) {
      return {
        ok: false,
        error: "CREATE_ORDER_FAILED",
      };
    }

    return {
      ok: true,
      orderId,
      orderNo,
      status,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "CREATE_ORDER_FAILED",
    };
  }
}