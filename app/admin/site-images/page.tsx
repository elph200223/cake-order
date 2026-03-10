"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";

type SiteImageSlot = "HOME_HERO";

type SiteImageItem = {
  id: number;
  slot: SiteImageSlot | string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  mimeType: string;
  originalName: string;
  createdAt?: string;
  updatedAt?: string;
};

type SiteImagesResponse = {
  ok: boolean;
  images?: SiteImageItem[];
  error?: string;
};

function formatBytes(value?: number | null) {
  if (!value || value <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 100 ? 0 : size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AdminSiteImagesPage() {
  const [images, setImages] = useState<SiteImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [progress, setProgress] = useState<number | null>(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const res = await fetch("/api/admin/site-images", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await res.json()) as SiteImagesResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "SITE_IMAGES_LOAD_FAILED");
      }

      setImages(Array.isArray(data.images) ? data.images : []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "SITE_IMAGES_LOAD_FAILED";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  const homeHeroImages = useMemo(
    () => images.filter((image) => image.slot === "HOME_HERO"),
    [images]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setSubmitError("請先選擇圖片");
      setSubmitMessage("");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSubmitMessage("");
    setProgress(0);

    try {
      const blob = await upload(selectedFile.name, selectedFile, {
        access: "public",
        handleUploadUrl: "/api/admin/site-images/upload",
        multipart: selectedFile.size > 20 * 1024 * 1024,
        clientPayload: JSON.stringify({
          slot: "HOME_HERO",
          alt: alt.trim(),
          originalName: selectedFile.name,
        }),
        onUploadProgress: ({ percentage }) => {
          setProgress(percentage);
        },
      });

      setSubmitMessage(`上傳完成：${blob.pathname}`);
      setSelectedFile(null);
      setAlt("");
      setProgress(100);

      const fileInput = document.getElementById(
        "site-image-file-input"
      ) as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }

      await loadImages();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "SITE_IMAGE_UPLOAD_FAILED";
      setSubmitError(message);
      setSubmitMessage("");
      setProgress(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm tracking-[0.25em] text-stone-500">ADMIN</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[0.12em]">
            站點圖片管理
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            這一頁目前先管理首頁主圖（HOME_HERO）。
            現在上傳會直接由瀏覽器送到 Blob，不再先把整張圖丟進你的 Next.js function。
          </p>
        </div>

        <section className="grid gap-8 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-[0.08em]">新增首頁主圖</h2>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  htmlFor="site-image-file-input"
                  className="block text-sm font-medium text-stone-700"
                >
                  圖片檔案
                </label>
                <input
                  id="site-image-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedFile(file);
                    setSubmitError("");
                    setSubmitMessage("");
                    setProgress(null);
                  }}
                  className="block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-800 file:mr-4 file:rounded-xl file:border-0 file:bg-stone-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-stone-700"
                  disabled={submitting}
                />
                <p className="text-xs leading-6 text-stone-500">
                  建議上傳橫式主圖。接受 JPG / PNG / WEBP / AVIF。
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="site-image-alt"
                  className="block text-sm font-medium text-stone-700"
                >
                  圖片說明（alt）
                </label>
                <input
                  id="site-image-alt"
                  type="text"
                  value={alt}
                  onChange={(event) => setAlt(event.target.value)}
                  placeholder="例如：首頁主視覺蛋糕照片"
                  className="block w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-500"
                  disabled={submitting}
                />
              </div>

              <div className="rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-600">
                <div className="flex items-start justify-between gap-4">
                  <span>站點位置</span>
                  <span className="font-medium text-stone-900">HOME_HERO</span>
                </div>
                <div className="mt-2 flex items-start justify-between gap-4">
                  <span>目前檔案</span>
                  <span className="text-right text-stone-900">
                    {selectedFile ? selectedFile.name : "尚未選擇"}
                  </span>
                </div>
                <div className="mt-2 flex items-start justify-between gap-4">
                  <span>檔案大小</span>
                  <span className="text-right text-stone-900">
                    {selectedFile ? formatBytes(selectedFile.size) : "-"}
                  </span>
                </div>
              </div>

              {progress !== null ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-600">
                    <span>上傳進度</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full rounded-full bg-stone-800 transition-all"
                      style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
                    />
                  </div>
                </div>
              ) : null}

              {submitError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              ) : null}

              {submitMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {submitMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting || !selectedFile}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium tracking-[0.08em] text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {submitting ? "上傳中..." : "上傳首頁主圖"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-[0.08em]">
                  已上傳圖片
                </h2>
                <p className="mt-2 text-sm text-stone-600">
                  目前先列出 `HOME_HERO` 類型圖片。
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadImages()}
                className="inline-flex items-center justify-center rounded-2xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
              >
                重新整理
              </button>
            </div>

            {loading ? (
              <div className="mt-6 rounded-2xl bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">
                讀取中...
              </div>
            ) : null}

            {!loading && loadError ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                {loadError}
              </div>
            ) : null}

            {!loading && !loadError && homeHeroImages.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">
                目前還沒有 HOME_HERO 圖片
              </div>
            ) : null}

            {!loading && !loadError && homeHeroImages.length > 0 ? (
              <div className="mt-6 grid gap-6">
                {homeHeroImages.map((image) => (
                  <article
                    key={image.id}
                    className="overflow-hidden rounded-3xl border border-stone-200"
                  >
                    <div className="bg-stone-100">
                      <img
                        src={image.url}
                        alt={image.alt || ""}
                        className="aspect-[16/10] w-full object-cover"
                      />
                    </div>

                    <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-stone-900">
                          {image.slot}
                        </div>
                        <div className="mt-2 break-all text-xs leading-6 text-stone-500">
                          {image.url}
                        </div>
                        <div className="mt-3 text-sm text-stone-700">
                          <span className="font-medium text-stone-900">alt：</span>
                          {image.alt?.trim() ? image.alt : "—"}
                        </div>
                        <div className="mt-2 text-sm text-stone-700">
                          <span className="font-medium text-stone-900">原始檔名：</span>
                          {image.originalName || "—"}
                        </div>
                      </div>

                      <dl className="grid grid-cols-[84px_1fr] gap-x-3 gap-y-2 text-sm text-stone-700">
                        <dt className="text-stone-500">尺寸</dt>
                        <dd>
                          {image.width && image.height
                            ? `${image.width} × ${image.height}`
                            : "-"}
                        </dd>

                        <dt className="text-stone-500">大小</dt>
                        <dd>{formatBytes(image.sizeBytes)}</dd>

                        <dt className="text-stone-500">格式</dt>
                        <dd>{image.mimeType || "-"}</dd>

                        <dt className="text-stone-500">建立時間</dt>
                        <dd>{formatDateTime(image.createdAt)}</dd>
                      </dl>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}