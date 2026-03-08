export type OrderStatusValue =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELLED"
  | string;

export function formatOrderMoney(amount: number) {
  return `NT$ ${amount.toLocaleString("zh-TW")}`;
}

export function formatOrderStatus(status: OrderStatusValue) {
  if (status === "PENDING_PAYMENT") return "待付款";
  if (status === "PAID") return "已付款";
  if (status === "CANCELLED") return "已取消";
  return status;
}

export function formatOrderPickup(date: string, time: string) {
  const d = date?.trim() || "—";
  const t = time?.trim() || "—";
  return `${d} ${t}`;
}

export function formatOrderDate(value: string) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatOrderDateTime(value: string) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}