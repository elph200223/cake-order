"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OptionGroup = {
  id: number;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  sort: number;
  isActive: boolean;
};

export default function AdminOptionsPage() {
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [name, setName] = useState("");
  const [required, setRequired] = useState(false);
  const [minSelect, setMinSelect] = useState("0");
  const [maxSelect, setMaxSelect] = useState("1");
  const [sort, setSort] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const inputStyle = useMemo<React.CSSProperties>(
    () => ({
      width: "100%",
      padding: 10,
      border: "1px solid #ddd",
      borderRadius: 12,
      fontSize: 14,
    }),
    []
  );

  async function load() {
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/option-groups", { cache: "no-store" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.detail || data?.error || "LIST_FAILED");
      setGroups(data.groups || []);
    } catch (e: any) {
      setMsg(e?.message ? String(e.message) : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate() {
    setMsg("");
    setCreating(true);
    try {
      const n = name.trim();
      if (!n) throw new Error("請輸入群組名稱");

      const res = await fetch("/api/admin/option-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          required,
          minSelect: Number(minSelect),
          maxSelect: Number(maxSelect),
          sort: Number(sort),
          isActive,
        }),
      });

      const data = await res.json();
      if (!data?.ok) throw new Error(data?.detail || data?.error || "CREATE_FAILED");

      setName("");
      setRequired(false);
      setMinSelect("0");
      setMaxSelect("1");
      setSort("0");
      setIsActive(true);

      await load();
      setMsg("✅ 已新增群組");
    } catch (e: any) {
      setMsg(e?.message ? String(e.message) : "新增失敗");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}>
        <div>
          <Link href="/admin" style={{ textDecoration: "underline", fontWeight: 700 }}>
            ← 回後台首頁
          </Link>
          <h1 style={{ marginTop: 10, fontSize: 22, fontWeight: 900 }}>選項群組管理</h1>
          <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
            先新增群組，再進入每個群組管理選項（Option）
          </div>
        </div>

        <Link
          href="/admin/products"
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 12,
            textDecoration: "none",
            color: "inherit",
            fontWeight: 800,
          }}
        >
          去商品管理
        </Link>
      </div>

      <section style={{ marginTop: 14, border: "1px solid #e5e5e5", borderRadius: 14, padding: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>新增群組</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>群組名稱</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
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
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={inputStyle}
              inputMode="numeric"
            />
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            required
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            isActive
          </label>

          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #222",
              background: "#fff",
              fontWeight: 900,
              cursor: creating ? "not-allowed" : "pointer",
            }}
          >
            {creating ? "新增中…" : "新增群組"}
          </button>
        </div>
      </section>

      <section style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>群組列表</div>

        <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#fafafa", textAlign: "left" }}>
                <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 70 }}>ID</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>名稱</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 90 }}>required</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 100 }}>min</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 100 }}>max</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 90 }}>sort</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 90 }}>active</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 180 }}>操作</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 14, opacity: 0.75 }}>
                    Loading…
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 14, opacity: 0.75 }}>
                    尚未建立任何群組
                  </td>
                </tr>
              ) : (
                groups.map((g) => (
                  <tr key={g.id}>
                    <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{g.id}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1", fontWeight: 900 }}>{g.name}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{g.required ? "Y" : "N"}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{g.minSelect}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{g.maxSelect}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{g.sort}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{g.isActive ? "Y" : "N"}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link
                          href={`/admin/options/${g.id}`}
                          style={{
                            border: "1px solid #222",
                            borderRadius: 10,
                            padding: "6px 10px",
                            background: "#fff",
                            fontWeight: 800,
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          管理選項
                        </Link>

                        <Link
                          href="/admin/products"
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: 10,
                            padding: "6px 10px",
                            background: "#fff",
                            fontWeight: 700,
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          去綁商品
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {msg ? (
        <div style={{ marginTop: 12, whiteSpace: "pre-wrap", color: msg.startsWith("✅") ? "#0a7" : "#b00020" }}>
          {msg}
        </div>
      ) : null}
    </main>
  );
}