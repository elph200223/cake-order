import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const allowedSlots = ["HOME_HERO"] as const;
type AllowedSlot = (typeof allowedSlots)[number];

function isAllowedSlot(value: unknown): value is AllowedSlot {
  return typeof value === "string" && allowedSlots.includes(value as AllowedSlot);
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

function buildStorageKey(slot: AllowedSlot, originalName: string) {
  const safeName = sanitizeFileName(originalName) || "image.jpg";
  const now = Date.now();
  return `site-images/${slot.toLowerCase()}/${now}-${safeName}`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const slotRaw = formData.get("slot");
    const altRaw = formData.get("alt");
    const fileRaw = formData.get("file");

    if (!isAllowedSlot(slotRaw)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_SLOT" },
        { status: 400 }
      );
    }

    if (!(fileRaw instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "FILE_REQUIRED" },
        { status: 400 }
      );
    }

    if (!fileRaw.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "FILE_MUST_BE_IMAGE" },
        { status: 400 }
      );
    }

    const originalBuffer = Buffer.from(await fileRaw.arrayBuffer());
    const originalSize = originalBuffer.byteLength;
    const originalName = fileRaw.name || "upload-image";
    const alt = String(altRaw ?? "").trim();

    const transformed = await sharp(originalBuffer)
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 82,
        mozjpeg: true,
      })
      .toBuffer({ resolveWithObject: true });

    const compressedBuffer = transformed.data;
    const compressedInfo = transformed.info;

    const storageKey = buildStorageKey(slotRaw, originalName.endsWith(".jpg") || originalName.endsWith(".jpeg")
      ? originalName
      : `${originalName}.jpg`);

    const blob = await put(storageKey, compressedBuffer, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
    });

    const image = await prisma.siteImage.upsert({
      where: { slot: slotRaw },
      update: {
        originalName,
        mimeType: "image/jpeg",
        storageKey: blob.pathname,
        url: blob.url,
        width: compressedInfo.width ?? null,
        height: compressedInfo.height ?? null,
        sizeBytes: originalSize,
        compressedBytes: compressedBuffer.byteLength,
        alt,
        isActive: true,
      },
      create: {
        slot: slotRaw,
        originalName,
        mimeType: "image/jpeg",
        storageKey: blob.pathname,
        url: blob.url,
        width: compressedInfo.width ?? null,
        height: compressedInfo.height ?? null,
        sizeBytes: originalSize,
        compressedBytes: compressedBuffer.byteLength,
        alt,
        isActive: true,
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