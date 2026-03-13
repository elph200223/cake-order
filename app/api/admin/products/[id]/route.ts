import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

type ProductPatchBody = {
  name?: unknown;
  slug?: unknown;
  basePrice?: unknown;
  isActive?: unknown;
};

function parseId(idStr: string) {
  const id = Number(idStr);
  if (!Number.isInteger(id)) return null;
  return id;
}

function isProductPatchBody(value: unknown): value is ProductPatchBody {
  return typeof value === "object" && value !== null;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseId(idStr);

    if (id == null) {
      return NextResponse.json(
        { ok: false, error: "ID_INVALID" },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ isCover: "desc" }, { sort: "asc" }, { id: "asc" }],
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      );
    }

    return NextResponse.json(
      { ok: true, product },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error: unknown) {
    console.error("GET /api/admin/products/[id] error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "GET_FAILED_" + (error instanceof Error ? error.message : String(error)),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseId(idStr);

    if (id == null) {
      return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
    }

    const raw: unknown = await req.json().catch(() => ({}));
    const body: ProductPatchBody = isProductPatchBody(raw) ? raw : {};
    const data: {
      name?: string;
      slug?: string;
      basePrice?: number;
      isActive?: boolean;
    } = {};

    if (body.name != null) data.name = String(body.name).trim();
    if (body.slug != null) data.slug = String(body.slug).trim();

    if (body.basePrice != null && body.basePrice !== "") {
      const p = Number(body.basePrice);
      if (!Number.isFinite(p)) {
        return NextResponse.json(
          { ok: false, error: "BASEPRICE_INVALID" },
          { status: 400 }
        );
      }
      data.basePrice = p;
    }

    if (body.isActive != null) data.isActive = Boolean(body.isActive);

    const product = await prisma.product.update({ where: { id }, data });
    return NextResponse.json({ ok: true, product });
  } catch (error: unknown) {
    console.error("PATCH /api/admin/products/[id] error:", error);
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseId(idStr);

    if (id == null) {
      return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("DELETE /api/admin/products/[id] error:", error);
    return NextResponse.json({ ok: false, error: "DELETE_FAILED" }, { status: 500 });
  }
}