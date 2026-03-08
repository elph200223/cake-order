import type { OrderStatusValue } from "@/lib/order-status";

export type OrderItemSummary = {
  id: number;
  name: string;
  price: number;
  qty: number;
};

export type OrderDetail = {
  id: number;
  orderNo: string;
  customer: string;
  phone: string;
  pickupDate: string;
  pickupTime: string;
  note: string;
  status: OrderStatusValue;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItemSummary[];
};