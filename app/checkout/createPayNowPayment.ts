import type { CartState } from "@/lib/cart";

export type PayNowCreateSuccess = {
  ok: true;
  orderId: string;
  dbOrderId?: string;
  action: string;
  fields: Record<string, string>;
  returnUrl?: string;
};

export type PayNowCreateFailure = {
  ok: false;
  error: string;
};

export type PayNowCreateResponse = PayNowCreateSuccess | PayNowCreateFailure;

type PayNowCreateApiResponse = {
  ok?: boolean;
  orderId?: unknown;
  dbOrderId?: unknown;
  action?: unknown;
  fields?: unknown;
  returnUrl?: unknown;
  error?: unknown;
};

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every((item) => typeof item === "string");
}

function buildPayNowItemDesc(cart: CartState) {
  const names = cart.items.map((item) => item.productName).filter(Boolean);

  if (names.length === 0) {
    return "Cake Order";
  }

  const summary = names.slice(0, 3).join("、");
  return names.length > 3 ? `${summary} 等商品` : summary;
}

export async function createPayNowPayment(input: {
  orderNo: string;
  dbOrderId: number;
  amount: number;
  customerName: string;
  phone: string;
  email: string;
  note: string;
  items: CartState["items"];
}): Promise<PayNowCreateResponse> {
  try {
    const res = await fetch("/api/paynow/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: input.orderNo,
        dbOrderId: input.dbOrderId,
        amount: input.amount,
        itemDesc: buildPayNowItemDesc({ items: input.items }),
        customer: {
          name: input.customerName,
          phone: input.phone,
          email: input.email,
        },
        items: input.items,
        note: input.note,
      }),
    });

    const raw: unknown = await res.json().catch(() => null);
    const data: PayNowCreateApiResponse =
      typeof raw === "object" && raw !== null ? (raw as PayNowCreateApiResponse) : {};

    if (
      !res.ok ||
      data.ok !== true ||
      typeof data.action !== "string" ||
      !isRecordOfStrings(data.fields)
    ) {
      return {
        ok: false,
        error:
          typeof data.error === "string"
            ? data.error
            : "CREATE_PAYNOW_PAYMENT_FAILED",
      };
    }

    return {
      ok: true,
      orderId: typeof data.orderId === "string" ? data.orderId : "",
      dbOrderId:
        typeof data.dbOrderId === "string" ? data.dbOrderId : undefined,
      action: data.action,
      fields: data.fields,
      returnUrl:
        typeof data.returnUrl === "string" ? data.returnUrl : undefined,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "CREATE_PAYNOW_PAYMENT_FAILED",
    };
  }
}

export function submitPostForm(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.style.display = "none";

  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value ?? "";
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}