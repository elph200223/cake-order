export const CART_STORAGE_KEY = "cakeorder_cart_v1";

export type CartOptionItem = {
  optionGroupId: number;
  optionGroupName: string;
  optionId: number;
  optionName: string;
  priceDelta: number;
  priceType?: string;
  priceMultiplier?: number;
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

export function createCartItemId(input: Pick<AddCartItemInput, "productId" | "options">) {
  const optionKey = input.options
    .map((option) => `${option.optionGroupId}:${option.optionId}`)
    .sort()
    .join("|");

  return `${input.productId}__${optionKey || "no-options"}`;
}

function getUnitPrice(input: Pick<AddCartItemInput, "basePrice" | "options">) {
  let multiplierProduct = 1.0;
  let deltaSum = 0;

  for (const option of input.options) {
    if (option.priceType === "multiplier") {
      multiplierProduct *= option.priceMultiplier ?? 1;
    } else {
      deltaSum += option.priceDelta;
    }
  }

  return Math.round(input.basePrice * multiplierProduct) + deltaSum;
}

function normalizeQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.floor(quantity));
}

function buildSubtotal(unitPrice: number, quantity: number) {
  return unitPrice * quantity;
}

export function createCartItem(input: AddCartItemInput): CartItem {
  const normalizedQuantity = normalizeQuantity(input.quantity);
  const unitPrice = getUnitPrice(input);

  return {
    id: createCartItemId(input),
    productId: input.productId,
    productName: input.productName,
    basePrice: input.basePrice,
    quantity: normalizedQuantity,
    options: input.options,
    subtotal: buildSubtotal(unitPrice, normalizedQuantity),
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

export function hasCartItem(input: Pick<AddCartItemInput, "productId" | "options">) {
  const cart = readCart();
  const itemId = createCartItemId(input);
  return cart.items.some((item) => item.id === itemId);
}

export function addCartItem(input: AddCartItemInput): CartState {
  const cart = readCart();
  const newItem = createCartItem(input);
  const unitPrice = getUnitPrice(input);

  const existingIndex = cart.items.findIndex((item) => item.id === newItem.id);

  if (existingIndex >= 0) {
    const existing = cart.items[existingIndex];
    const nextQuantity = existing.quantity + normalizeQuantity(input.quantity);

    const merged: CartItem = {
      ...existing,
      quantity: nextQuantity,
      subtotal: buildSubtotal(unitPrice, nextQuantity),
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

export function setCartItemQuantity(itemId: string, quantity: number): CartState {
  const cart = readCart();
  const normalizedQuantity = Math.floor(quantity);

  if (normalizedQuantity <= 0) {
    return removeCartItem(itemId);
  }

  const items = cart.items.map((item) => {
    if (item.id !== itemId) return item;

    const unitPrice = getUnitPrice(item);

    return {
      ...item,
      quantity: normalizedQuantity,
      subtotal: buildSubtotal(unitPrice, normalizedQuantity),
    };
  });

  const nextCart = { items };
  writeCart(nextCart);
  return nextCart;
}

export function incrementCartItemQuantity(itemId: string): CartState {
  const cart = readCart();
  const target = cart.items.find((item) => item.id === itemId);

  if (!target) {
    return cart;
  }

  return setCartItemQuantity(itemId, target.quantity + 1);
}

export function decrementCartItemQuantity(itemId: string): CartState {
  const cart = readCart();
  const target = cart.items.find((item) => item.id === itemId);

  if (!target) {
    return cart;
  }

  return setCartItemQuantity(itemId, target.quantity - 1);
}

export function removeCartItem(itemId: string): CartState {
  const cart = readCart();

  const nextCart: CartState = {
    items: cart.items.filter((item) => item.id !== itemId),
  };

  writeCart(nextCart);
  return nextCart;
}

export function clearCart(): CartState {
  const nextCart: CartState = { items: [] };

  if (!isBrowser()) {
    return nextCart;
  }

  window.localStorage.removeItem(CART_STORAGE_KEY);
  return nextCart;
}

export function getCartItemCount(cart: CartState) {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartTotalAmount(cart: CartState) {
  return cart.items.reduce((sum, item) => sum + item.subtotal, 0);
}