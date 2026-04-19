import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
const GROUP_ID = process.env.LINE_GROUP_ID ?? "";

async function linePost(path: string, body: unknown) {
  const res = await fetch(`https://api.line.me/v2/bot/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE API ${res.status}: ${text}`);
  }
}

function pushText(to: string, text: string) {
  return linePost("message/push", { to, messages: [{ type: "text", text }] });
}

function pushFlexToAdmin(reservation: {
  id: number;
  customerName: string;
  phone: string;
  adults: number;
  children: number;
  requestDate: string;
  requestTime: string;
  note: string;
}) {
  const people =
    reservation.children > 0
      ? `${reservation.adults} 大人 / ${reservation.children} 小孩`
      : `${reservation.adults} 大人`;

  const bodyContents = [
    { type: "text", text: "📋 新訂位申請", weight: "bold", size: "lg" },
    { type: "text", text: `姓名：${reservation.customerName}`, margin: "md" },
    { type: "text", text: `電話：${reservation.phone}` },
    { type: "text", text: `人數：${people}` },
    { type: "text", text: `時間：${reservation.requestDate} ${reservation.requestTime}` },
    ...(reservation.note
      ? [{ type: "text", text: `備註：${reservation.note}`, wrap: true, color: "#888888" }]
      : []),
  ];

  const flex = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: bodyContents,
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#06C755",
          action: {
            type: "postback",
            label: "✅ 確認訂位",
            data: `action=confirm&id=${reservation.id}`,
          },
        },
        {
          type: "button",
          style: "primary",
          color: "#E53E3E",
          action: {
            type: "postback",
            label: "❌ 拒絕訂位",
            data: `action=reject&id=${reservation.id}`,
          },
        },
      ],
    },
  };

  return linePost("message/push", {
    to: GROUP_ID,
    messages: [{ type: "flex", altText: `新訂位申請：${reservation.customerName}`, contents: flex }],
  });
}

export async function POST(req: NextRequest) {
  try {
    const { rid, lineUserId } = await req.json() as { rid: number; lineUserId: string };

    if (!rid || !lineUserId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const reservation = await prisma.reservation.update({
      where: { id: rid },
      data: { lineUserId },
    });

    // 推送確認訊息給客人：失敗時回傳 ok: false 讓 LIFF 端切到 error 畫面
    try {
      await pushText(
        lineUserId,
        `您好 ${reservation.customerName}！\n\n已收到您的訂位申請：\n📅 ${reservation.requestDate} ${reservation.requestTime}\n👥 ${reservation.adults} 大人${reservation.children > 0 ? ` / ${reservation.children} 小孩` : ""}\n\n我們會盡快確認並回覆您，感謝您的耐心等候 🙏`
      );
    } catch (err) {
      console.error("push to customer failed", err);
      return NextResponse.json({ ok: false, error: "push failed" });
    }

    // 推送 Flex Message 到群組：失敗不影響客人端體驗
    if (GROUP_ID) {
      try {
        await pushFlexToAdmin(reservation);
      } catch (err) {
        console.error("push to admin group failed", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("bind-line error", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
