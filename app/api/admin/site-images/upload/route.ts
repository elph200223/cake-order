import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ClientPayload = {
  slot?: string;
  alt?: string;
  originalName?: string;
  base?: string;
  requestedAt?: number;
};

function parseClientPayload(raw: string | null | undefined): ClientPayload {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as ClientPayload;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function safeBaseName(filename: string) {
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;

  return base
    .normalize("NFKC")
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function extFromFormat(format: string | undefined) {
  switch (format) {
    case "jpeg":
      return "jpg";
    case "png":
      return "png";
    case "webp":
      return "webp";
    case "avif":
      return "avif";
    default:
      return "webp";
  }
}

function normalizeSlot(raw: string | undefined) {
  return raw === "HOME_HERO" ? "HOME_HERO" : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HandleUploadBody;

    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parseClientPayload(clientPayload);
        const slot = normalizeSlot(payload.slot);

        if (!slot) {
          throw new Error("INVALID_IMAGE_SLOT");
        }

        const originalName = payload.originalName?.trim() || pathname || "upload";
        const base = safeBaseName(originalName) || "upload";

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
          ],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            slot,
            alt: payload.alt?.trim() || "",
            originalName,
            base,
            requestedAt: Date.now(),
          } satisfies ClientPayload),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = parseClientPayload(tokenPayload);
        const slot = normalizeSlot(payload.slot);

        if (!slot) {
          throw new Error("INVALID_COMPLETION_PAYLOAD");
        }

        const sourceRes = await fetch(blob.url);

        if (!sourceRes.ok) {
          throw new Error("BLOB_FETCH_FAILED");
        }

        const sourceArrayBuffer = await sourceRes.arrayBuffer();
        const sourceBuffer = Buffer.from(sourceArrayBuffer);

        const transformed = await sharp(sourceBuffer)
          .rotate()
          .resize({
            width: 2400,
            height: 2400,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 82 })
          .toBuffer({ resolveWithObject: true });

        const compressedBuffer = transformed.data;
        const info = transformed.info;

        const base =
          safeBaseName(payload.base || payload.originalName || "site-image") ||
          "site-image";
        const ext = extFromFormat(info.format);
        const pathname = `site-images/${slot.toLowerCase()}/${Date.now()}-${base}.${ext}`;

        const finalBlob = await put(pathname, compressedBuffer, {
          access: "public",
          contentType: "image/webp",
          addRandomSuffix: false,
        });

        await prisma.siteImage.upsert({
          where: { slot },
          update: {
            originalName: payload.originalName?.trim() || blob.pathname,
            mimeType: "image/webp",
            storageKey: finalBlob.pathname,
            url: finalBlob.url,
            width: info.width ?? undefined,
            height: info.height ?? undefined,
            sizeBytes: sourceBuffer.byteLength,
            compressedBytes: compressedBuffer.byteLength,
            alt: payload.alt?.trim() || "",
            isActive: true,
          },
          create: {
            slot,
            originalName: payload.originalName?.trim() || blob.pathname,
            mimeType: "image/webp",
            storageKey: finalBlob.pathname,
            url: finalBlob.url,
            width: info.width ?? undefined,
            height: info.height ?? undefined,
            sizeBytes: sourceBuffer.byteLength,
            compressedBytes: compressedBuffer.byteLength,
            alt: payload.alt?.trim() || "",
            isActive: true,
          },
        });
      },
    });

    return NextResponse.json(json);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "SITE_IMAGE_UPLOAD_TOKEN_FAILED";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 }
    );
  }
}