import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function sha1HexUpper(input: string) {
  return crypto.createHash("sha1").update(input, "utf8").digest("hex").toUpperCase();
}

function verifyPassCode(p: Record<string, string>) {
  const webNo = (process.env.PAYNOW_WEBNO || process.env.PAYNOW_WEB_NO || "").trim();
  const secret = (process.env.PAYNOW_SECRET || process.env.PAYNOW_MEM_CHECKPW || "").trim();

  const orderNo = (p.OrderNo || "").trim();
  const totalPrice = (p.TotalPrice || "").trim();
  const tranStatus = (p.TranStatus || "").trim().toUpperCase();
  const got = (p.PassCode || "").trim().toUpperCase();

  if (!webNo || !secret || !orderNo || !totalPrice || !got) {
    return { ok: false as const };
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

export async function POST(req: Request) {
  console.log("[paynow-callback] HIT AT", new Date().toISOString());

  try {
    const contentType = req.headers.get("content-type") || "";
    const raw = await req.text();

    const p: Record<string, string> = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const sp = new URLSearchParams(raw);
      sp.forEach((v, k) => {
        p[k] = v;
      });
    } else {
      try {
        const j = JSON.parse(raw);
        Object.keys(j || {}).forEach((k) => {
          p[k] = String((j as Record<string, unknown>)[k] ?? "");
        });
      } catch {
        const sp = new URLSearchParams(raw);
        sp.forEach((v, k) => {
          p[k] = v;
        });
      }
    }

    console.log("[paynow-callback] contentType=", contentType);
    console.log("[paynow-callback] raw=", raw);

    const sig = verifyPassCode(p);

    if (!sig.ok) {
      console.log("[paynow-callback] INVALID_SIGNATURE", sig);
      return NextResponse.json(
        { ok: false, error: "INVALID_SIGNATURE", sig },
        { status: 200 }
      );
    }

    const orderNo = sig.orderNo;
    const paymentStatus = sig.tranStatus === "S" ? "PAID" : "FAILED";

    let prismaOrderUpdate: {
      ok: boolean;
      status?: string;
      error?: string;
    } | null = null;

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

        prismaOrderUpdate = {
          ok: true,
          status: updated.status,
        };
      } catch (e: any) {
        prismaOrderUpdate = {
          ok: false,
          error: e?.message || String(e),
        };
      }
    } else {
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

    let gasJson: any = null;
    try {
      gasJson = JSON.parse(text);
    } catch {}

    return NextResponse.json(
      {
        ok: true,
        orderNo,
        paymentStatus,
        prismaOrderUpdate,
        gasStatus: r.status,
        gasBody: gasJson ?? text,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.log("[paynow-callback] ERROR", e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}