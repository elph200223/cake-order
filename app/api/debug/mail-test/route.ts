import { NextResponse } from "next/server";
import { sendPaidOrderEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

function maskEmail(value: string) {
  const trimmed = value.trim();
  const at = trimmed.indexOf("@");

  if (!trimmed || at <= 1) {
    return "***";
  }

  return `${trimmed.slice(0, 2)}***${trimmed.slice(at)}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const to = (url.searchParams.get("to") || process.env.GMAIL_SMTP_USER || "").trim();

    if (!to) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_TEST_EMAIL_RECIPIENT",
          hint: "Use /api/debug/mail-test?to=your@email.com or set GMAIL_SMTP_USER",
        },
        { status: 400 }
      );
    }

    const result = await sendPaidOrderEmail({
      to,
      orderNo: "TEST-EMAIL-0001",
      customer: "測試客人",
      pickupDate: "2026-04-01",
      pickupTime: "15:00",
      totalAmount: 999,
      items: [
        {
          name: "測試蛋糕",
          quantity: 1,
        },
        {
          name: "測試蠟燭",
          quantity: 1,
        },
      ],
    });

    return NextResponse.json(
      {
        ok: true,
        message: "MAIL_TEST_SENT",
        accepted: result.accepted,
        rejected: result.rejected,
        response: result.response,
        envelope: result.envelope,
        recipientMasked: maskEmail(to),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}