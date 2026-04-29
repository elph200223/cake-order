import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushFlexToAdmin } from "@/lib/reservation-messages";
import { upsertCustomer } from "@/lib/customer";

const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
const GROUP_ID = process.env.LINE_GROUP_ID ?? "";

type CreateReservationPayload = {
  customerName: string;
  phone: string;
  adults: number;
  children: number;
  requestDate: string;
  requestTime: string;
  note?: string;
  notifyMethod?: string;
  customerEmail?: string;
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
    const notifyMethod = body.notifyMethod === "EMAIL" ? "EMAIL" : "LINE";
    const customerEmail = body.customerEmail?.trim() ?? "";

    if (!customerName) return NextResponse.json({ ok: false, error: "CUSTOMER_NAME_REQUIRED" }, { status: 400 });
    if (!phone) return NextResponse.json({ ok: false, error: "PHONE_REQUIRED" }, { status: 400 });
    if (!requestDate) return NextResponse.json({ ok: false, error: "DATE_REQUIRED" }, { status: 400 });
    if (!requestTime) return NextResponse.json({ ok: false, error: "TIME_REQUIRED" }, { status: 400 });
    if (notifyMethod === "EMAIL" && !customerEmail) {
      return NextResponse.json({ ok: false, error: "EMAIL_REQUIRED" }, { status: 400 });
    }

    const reservation = await prisma.reservation.create({
      data: { customerName, phone, adults, children, requestDate, requestTime, note, notifyMethod, customerEmail },
    });

    const { id: customerId } = await upsertCustomer(phone, customerName);
    await prisma.reservation.update({ where: { id: reservation.id }, data: { customerId } });

    // Email 通知模式：訂位建立後直接推送通知給店家
    if (notifyMethod === "EMAIL" && GROUP_ID) {
      try {
        await pushFlexToAdmin(reservation, ACCESS_TOKEN, GROUP_ID);
      } catch (err) {
        console.error("pushFlexToAdmin for email reservation failed", err);
      }
    }

    return NextResponse.json({ ok: true, reservation });
  } catch (error) {
    console.error("POST /api/reservations/create error", error);
    return NextResponse.json({ ok: false, error: "CREATE_FAILED" }, { status: 500 });
  }
}
