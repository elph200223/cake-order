"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OptionGroup = {
  id: number;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  sort: number;
  isActive: boolean;
};

export default function Page() {
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const res = await fetch("/api/admin/option-groups", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));

    if (json.ok) {
      setGroups(json.groups ?? []);
    } else {
      setError(json?.error ?? "LIST_FAILED");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const n = name.trim();
    if (!n) return;

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/admin/option-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });

      const json = await res.json().catch(() => ({}));

      if (json.ok) {
        setName("");
        load();
      } else {
        setError(json?.error ?? "CREATE_FAILED");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>選項群組</h1>
          <div style={{ marginTop: 8, color: "#666", fontSize: 14 }}>
            管理尺寸、蛋糕體、水果產地等群組。
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="輸入群組名稱"
            style={{
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 12,
              minWidth: 220,
            }}
          />

          <button
            onClick={create}
            disabled={creating}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #111827",
              background: "#111827",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {creating ? "新增中…" : "新增群組"}
          </button>

          <Link
            href="/admin/options"
            style={{
              display: "inline-block",
              padding: "10px 12px",
              border: "1px solid #222",
              borderRadius: 12,
              fontWeight: 700,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            前往選項管理
          </Link>
        </div>
      </div>

      {error ? (
        <div style={{ marginBottom: 16, color: "#b91c1c", fontWeight: 700 }}>{error}</div>
      ) : null}

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#fafafa", textAlign: "left" }}>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 80 }}>ID</th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>名稱</th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 100 }}>必選</th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 90 }}>最少</th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 90 }}>最多</th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 90 }}>排序</th>
              <th style={{ padding: 12, borderBottom: "1px solid #eee", width: 100 }}>狀態</th>
            </tr>
          </thead>

          <tbody>
            {groups.map((g) => (
              <tr key={g.id}>
                <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{g.id}</td>
                <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1", fontWeight: 700 }}>
                  {g.name}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
                  {g.required ? "是" : "否"}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{g.minSelect}</td>
                <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{g.maxSelect}</td>
                <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>{g.sort}</td>
                <td style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
                  {g.isActive ? "啟用" : "停用"}
                </td>
              </tr>
            ))}

            {groups.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 16, opacity: 0.7 }}>
                  目前沒有群組，請先新增。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}