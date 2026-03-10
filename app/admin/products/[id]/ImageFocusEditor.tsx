"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type Props = {
  imageUrl: string;
  alt: string;
  initialFocusX: number;
  initialFocusY: number;
  disabled?: boolean;
  onSave: (focusX: number, focusY: number) => Promise<void> | void;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 50;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

export default function ImageFocusEditor({
  imageUrl,
  alt,
  initialFocusX,
  initialFocusY,
  disabled = false,
  onSave,
}: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [focusX, setFocusX] = useState(initialFocusX);
  const [focusY, setFocusY] = useState(initialFocusY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function updateFromPointer(clientX: number, clientY: number) {
    const box = boxRef.current;
    if (!box) return;

    const rect = box.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    setFocusX(clampPercent(x));
    setFocusY(clampPercent(y));
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");

    try {
      await onSave(focusX, focusY);
      setMsg("✅ 已儲存中心");
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div
        ref={boxRef}
        onMouseDown={(event) => {
          if (disabled || saving) return;
          setDragging(true);
          updateFromPointer(event.clientX, event.clientY);
        }}
        onMouseMove={(event) => {
          if (!dragging || disabled || saving) return;
          updateFromPointer(event.clientX, event.clientY);
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={(event) => {
          if (disabled || saving) return;
          const touch = event.touches[0];
          if (!touch) return;
          setDragging(true);
          updateFromPointer(touch.clientX, touch.clientY);
        }}
        onTouchMove={(event) => {
          if (disabled || saving) return;
          const touch = event.touches[0];
          if (!touch) return;
          updateFromPointer(touch.clientX, touch.clientY);
        }}
        onTouchEnd={() => setDragging(false)}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4 / 3",
          background: "#f5f5f5",
          borderRadius: 12,
          overflow: "hidden",
          cursor: disabled || saving ? "default" : "grab",
          touchAction: "none",
          border: "1px solid #eee",
        }}
      >
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="320px"
          style={{
            objectFit: "cover",
            objectPosition: `${focusX}% ${focusY}%`,
            userSelect: "none",
            pointerEvents: "none",
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
          中心：X {focusX}% / Y {focusY}%
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={disabled || saving}
            onClick={() => {
              setFocusX(50);
              setFocusY(50);
              setMsg("");
            }}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: "8px 10px",
              background: "#fff",
              fontWeight: 700,
              cursor: disabled || saving ? "not-allowed" : "pointer",
            }}
          >
            回到中央
          </button>

          <button
            type="button"
            disabled={disabled || saving}
            onClick={() => void handleSave()}
            style={{
              border: "1px solid #222",
              borderRadius: 10,
              padding: "8px 10px",
              background: "#fff",
              fontWeight: 800,
              cursor: disabled || saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "儲存中…" : "儲存中心"}
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