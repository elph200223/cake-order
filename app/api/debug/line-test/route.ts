import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function pushLineTestMessage(message: string) {
  const channelAccessToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
  const groupId = (process.env.LINE_GROUP_ID || "").trim();

  if (!channelAccessToken || !groupId) {
    return {
      ok: false,
      error: "MISSING_LINE_ENV",
      hasToken: Boolean(channelAccessToken),
      hasGroupId: Boolean(groupId),
    };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      to: groupId,
      messages: [
        {
          type: "text",
          text: message.slice(0, 5000),
        },
      ],
    }),
    cache: "no-store",
  });

  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    body: text,
  };
}

export async function GET() {
  try {
    const result = await pushLineTestMessage(
      `cakeorder Vercel 測試通知\n${new Date().toISOString()}`
    );

    console.log("[debug-line-test] result=", result);

    return NextResponse.json(
      {
        ok: result.ok,
        status: "status" in result ? result.status : undefined,
        result,
      },
      { status: result.ok ? 200 : 500 }
    );
  } catch (error: unknown) {
    console.log("[debug-line-test] ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}