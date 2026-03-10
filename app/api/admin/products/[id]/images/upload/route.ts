import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

type ClientPayload = {
  alt?: string;
  originalName?: string;
  base?: string;
  requestedAt?: number;
  makeCover?: boolean;
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

function parseId(idStr: string) {
  const id = Number(idStr);
  if (!Number.isInteger(id)) return null;
  return id;
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

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id: idStr } = await ctx.params;
    const productId = parseId(idStr);

    if (productId == null) {
      return NextResponse.json({ ok: false, error: "ID_INVALID" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    }

    const body = (await req.json()) as HandleUploadBody;

    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parseClientPayload(clientPayload);
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
            alt: payload.alt?.trim() || "",
            originalName,
            base,
            requestedAt: Date.now(),
            makeCover: Boolean(payload.makeCover),
          } satisfies ClientPayload),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = parseClientPayload(tokenPayload);

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
          safeBaseName(payload.base || payload.originalName || "product-image") ||
          "product-image";
        const pathname = `product-images/${productId}/${Date.now()}-${base}.webp`;

        const finalBlob = await put(pathname, compressedBuffer, {
          access: "public",
          contentType: "image/webp",
          addRandomSuffix: false,
        });

        const [existingCount, maxSortRow] = await prisma.$transaction([
          prisma.productImage.count({
            where: {
              productId,
              isActive: true,
            },
          }),
          prisma.productImage.findFirst({
            where: { productId },
            orderBy: [{ sort: "desc" }, { id: "desc" }],
            select: { sort: true },
          }),
        ]);

        const nextSort = (maxSortRow?.sort ?? -1) + 1;
        const shouldMakeCover = existingCount === 0 || Boolean(payload.makeCover);

        await prisma.$transaction(async (tx) => {
          if (shouldMakeCover) {
            await tx.productImage.updateMany({
              where: {
                productId,
                isCover: true,
              },
              data: {
                isCover: false,
              },
            });
          }

          await tx.productImage.create({
            data: {
              productId,
              originalName: payload.originalName?.trim() || blob.pathname,
              mimeType: "image/webp",
              storageKey: finalBlob.pathname,
              url: finalBlob.url,
              width: info.width ?? undefined,
              height: info.height ?? undefined,
              sizeBytes: sourceBuffer.byteLength,
              compressedBytes: compressedBuffer.byteLength,
              alt: payload.alt?.trim() || "",
              sort: nextSort,
              isCover: shouldMakeCover,
              isActive: true,
            },
          });
        });
      },
    });

    return NextResponse.json(json);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "PRODUCT_IMAGE_UPLOAD_TOKEN_FAILED";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 }
    );
  }
}