"use client";

import { useState, useRef, useCallback } from "react";
import {
  VARIETIES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  FLAVOR_DIMS,
  type Variety,
  type FlavorCategory,
  type FlavorScores,
} from "./data";

// ─── Chart geometry ────────────────────────────────────────────────────────────
const W = 820;
const H = 580;
const PAD = { top: 28, right: 40, bottom: 52, left: 52 };
const PLOT_W = W - PAD.left - PAD.right;  // 728
const PLOT_H = H - PAD.top - PAD.bottom;  // 500
const MIN_V = 3;
const MAX_V = 10;
const RANGE = MAX_V - MIN_V;

function cx(acidity: number) {
  return PAD.left + ((acidity - MIN_V) / RANGE) * PLOT_W;
}
function cy(body: number) {
  return PAD.top + (1 - (body - MIN_V) / RANGE) * PLOT_H;
}
function bubbleR(sweetness: number) {
  if (sweetness >= 7) return 28;
  if (sweetness >= 5.5) return 20;
  return 14;
}

const GRID_TICKS = [3, 4, 5, 6, 7, 8, 9, 10];

// ─── Radar chart geometry ──────────────────────────────────────────────────────
const RADAR_SIZE = 220;
const RADAR_LEVELS = 5;
const RADAR_DIMS = FLAVOR_DIMS;

function radarPoint(angle: number, value: number, maxVal = 10, r = 88) {
  const ratio = value / maxVal;
  return {
    x: RADAR_SIZE / 2 + r * ratio * Math.sin(angle),
    y: RADAR_SIZE / 2 - r * ratio * Math.cos(angle),
  };
}

function polygonPath(scores: FlavorScores) {
  const n = RADAR_DIMS.length;
  return RADAR_DIMS.map((d, i) => {
    const angle = (2 * Math.PI * i) / n;
    const p = radarPoint(angle, scores[d.key]);
    return `${i === 0 ? "M" : "L"}${p.x},${p.y}`;
  }).join(" ") + "Z";
}

// ─── Component ─────────────────────────────────────────────────────────────────
type Mode = "vendor" | "user";
type Category = "all" | FlavorCategory;

