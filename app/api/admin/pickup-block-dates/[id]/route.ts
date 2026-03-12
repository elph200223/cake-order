import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PickupBlockDatePatchBody = {
  isActive?: unknown;
  reason?: unknown;
};

function parseId(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function isPatchBody(value: unknown): value is PickupBlockDatePatchBody {
  return typeof value === "object" && value !== null;
}

/**
 * PATCH /api/admin/pickup-block-dates/:id
 * body: { isActive?, reason? }
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const pickupBlockDateId = parseId(id);

    if (pickupBlockDateId == null) {
      return NextResponse.json(
        { ok: false, error: "ID_INVALID" },
        { status: 400 }
      );
    }

    const existing = await prisma.pickupBlockDate.findUnique({
      where: { id: pickupBlockDateId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const raw: unknown = await req.json().catch(() => ({}));
    const body = isPatchBody(raw) ? raw : {};

    const data: {
      isActive?: boolean;
      reason?: string;
    } = {};

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (body.reason !== undefined) {
      data.reason = String(body.reason ?? "").trim();
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { ok: false, error: "NO_UPDATES" },
        { status: 400 }
      );
    }

    const pickupBlockDate = await prisma.pickupBlockDate.update({
      where: { id: pickupBlockDateId },
      data,
    });

    return NextResponse.json({ ok: true, pickupBlockDate });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "UPDATE_FAILED",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}