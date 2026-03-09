import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

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
      expectedA?: string;
      expectedB?: string;
      got?: string;
      orderNo?: string;
      tranStatus?: string;
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
    return { ok: false, orderNo, tranStatus, got };
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

function parsePayload(raw: string, contentType: string): Record<string, string> {
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
      Object.entries(parsed as Record<string, unknown>).forEach(([k, v]) => {
        payload[k] = String(v ?? "");
      });
      return payload;
    }
  } catch {
    // ignore
  }

  const sp = new URLSearchParams(raw);
  sp.forEach((v, k) => {
    payload[k] = v;
  });

  return payload;
}

async function syncGas(
  orderNo: string,
  paymentStatus: "PAID" | "FAILED",
  transactionId: string
) {
  const gasUrl = (process.env.GAS_WEBAPP_URL || "").trim();
  const apiKey = (process.env.GAS_ORDER_API_KEY || "").trim();

  if (!gasUrl || !apiKey) return;

  const payload = {
    apiKey,
    orderId: orderNo,
    paymentProvider: "paynow",
    paymentStatus,
    transactionId,
    note: `paynow_3d_return ${paymentStatus}`,
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

  console.log("[paynow-3d-return] gasStatus=", r.status);
  console.log("[paynow-3d-return] gasBody=", gasBody);
}

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;

  try {
    const contentType = req.headers.get("content-type") || "";
    const raw = await req.text();
    const p = parsePayload(raw, contentType);

    console.log("[paynow-3d-return] HIT AT", new Date().toISOString());
    console.log("[paynow-3d-return] contentType=", contentType);
    console.log("[paynow-3d-return] raw=", raw);

    const sig = verifyPassCode(p);
    console.log("[paynow-3d-return] sig=", sig);

    const orderNo = (p.OrderNo || "").trim();
    const tranStatus = (p.TranStatus || "").trim().toUpperCase();
    const transactionId = (p.BuysafeNo || "").trim();

    let dbOrderId = "";
    const paymentStatus: "PAID" | "FAILED" = tranStatus === "S" ? "PAID" : "FAILED";
    const prismaStatus: "PAID" | "CANCELLED" = tranStatus === "S" ? "PAID" : "CANCELLED";

    if (orderNo) {
      const order = await prisma.order.findUnique({
        where: { orderNo },
        select: { id: true, status: true },
      });

      if (order) {
        dbOrderId = String(order.id);

        if (sig.ok) {
          try {
            await prisma.order.update({
              where: { orderNo },
              data: {
                status: prismaStatus,
              },
            });

            console.log(
              "[paynow-3d-return] prisma updated",
              orderNo,
              "=>",
              prismaStatus
            );
          } catch (error: unknown) {
            console.log("[paynow-3d-return] prisma update error", error);
          }

          try {
            await syncGas(orderNo, paymentStatus, transactionId);
          } catch (error: unknown) {
            console.log("[paynow-3d-return] gas sync error", error);
          }
        } else {
          console.log("[paynow-3d-return] INVALID_SIGNATURE");
        }
      } else {
        console.log("[paynow-3d-return] order not found:", orderNo);
      }
    } else {
      console.log("[paynow-3d-return] missing OrderNo");
    }

    const target = dbOrderId
      ? `${origin}/pay/result?orderId=${encodeURIComponent(dbOrderId)}`
      : `${origin}/pay/result`;

    return NextResponse.redirect(target, { status: 303 });
  } catch (error: unknown) {
    console.log("[paynow-3d-return] ERROR", error);
    return NextResponse.redirect(`${origin}/pay/result`, { status: 303 });
  }
}