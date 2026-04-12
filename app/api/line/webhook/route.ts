import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? "";
const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
const GROUP_ID = process.env.LINE_GROUP_ID ?? "";

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
      source: { type: string; userId: string; groupId?: string; roomId?: string };
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

      // 特殊指令：回覆群組 ID
      if (text.trim() === "群組ID") {
        const groupId = event.source.groupId ?? event.source.roomId ?? "（非群組環境）";
        if (event.replyToken) {
          await replyText(event.replyToken, `群組 ID 是：\n${groupId}\n來源類型：${event.source.type}`);
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

    // ── 店主按確認／拒絕按鈕（postback event）──
    if (event.type === "postback" && event.postback?.data) {
      const userId = event.source.userId;

      // 只接受從群組來的 postback
      if (GROUP_ID && event.source.groupId !== GROUP_ID) continue;

      const params = new URLSearchParams(event.postback.data);
      const action = params.get("action");
      const id = Number(params.get("id"));

      if (!action || !id || (action !== "confirm" && action !== "reject")) continue;

      // 檢查是否已處理
      const existing = await prisma.reservation.findUnique({ where: { id } });
      if (!existing) continue;
      if (existing.status !== "PENDING") {
        const alreadyLabel = existing.status === "CONFIRMED" ? "已確認" : "已拒絕";
        if (event.replyToken) {
          await replyText(event.replyToken, `此訂位已處理（${alreadyLabel}），不會重複傳送訊息。`);
        }
        continue;
      }

      const newStatus = action === "confirm" ? "CONFIRMED" : "REJECTED";
      const { confirmMessage, rejectMessage } = await getSetting();

      const reservation = await prisma.reservation.update({
        where: { id },
        data: { status: newStatus },
      });

      // 推送回覆給客人
      if (reservation.lineUserId) {
        const message = action === "confirm" ? confirmMessage : rejectMessage;
        await pushText(reservation.lineUserId, message);
      }

      // 告知店主已送出
      if (event.replyToken) {
        const done = action === "confirm" ? "已傳送確認訊息給客人 ✅" : "已傳送拒絕訊息給客人 ❌";
        await replyText(event.replyToken, done);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
