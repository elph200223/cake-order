"use client";

import { useState } from "react";

export type OptionRowOption = {
  id: number;
  optionGroupId: number;
  name: string;
  priceDelta: number;
  priceType: string;
  priceMultiplier: number;
  sort: number;
  isActive: boolean;
};

type OptionMutationResponse = {
  ok?: boolean;
  error?: unknown;
  detail?: unknown;
};

function isOptionMutationResponse(value: unknown): value is OptionMutationResponse {
  return typeof value === "object" && value !== null;
}

export default function OptionRow({
  option,
  onChanged,
  setMsg,
}: {
  option: OptionRowOption;
  onChanged: () => Promise<void>;
  setMsg: (msg: string) => void;
}) {
  const [name, setName] = useState(option.name);
  const [priceType, setPriceType] = useState(option.priceType ?? "delta");
  const [priceDelta, setPriceDelta] = useState(String(option.priceDelta));
  const [priceMultiplier, setPriceMultiplier] = useState(String(option.priceMultiplier ?? 1));
  const [sort, setSort] = useState(String(option.sort));
  const [isActive, setIsActive] = useState(Boolean(option.isActive));
  const [busy, setBusy] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 8,
    border: "1px solid #ddd",
    borderRadius: 10,
    fontSize: 14,
    background: "#fff",
  };

  async function save() {
    setMsg("");
    setBusy(true);

    try {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("選項名稱不能空白");

      const pd = Number(priceDelta);
      const pm = Number(priceMultiplier);
      const s = Number(sort);

      if (!Number.isFinite(pd)) throw new Error("priceDelta 不正確");
      if (!Number.isFinite(pm) || pm <= 0) throw new Error("乘數必須大於 0");
      if (!Number.isFinite(s)) throw new Error("sort 不正確");

      const res = await fetch(`/api/admin/options/${option.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          priceType,
          priceDelta: Math.trunc(pd),
          priceMultiplier: pm,
          sort: Math.trunc(s),
          isActive,
        }),
      });

      const raw: unknown = await res.json().catch(() => null);
      const data = isOptionMutationResponse(raw) ? raw : null;

      if (!data || data.ok !== true) {
        throw new Error(String(data?.detail ?? data?.error ?? "UPDATE_FAILED"));
      }

      await onChanged();
      setMsg("✅ 已儲存選項");
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "儲存選項失敗");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setMsg("");
    setBusy(true);

    try {
      if (!confirm(`確定刪除選項「${option.name}」？`)) return;

      const res = await fetch(`/api/admin/options/${option.id}`, {
        method: "DELETE",
      });

      const raw: unknown = await res.json().catch(() => null);
      const data = isOptionMutationResponse(raw) ? raw : null;

      if (!data || data.ok !== true) {
        throw new Error(String(data?.detail ?? data?.error ?? "DELETE_FAILED"));
      }

      await onChanged();
      setMsg("✅ 已刪除選項");
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "刪除選項失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{option.id}</td>

      <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </td>

      <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              type="button"
              onClick={() => setPriceType("delta")}
              style={{
                flex: 1,
                padding: "4px 0",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: priceType === "delta" ? "#222" : "#fff",
                color: priceType === "delta" ? "#fff" : "#444",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              加減金額
            </button>
            <button
              type="button"
              onClick={() => setPriceType("multiplier")}
              style={{
                flex: 1,
                padding: "4px 0",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: priceType === "multiplier" ? "#222" : "#fff",
                color: priceType === "multiplier" ? "#fff" : "#444",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              乘數
            </button>
          </div>

          {priceType === "delta" ? (
            <input
              value={priceDelta}
              onChange={(e) => setPriceDelta(e.target.value)}
              style={inputStyle}
              inputMode="numeric"
              placeholder="例：100 或 -50"
            />
          ) : (
            <input
              value={priceMultiplier}
              onChange={(e) => setPriceMultiplier(e.target.value)}
              style={inputStyle}
              inputMode="decimal"
              placeholder="例：2 或 0.9 或 0.5"
            />
          )}
          <div style={{ fontSize: 11, color: "#999" }}>
            {priceType === "delta"
              ? "在基礎價格上加減固定金額"
              : `基礎價格 × ${priceMultiplier || "?"}`}
          </div>
        </div>
      </td>

      <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
        <input
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={inputStyle}
          inputMode="numeric"
        />
      </td>

      <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          {isActive ? "Y" : "N"}
        </label>
      </td>

      <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            style={{
              border: "1px solid #222",
              borderRadius: 10,
              padding: "6px 10px",
              background: "#fff",
              fontWeight: 800,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            儲存
          </button>

          <button
            type="button"
            onClick={remove}
            disabled={busy}
            style={{
              border: "1px solid #d33",
              color: "#d33",
              borderRadius: 10,
              padding: "6px 10px",
              background: "#fff",
              fontWeight: 800,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            刪除
          </button>
        </div>
      </td>
    </tr>
  );
}
