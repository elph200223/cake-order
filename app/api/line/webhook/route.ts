import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? "";
const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

// ── LINE API helpers ────────────────────────────────────────────

async function linePost(path: string, body: unknown) {
  await fetch(`https://api.line.me/v2/bot/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
}

function replyText(replyToken: string, text: string) {
  return linePost("message/reply", {
    replyToken,
    messages: [{ type: "text", text }],
  });
}

function pushText(to: string, text: string) {
  return linePost("message/push", {
    to,
    messages: [{ type: "text", text }],
  });
}

// ── Signature verification ──────────────────────────────────────

function verifySignature(body: string, signature: string): boolean {
  const hash = createHmac("sha256", CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  return hash === signature;
}

// ── Parse pre-filled text to find phone ────────────────────────

function extractPhone(text: string): string | null {
  const match = text.match(/電話[：:]\s*([0-9\-+\s]{7,15})/);
  return match ? match[1].replace(/[\s\-]/g, "") : null;
}

// ── GET setting with defaults ───────────────────────────────────

async function getSetting() {
  const setting = await prisma.reservationSetting.findFirst();
  return {
    confirmMessage: setting?.confirmMessage ?? "您好！您的訂位已確認，期待您的到來！如有任何問題歡迎隨時詢問 🙏",
    rejectMessage: setting?.rejectMessage ?? "您好！非常抱歉，您所希望的時段目前已滿，如有需要請再與我們聯繫，謝謝您的理解 🙏",
  };
}

// ── Main handler ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const payload = JSON.parse(rawBody) as {
    events: {
      type: string;
      replyToken?: string;
      source: { userId: string };
      message?: { type: string; text: string };
      postback?: { data: string };
    }[];
  };

  for (const event of payload.events) {
    // ── 客人傳訊（message event）──
    if (event.type === "message" && event.message?.type === "text") {
      const text = event.message.text;
      const userId = event.source.userId;

      // 特殊指令：回覆自己的 userId
      if (text.trim() === "我的ID") {
        if (event.replyToken) {
          await replyText(event.replyToken, `您的 LINE userId 是：\n${userId}`);
        }
        continue;
      }

      // 只處理帶有訂位申請標記的訊息
      if (!text.includes("【訂位申請】")) continue;

      const phone = extractPhone(text);
      if (!phone) continue;

      // 找最近的 PENDING 訂位（同電話，lineUserId 還是 null）
      const reservation = await prisma.reservation.findFirst({
        where: { phone, status: "PENDING", lineUserId: null },
        orderBy: { createdAt: "desc" },
      });

      if (!reservation) {
        // 找不到對應記錄，還是回覆一下
        if (event.replyToken) {
          await replyText(event.replyToken, "感謝您的訂位申請！我們會盡快確認並回覆您 🙏");
        }
        continue;
      }

      // 綁定 lineUserId
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { lineUserId: userId },
      });

      // 立即回覆客人
      if (event.replyToken) {
        await replyText(event.replyToken, "感謝您的訂位申請！我們會盡快確認並回覆您 🙏");
      }
    }

  }

  return NextResponse.json({ ok: true });
}
