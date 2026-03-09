import type { CartItem, CartState } from "@/lib/cart";

export type CheckoutCustomerInput = {
  customerName: string;
  phone: string;
  email: string;
  pickupDate: string;
  pickupTime: string;
  note: string;
};

export type CheckoutOrderItemPayload = {
  productId: number;
  productName: string;
  basePrice: number;
  quantity: number;
  subtotal: number;
  options: {
    optionGroupId: number;
    optionGroupName: string;
    optionId: number;
    optionName: string;
    priceDelta: number;
  }[];
};

export type CheckoutOrderPayload = {
  customerName: string;
  phone: string;
  email: string;
  pickupDate: string;
  pickupTime: string;
  note: string;
  totalAmount: number;
  items: CheckoutOrderItemPayload[];
};

function normalizeString(value: string) {
  return value.trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateCheckoutCustomerInput(input: CheckoutCustomerInput) {
  const customerName = normalizeString(input.customerName);
  const phone = normalizeString(input.phone);
  const email = normalizeString(input.email);
  const pickupDate = normalizeString(input.pickupDate);
  const pickupTime = normalizeString(input.pickupTime);
  const note = input.note.trim();

  return {
    customerName,
    phone,
    email,
    pickupDate,
    pickupTime,
    note,
    errors: {
      customerName: customerName ? "" : "請輸入姓名",
      phone: phone ? "" : "請輸入電話",
      email: !email
        ? "請輸入 Email"
        : !isValidEmail(email)
          ? "Email 格式不正確"
          : "",
      pickupDate: pickupDate ? "" : "請選擇取貨日期",
      pickupTime: pickupTime ? "" : "請選擇取貨時間",
    },
  };
}

export function isCheckoutCustomerInputValid(input: CheckoutCustomerInput) {
  const result = validateCheckoutCustomerInput(input);

  return (
    !result.errors.customerName &&
    !result.errors.phone &&
    !result.errors.email &&
    !result.errors.pickupDate &&
    !result.errors.pickupTime
  );
}

export function buildCheckoutOrderPayload(
  cart: CartState,
  customer: CheckoutCustomerInput
): CheckoutOrderPayload {
  const normalized = validateCheckoutCustomerInput(customer);

  const totalAmount = cart.items.reduce((sum, item) => sum + item.subtotal, 0);

  const items: CheckoutOrderItemPayload[] = cart.items.map((item: CartItem) => ({
    productId: item.productId,
    productName: item.productName,
    basePrice: item.basePrice,
    quantity: item.quantity,
    subtotal: item.subtotal,
    options: item.options.map((option) => ({
      optionGroupId: option.optionGroupId,
      optionGroupName: option.optionGroupName,
      optionId: option.optionId,
      optionName: option.optionName,
      priceDelta: option.priceDelta,
    })),
  }));

  return {
    customerName: normalized.customerName,
    phone: normalized.phone,
    email: normalized.email,
    pickupDate: normalized.pickupDate,
    pickupTime: normalized.pickupTime,
    note: normalized.note,
    totalAmount,
    items,
  };
}