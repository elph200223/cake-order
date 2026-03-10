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
    };

type PrismaOrderUpdateResult = {
  ok: boolean;
  status?: string;
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

    if (sig.tranStatus === "S") {
      try {
        const updated = await prisma.order.update({
          where: { orderNo },
          data: { status: "PAID" },
          select: {
            id: true,
            orderNo: true,
            status: true,
          },
        });

        dbOrderId = String(updated.id);

        prismaOrderUpdate = {
          ok: true,
          status: updated.status,
        };
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
      orderId: orderNo,
      paymentProvider: "paynow",
      paymentStatus,
      transactionId: (p.BuysafeNo || "").trim(),
      note: `paynow_callback ${paymentStatus}`,
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