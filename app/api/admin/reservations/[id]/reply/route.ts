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

const DEFAULTS = {
  confirmMessage: "您好！您的訂位已確認，期待您的到來！如有任何問題歡迎隨時詢問 🙏",
  rejectMessage: "您好！非常抱歉，您所希望的時段目前已滿，如有需要請再與我們聯繫，謝謝您的理解 🙏",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reservationId = parseInt(id, 10);
  if (isNaN(reservationId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { action } = await req.json() as { action: "confirm" | "reject" };
  if (action !== "confirm" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const newStatus = action === "confirm" ? "CONFIRMED" : "REJECTED";

  const reservation = await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: newStatus },
  });

  if (reservation.lineUserId) {
    const setting = await prisma.reservationSetting.findFirst();
    const message =
      action === "confirm"
        ? (setting?.confirmMessage ?? DEFAULTS.confirmMessage)
        : (setting?.rejectMessage ?? DEFAULTS.rejectMessage);

    await pushText(reservation.lineUserId, message);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reservationId = parseInt(id, 10);
  if (isNaN(reservationId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    await prisma.reservation.delete({ where: { id: reservationId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE reservation error", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
