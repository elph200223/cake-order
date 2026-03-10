import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const allowedSlots = ["HOME_HERO"] as const;
type AllowedSlot = (typeof allowedSlots)[number];

function isAllowedSlot(value: unknown): value is AllowedSlot {
  return typeof value === "string" && allowedSlots.includes(value as AllowedSlot);
}

type SiteImageInput = {
  slot?: unknown;
  originalName?: unknown;
  mimeType?: unknown;
  storageKey?: unknown;
  url?: unknown;
  width?: unknown;
  height?: unknown;
  sizeBytes?: unknown;
  compressedBytes?: unknown;
  alt?: unknown;
  isActive?: unknown;
};

function toOptionalInt(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function toOptionalString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export async function GET() {
  try {
    const images = await prisma.siteImage.findMany({
      orderBy: [{ slot: "asc" }],
    });

    return NextResponse.json(
      {
        ok: true,
        images,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const raw = (await req.json().catch(() => null)) as SiteImageInput | null;
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const slot = raw.slot;
    if (!isAllowedSlot(slot)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_SLOT" },
        { status: 400 }
      );
    }

    const originalName = toOptionalString(raw.originalName);
    const mimeType = toOptionalString(raw.mimeType);
    const storageKey = toOptionalString(raw.storageKey);
    const url = toOptionalString(raw.url);
    const alt = toOptionalString(raw.alt);

    if (!originalName) {
      return NextResponse.json(
        { ok: false, error: "ORIGINAL_NAME_REQUIRED" },
        { status: 400 }
      );
    }

    if (!mimeType) {
      return NextResponse.json(
        { ok: false, error: "MIME_TYPE_REQUIRED" },
        { status: 400 }
      );
    }

    if (!storageKey) {
      return NextResponse.json(
        { ok: false, error: "STORAGE_KEY_REQUIRED" },
        { status: 400 }
      );
    }

    if (!url) {
      return NextResponse.json(
        { ok: false, error: "URL_REQUIRED" },
        { status: 400 }
      );
    }

    const image = await prisma.siteImage.upsert({
      where: { slot },
      update: {
        originalName,
        mimeType,
        storageKey,
        url,
        width: toOptionalInt(raw.width),
        height: toOptionalInt(raw.height),
        sizeBytes: toOptionalInt(raw.sizeBytes),
        compressedBytes: toOptionalInt(raw.compressedBytes),
        alt,
        isActive: raw.isActive === undefined ? true : Boolean(raw.isActive),
      },
      create: {
        slot,
        originalName,
        mimeType,
        storageKey,
        url,
        width: toOptionalInt(raw.width),
        height: toOptionalInt(raw.height),
        sizeBytes: toOptionalInt(raw.sizeBytes),
        compressedBytes: toOptionalInt(raw.compressedBytes),
        alt,
        isActive: raw.isActive === undefined ? true : Boolean(raw.isActive),
      },
    });

    return NextResponse.json(
      {
        ok: true,
        image,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}