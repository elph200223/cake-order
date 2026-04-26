import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PickupBlockDatePostBody = {
  date?: unknown;
  reason?: unknown;
  isActive?: unknown;
  orderOnly?: unknown;
};

type PickupBlockDateDelegate = {
  findMany: (args: {
    orderBy?: Array<{ date?: "asc" | "desc"; id?: "asc" | "desc" }>;
  }) => Promise<unknown>;
  findUnique: (args: {
    where: { date: string };
    select?: { id?: boolean };
  }) => Promise<{ id: number } | null>;
  create: (args: {
    data: {
      date: string;
      reason: string;
      isActive: boolean;
      orderOnly: boolean;
    };
  }) => Promise<unknown>;
};

function getPickupBlockDateDelegate() {
  const prismaRecord = prisma as unknown as Record<string, unknown>;
  const delegate = prismaRecord["pickupBlockDate"];

  if (!delegate) {
    throw new Error("PICKUP_BLOCK_DATE_MODEL_UNAVAILABLE");
  }

  return delegate as PickupBlockDateDelegate;
}

function isPickupBlockDatePostBody(value: unknown): value is PickupBlockDatePostBody {
  return typeof value === "object" && value !== null;
}

function normalizeDate(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeReason(value: unknown) {
  return String(value ?? "").trim();
}

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * GET /api/admin/pickup-block-dates
 */
export async function GET() {
  try {
    const pickupBlockDateModel = getPickupBlockDateDelegate();

    const dates = await pickupBlockDateModel.findMany({
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({ ok: true, dates });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "LIST_FAILED",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/pickup-block-dates
 * body: { date, reason, isActive }
 */
export async function POST(req: NextRequest) {
  try {
    const pickupBlockDateModel = getPickupBlockDateDelegate();

    const raw: unknown = await req.json().catch(() => ({}));
    const body: PickupBlockDatePostBody = isPickupBlockDatePostBody(raw) ? raw : {};

    const date = normalizeDate(body.date);
    const reason = normalizeReason(body.reason);
    const isActive = body.isActive === undefined ? true : Boolean(body.isActive);
    const orderOnly = body.orderOnly === undefined ? false : Boolean(body.orderOnly);

    if (!date) {
      return NextResponse.json(
        { ok: false, error: "DATE_REQUIRED" },
        { status: 400 }
      );
    }

    if (!isValidDateString(date)) {
      return NextResponse.json(
        { ok: false, error: "DATE_INVALID" },
        { status: 400 }
      );
    }

    const exists = await pickupBlockDateModel.findUnique({
      where: { date },
      select: { id: true },
    });

    if (exists) {
      return NextResponse.json(
        { ok: false, error: "DATE_ALREADY_EXISTS" },
        { status: 400 }
      );
    }

    const pickupBlockDate = await pickupBlockDateModel.create({
      data: {
        date,
        reason,
        isActive,
        orderOnly,
      },
    });

    return NextResponse.json({ ok: true, pickupBlockDate });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "CREATE_FAILED",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}