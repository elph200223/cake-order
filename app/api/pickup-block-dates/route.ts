import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluatePickupDateRules, getLeadBlockedDateStrings } from "@/lib/pickup-rules";

export const dynamic = "force-dynamic";

type PickupBlockDateRow = {
  id: number;
  date: string;
  reason: string;
  orderOnly: boolean;
};

type PickupBlockDateDelegate = {
  findMany: (args: {
    where?: {
      isActive?: boolean;
    };
    orderBy?: {
      date?: "asc" | "desc";
    };
    select?: {
      id?: boolean;
      date?: boolean;
      reason?: boolean;
      orderOnly?: boolean;
    };
  }) => Promise<PickupBlockDateRow[]>;
};

function getPickupBlockDateDelegate() {
  const prismaRecord = prisma as unknown as Record<string, unknown>;
  const delegate = prismaRecord["pickupBlockDate"];

  if (!delegate) {
    throw new Error("PICKUP_BLOCK_DATE_MODEL_UNAVAILABLE");
  }

  return delegate as PickupBlockDateDelegate;
}

export async function GET() {
  try {
    const pickupBlockDateModel = getPickupBlockDateDelegate();

    const rows = await pickupBlockDateModel.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        date: "asc",
      },
      select: {
        id: true,
        date: true,
        reason: true,
        orderOnly: true,
      },
    });

    const blockedDates = rows.map((row) => ({
      id: row.id,
      date: row.date,
      reason: row.reason,
      orderOnly: row.orderOnly,
    }));

    const leadBlockedDates = getLeadBlockedDateStrings();

    const restrictedDates = rows.map((row) => {
      const nextDate = evaluatePickupDateRules({
        date: row.date,
        blockedDates: rows.map((item) => ({
          date: item.date,
          reason: item.reason,
        })),
      });

      return {
        date: row.date,
        nextDayRestricted: false,
        blockedReason: nextDate.blockedReason,
      };
    });

    const nextDayRestrictedDates = rows
      .map((row) => {
        const parts = row.date.split("-");
        if (parts.length !== 3) return null;

        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);

        if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
          return null;
        }

        const date = new Date(year, month - 1, day + 1);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");

        return {
          date: `${yyyy}-${mm}-${dd}`,
          startTime: "13:00",
        };
      })
      .filter((item): item is { date: string; startTime: string } => Boolean(item));

    return NextResponse.json(
      {
        ok: true,
        blockedDates,
        leadBlockedDates,
        nextDayRestrictedDates,
        restrictedDates,
      },
      { status: 200 }
    );
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