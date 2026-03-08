export const ORDER_STATUS_VALUES = [
    "PENDING_PAYMENT",
    "PAID",
    "CANCELLED",
  ] as const;
  
  export type OrderStatusValue = (typeof ORDER_STATUS_VALUES)[number];
  
  export type OrderStatusFilter = "ALL" | OrderStatusValue;
  
  export const ORDER_STATUS_OPTIONS: Array<{
    value: OrderStatusValue;
    label: string;
  }> = [
    { value: "PENDING_PAYMENT", label: "待付款" },
    { value: "PAID", label: "已付款" },
    { value: "CANCELLED", label: "已取消" },
  ];
  
  export function isOrderStatusValue(value: string): value is OrderStatusValue {
    return ORDER_STATUS_VALUES.includes(value as OrderStatusValue);
  }
  
  export function normalizeOrderStatusFilter(value: string): OrderStatusFilter {
    if (isOrderStatusValue(value)) return value;
    return "ALL";
  }
  
  export function getOrderStatusLabel(status: string) {
    const match = ORDER_STATUS_OPTIONS.find((item) => item.value === status);
    return match?.label || status;
  }