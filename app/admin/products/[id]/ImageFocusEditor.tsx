"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type Props = {
  imageUrl: string;
  alt: string;
  initialFocusX: number;
  initialFocusY: number;
  initialZoom: number;
  disabled?: boolean;
  onSave: (focusX: number, focusY: number, zoom: number) => Promise<void> | void;
};

const ZOOM_MIN = 50;
const ZOOM_MAX = 250;
const ZOOM_STEP = 10;
const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200, 250];
const BOX_RATIO = 4 / 3;

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 50;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function clampZoom(value: number) {
  if (!Number.isFinite(value)) return 100;
  if (value < ZOOM_MIN) return ZOOM_MIN;
  if (value > ZOOM_MAX) return ZOOM_MAX;
  return Math.round(value);
}

export default function ImageFocusEditor({
  imageUrl,
  alt,
  initialFocusX,
  initialFocusY,
  initialZoom,
  disabled = false,
  onSave,
}: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const zoomInputId = useId();

  const [dragging, setDragging] = useState(false);
  const [focusX, setFocusX] = useState(clampPercent(initialFocusX));
  const [focusY, setFocusY] = useState(clampPercent(initialFocusY));
  const [zoom, setZoom] = useState(clampZoom(initialZoom));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setFocusX(clampPercent(initialFocusX));
    setFocusY(clampPercent(initialFocusY));
    setZoom(clampZoom(initialZoom));
  }, [initialFocusX, initialFocusY, initialZoom]);

  function updateFromPointer(clientX: number, clientY: number) {
    const box = boxRef.current;
    if (!box) return;

    const rect = box.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    setFocusX(clampPercent(x));
    setFocusY(clampPercent(y));
    setMsg("");
  }

  function applyZoom(nextZoom: number) {
    setZoom(clampZoom(nextZoom));
    setMsg("");
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");

    try {
      await onSave(focusX, focusY, zoom);
      setMsg("✅ 已儲存中心與縮放");
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  const isBusy = disabled || saving;

  const imageLayout = useMemo(() => {
    const sourceWidth = naturalSize?.width ?? BOX_RATIO * 1000;
    const sourceHeight = naturalSize?.height ?? 1000;
    const sourceRatio = sourceWidth / sourceHeight;

    let baseWidthPercent = 100;
    let baseHeightPercent = 100;

    if (sourceRatio > BOX_RATIO) {
      baseHeightPercent = 100;
      baseWidthPercent = (sourceRatio / BOX_RATIO) * 100;
    } else {
      baseWidthPercent = 100;
      baseHeightPercent = (BOX_RATIO / sourceRatio) * 100;
    }

    const scaledWidthPercent = baseWidthPercent * (zoom / 100);
    const scaledHeightPercent = baseHeightPercent * (zoom / 100);

    const leftPercent = 50 - (focusX / 100) * scaledWidthPercent;
    const topPercent = 50 - (focusY / 100) * scaledHeightPercent;

    return {
      widthPercent: scaledWidthPercent,
      heightPercent: scaledHeightPercent,
      leftPercent,
      topPercent,
    };
  }, [focusX, focusY, naturalSize, zoom]);

  return (
    <div>
      <div
        ref={boxRef}
        onPointerDown={(event) => {
          if (isBusy) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          updateFromPointer(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (!dragging || isBusy) return;
          updateFromPointer(event.clientX, event.clientY);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4 / 3",
          background:
            "linear-gradient(45deg, #f7f7f7 25%, #f1f1f1 25%, #f1f1f1 50%, #f7f7f7 50%, #f7f7f7 75%, #f1f1f1 75%, #f1f1f1 100%)",
          backgroundSize: "20px 20px",
          borderRadius: 12,
          overflow: "hidden",
          cursor: isBusy ? "default" : dragging ? "grabbing" : "grab",
          touchAction: "none",
          border: "1px solid #eee",
        }}
      >
        <img
          src={imageUrl}
          alt={alt}
          draggable={false}
          onLoad={(event) => {
            const img = event.currentTarget;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setNaturalSize({
                width: img.naturalWidth,
                height: img.naturalHeight,
              });
            }
          }}
          style={{
            position: "absolute",
            left: `${imageLayout.leftPercent}%`,
            top: `${imageLayout.topPercent}%`,
            width: `${imageLayout.widthPercent}%`,
            height: `${imageLayout.heightPercent}%`,
            maxWidth: "none",
            userSelect: "none",
            pointerEvents: "none",
            transition: dragging
              ? "none"
              : "left 120ms ease, top 120ms ease, width 120ms ease, height 120ms ease",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(0,0,0,0.08), rgba(0,0,0,0) 20%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.08)), linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0) 20%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.08))",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: `${focusX}%`,
            top: `${focusY}%`,
            width: 22,
            height: 22,
            marginLeft: -11,
            marginTop: -11,
            borderRadius: 999,
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
            background: "rgba(255,255,255,0.25)",
            pointerEvents: "none",
          }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 6,
            flexWrap: "wrap",
          }}
        >
          <label
            htmlFor={zoomInputId}
            style={{ fontSize: 12, color: "#666", fontWeight: 600 }}
          >
            縮放：{zoom}%（固定外框，縮小時會露出更多照片範圍）
          </label>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => applyZoom(zoom - ZOOM_STEP)}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: "6px 10px",
                background: "#fff",
                fontWeight: 700,
                cursor: isBusy ? "not-allowed" : "pointer",
              }}
            >
              −
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => applyZoom(zoom + ZOOM_STEP)}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: "6px 10px",
                background: "#fff",
                fontWeight: 700,
                cursor: isBusy ? "not-allowed" : "pointer",
              }}
            >
              ＋
            </button>
          </div>
        </div>

        <input
          id={zoomInputId}
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={1}
          value={zoom}
          disabled={isBusy}
          onChange={(event) => applyZoom(Number(event.target.value))}
          style={{ width: "100%" }}
        />

        <div
          style={{
            marginTop: 6,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#888",
          }}
        >
          <span>{ZOOM_MIN}%</span>
          <span>100%</span>
          <span>{ZOOM_MAX}%</span>
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {ZOOM_PRESETS.map((preset) => {
            const active = zoom === preset;

            return (
              <button
                key={preset}
                type="button"
                disabled={isBusy}
                onClick={() => applyZoom(preset)}
                style={{
                  border: active ? "1px solid #222" : "1px solid #ddd",
                  borderRadius: 999,
                  padding: "6px 10px",
                  background: active ? "#222" : "#fff",
                  color: active ? "#fff" : "#222",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isBusy ? "not-allowed" : "pointer",
                }}
              >
                {preset}%
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 12, color: "#666" }}>
          中心：X {focusX}% / Y {focusY}% ／ 縮放：{zoom}%
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              setFocusX(50);
              setFocusY(50);
              setZoom(100);
              setMsg("");
            }}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: "8px 10px",
              background: "#fff",
              fontWeight: 700,
              cursor: isBusy ? "not-allowed" : "pointer",
            }}
          >
            回到預設
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleSave()}
            style={{
              border: "1px solid #222",
              borderRadius: 10,
              padding: "8px 10px",
              background: "#fff",
              fontWeight: 800,
              cursor: isBusy ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "儲存中…" : "儲存中心與縮放"}
          </button>
        </div>
      </div>

      {msg ? (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: msg.startsWith("✅") ? "#166534" : "#b00020",
            whiteSpace: "pre-wrap",
          }}
        >
          {msg}
        </div>
      ) : null}
    </div>
  );
}