import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCustomerMessage, pushFlexToAdmin } from "@/lib/reservation-messages";

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

export async function POST(req: NextRequest) {
  try {
    const { rid, lineUserId, isFriend } = (await req.json()) as {
      rid: number;
      lineUserId: string;
      isFriend: boolean;
    };

    if (!rid || !lineUserId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const reservation = await prisma.reservation.update({
      where: { id: rid },
      data: { lineUserId },
    });

    if (isFriend) {
      // 立即 push 客人訊息；失敗時設 pendingFollowPush 備援
      let pushed = false;
      try {
        await pushText(lineUserId, buildCustomerMessage(reservation));
        pushed = true;
      } catch (err) {
        console.error("push to customer failed", err);
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { pendingFollowPush: true },
        });
        return NextResponse.json({ ok: true, pushed: false });
      }

      // admin group push 失敗不影響客人端體驗
      if (GROUP_ID) {
        try {
          await pushFlexToAdmin(reservation, ACCESS_TOKEN, GROUP_ID);
        } catch (err) {
          console.error("push to admin group failed", err);
        }
      }

      return NextResponse.json({ ok: true, pushed });
    } else {
      // 非好友：只標記 pending，由 follow 事件推送
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { pendingFollowPush: true },
      });
      return NextResponse.json({ ok: true, pushed: false });
    }
  } catch (error) {
    console.error("bind-line error", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
