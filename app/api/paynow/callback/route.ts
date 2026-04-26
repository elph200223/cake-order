import { NextResponse } from "next/server";
import crypto from "crypto";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPaidOrderEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

type VerifyPassCodeResult =
  | {
      ok: true;
      expectedA: string;
      expectedB: string;
      got: string;
      orderNo: string;
      tranStatus: string;
    }
  | {
      ok: false;
    };

type PrismaOrderUpdateResult = {
  ok: boolean;
  status?: string;
  previousStatus?: string;
  error?: string;
};

type GasResponse = {
  ok?: boolean;
  error?: unknown;
  [key: string]: unknown;
};

function sha1HexUpper(input: string) {
  return crypto.createHash("sha1").update(input, "utf8").digest("hex").toUpperCase();
}

function verifyPassCode(p: Record<string, string>): VerifyPassCodeResult {
  const webNo = (process.env.PAYNOW_WEBNO || process.env.PAYNOW_WEB_NO || "").trim();
  const secret = (process.env.PAYNOW_SECRET || process.env.PAYNOW_MEM_CHECKPW || "").trim();

  const orderNo = (p.OrderNo || "").trim();
  const totalPrice = (p.TotalPrice || "").trim();
  const tranStatus = (p.TranStatus || "").trim().toUpperCase();
  const got = (p.PassCode || "").trim().toUpperCase();

  if (!webNo || !secret || !orderNo || !totalPrice || !got) {
    return { ok: false };
  }

  const expectedA = sha1HexUpper(webNo + orderNo + totalPrice + secret + tranStatus);
  const expectedB = sha1HexUpper(webNo + orderNo + totalPrice + secret);

  return {
    ok: got === expectedA || got === expectedB,
    expectedA,
    expectedB,
    got,
    orderNo,
    tranStatus,
  };
}

function parseCallbackPayload(raw: string, contentType: string): Record<string, string> {
  const payload: Record<string, string> = {};

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const sp = new URLSearchParams(raw);
    sp.forEach((v, k) => {
      payload[k] = v;
    });
    return payload;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed === "object" && parsed !== null) {
      Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
        payload[key] = String(value ?? "");
      });
      return payload;
    }
  } catch {
    // fall through to URLSearchParams parsing
  }

  const sp = new URLSearchParams(raw);
  sp.forEach((v, k) => {
    payload[k] = v;
  });

  return payload;
}

function formatCurrency(amount: number) {
  return `NT$ ${amount.toLocaleString("zh-TW")}`;
}

function buildOrderItemsSummary(
  items: Array<{
    name: string;
    quantity: number;
  }>
) {
  if (!items.length) return "（無品項資料）";

  return items.map((item) => `・${item.name} × ${item.quantity}`).join("\n");
}

function buildLineMessage(args: {
  orderNo: string;
  customer: string;
  phone: string;
  pickupDate: string;
  pickupTime: string;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  transactionId: string;
}) {
  const pickupText = [args.pickupDate.trim(), args.pickupTime.trim()].filter(Boolean).join(" ");

  return [
    "【新訂單付款成功】",
    `訂單編號：${args.orderNo}`,
    `姓名：${args.customer.trim() || "未填寫"}`,
    `電話：${args.phone.trim() || "未填寫"}`,
    `取貨時間：${pickupText || "未填寫"}`,
    `訂單金額：${formatCurrency(args.totalAmount)}`,
    `交易編號：${args.transactionId.trim() || "未提供"}`,
    "",
    "品項：",
    buildOrderItemsSummary(args.items),
  ].join("\n");
}

async function pushLineOrderPaidMessage(message: string) {
  const channelAccessToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
  const groupId = (process.env.LINE_GROUP_ID || "").trim();

  if (!channelAccessToken || !groupId) {
    return {
      ok: false,
      skipped: true,
      error: "Missing LINE env",
    };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      to: groupId,
      messages: [
        {
          type: "text",
          text: message.slice(0, 5000),
        },
      ],
    }),
    cache: "no-store",
  });

  const text = await response.text();

  return {
    ok: response.ok,
    skipped: false,
    status: response.status,
    body: text,
  };
}

