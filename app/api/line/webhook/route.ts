import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? "";
const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
const ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID ?? "";

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

function pushFlexToAdmin(reservationId: number, body: {
  name: string; phone: string; adults: number; children: number;
  date: string; time: string; note: string;
}) {
  const peopleText = body.children > 0
    ? `${body.adults} 大人 / ${body.children} 小孩`
    : `${body.adults} 大人`;

  const flex = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        { type: "text", text: "📋 新訂位申請", weight: "bold", size: "lg" },
        { type: "separator", margin: "md" },
        { type: "box", layout: "vertical", margin: "md", spacing: "xs", contents: [
          { type: "box", layout: "horizontal", contents: [
            { type: "text", text: "姓名", size: "sm", color: "#888888", flex: 2 },
            { type: "text", text: body.name, size: "sm", flex: 5, wrap: true },
          ]},
          { type: "box", layout: "horizontal", contents: [
            { type: "text", text: "電話", size: "sm", color: "#888888", flex: 2 },
            { type: "text", text: body.phone, size: "sm", flex: 5 },
          ]},
          { type: "box", layout: "horizontal", contents: [
            { type: "text", text: "人數", size: "sm", color: "#888888", flex: 2 },
            { type: "text", text: peopleText, size: "sm", flex: 5 },
          ]},
          { type: "box", layout: "horizontal", contents: [
            { type: "text", text: "時間", size: "sm", color: "#888888", flex: 2 },
            { type: "text", text: `${body.date} ${body.time}`, size: "sm", flex: 5 },
          ]},
          ...(body.note ? [{ type: "box", layout: "horizontal", contents: [
            { type: "text", text: "備註", size: "sm", color: "#888888", flex: 2 },
            { type: "text", text: body.note, size: "sm", flex: 5, wrap: true },
          ]} as const] : []),
        ]},
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#4CAF50",
          action: {
            type: "postback",
            label: "✅ 確認訂位",
            data: `action=confirm&id=${reservationId}`,
            displayText: "確認訂位",
          },
        },
        {
          type: "button",
          style: "secondary",
          action: {
            type: "postback",
            label: "❌ 拒絕訂位",
            data: `action=reject&id=${reservationId}`,
            displayText: "拒絕訂位",
          },
        },
      ],
    },
  };

  return linePost("message/push", {
    to: ADMIN_USER_ID,
    messages: [{ type: "flex", altText: `新訂位申請：${body.name} ${body.date} ${body.time}`, contents: flex }],
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

      // 推通知 + 按鈕給店主
      if (ADMIN_USER_ID) {
        await pushFlexToAdmin(reservation.id, {
          name: reservation.customerName,
          phone: reservation.phone,
          adults: reservation.adults,
          children: reservation.children,
          date: reservation.requestDate,
          time: reservation.requestTime,
          note: reservation.note,
        });
      }
    }

    // ── 店主按按鈕（postback event）──
    if (event.type === "postback" && event.postback?.data) {
      const userId = event.source.userId;

      // 只接受店主的 postback
      if (userId !== ADMIN_USER_ID) continue;

      const params = new URLSearchParams(event.postback.data);
      const action = params.get("action");
      const id = Number(params.get("id"));

      if (!action || !id) continue;

      const reservation = await prisma.reservation.findUnique({ where: { id } });
      if (!reservation) continue;

      const setting = await getSetting();
      const isConfirm = action === "confirm";

      // 更新狀態
      await prisma.reservation.update({
        where: { id },
        data: { status: isConfirm ? "CONFIRMED" : "REJECTED" },
      });

      // 推訊息給客人
      if (reservation.lineUserId) {
        await pushText(
          reservation.lineUserId,
          isConfirm ? setting.confirmMessage : setting.rejectMessage
        );
      }

      // 回覆店主確認
      if (event.replyToken) {
        await replyText(
          event.replyToken,
          isConfirm
            ? `已傳送確認訊息給 ${reservation.customerName} ✅`
            : `已傳送拒絕訊息給 ${reservation.customerName} ❌`
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
