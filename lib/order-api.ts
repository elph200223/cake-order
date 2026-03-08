import type { OrderStatusValue } from "@/lib/order-status";
import type { OrderDetail } from "@/lib/order-types";

export async function fetchOrderDetail(orderId: number): Promise<OrderDetail> {
  const res = await fetch(`/api/orders/get?orderId=${orderId}`, {
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok || !data?.ok || !data?.order) {
    throw new Error(data?.error || "ORDER_FETCH_FAILED");
  }

  return data.order as OrderDetail;
}

export async function updateOrderStatus(
  orderId: number,
  status: OrderStatusValue
): Promise<void> {
  const res = await fetch(`/api/orders/${orderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  const data = await res.json();

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "UPDATE_ORDER_STATUS_FAILED");
  }
}