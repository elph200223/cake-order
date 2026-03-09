import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/product-option-groups?productId=1
 * 回傳該商品綁定的所有 OptionGroup（含群組資訊）
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productIdStr = searchParams.get("productId");
  const productId = Number(productIdStr);

  if (!Number.isInteger(productId)) {
    return NextResponse.json(
      { ok: false, error: "PRODUCT_ID_INVALID" },
      { status: 400 }
    );
  }

  const bindings = await prisma.productOptionGroup.findMany({
    where: { productId },
    include: { optionGroup: true },
    orderBy: [{ sort: "asc" }, { id: "asc" }],
  });

  return NextResponse.json({ ok: true, bindings });
}

/**
 * POST /api/admin/product-option-groups
 * body: { productId, optionGroupId, sort }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const productId = Number(body?.productId);
    const optionGroupId = Number(body?.optionGroupId);
    const sort = Number(body?.sort ?? 0);

    if (!Number.isInteger(productId) || !Number.isInteger(optionGroupId)) {
      return NextResponse.json(
        { ok: false, error: "ID_INVALID" },
        { status: 400 }
      );
    }

    const binding = await prisma.productOptionGroup.create({
      data: {
        productId,
        optionGroupId,
        sort,
      },
    });

    return NextResponse.json({ ok: true, binding });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "CREATE_FAILED", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}