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
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
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

// ─── Radar geometry ────────────────────────────────────────────────────────────
const RADAR_SIZE = 220;
const RADAR_DIMS = FLAVOR_DIMS;

function polygonPath(scores: FlavorScores) {
  const n = RADAR_DIMS.length;
  return RADAR_DIMS.map((d, i) => {
    const angle = (2 * Math.PI * i) / n;
    const r = 88;
    const ratio = scores[d.key] / 10;
    const x = RADAR_SIZE / 2 + r * ratio * Math.sin(angle);
    const y = RADAR_SIZE / 2 - r * ratio * Math.cos(angle);
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ") + "Z";
}

// ─── Search matching ──────────────────────────────────────────────────────────
function matchesSearch(v: Variety, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    v.name.toLowerCase().includes(q) ||
    v.nameEn.toLowerCase().includes(q) ||
    v.id.toLowerCase().includes(q)
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type Mode = "vendor" | "user";
type Category = "all" | FlavorCategory;

// ─── Component ─────────────────────────────────────────────────────────────────
export default function CoffeeGuideClient() {
  const [mode, setMode] = useState<Mode>("vendor");
  const [category, setCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const scores = useCallback(
    (v: Variety): FlavorScores => (mode === "vendor" ? v.vendor : v.user),
    [mode]
  );

  // Varieties passing category filter
  const categoryFiltered = VARIETIES.filter(
    (v) => category === "all" || v.category === category
  );

  // Search highlight: true = match, false = dim
  const hasSearch = searchQuery.trim().length > 0;
  const searchMatches = new Set(
    VARIETIES.filter((v) => matchesSearch(v, searchQuery)).map((v) => v.id)
  );

  function getBubbleOpacity(v: Variety): number {
    const inCategory = category === "all" || v.category === category;
    if (!inCategory) return 0; // hidden by category filter
    if (!hasSearch) return 1;
    return searchMatches.has(v.id) ? 1 : 0.12;
  }

  function isHighlighted(v: Variety): boolean {
    return hasSearch && searchMatches.has(v.id);
  }

  function handleBubbleEnter(v: Variety, e: React.MouseEvent<SVGCircleElement>) {
    setHoverId(v.id);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function handleBubbleLeave() {
    setHoverId(null);
    setTooltip(null);
  }

  const hoveredVariety = hoverId ? VARIETIES.find((v) => v.id === hoverId) ?? null : null;
  const selectedVariety = selectedId ? VARIETIES.find((v) => v.id === selectedId) ?? null : null;

  const CATEGORIES: Category[] = ["all", "floral", "fruity", "sweet", "chocolate", "balanced", "bold"];

  // Render order: non-highlighted first, then highlighted on top
  const renderOrder = [...categoryFiltered].sort((a, b) => {
    const aH = isHighlighted(a) ? 1 : 0;
    const bH = isHighlighted(b) ? 1 : 0;
    return aH - bH;
  });

  return (
    <div style={{
      display: "flex", height: "100vh",
      background: "#141008", color: "#f0e8d4",
      fontFamily: "'Noto Sans TC', system-ui, sans-serif",
      overflow: "hidden",
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        borderRight: "1px solid rgba(255,255,255,0.08)",
        padding: "28px 20px",
        display: "flex", flexDirection: "column", gap: 24,
        overflowY: "auto",
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", opacity: 0.5, marginBottom: 12 }}>
            依風味類別篩選
          </div>
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            const color = cat === "all" ? "#9ca3af" : CATEGORY_COLORS[cat as FlavorCategory];
            return (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "7px 10px", marginBottom: 3,
                borderRadius: 10,
                border: active ? `1px solid ${color}` : "1px solid transparent",
                background: active ? "rgba(255,255,255,0.07)" : "transparent",
                color: active ? "#fff" : "rgba(240,232,212,0.75)",
                cursor: "pointer", fontSize: 13,
                fontWeight: active ? 700 : 400, textAlign: "left",
              }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
                {cat === "all" ? "全部品種" : CATEGORY_LABELS[cat as FlavorCategory]}
              </button>
            );
          })}
        </div>

        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", opacity: 0.5, marginBottom: 10 }}>氣泡大小</div>
          {[{ label: "甜感低", r: 7 }, { label: "甜感中", r: 11 }, { label: "甜感高", r: 15 }].map(({ label, r }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 12, opacity: 0.65 }}>
              <span style={{ display: "inline-block", width: r * 2, height: r * 2, borderRadius: "50%", background: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, opacity: 0.5, lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>說明</div>
          點擊氣泡查看雷達圖。<br />
          搜尋品種名稱定位位置。<br />
          共 {VARIETIES.length} 個阿拉比卡品種。
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.07)", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a
              href="/admin"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(240,232,212,0.75)",
                fontSize: 12, textDecoration: "none", flexShrink: 0,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <path d="M15 18 9 12l6-6" />
              </svg>
              後台
            </a>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>阿拉比卡品種風味分布</div>
              <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>
                顯示 {categoryFiltered.length} / {VARIETIES.length} 個品種
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ flex: 1, maxWidth: 300, position: "relative" }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋品種名稱（如：藝妓、SL28）"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.08)",
                border: searchQuery ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                color: "#f0e8d4",
                padding: "8px 36px 8px 14px",
                fontSize: 13,
                outline: "none",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "rgba(255,255,255,0.4)",
                  cursor: "pointer", fontSize: 14, lineHeight: 1,
                }}
              >✕</button>
            )}
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 3, flexShrink: 0 }}>
            {(["vendor", "user"] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: "7px 16px", borderRadius: 8, border: "none",
                background: mode === m ? "rgba(255,255,255,0.15)" : "transparent",
                color: mode === m ? "#fff" : "rgba(255,255,255,0.45)",
                cursor: "pointer", fontSize: 13,
                fontWeight: mode === m ? 700 : 400,
              }}>
                {m === "vendor" ? "商家資訊" : "用戶感想"}
              </button>
            ))}
          </div>
        </div>

        {/* Search result hint */}
        {hasSearch && (
          <div style={{
            padding: "6px 24px",
            fontSize: 12,
            background: "rgba(255,255,255,0.04)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            color: searchMatches.size > 0 ? "rgba(255,255,255,0.6)" : "#fb923c",
          }}>
            {searchMatches.size > 0
              ? `找到 ${searchMatches.size} 個品種：${[...searchMatches].map(id => VARIETIES.find(v => v.id === id)?.name).join("、")}`
              : `找不到「${searchQuery}」，請試試英文名或其他關鍵字`
            }
          </div>
        )}

        {/* Chart */}
        <div style={{ flex: 1, position: "relative", padding: "8px 12px 0" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            {/* Grid */}
            {GRID_TICKS.map((t) => (
              <g key={t}>
                <line x1={cx(t)} y1={PAD.top} x2={cx(t)} y2={PAD.top + PLOT_H} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
                <line x1={PAD.left} y1={cy(t)} x2={PAD.left + PLOT_W} y2={cy(t)} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
                <text x={cx(t)} y={PAD.top + PLOT_H + 18} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={11}>{t}</text>
                <text x={PAD.left - 8} y={cy(t) + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={11}>{t}</text>
              </g>
            ))}

            {/* Zone labels */}
            <text x={cx(3.8)} y={cy(9.5)} fill="rgba(255,255,255,0.15)" fontSize={12} fontWeight="700">渾郁複雜</text>
            <text x={cx(8.0)} y={cy(9.5)} fill="rgba(255,255,255,0.15)" fontSize={12} fontWeight="700">澄亮高酸</text>
            <text x={cx(3.5)} y={cy(3.3)} fill="rgba(255,255,255,0.1)" fontSize={11}>醇厚低酸</text>
            <text x={cx(8.5)} y={cy(3.3)} fill="rgba(255,255,255,0.1)" fontSize={11}>尖銳輕薄</text>

            {/* Bubbles — non-highlighted first, highlighted on top */}
            {renderOrder.map((v) => {
              const s = scores(v);
              const bx = cx(s.acidity);
              const by = cy(s.body);
              const r = bubbleR(s.sweetness);
              const color = CATEGORY_COLORS[v.category];
              const opacity = getBubbleOpacity(v);
              const highlighted = isHighlighted(v);
              const isHovered = hoverId === v.id;
              const isSelected = selectedId === v.id;

              if (opacity === 0) return null;

              return (
                <g key={v.id} style={{ opacity, transition: "opacity 0.2s" }}>
                  {/* Glow ring for search highlight */}
                  {highlighted && (
                    <circle cx={bx} cy={by} r={r + 6}
                      fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.4}
                      strokeDasharray="3 2"
                    />
                  )}
                  <circle
                    cx={bx} cy={by} r={r}
                    fill={color}
                    fillOpacity={isHovered || isSelected || highlighted ? 0.92 : 0.65}
                    stroke={isHovered || isSelected || highlighted ? "#fff" : color}
                    strokeWidth={isHovered || isSelected || highlighted ? 2 : 1}
                    strokeOpacity={isHovered || isSelected ? 0.9 : 0.5}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => handleBubbleEnter(v, e)}
                    onMouseLeave={handleBubbleLeave}
                    onClick={() => setSelectedId(v.id)}
                  />
                  <text
                    x={bx} y={by + r + 13}
                    textAnchor="middle"
                    fill={highlighted ? "#fff" : "rgba(255,255,255,0.7)"}
                    fontSize={highlighted ? 12 : 11}
                    fontWeight={highlighted ? 700 : 400}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {v.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoveredVariety && tooltip && (
            <div style={{
              position: "absolute",
              left: tooltip.x + 16, top: tooltip.y - 10,
              background: "rgba(20,16,8,0.97)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10, padding: "10px 14px",
              fontSize: 12, pointerEvents: "none", zIndex: 10, minWidth: 190,
            }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 3 }}>
                {hoveredVariety.name}
                <span style={{ opacity: 0.45, fontWeight: 400, fontSize: 11, marginLeft: 6 }}>
                  {hoveredVariety.nameEn}
                </span>
              </div>
              <div style={{ opacity: 0.5, marginBottom: 7, fontSize: 11 }}>
                {hoveredVariety.origins.join("・")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(mode === "vendor" ? hoveredVariety.vendorNotes : hoveredVariety.userNotes).map((n) => (
                  <span key={n} style={{
                    background: "rgba(255,255,255,0.1)", borderRadius: 6,
                    padding: "2px 8px", fontSize: 11,
                  }}>{n}</span>
                ))}
              </div>
              <div style={{ marginTop: 6, opacity: 0.35, fontSize: 10 }}>點擊查看雷達圖</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "6px 0 10px", fontSize: 11, opacity: 0.35, letterSpacing: "0.06em" }}>
          ↑ 醇厚度 Full Body　｜　酸度 Acidity →　（資料依據 SCA 品評標準及產地研究綜合整理）
        </div>
      </main>

      {/* ── Radar Modal ── */}
      {selectedVariety && (
        <div onClick={() => setSelectedId(null)} style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.72)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#1c140a",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 20, padding: "28px 32px",
            width: 500, maxWidth: "92vw",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{selectedVariety.name}</div>
                <div style={{ opacity: 0.45, fontSize: 13, marginTop: 2 }}>{selectedVariety.nameEn}</div>
                <div style={{ marginTop: 5, fontSize: 11, opacity: 0.5 }}>{selectedVariety.origins.join(" · ")}</div>
              </div>
              <button onClick={() => setSelectedId(null)} style={{
                background: "rgba(255,255,255,0.09)", border: "none",
                borderRadius: 8, color: "#fff", padding: "6px 12px",
                cursor: "pointer", fontSize: 12,
              }}>✕ 關閉</button>
            </div>

            {/* Mode tabs */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.07)", borderRadius: 9, padding: 3, marginBottom: 18, width: "fit-content" }}>
              {(["vendor", "user"] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: "6px 16px", borderRadius: 7, border: "none",
                  background: mode === m ? "rgba(255,255,255,0.15)" : "transparent",
                  color: mode === m ? "#fff" : "rgba(255,255,255,0.4)",
                  cursor: "pointer", fontSize: 12, fontWeight: mode === m ? 700 : 400,
                }}>
                  {m === "vendor" ? "商家描述" : "用戶感想"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
              <RadarChart variety={selectedVariety} mode={mode} />

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 12, lineHeight: 1.7 }}>
                  {selectedVariety.lineage}
                </div>
                <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 6, letterSpacing: "0.06em" }}>
                  {mode === "vendor" ? "商家風味描述" : "社群風味回饋"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
                  {(mode === "vendor" ? selectedVariety.vendorNotes : selectedVariety.userNotes).map((n) => (
                    <span key={n} style={{
                      background: `${CATEGORY_COLORS[selectedVariety.category]}33`,
                      border: `1px solid ${CATEGORY_COLORS[selectedVariety.category]}55`,
                      borderRadius: 7, padding: "3px 10px", fontSize: 12,
                    }}>{n}</span>
                  ))}
                </div>
                {FLAVOR_DIMS.map((d) => {
                  const s = mode === "vendor" ? selectedVariety.vendor : selectedVariety.user;
                  const val = s[d.key];
                  return (
                    <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 60, fontSize: 11, opacity: 0.55, flexShrink: 0 }}>{d.label}</div>
                      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${((val - 1) / 9) * 100}%`,
                          background: CATEGORY_COLORS[selectedVariety.category], borderRadius: 2,
                        }} />
                      </div>
                      <div style={{ width: 24, fontSize: 11, opacity: 0.45, textAlign: "right" }}>{val}</div>
                    </div>
                  );
                })}
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
  const c = RADAR_SIZE / 2;
  const color = CATEGORY_COLORS[variety.category];

  return (
    <svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} style={{ flexShrink: 0 }}>
      {/* Level polygons */}
      {[1, 2, 3, 4, 5].map((lvl) => {
        const ratio = lvl / 5;
        const pts = RADAR_DIMS.map((_, i) => {
          const a = (2 * Math.PI * i) / n;
          return `${c + r * ratio * Math.sin(a)},${c - r * ratio * Math.cos(a)}`;
        }).join(" ");
        return <polygon key={lvl} points={pts} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />;
      })}

      {/* Axes */}
      {RADAR_DIMS.map((_, i) => {
        const a = (2 * Math.PI * i) / n;
        return <line key={i} x1={c} y1={c} x2={c + r * Math.sin(a)} y2={c - r * Math.cos(a)} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />;
      })}

      {/* Vendor polygon */}
      <path d={polygonPath(variety.vendor)}
        fill={color} fillOpacity={mode === "vendor" ? 0.3 : 0.1}
        stroke={color} strokeWidth={1.5} strokeOpacity={mode === "vendor" ? 0.9 : 0.25}
      />
      {/* User polygon */}
      <path d={polygonPath(variety.user)}
        fill="#64748b" fillOpacity={mode === "user" ? 0.3 : 0.08}
        stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 2"
        strokeOpacity={mode === "user" ? 0.9 : 0.2}
      />

      {/* Axis labels */}
      {RADAR_DIMS.map((d, i) => {
        const a = (2 * Math.PI * i) / n;
        const lr = r + 18;
        return (
          <text key={d.key} x={c + lr * Math.sin(a)} y={c - lr * Math.cos(a) + 4}
            textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10}>
            {d.label}
          </text>
        );
      })}

      {/* Legend */}
      <circle cx={8} cy={RADAR_SIZE - 18} r={4} fill={color} fillOpacity={0.85} />
      <text x={16} y={RADAR_SIZE - 14} fill="rgba(255,255,255,0.4)" fontSize={9}>商家</text>
      <circle cx={50} cy={RADAR_SIZE - 18} r={4} fill="#94a3b8" fillOpacity={0.7} />
      <text x={58} y={RADAR_SIZE - 14} fill="rgba(255,255,255,0.4)" fontSize={9}>用戶</text>
    </svg>
  );
}
