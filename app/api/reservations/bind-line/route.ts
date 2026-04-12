import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

async function pushText(to: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
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

    // 推送確認訊息給客人
    await pushText(lineUserId, `您好 ${reservation.customerName}！\n\n已收到您的訂位申請：\n📅 ${reservation.requestDate} ${reservation.requestTime}\n👥 ${reservation.adults} 大人${reservation.children > 0 ? ` / ${reservation.children} 小孩` : ""}\n\n我們會盡快確認並回覆您，感謝您的耐心等候 🙏`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("bind-line error", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
