"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import OptionRow from "./OptionRow";

type Option = {
  id: number;
  optionGroupId: number;
  name: string;
  priceDelta: number;
  priceType: string;
  priceMultiplier: number;
  sort: number;
  isActive: boolean;
};

type OptionGroup = {
  id: number;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  sort: number;
  isActive: boolean;
  options: Option[];
};

type OptionGroupResponse = {
  ok?: boolean;
  group?: OptionGroup;
  error?: unknown;
  detail?: unknown;
};

type OptionMutationResponse = {
  ok?: boolean;
  error?: unknown;
  detail?: unknown;
};

function isOptionGroupResponse(value: unknown): value is OptionGroupResponse {
  return typeof value === "object" && value !== null;
}

function isOptionMutationResponse(value: unknown): value is OptionMutationResponse {
  return typeof value === "object" && value !== null;
}

export default function AdminOptionGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const groupId = Number(id);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [group, setGroup] = useState<OptionGroup | null>(null);

  const [groupName, setGroupName] = useState("");
  const [required, setRequired] = useState(false);
  const [minSelect, setMinSelect] = useState("0");
  const [maxSelect, setMaxSelect] = useState("1");
  const [groupSort, setGroupSort] = useState("0");
  const [groupActive, setGroupActive] = useState(true);
  const [savingGroup, setSavingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPriceType, setNewPriceType] = useState("delta");
  const [newPriceDelta, setNewPriceDelta] = useState("0");
  const [newPriceMultiplier, setNewPriceMultiplier] = useState("1");
  const [newSort, setNewSort] = useState("0");
  const [newActive, setNewActive] = useState(true);
  const [creatingOption, setCreatingOption] = useState(false);

  const inputStyle = useMemo<React.CSSProperties>(
    () => ({
      width: "100%",
      padding: 10,
      border: "1px solid #ddd",
      borderRadius: 12,
      fontSize: 14,
      background: "#fff",
    }),
    []
  );

  const load = useCallback(async () => {
    setMsg("");
    setLoading(true);

    try {
      if (!Number.isInteger(groupId)) throw new Error("ID_INVALID");

      const res = await fetch(`/api/admin/option-groups/${groupId}`, {
        cache: "no-store",
      });

      const raw: unknown = await res.json().catch(() => null);
      const data = isOptionGroupResponse(raw) ? raw : null;

      if (!data || data.ok !== true || !data.group) {
        throw new Error(String(data?.detail ?? data?.error ?? "LOAD_FAILED"));
      }

      const g = data.group;
      setGroup(g);

      setGroupName(g.name);
      setRequired(Boolean(g.required));
      setMinSelect(String(g.minSelect));
      setMaxSelect(String(g.maxSelect));
      setGroupSort(String(g.sort));
      setGroupActive(Boolean(g.isActive));
    } catch (error: unknown) {
      setGroup(null);
      setMsg(error instanceof Error ? error.message : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveGroup() {
    setMsg("");
    setSavingGroup(true);

    try {
      if (!Number.isInteger(groupId)) throw new Error("ID_INVALID");

      const name = groupName.trim();
      if (!name) throw new Error("請輸入群組名稱");

      const min = Number(minSelect);
      const max = Number(maxSelect);
      const sort = Number(groupSort);

      if (!Number.isInteger(min) || min < 0) throw new Error("minSelect 不正確");
      if (!Number.isInteger(max) || max < 0) throw new Error("maxSelect 不正確");
      if (max !== 0 && max < min) throw new Error("maxSelect 不能小於 minSelect");
      if (!Number.isFinite(sort)) throw new Error("sort 不正確");

      const res = await fetch(`/api/admin/option-groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          required,
          minSelect: min,
          maxSelect: max,
          sort: Math.trunc(sort),
          isActive: groupActive,
        }),
      });

      const raw: unknown = await res.json().catch(() => null);
      const data = isOptionMutationResponse(raw) ? raw : null;

      if (!data || data.ok !== true) {
        throw new Error(String(data?.detail ?? data?.error ?? "UPDATE_FAILED"));
      }

      await load();
      setMsg("✅ 已儲存群組");
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "儲存群組失敗");
    } finally {
      setSavingGroup(false);
    }
  }

  async function deleteGroup() {
    setMsg("");
    setDeletingGroup(true);

    try {
      if (!Number.isInteger(groupId)) throw new Error("ID_INVALID");
      if (!confirm("確定要刪除這個群組？若仍有選項或商品綁定，可能會刪除失敗。")) return;

      const res = await fetch(`/api/admin/option-groups/${groupId}`, {
        method: "DELETE",
      });

      const raw: unknown = await res.json().catch(() => null);
      const data = isOptionMutationResponse(raw) ? raw : null;

      if (!data || data.ok !== true) {
        throw new Error(String(data?.detail ?? data?.error ?? "DELETE_FAILED"));
      }

      window.location.href = "/admin/options";
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "刪除群組失敗");
    } finally {
      setDeletingGroup(false);
    }
  }

  async function createOption() {
    setMsg("");
    setCreatingOption(true);

    try {
      if (!Number.isInteger(groupId)) throw new Error("ID_INVALID");

      const name = newName.trim();
      if (!name) throw new Error("請輸入選項名稱");

      const priceDelta = Number(newPriceDelta);
      const priceMultiplier = Number(newPriceMultiplier);
      const sort = Number(newSort);

      if (!Number.isFinite(priceDelta)) throw new Error("priceDelta 不正確");
      if (!Number.isFinite(priceMultiplier) || priceMultiplier <= 0) throw new Error("乘數必須大於 0");
      if (!Number.isFinite(sort)) throw new Error("sort 不正確");

      const res = await fetch(`/api/admin/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionGroupId: groupId,
          name,
          priceType: newPriceType,
          priceDelta: Math.trunc(priceDelta),
          priceMultiplier,
          sort: Math.trunc(sort),
          isActive: newActive,
        }),
      });

      const raw: unknown = await res.json().catch(() => null);
      const data = isOptionMutationResponse(raw) ? raw : null;

      if (!data || data.ok !== true) {
        throw new Error(String(data?.detail ?? data?.error ?? "CREATE_FAILED"));
      }

      setNewName("");
      setNewPriceType("delta");
      setNewPriceDelta("0");
      setNewPriceMultiplier("1");
      setNewSort("0");
      setNewActive(true);

      await load();
      setMsg("✅ 已新增選項");
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "新增選項失敗");
    } finally {
      setCreatingOption(false);
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ opacity: 0.75 }}>Loading…</div>
      </main>
    );
  }

  if (!group) {
    return (
      <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/admin/options" style={{ textDecoration: "underline", fontWeight: 700 }}>
          ← 回群組列表
        </Link>
        <div style={{ marginTop: 12, color: "#b00020", whiteSpace: "pre-wrap" }}>
          {msg || "找不到群組"}
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}>
        <div>
          <Link href="/admin/options" style={{ textDecoration: "underline", fontWeight: 700 }}>
            ← 回群組列表
          </Link>
          <h1 style={{ marginTop: 10, fontSize: 22, fontWeight: 900 }}>
            群組管理：{group.name} (ID {group.id})
          </h1>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={saveGroup}
            disabled={savingGroup}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #222",
              background: "#fff",
              fontWeight: 900,
              cursor: savingGroup ? "not-allowed" : "pointer",
            }}
          >
            {savingGroup ? "儲存中…" : "儲存群組"}
          </button>

          <button
            type="button"
            onClick={deleteGroup}
            disabled={deletingGroup}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #d33",
              color: "#d33",
              background: "#fff",
              fontWeight: 900,
              cursor: deletingGroup ? "not-allowed" : "pointer",
            }}
          >
            {deletingGroup ? "刪除中…" : "刪除群組"}
          </button>
        </div>
      </div>

      <section
        style={{
          marginTop: 14,
          border: "1px solid #e5e5e5",
          borderRadius: 14,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>群組設定</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>群組名稱</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>minSelect</label>
            <input
              value={minSelect}
              onChange={(e) => setMinSelect(e.target.value)}
              style={inputStyle}
              inputMode="numeric"
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>maxSelect</label>
            <input
              value={maxSelect}
              onChange={(e) => setMaxSelect(e.target.value)}
              style={inputStyle}
              inputMode="numeric"
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>sort</label>
            <input
              value={groupSort}
              onChange={(e) => setGroupSort(e.target.value)}
              style={inputStyle}
              inputMode="numeric"
            />
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
            />
            required
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={groupActive}
              onChange={(e) => setGroupActive(e.target.checked)}
            />
            isActive
          </label>
        </div>
      </section>

      <section
        style={{
          marginTop: 14,
          border: "1px solid #e5e5e5",
          borderRadius: 14,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>新增選項</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 120px auto", gap: 10 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>名稱</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>價格設定</label>
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
              <button
                type="button"
                onClick={() => setNewPriceType("delta")}
                style={{
                  flex: 1,
                  padding: "5px 0",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  background: newPriceType === "delta" ? "#222" : "#fff",
                  color: newPriceType === "delta" ? "#fff" : "#444",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                加減金額
              </button>
              <button
                type="button"
                onClick={() => setNewPriceType("multiplier")}
                style={{
                  flex: 1,
                  padding: "5px 0",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  background: newPriceType === "multiplier" ? "#222" : "#fff",
                  color: newPriceType === "multiplier" ? "#fff" : "#444",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                乘數
              </button>
            </div>
            {newPriceType === "delta" ? (
              <input
                value={newPriceDelta}
                onChange={(e) => setNewPriceDelta(e.target.value)}
                style={inputStyle}
                inputMode="numeric"
                placeholder="例：100 或 -50"
              />
            ) : (
              <input
                value={newPriceMultiplier}
                onChange={(e) => setNewPriceMultiplier(e.target.value)}
                style={inputStyle}
                inputMode="decimal"
                placeholder="例：2 或 0.9 或 0.5"
              />
            )}
            <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
              {newPriceType === "delta" ? "在基礎價格上加減固定金額" : `基礎價格 × ${newPriceMultiplier || "?"}`}
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>sort</label>
            <input
              value={newSort}
              onChange={(e) => setNewSort(e.target.value)}
              style={inputStyle}
              inputMode="numeric"
            />
          </div>

          <div style={{ display: "flex", alignItems: "end", gap: 10, flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={newActive}
                onChange={(e) => setNewActive(e.target.checked)}
              />
              isActive
            </label>

            <button
              type="button"
              onClick={createOption}
              disabled={creatingOption}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #222",
                background: "#fff",
                fontWeight: 900,
                cursor: creatingOption ? "not-allowed" : "pointer",
              }}
            >
              {creatingOption ? "新增中…" : "新增選項"}
            </button>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>選項列表</div>

        <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#fafafa", textAlign: "left" }}>
                <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 70 }}>ID</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>名稱</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 200 }}>價格設定</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 100 }}>sort</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 100 }}>active</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 180 }}>操作</th>
              </tr>
            </thead>

            <tbody>
              {group.options.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 14, opacity: 0.75 }}>
                    目前沒有選項
                  </td>
                </tr>
              ) : (
                group.options.map((option) => (
                  <OptionRow
                    key={option.id}
                    option={option}
                    onChanged={load}
                    setMsg={setMsg}
                  />
                ))
              )}
            </tbody>
          </table>
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