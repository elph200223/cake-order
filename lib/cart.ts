export const CART_STORAGE_KEY = "cakeorder_cart_v1";

export type CartOptionItem = {
  optionGroupId: number;
  optionGroupName: string;
  optionId: number;
  optionName: string;
  priceDelta: number;
};

export type CartItem = {
  id: string;
  productId: number;
  productName: string;
  basePrice: number;
  quantity: number;
  options: CartOptionItem[];
  subtotal: number;
};

export type CartState = {
  items: CartItem[];
};

export type AddCartItemInput = {
  productId: number;
  productName: string;
  basePrice: number;
  quantity: number;
  options: CartOptionItem[];
  subtotal: number;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function createCartItemId(input: AddCartItemInput) {
  const optionKey = input.options
    .map((option) => `${option.optionGroupId}:${option.optionId}`)
    .sort()
    .join("|");

  return `${input.productId}__${optionKey || "no-options"}`;
}

export function createCartItem(input: AddCartItemInput): CartItem {
  return {
    id: createCartItemId(input),
    productId: input.productId,
    productName: input.productName,
    basePrice: input.basePrice,
    quantity: input.quantity,
    options: input.options,
    subtotal: input.subtotal,
  };
}

export function readCart(): CartState {
  if (!isBrowser()) {
    return { items: [] };
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return { items: [] };
    }

    const parsed = JSON.parse(raw) as CartState;

    if (!parsed || !Array.isArray(parsed.items)) {
      return { items: [] };
    }

    return {
      items: parsed.items,
    };
  } catch {
    return { items: [] };
  }
}

export function writeCart(cart: CartState) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

export function addCartItem(input: AddCartItemInput): CartState {
  const cart = readCart();
  const newItem = createCartItem(input);

  const existingIndex = cart.items.findIndex((item) => item.id === newItem.id);

  if (existingIndex >= 0) {
    const existing = cart.items[existingIndex];

    const merged: CartItem = {
      ...existing,
      quantity: existing.quantity + input.quantity,
      subtotal: existing.subtotal + input.subtotal,
    };

    const items = [...cart.items];
    items[existingIndex] = merged;

    const nextCart = { items };
    writeCart(nextCart);
    return nextCart;
  }

  const nextCart = {
    items: [...cart.items, newItem],
  };

  writeCart(nextCart);
  return nextCart;
}

export function clearCart() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(CART_STORAGE_KEY);
}

export function getCartItemCount(cart: CartState) {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartTotalAmount(cart: CartState) {
  return cart.items.reduce((sum, item) => sum + item.subtotal, 0);
}