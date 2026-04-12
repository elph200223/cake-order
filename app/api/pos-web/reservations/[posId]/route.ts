import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ posId: string }> }
) {
  const { posId } = await params;
  const body = await req.json() as { status?: string; [key: string]: unknown };

  try {
    await prisma.reservation.update({
      where: { posId },
      data: {
        ...(body.status !== undefined && { arrivalStatus: body.status }),
        ...(body.name !== undefined && { customerName: body.name as string }),
        ...(body.phone !== undefined && { phone: body.phone as string }),
        ...(body.adults !== undefined && { adults: body.adults as number }),
        ...(body.children !== undefined && { children: body.children as number }),
        ...(body.date !== undefined && { requestDate: body.date as string }),
        ...(body.time !== undefined && { requestTime: body.time as string }),
        ...(body.note !== undefined && { note: body.note as string }),
        ...(body.title !== undefined && { title: body.title as string }),
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ posId: string }> }
) {
  const { posId } = await params;
  try {
    await prisma.reservation.delete({ where: { posId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
}
