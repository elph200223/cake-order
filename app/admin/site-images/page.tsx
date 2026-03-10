"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type SiteImageRecord = {
  id: number;
  slot: string;
  originalName: string;
  mimeType: string;
  storageKey: string;
  url: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  compressedBytes: number | null;
  alt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type SiteImagesResponse = {
  ok?: boolean;
  images?: SiteImageRecord[];
  error?: unknown;
};

type UploadResponse = {
  ok?: boolean;
  image?: SiteImageRecord;
  error?: unknown;
};

const imageSlots = [
  {
    key: "HOME_HERO",
    title: "首頁主圖",
    description: "對應首頁左側的大圖區塊。",
  },
];

function isSiteImagesResponse(value: unknown): value is SiteImagesResponse {
  return typeof value === "object" && value !== null;
}

function isUploadResponse(value: unknown): value is UploadResponse {
  return typeof value === "object" && value !== null;
}

function formatBytes(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDimension(width: number | null | undefined, height: number | null | undefined) {
  if (!width || !height) return "-";
  return `${width} × ${height}`;
}

export default function AdminSiteImagesPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [images, setImages] = useState<SiteImageRecord[]>([]);
  const [altMap, setAltMap] = useState<Record<string, string>>({});
  const [fileMap, setFileMap] = useState<Record<string, File | null>>({});
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});

  async function load() {
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/site-images", {
        cache: "no-store",
      });

      const raw: unknown = await res.json().catch(() => null);
      const data = isSiteImagesResponse(raw) ? raw : null;

      if (!data || data.ok !== true || !Array.isArray(data.images)) {
        throw new Error(String(data?.error ?? "LOAD_FAILED"));
      }

      setImages(data.images);

      setAltMap((prev) => {
        const next = { ...prev };
        for (const image of data.images ?? []) {
          next[image.slot] = image.alt ?? "";
        }
        return next;
      });
    } catch (error: unknown) {
      setImages([]);
      setMsg(error instanceof Error ? error.message : "讀取站點圖片失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const imageMap = useMemo(() => {
    return new Map(images.map((image) => [image.slot, image]));
  }, [images]);

  function handleFileChange(slot: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setFileMap((prev) => ({
      ...prev,
      [slot]: file,
    }));
  }

  async function handleUpload(slot: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMsg("");

    const file = fileMap[slot] ?? null;
    const alt = (altMap[slot] ?? "").trim();

    if (!file) {
      setMsg("請先選擇圖片檔案。");
      return;
    }

    setUploadingMap((prev) => ({
      ...prev,
      [slot]: true,
    }));

    try {
      const formData = new FormData();
      formData.append("slot", slot);
      formData.append("alt", alt);
      formData.append("file", file);

      const res = await fetch("/api/admin/site-images/upload", {
        method: "POST",
        body: formData,
      });

      const raw: unknown = await res.json().catch(() => null);
      const data = isUploadResponse(raw) ? raw : null;

      if (!data || data.ok !== true || !data.image) {
        throw new Error(String(data?.error ?? "UPLOAD_FAILED"));
      }

      setFileMap((prev) => ({
        ...prev,
        [slot]: null,
      }));

      const input = document.getElementById(`site-image-file-${slot}`) as HTMLInputElement | null;
      if (input) input.value = "";

      await load();
      setMsg("✅ 圖片已上傳並更新。");
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "圖片上傳失敗");
    } finally {
      setUploadingMap((prev) => ({
        ...prev,
        [slot]: false,
      }));
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Link
          href="/admin"
          style={{ textDecoration: "underline", fontWeight: 700, width: "fit-content" }}
        >
          ← 回後台首頁
        </Link>

        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>站點圖片管理</h1>
          <p style={{ marginTop: 8, color: "#666", lineHeight: 1.7 }}>
            目前已接上首頁主圖資料讀取與正式上傳。上傳後會先壓縮，再存入 Blob 與資料庫。
          </p>
        </div>
      </div>

      <section
        style={{
          marginTop: 20,
          border: "1px solid #e5e5e5",
          borderRadius: 16,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr 280px",
            gap: 16,
            padding: 16,
            background: "#fafafa",
            borderBottom: "1px solid #eee",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          <div>圖片欄位</div>
          <div>說明 / 現況</div>
          <div>操作</div>
        </div>

        {loading ? (
          <div style={{ padding: 16, color: "#777" }}>讀取中…</div>
        ) : (
          imageSlots.map((slot) => {
            const image = imageMap.get(slot.key);
            const uploading = Boolean(uploadingMap[slot.key]);
            const selectedFile = fileMap[slot.key] ?? null;
            const altValue = altMap[slot.key] ?? image?.alt ?? "";

            return (
              <div
                key={slot.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr 280px",
                  gap: 16,
                  padding: 16,
                  borderBottom: "1px solid #f1f1f1",
                  alignItems: "start",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>{slot.title}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#777" }}>{slot.key}</div>
                </div>

                <div style={{ color: "#555", lineHeight: 1.7 }}>
                  <div>{slot.description}</div>

                  {image ? (
                    <div
                      style={{
                        marginTop: 12,
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 12,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontWeight: 800, color: "#333" }}>{image.originalName}</div>

                      {image.url ? (
                        <div style={{ marginTop: 10 }}>
                          <img
                            src={image.url}
                            alt={image.alt || image.originalName}
                            style={{
                              width: "100%",
                              maxWidth: 360,
                              borderRadius: 10,
                              border: "1px solid #e5e5e5",
                              display: "block",
                            }}
                          />
                        </div>
                      ) : null}

                      <div style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
                        尺寸：{formatDimension(image.width, image.height)}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "#666" }}>
                        原始大小：{formatBytes(image.sizeBytes)}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "#666" }}>
                        壓縮後大小：{formatBytes(image.compressedBytes)}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "#666" }}>
                        MIME：{image.mimeType || "-"}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "#666" }}>
                        啟用狀態：{image.isActive ? "啟用中" : "未啟用"}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "#666" }}>
                        ALT：{image.alt || "-"}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: "#888", wordBreak: "break-all" }}>
                        URL：{image.url}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid #ddd",
                        background: "#fafafa",
                        fontSize: 13,
                        color: "#777",
                      }}
                    >
                      目前尚無圖片資料
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <form
                    onSubmit={(event) => {
                      void handleUpload(slot.key, event);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      border: "1px solid #e5e5e5",
                      borderRadius: 12,
                      padding: 12,
                      background: "#fafafa",
                    }}
                  >
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>選擇圖片</span>
                      <input
                        id={`site-image-file-${slot.key}`}
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleFileChange(slot.key, event)}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>ALT 文字</span>
                      <input
                        value={altValue}
                        onChange={(event) =>
                          setAltMap((prev) => ({
                            ...prev,
                            [slot.key]: event.target.value,
                          }))
                        }
                        placeholder="例如：首頁主圖"
                        style={{
                          width: "100%",
                          padding: 10,
                          border: "1px solid #ddd",
                          borderRadius: 10,
                          fontSize: 14,
                          background: "#fff",
                        }}
                      />
                    </label>

                    {selectedFile ? (
                      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
                        已選擇：{selectedFile.name}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={uploading}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid #222",
                        background: "#fff",
                        fontWeight: 800,
                        cursor: uploading ? "not-allowed" : "pointer",
                      }}
                    >
                      {uploading ? "上傳中…" : "上傳圖片"}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => {
                      void load();
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #222",
                      background: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    重新讀取
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      <section
        style={{
          marginTop: 20,
          border: "1px solid #e5e5e5",
          borderRadius: 16,
          padding: 16,
          background: "#fff",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>接下來要接的功能</div>

        <div style={{ display: "grid", gap: 10, color: "#555", lineHeight: 1.7 }}>
          <div>1. 首頁 app/page.tsx 改為讀取 HOME_HERO</div>
          <div>2. 商品 ProductImage 上傳 API 與後台管理頁</div>
          <div>3. 商品頁 /cakes/[slug] 改為顯示商品圖片</div>
        </div>
      </section>

      {msg ? (
        <div
          style={{
            marginTop: 12,
            whiteSpace: "pre-wrap",
            color: msg.startsWith("✅") ? "#0a7" : "#b00020",
          }}
        >
          {msg}
        </div>
      ) : null}
    </main>
  );
}
