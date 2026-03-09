import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type OptionGroupPatchBody = {
  name?: unknown;
  required?: unknown;
  minSelect?: unknown;
  maxSelect?: unknown;
  sort?: unknown;
  isActive?: unknown;
};

function parseId(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

function isOptionGroupPatchBody(value: unknown): value is OptionGroupPatchBody {
  return typeof value === "object" && value !== null;
}

/**
 * GET /api/admin/option-groups/:id
 * 回傳群組 + 下面的 options（依 sort, id 排序）
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gid = parseId(id);

  if (gid == null) {
    return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
  }

  const group = await prisma.optionGroup.findUnique({
    where: { id: gid },
    include: { options: { orderBy: [{ sort: "asc" }, { id: "asc" }] } },
  });

  if (!group) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, group });
}

/**
 * PATCH /api/admin/option-groups/:id
 * body: { name?, required?, minSelect?, maxSelect?, sort?, isActive? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gid = parseId(id);

    if (gid == null) {
      return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
    }

    const raw: unknown = await req.json().catch(() => ({}));
    const body: OptionGroupPatchBody = isOptionGroupPatchBody(raw) ? raw : {};
    const data: {
      name?: string;
      required?: boolean;
      minSelect?: number;
      maxSelect?: number;
      sort?: number;
      isActive?: boolean;
    } = {};

    if (body.name != null) data.name = String(body.name).trim();
    if (body.required != null) data.required = Boolean(body.required);
    if (body.minSelect != null) data.minSelect = Number(body.minSelect);
    if (body.maxSelect != null) data.maxSelect = Number(body.maxSelect);
    if (body.sort != null) data.sort = Number(body.sort);
    if (body.isActive != null) data.isActive = Boolean(body.isActive);

    if (
      data.minSelect != null &&
      (!Number.isInteger(data.minSelect) || data.minSelect < 0)
    ) {
      return NextResponse.json({ ok: false, error: "MIN_INVALID" }, { status: 400 });
    }

    if (
      data.maxSelect != null &&
      (!Number.isInteger(data.maxSelect) || data.maxSelect < 0)
    ) {
      return NextResponse.json({ ok: false, error: "MAX_INVALID" }, { status: 400 });
    }

    if (data.minSelect != null || data.maxSelect != null) {
      const current = await prisma.optionGroup.findUnique({ where: { id: gid } });

      if (!current) {
        return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
      }

      const min = data.minSelect ?? current.minSelect;
      const max = data.maxSelect ?? current.maxSelect;

      if (max !== 0 && max < min) {
        return NextResponse.json({ ok: false, error: "MAX_LT_MIN" }, { status: 400 });
      }
    }

    const group = await prisma.optionGroup.update({
      where: { id: gid },
      data,
    });

    return NextResponse.json({ ok: true, group });
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

/**
 * DELETE /api/admin/option-groups/:id
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gid = parseId(id);

    if (gid == null) {
      return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
    }

    await prisma.optionGroup.delete({ where: { id: gid } });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "DELETE_FAILED",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}