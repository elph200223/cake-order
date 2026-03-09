'use client';

import React, { useState } from "react";

export default function AdminCakesPage() {
  const [msg, setMsg] = useState("");

  async function onSave() {
    setMsg("Saved (placeholder).");
  }

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>Admin / Cakes</h1>
      <p style={{ marginTop: 8 }}>Temporary safe page to pass TypeScript.</p>

      <button
        type="button"
        onClick={onSave}
        style={{
          marginTop: 12,
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: 8,
        }}
      >
        Save (test)
      </button>

      {msg ? <div style={{ marginTop: 12 }}>{msg}</div> : null}
    </main>
  );
}
