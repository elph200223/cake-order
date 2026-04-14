import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type OptionPatchBody = {
  name?: unknown;
  priceDelta?: unknown;
  priceType?: unknown;
  priceMultiplier?: unknown;
  sort?: unknown;
  isActive?: unknown;
};

function parseId(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

function isOptionPatchBody(value: unknown): value is OptionPatchBody {
  return typeof value === "object" && value !== null;
}

/**
 * GET /api/admin/options/:id
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const oid = parseId(id);

  if (oid == null) {
    return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
  }

  const option = await prisma.option.findUnique({
    where: { id: oid },
  });

  if (!option) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, option });
}

/**
 * PATCH /api/admin/options/:id
 * body: { name?, priceDelta?, sort?, isActive? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const oid = parseId(id);

    if (oid == null) {
      return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
    }

    const raw: unknown = await req.json().catch(() => ({}));
    const body: OptionPatchBody = isOptionPatchBody(raw) ? raw : {};
    const data: {
      name?: string;
      priceDelta?: number;
      priceType?: string;
      priceMultiplier?: number;
      sort?: number;
      isActive?: boolean;
    } = {};

    if (body.name != null) data.name = String(body.name).trim();
    if (body.priceDelta != null) data.priceDelta = Number(body.priceDelta);
    if (body.priceType != null) data.priceType = String(body.priceType);
    if (body.priceMultiplier != null) data.priceMultiplier = Number(body.priceMultiplier);
    if (body.sort != null) data.sort = Number(body.sort);
    if (body.isActive != null) data.isActive = Boolean(body.isActive);

    if (data.priceDelta != null && !Number.isFinite(data.priceDelta)) {
      return NextResponse.json(
        { ok: false, error: "PRICEDELTA_INVALID" },
        { status: 400 }
      );
    }

    const option = await prisma.option.update({
      where: { id: oid },
      data,
    });

    return NextResponse.json({ ok: true, option });
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
 * DELETE /api/admin/options/:id
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const oid = parseId(id);

    if (oid == null) {
      return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
    }

    await prisma.option.delete({
      where: { id: oid },
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