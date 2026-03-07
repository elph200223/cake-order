import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId") || "";

  // placeholder: later read from DB / PayNow status
  return NextResponse.json({ ok: true, orderId, status: "UNKNOWN" });
}