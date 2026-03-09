import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/options?optionGroupId=123
 * - 若有 optionGroupId：回傳該群組的 options（依 sort, id）
 * - 若沒有：回傳全部 options（依 optionGroupId, sort, id）
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ogidStr = searchParams.get("optionGroupId");
    const ogid = ogidStr != null ? Number(ogidStr) : null;

    if (ogidStr != null && !Number.isInteger(ogid)) {
      return NextResponse.json(
        { ok: false, error: "OPTION_GROUP_ID_INVALID" },
        { status: 400 }
      );
    }

    const options = await prisma.option.findMany({
      where: ogid != null ? { optionGroupId: ogid } : undefined,
      orderBy: ogid != null
        ? [{ sort: "asc" }, { id: "asc" }]
        : [{ optionGroupId: "asc" }, { sort: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({ ok: true, options });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "LIST_FAILED", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/options
 * body: { optionGroupId, name, priceDelta, sort, isActive }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const optionGroupId = Number(body?.optionGroupId);
    const name = String(body?.name ?? "").trim();
    const priceDelta = Number(body?.priceDelta ?? 0);
    const sort = Number(body?.sort ?? 0);
    const isActive = Boolean(body?.isActive ?? true);

    if (!Number.isInteger(optionGroupId)) {
      return NextResponse.json(
        { ok: false, error: "OPTION_GROUP_ID_REQUIRED" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "NAME_REQUIRED" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(priceDelta)) {
      return NextResponse.json(
        { ok: false, error: "PRICEDELTA_INVALID" },
        { status: 400 }
      );
    }

    const group = await prisma.optionGroup.findUnique({
      where: { id: optionGroupId },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json(
        { ok: false, error: "OPTION_GROUP_NOT_FOUND" },
        { status: 404 }
      );
    }

    const option = await prisma.option.create({
      data: {
        optionGroupId,
        name,
        priceDelta,
        sort,
        isActive,
      },
    });

    return NextResponse.json({ ok: true, option });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "CREATE_FAILED", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}