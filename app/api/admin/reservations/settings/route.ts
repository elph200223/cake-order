import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  confirmMessage: "您好！您的訂位已確認，期待您的到來！如有任何問題歡迎隨時詢問 🙏",
  rejectMessage: "您好！非常抱歉，您所希望的時段目前已滿，如有需要請再與我們聯繫，謝謝您的理解 🙏",
};

export async function GET() {
  const setting = await prisma.reservationSetting.findFirst();
  return NextResponse.json({ ok: true, setting: setting ?? { id: null, ...DEFAULTS } });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { confirmMessage?: string; rejectMessage?: string };
    const existing = await prisma.reservationSetting.findFirst();

    const setting = existing
      ? await prisma.reservationSetting.update({
          where: { id: existing.id },
          data: {
            ...(body.confirmMessage !== undefined ? { confirmMessage: body.confirmMessage } : {}),
            ...(body.rejectMessage !== undefined ? { rejectMessage: body.rejectMessage } : {}),
          },
        })
      : await prisma.reservationSetting.create({
          data: {
            confirmMessage: body.confirmMessage ?? DEFAULTS.confirmMessage,
            rejectMessage: body.rejectMessage ?? DEFAULTS.rejectMessage,
          },
        });

    return NextResponse.json({ ok: true, setting });
  } catch (error) {
    console.error("PATCH /api/admin/reservations/settings error", error);
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });
  }
}
