import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CreateReservationPayload = {
  customerName: string;
  phone: string;
  adults: number;
  children: number;
  requestDate: string;
  requestTime: string;
  note?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateReservationPayload;

    const customerName = body.customerName?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const adults = Number(body.adults) || 1;
    const children = Number(body.children) || 0;
    const requestDate = body.requestDate?.trim() ?? "";
    const requestTime = body.requestTime?.trim() ?? "";
    const note = body.note?.trim() ?? "";

    if (!customerName) return NextResponse.json({ ok: false, error: "CUSTOMER_NAME_REQUIRED" }, { status: 400 });
    if (!phone) return NextResponse.json({ ok: false, error: "PHONE_REQUIRED" }, { status: 400 });
    if (!requestDate) return NextResponse.json({ ok: false, error: "DATE_REQUIRED" }, { status: 400 });
    if (!requestTime) return NextResponse.json({ ok: false, error: "TIME_REQUIRED" }, { status: 400 });

    const reservation = await prisma.reservation.create({
      data: { customerName, phone, adults, children, requestDate, requestTime, note },
    });

    return NextResponse.json({ ok: true, reservation });
  } catch (error) {
    console.error("POST /api/reservations/create error", error);
    return NextResponse.json({ ok: false, error: "CREATE_FAILED" }, { status: 500 });
  }
}