export default function CoffeeGuideClient() {
  const [mode, setMode] = useState<Mode>("vendor");
  const [category, setCategory] = useState<Category>("all");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const scores = useCallback(
    (v: Variety): FlavorScores => (mode === "vendor" ? v.vendor : v.user),
    [mode]
  );

  const visible = VARIETIES.filter(
    (v) => category === "all" || v.category === category
  );

  const selectedVariety = selectedId
    ? VARIETIES.find((v) => v.id === selectedId) ?? null
    : null;

  const hoveredVariety = hoverId
    ? VARIETIES.find((v) => v.id === hoverId) ?? null
    : null;

  function handleBubbleEnter(v: Variety, e: React.MouseEvent<SVGCircleElement>) {
    setHoverId(v.id);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }

  function handleBubbleLeave() {
    setHoverId(null);
    setTooltip(null);
  }

  const CATEGORIES: Category[] = [
    "all",
    "floral",
    "fruity",
    "sweet",
    "chocolate",
    "balanced",
    "bold",
  ];

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#141008",
        color: "#f0e8d4",
        fontFamily: "'Noto Sans TC', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          padding: "28px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          overflowY: "auto",
        }}
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", opacity: 0.5, marginBottom: 12 }}>
            依風味類別篩選
          </div>
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            const color = cat === "all" ? "#9ca3af" : CATEGORY_COLORS[cat as FlavorCategory];
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  marginBottom: 4,
                  borderRadius: 10,
                  border: active ? `1px solid ${color}` : "1px solid transparent",
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  color: active ? "#fff" : "rgba(240,232,212,0.75)",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: active ? 700 : 400,
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                  }}
                />
                {cat === "all" ? "全部品種" : CATEGORY_LABELS[cat as FlavorCategory]}
              </button>
            );
          })}
        </div>

        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", opacity: 0.5, marginBottom: 12 }}>
            氣泡大小
          </div>
          {[
            { label: "甜感低", r: 7 },
            { label: "甜感中", r: 11 },
            { label: "甜感高", r: 15 },
          ].map(({ label, r }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
                fontSize: 13,
                opacity: 0.75,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: r * 2,
                  height: r * 2,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.25)",
                  flexShrink: 0,
                }}
              />
              {label}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>說明</div>
          點擊氣泡查看詳細風味雷達圖。
          <br />
          滑鼠懸停預覽風味條目。
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 28px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>阿拉比卡品種風味分布</div>
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 3 }}>
              {visible.length} 個品種 · 點擊氣泡查看雷達圖
            </div>
          </div>

          {/* Mode toggle */}
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.08)",
              borderRadius: 10,
              padding: 3,
            }}
          >
            {(["vendor", "user"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "7px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: mode === m ? "rgba(255,255,255,0.15)" : "transparent",
                  color: mode === m ? "#fff" : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: mode === m ? 700 : 400,
                  transition: "all 0.15s",
                }}
              >
                {m === "vendor" ? "商家資訊" : "用戶感想"}
              </button>
            ))}
          </div>
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, position: "relative", padding: "12px 16px 0" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            {/* Grid lines */}
            {GRID_TICKS.map((t) => (
              <g key={t}>
                <line
                  x1={cx(t)} y1={PAD.top}
                  x2={cx(t)} y2={PAD.top + PLOT_H}
                  stroke="rgba(255,255,255,0.07)" strokeWidth={1}
                />
                <line
                  x1={PAD.left} y1={cy(t)}
                  x2={PAD.left + PLOT_W} y2={cy(t)}
                  stroke="rgba(255,255,255,0.07)" strokeWidth={1}
                />
                <text x={cx(t)} y={PAD.top + PLOT_H + 18} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={11}>{t}</text>
                <text x={PAD.left - 8} y={cy(t) + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize={11}>{t}</text>
              </g>
            ))}

            {/* Zone labels */}
            <text x={cx(3.8)} y={cy(9.5)} fill="rgba(255,255,255,0.18)" fontSize={13} fontWeight="700">渾郁複雜</text>
            <text x={cx(8.2)} y={cy(9.5)} fill="rgba(255,255,255,0.18)" fontSize={13} fontWeight="700">澄亮高酸</text>
            <text x={cx(3.5)} y={cy(3.2)} fill="rgba(255,255,255,0.12)" fontSize={11}>醇厚低酸</text>

            {/* Bubbles */}
            {visible.map((v) => {
              const s = scores(v);
              const bx = cx(s.acidity);
              const by = cy(s.body);
              const r = bubbleR(s.sweetness);
              const color = CATEGORY_COLORS[v.category];
              const isHovered = hoverId === v.id;
              const isSelected = selectedId === v.id;

              return (
                <g key={v.id}>
                  <circle
                    cx={bx} cy={by} r={r}
                    fill={color}
                    fillOpacity={isHovered || isSelected ? 0.9 : 0.68}
                    stroke={isHovered || isSelected ? "#fff" : color}
                    strokeWidth={isHovered || isSelected ? 2 : 1}
                    strokeOpacity={isHovered || isSelected ? 0.8 : 0.5}
                    style={{ cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={(e) => handleBubbleEnter(v, e)}
                    onMouseLeave={handleBubbleLeave}
                    onClick={() => setSelectedId(v.id)}
                  />
                  <text
                    x={bx} y={by + r + 13}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.75)"
                    fontSize={11}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {v.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip */}
          {hoveredVariety && tooltip && (
            <div
              style={{
                position: "absolute",
                left: tooltip.x + 14,
                top: tooltip.y - 10,
                background: "rgba(20,16,8,0.95)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 12,
                pointerEvents: "none",
                zIndex: 10,
                minWidth: 180,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                {hoveredVariety.name}
                <span style={{ opacity: 0.5, fontWeight: 400, fontSize: 11, marginLeft: 6 }}>
                  {hoveredVariety.nameEn}
                </span>
              </div>
              <div style={{ opacity: 0.6, marginBottom: 6, fontSize: 11 }}>
                {hoveredVariety.origins.join("・")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(mode === "vendor" ? hoveredVariety.vendorNotes : hoveredVariety.userNotes).map((n) => (
                  <span
                    key={n}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontSize: 11,
                    }}
                  >
                    {n}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 6, opacity: 0.4, fontSize: 10 }}>點擊查看雷達圖</div>
            </div>
          )}
        </div>

        {/* Footer axis labels */}
        <div
          style={{
            textAlign: "center",
            padding: "8px 0 12px",
            fontSize: 11,
            opacity: 0.45,
            letterSpacing: "0.06em",
          }}
        >
          ↑ 醇厚度 Full Body　｜　酸度 Acidity →
          　（資料依據 SCA 品評標準及產地研究綜合整理）
        </div>
      </main>

      {/* ── Radar Modal ── */}
      {selectedVariety && (
        <div
          onClick={() => setSelectedId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1c140a",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 20,
              padding: "28px 32px",
              width: 480,
              maxWidth: "90vw",
            }}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{selectedVariety.name}</div>
                <div style={{ opacity: 0.5, fontSize: 13, marginTop: 2 }}>{selectedVariety.nameEn}</div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.55 }}>
                  {selectedVariety.origins.join(" · ")}
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                ✕ 關閉
              </button>
            </div>

            {/* Mode tabs inside modal */}
            <div
              style={{
                display: "flex",
                background: "rgba(255,255,255,0.07)",
                borderRadius: 9,
                padding: 3,
                marginBottom: 20,
                width: "fit-content",
              }}
            >
              {(["vendor", "user"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 7,
                    border: "none",
                    background: mode === m ? "rgba(255,255,255,0.15)" : "transparent",
                    color: mode === m ? "#fff" : "rgba(255,255,255,0.45)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: mode === m ? 700 : 400,
                  }}
                >
                  {m === "vendor" ? "商家描述" : "用戶感想"}
                </button>
              ))}
            </div>

            {/* Radar chart */}
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
              <RadarChart variety={selectedVariety} mode={mode} />

              <div style={{ flex: 1 }}>
                {/* Lineage */}
                <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 12, lineHeight: 1.6 }}>
                  {selectedVariety.lineage}
                </div>

                {/* Flavor notes */}
                <div style={{ fontSize: 11, opacity: 0.45, marginBottom: 6, letterSpacing: "0.06em" }}>
                  {mode === "vendor" ? "商家風味描述" : "社群風味回饋"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {(mode === "vendor"
                    ? selectedVariety.vendorNotes
                    : selectedVariety.userNotes
                  ).map((n) => (
                    <span
                      key={n}
                      style={{
                        background: `${CATEGORY_COLORS[selectedVariety.category]}33`,
                        border: `1px solid ${CATEGORY_COLORS[selectedVariety.category]}55`,
                        borderRadius: 7,
                        padding: "3px 10px",
                        fontSize: 12,
                        color: "#f0e8d4",
                      }}
                    >
                      {n}
                    </span>
                  ))}
                </div>

                {/* Scores table */}
                <div style={{ marginTop: 16 }}>
                  {FLAVOR_DIMS.map((d) => {
                    const s = mode === "vendor" ? selectedVariety.vendor : selectedVariety.user;
                    const val = s[d.key];
                    return (
                      <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 60, fontSize: 11, opacity: 0.6, flexShrink: 0 }}>{d.label}</div>
                        <div
                          style={{
                            flex: 1,
                            height: 4,
                            background: "rgba(255,255,255,0.1)",
                            borderRadius: 2,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${((val - 1) / 9) * 100}%`,
                              background: CATEGORY_COLORS[selectedVariety.category],
                              borderRadius: 2,
                            }}
                          />
                        </div>
                        <div style={{ width: 24, fontSize: 11, opacity: 0.5, textAlign: "right" }}>
                          {val}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────

function RadarChart({ variety, mode }: { variety: Variety; mode: Mode }) {
  const n = RADAR_DIMS.length;
  const r = 88;
  const cx = RADAR_SIZE / 2;
  const cy = RADAR_SIZE / 2;

  const vendorPath = polygonPath(variety.vendor);
  const userPath = polygonPath(variety.user);
  const color = CATEGORY_COLORS[variety.category];

  return (
    <svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} style={{ flexShrink: 0 }}>
      {/* Concentric level polygons */}
      {Array.from({ length: RADAR_LEVELS }, (_, lvl) => {
        const ratio = (lvl + 1) / RADAR_LEVELS;
        const points = RADAR_DIMS.map((_, i) => {
          const angle = (2 * Math.PI * i) / n;
          return `${cx + r * ratio * Math.sin(angle)},${cy - r * ratio * Math.cos(angle)}`;
        }).join(" ");
        return (
          <polygon
            key={lvl}
            points={points}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
        );
      })}

      {/* Axis lines */}
      {RADAR_DIMS.map((d, i) => {
        const angle = (2 * Math.PI * i) / n;
        const x2 = cx + r * Math.sin(angle);
        const y2 = cy - r * Math.cos(angle);
        return <line key={d.key} x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />;
      })}

      {/* Vendor polygon (always shown, dimmed if user mode) */}
      <path
        d={vendorPath}
        fill={color}
        fillOpacity={mode === "vendor" ? 0.3 : 0.12}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={mode === "vendor" ? 0.85 : 0.3}
      />

      {/* User polygon (always shown, dimmed if vendor mode) */}
      <path
        d={userPath}
        fill="#64748b"
        fillOpacity={mode === "user" ? 0.3 : 0.08}
        stroke="#94a3b8"
        strokeWidth={1.5}
        strokeDasharray="4 2"
        strokeOpacity={mode === "user" ? 0.85 : 0.25}
      />

      {/* Axis labels */}
      {RADAR_DIMS.map((d, i) => {
        const angle = (2 * Math.PI * i) / n;
        const labelR = r + 18;
        const lx = cx + labelR * Math.sin(angle);
        const ly = cy - labelR * Math.cos(angle);
        return (
          <text
            key={d.key}
            x={lx} y={ly + 4}
            textAnchor="middle"
            fill="rgba(255,255,255,0.45)"
            fontSize={10}
          >
            {d.label}
          </text>
        );
      })}

      {/* Legend dots */}
      <circle cx={8} cy={RADAR_SIZE - 18} r={4} fill={color} fillOpacity={0.8} />
      <text x={16} y={RADAR_SIZE - 14} fill="rgba(255,255,255,0.45)" fontSize={9}>商家</text>
      <circle cx={50} cy={RADAR_SIZE - 18} r={4} fill="#94a3b8" fillOpacity={0.7} />
      <text x={58} y={RADAR_SIZE - 14} fill="rgba(255,255,255,0.45)" fontSize={9}>用戶</text>
    </svg>
  );
}
