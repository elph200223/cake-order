import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type OptionGroupPostBody = {
  name?: unknown;
  required?: unknown;
  minSelect?: unknown;
  maxSelect?: unknown;
  sort?: unknown;
  isActive?: unknown;
};

function isOptionGroupPostBody(value: unknown): value is OptionGroupPostBody {
  return typeof value === "object" && value !== null;
}

/**
 * GET /api/admin/option-groups
 */
export async function GET() {
  try {
    const groups = await prisma.optionGroup.findMany({
      orderBy: [{ sort: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({ ok: true, groups });
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
 * POST /api/admin/option-groups
 * body: { name, required, minSelect, maxSelect, sort, isActive }
 */
export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => ({}));
    const body: OptionGroupPostBody = isOptionGroupPostBody(raw) ? raw : {};

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { ok: false, error: "NAME_REQUIRED" },
        { status: 400 }
      );
    }

    const required = Boolean(body.required ?? false);
    const minSelect = Number(body.minSelect ?? 0);
    const maxSelect = Number(body.maxSelect ?? 1);
    const sort = Number(body.sort ?? 0);
    const isActive = Boolean(body.isActive ?? true);

    if (!Number.isInteger(minSelect) || minSelect < 0) {
      return NextResponse.json(
        { ok: false, error: "MIN_INVALID" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(maxSelect) || maxSelect < 0) {
      return NextResponse.json(
        { ok: false, error: "MAX_INVALID" },
        { status: 400 }
      );
    }

    if (maxSelect !== 0 && maxSelect < minSelect) {
      return NextResponse.json(
        { ok: false, error: "MAX_LT_MIN" },
        { status: 400 }
      );
    }

    const group = await prisma.optionGroup.create({
      data: {
        name,
        required,
        minSelect,
        maxSelect,
        sort,
        isActive,
      },
    });

    return NextResponse.json({ ok: true, group });
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