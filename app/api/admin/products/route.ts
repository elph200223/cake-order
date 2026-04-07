import { ProductType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ProductMutationBody = {
  name?: unknown;
  slug?: unknown;
  productType?: unknown;
  basePrice?: unknown;
  isActive?: unknown;
};

function isProductMutationBody(value: unknown): value is ProductMutationBody {
  return typeof value === "object" && value !== null;
}

function parseProductType(value: unknown): ProductType | null {
  if (value === ProductType.CAKE || value === ProductType.COFFEE) {
    return value;
  }
  return null;
}

/**
 * GET /api/admin/products
 */
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, products });
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
 * POST /api/admin/products
 * body: { name, slug, productType, basePrice, isActive }
 */
export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => ({}));
    const body: ProductMutationBody = isProductMutationBody(raw) ? raw : {};

    const name = String(body.name ?? "").trim();
    const slug = String(body.slug ?? "").trim();
    const basePrice = Number(body.basePrice);
    const productTypeRaw = body.productType;

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "NAME_REQUIRED" },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "SLUG_REQUIRED" },
        { status: 400 }
      );
    }

    if (productTypeRaw == null || productTypeRaw === "") {
      return NextResponse.json(
        { ok: false, error: "PRODUCT_TYPE_REQUIRED" },
        { status: 400 }
      );
    }

    const productType = parseProductType(productTypeRaw);
    if (!productType) {
      return NextResponse.json(
        { ok: false, error: "PRODUCT_TYPE_INVALID" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(basePrice)) {
      return NextResponse.json(
        { ok: false, error: "BASEPRICE_INVALID" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        productType,
        basePrice,
        isActive: body.isActive == null ? true : Boolean(body.isActive),
      },
    });

    return NextResponse.json({ ok: true, product });
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

/**
 * PATCH /api/admin/products?id=123
 */
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    const id = Number(idStr);

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        { ok: false, error: "ID_INVALID" },
        { status: 400 }
      );
    }

    const raw: unknown = await req.json().catch(() => ({}));
    const body: ProductMutationBody = isProductMutationBody(raw) ? raw : {};
    const data: {
      name?: string;
      slug?: string;
      productType?: ProductType;
      basePrice?: number;
      isActive?: boolean;
    } = {};

    if (body.name != null) data.name = String(body.name).trim();
    if (body.slug != null) data.slug = String(body.slug).trim();

    if (body.productType != null) {
      const productType = parseProductType(body.productType);
      if (!productType) {
        return NextResponse.json(
          { ok: false, error: "PRODUCT_TYPE_INVALID" },
          { status: 400 }
        );
      }
      data.productType = productType;
    }

    if (body.basePrice != null) {
      const p = Number(body.basePrice);
      if (!Number.isFinite(p)) {
        return NextResponse.json(
          { ok: false, error: "BASEPRICE_INVALID" },
          { status: 400 }
        );
      }
      data.basePrice = p;
    }

    if (body.isActive != null) {
      data.isActive = Boolean(body.isActive);
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, product });
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
 * DELETE /api/admin/products?id=123
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    const id = Number(idStr);

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        { ok: false, error: "ID_INVALID" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { slug: true, productType: true },
    });

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.productOptionGroup.deleteMany({
        where: { productId: id },
      });

      await tx.productImage.deleteMany({
        where: { productId: id },
      });

      await tx.product.delete({
        where: { id },
      });
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/products/list");
    if (product.productType === ProductType.COFFEE) {
      revalidatePath("/coffee");
      revalidatePath(`/coffee/${product.slug}`);
    } else {
      revalidatePath("/cakes");
      revalidatePath(`/cakes/${product.slug}`);
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