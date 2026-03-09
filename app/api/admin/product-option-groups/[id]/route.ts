import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ProductOptionGroupPatchBody = {
  sort?: unknown;
};

function parseId(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

function isProductOptionGroupPatchBody(
  value: unknown
): value is ProductOptionGroupPatchBody {
  return typeof value === "object" && value !== null;
}

/**
 * PATCH /api/admin/product-option-groups/:id
 * body: { sort? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bid = parseId(id);

    if (bid == null) {
      return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
    }

    const raw: unknown = await req.json().catch(() => ({}));
    const body: ProductOptionGroupPatchBody = isProductOptionGroupPatchBody(raw)
      ? raw
      : {};
    const sort = Number(body.sort ?? 0);

    const binding = await prisma.productOptionGroup.update({
      where: { id: bid },
      data: { sort },
    });

    return NextResponse.json({ ok: true, binding });
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
 * DELETE /api/admin/product-option-groups/:id
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bid = parseId(id);

    if (bid == null) {
      return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
    }

    await prisma.productOptionGroup.delete({
      where: { id: bid },
    });

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