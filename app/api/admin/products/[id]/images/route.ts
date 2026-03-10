import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

type ProductImagePatchBody = {
  imageId?: unknown;
  alt?: unknown;
  sort?: unknown;
  isCover?: unknown;
  isActive?: unknown;
  focusX?: unknown;
  focusY?: unknown;
};

function parseId(idStr: string) {
  const id = Number(idStr);
  return Number.isInteger(id) ? id : null;
}

function clampFocus(value: number) {
  if (!Number.isFinite(value)) return 50;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function isPatchBody(value: unknown): value is ProductImagePatchBody {
  return typeof value === "object" && value !== null;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id: idStr } = await ctx.params;
    const productId = parseId(idStr);

    if (productId == null) {
      return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
    }

    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ sort: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({ ok: true, images });
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

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id: idStr } = await ctx.params;
    const productId = parseId(idStr);

    if (productId == null) {
      return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
    }

    const raw: unknown = await req.json().catch(() => ({}));
    const body = isPatchBody(raw) ? raw : {};
    const imageId = Number(body.imageId);

    if (!Number.isInteger(imageId)) {
      return NextResponse.json({ ok: false, error: "IMAGE_ID_INVALID" }, { status: 400 });
    }

    const image = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!image) {
      return NextResponse.json({ ok: false, error: "IMAGE_NOT_FOUND" }, { status: 404 });
    }

    const data: {
      alt?: string;
      sort?: number;
      isCover?: boolean;
      isActive?: boolean;
      focusX?: number;
      focusY?: number;
    } = {};

    if (body.alt != null) data.alt = String(body.alt).trim();

    if (body.sort != null && body.sort !== "") {
      const sort = Number(body.sort);
      if (!Number.isFinite(sort)) {
        return NextResponse.json({ ok: false, error: "SORT_INVALID" }, { status: 400 });
      }
      data.sort = Math.trunc(sort);
    }

    if (body.isActive != null) data.isActive = Boolean(body.isActive);

    if (body.focusX != null) {
      const focusX = Number(body.focusX);
      if (!Number.isFinite(focusX)) {
        return NextResponse.json({ ok: false, error: "FOCUS_X_INVALID" }, { status: 400 });
      }
      data.focusX = clampFocus(focusX);
    }

    if (body.focusY != null) {
      const focusY = Number(body.focusY);
      if (!Number.isFinite(focusY)) {
        return NextResponse.json({ ok: false, error: "FOCUS_Y_INVALID" }, { status: 400 });
      }
      data.focusY = clampFocus(focusY);
    }

    const makeCover = body.isCover === true;

    const updated = await prisma.$transaction(async (tx) => {
      if (makeCover) {
        await tx.productImage.updateMany({
          where: {
            productId,
            isCover: true,
            NOT: { id: imageId },
          },
          data: {
            isCover: false,
          },
        });

        data.isCover = true;
      }

      return tx.productImage.update({
        where: { id: imageId },
        data,
      });
    });

    return NextResponse.json({ ok: true, image: updated });
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

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id: idStr } = await ctx.params;
    const productId = parseId(idStr);

    if (productId == null) {
      return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const imageId = Number(searchParams.get("imageId"));

    if (!Number.isInteger(imageId)) {
      return NextResponse.json({ ok: false, error: "IMAGE_ID_INVALID" }, { status: 400 });
    }

    const image = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!image) {
      return NextResponse.json({ ok: false, error: "IMAGE_NOT_FOUND" }, { status: 404 });
    }

    await prisma.productImage.delete({
      where: { id: imageId },
    });

    const nextCover = await prisma.productImage.findFirst({
      where: {
        productId,
        isActive: true,
      },
      orderBy: [{ sort: "asc" }, { id: "asc" }],
    });

    if (image.isCover && nextCover) {
      await prisma.productImage.update({
        where: { id: nextCover.id },
        data: { isCover: true },
      });
    }

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