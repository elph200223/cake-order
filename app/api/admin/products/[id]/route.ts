import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

function parseId(idStr: string) {
  const id = Number(idStr);
  if (!Number.isInteger(id)) return null;
  return id;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseId(idStr);    if (id == null) return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    console.error("GET /api/admin/products/[id] error:", e);
    return NextResponse.json({ ok: false, error: "GET_FAILED_" + String(e?.message ?? e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseId(idStr);    if (id == null) return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });

    const body = await req.json();
    const data: any = {};
    if (body?.name != null) data.name = String(body.name).trim();
    if (body?.slug != null) data.slug = String(body.slug).trim();
    if (body?.basePrice != null && body.basePrice !== "") {
      const p = Number(body.basePrice);
      if (!Number.isFinite(p)) return NextResponse.json({ ok: false, error: "BASEBASEPRICE_INVALID" }, { status: 400 });
      data.basePrice = p;
    }
    if (body?.isActive != null) data.isActive = Boolean(body.isActive);

    const product = await prisma.product.update({ where: { id }, data });
    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    console.error("PATCH /api/admin/products/[id] error:", e);
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseId(idStr);    if (id == null) return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/admin/products/[id] error:", e);
    return NextResponse.json({ ok: false, error: "DELETE_FAILED" }, { status: 500 });
  }
}