export async function POST(req: Request) {
  console.log("[paynow-callback] HIT AT", new Date().toISOString());

  try {
    const contentType = req.headers.get("content-type") || "";
    const raw = await req.text();
    const p = parseCallbackPayload(raw, contentType);

    console.log("[paynow-callback] contentType=", contentType);
    console.log("[paynow-callback] raw=", raw);

    const sig = verifyPassCode(p);
    const origin = new URL(req.url).origin;

    if (!sig.ok) {
      console.log("[paynow-callback] INVALID_SIGNATURE", sig);
      return NextResponse.json(
        { ok: false, error: "INVALID_SIGNATURE", sig },
        { status: 200 }
      );
    }

    const orderNo = sig.orderNo;
    const paymentStatus = sig.tranStatus === "S" ? "PAID" : "FAILED";

    let prismaOrderUpdate: PrismaOrderUpdateResult | null = null;
    let dbOrderId = "";
    let shouldNotifyLine = false;
    let shouldNotifyEmail = false;
    let lineMessage = "";
    let emailPayload: {
      to: string;
      orderNo: string;
      customer: string;
      pickupDate: string;
      pickupTime: string;
      totalAmount: number;
      items: Array<{
        name: string;
        quantity: number;
      }>;
    } | null = null;
    // 訂單詳細資料（供 GAS 帳務用）
    let orderDetailsForGas: {
      totalAmount: number;
      pickupDate: string;
      customer: string;
      items: Array<{ name: string; quantity: number; price: number }>;
    } | null = null;

    if (sig.tranStatus === "S") {
      try {
        const existingOrder = await prisma.order.findUnique({
          where: { orderNo },
          select: {
            id: true,
            orderNo: true,
            customer: true,
            phone: true,
            email: true,
            pickupDate: true,
            pickupTime: true,
            totalAmount: true,
            status: true,
            items: {
              select: {
                name: true,
                quantity: true,
              },
              orderBy: { id: "asc" },
            },
          },
        });

        if (!existingOrder) {
          prismaOrderUpdate = {
            ok: false,
            error: "ORDER_NOT_FOUND",
          };
        } else {
          dbOrderId = String(existingOrder.id);

          const updated = await prisma.order.update({
            where: { orderNo },
            data: { status: OrderStatus.PAID },
            select: {
              id: true,
              orderNo: true,
              status: true,
            },
          });

          prismaOrderUpdate = {
            ok: true,
            status: updated.status,
            previousStatus: existingOrder.status,
          };

          shouldNotifyLine = existingOrder.status !== OrderStatus.PAID;
          shouldNotifyEmail =
            existingOrder.status !== OrderStatus.PAID &&
            Boolean(existingOrder.email?.trim());

          if (shouldNotifyLine) {
            lineMessage = buildLineMessage({
              orderNo: existingOrder.orderNo,
              customer: existingOrder.customer,
              phone: existingOrder.phone,
              pickupDate: existingOrder.pickupDate,
              pickupTime: existingOrder.pickupTime,
              totalAmount: existingOrder.totalAmount,
              items: existingOrder.items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
              })),
              transactionId: (p.BuysafeNo || "").trim(),
            });
          }

          if (shouldNotifyEmail) {
            emailPayload = {
              to: existingOrder.email.trim(),
              orderNo: existingOrder.orderNo,
              customer: existingOrder.customer,
              pickupDate: existingOrder.pickupDate,
              pickupTime: existingOrder.pickupTime,
              totalAmount: existingOrder.totalAmount,
              items: existingOrder.items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
              })),
            };
          }

          // 儲存訂單詳細資料供 GAS 帳務使用
          orderDetailsForGas = {
            totalAmount: existingOrder.totalAmount,
            pickupDate:  existingOrder.pickupDate,
            customer:    existingOrder.customer,
            items:       existingOrder.items.map((item) => ({
              name:     item.name,
              quantity: item.quantity,
              price:    item.price,
            })),
          };
        }
      } catch (error: unknown) {
        prismaOrderUpdate = {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    } else {
      try {
        const found = await prisma.order.findUnique({
          where: { orderNo },
          select: { id: true },
        });

        if (found) {
          dbOrderId = String(found.id);
        }
      } catch (error: unknown) {
        console.log("[paynow-callback] find order error", error);
      }

      prismaOrderUpdate = {
        ok: true,
        status: "SKIPPED_NON_SUCCESS",
      };
    }

    const gasUrl = (process.env.GAS_WEBAPP_URL || "").trim();
    const apiKey = (process.env.GAS_ORDER_API_KEY || "").trim();

    if (!gasUrl || !apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing GAS env",
          orderNo,
          paymentStatus,
          prismaOrderUpdate,
        },
        { status: 500 }
      );
    }

    const payload = {
      apiKey,
      orderId:         orderNo,
      paymentProvider: "paynow",
      paymentStatus,
      transactionId:   (p.BuysafeNo || "").trim(),
      note:            `paynow_callback ${paymentStatus}`,
      // 帳務用訂單詳細資料（付款成功時才有）
      ...(orderDetailsForGas && {
        totalAmount: orderDetailsForGas.totalAmount,
        pickupDate:  orderDetailsForGas.pickupDate,
        customer:    orderDetailsForGas.customer,
        items:       orderDetailsForGas.items,
      }),
    };

    const r = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });

    const text = await r.text();

    let gasBody: GasResponse | string = text;
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null) {
        gasBody = parsed as GasResponse;
      }
    } catch {
      gasBody = text;
    }

    console.log("[paynow-callback] gasStatus=", r.status);
    console.log("[paynow-callback] gasBody=", gasBody);

    // 傳送帳務資料給月結 GAS（獨立的 WebApp）
    const accountingGasUrl = (process.env.GAS_ACCOUNTING_URL || "").trim();
    const accountingApiKey  = (process.env.GAS_ACCOUNTING_KEY || "").trim();
    if (accountingGasUrl && accountingApiKey && orderDetailsForGas) {
      try {
        const accountingPayload = {
          apiKey:        accountingApiKey,
          orderId:       orderNo,
          paymentStatus: "PAID",
          totalAmount:   orderDetailsForGas.totalAmount,
          pickupDate:    orderDetailsForGas.pickupDate,
          customer:      orderDetailsForGas.customer,
          items:         orderDetailsForGas.items,
        };
        const ar = await fetch(accountingGasUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(accountingPayload),
        });
        const aText = await ar.text();
        console.log("[paynow-callback] accountingGas status=", ar.status, "body=", aText);
      } catch (err: unknown) {
        console.log("[paynow-callback] accountingGas ERROR", err);
      }
    }

    if (shouldNotifyLine && lineMessage) {
      try {
        const lineResult = await pushLineOrderPaidMessage(lineMessage);
        console.log("[paynow-callback] lineResult=", lineResult);
      } catch (error: unknown) {
        console.log("[paynow-callback] LINE_PUSH_ERROR", error);
      }
    } else {
      console.log("[paynow-callback] line skipped", {
        shouldNotifyLine,
        reason:
          sig.tranStatus !== "S"
            ? "NON_SUCCESS_TRANSACTION"
            : prismaOrderUpdate?.previousStatus === OrderStatus.PAID
              ? "ALREADY_PAID"
              : "NO_MESSAGE",
      });
    }

    if (shouldNotifyEmail && emailPayload) {
      try {
        const emailResult = await sendPaidOrderEmail(emailPayload);
        console.log("[paynow-callback] emailResult=", {
          accepted: emailResult.accepted,
          rejected: emailResult.rejected,
          messageId: emailResult.messageId,
        });
      } catch (error: unknown) {
        console.log("[paynow-callback] EMAIL_SEND_ERROR", error);
      }
    } else {
      console.log("[paynow-callback] email skipped", {
        shouldNotifyEmail,
        reason:
          sig.tranStatus !== "S"
            ? "NON_SUCCESS_TRANSACTION"
            : prismaOrderUpdate?.previousStatus === OrderStatus.PAID
              ? "ALREADY_PAID"
              : "MISSING_EMAIL",
      });
    }

    const target = dbOrderId
      ? `${origin}/pay/result?orderId=${encodeURIComponent(dbOrderId)}`
      : `${origin}/pay/result`;

    return NextResponse.redirect(target, { status: 303 });
  } catch (error: unknown) {
    console.log("[paynow-callback] ERROR", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}