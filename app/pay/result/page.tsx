"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ViewState = "LOADING" | "PAID" | "FAILED" | "PENDING" | "UNKNOWN" | "ERROR";


export default function PayResultPage() {
  const sp = useSearchParams();
  const orderId = useMemo(() => String(sp.get("orderId") ?? "").trim(), [sp]);

  const [state, setState] = useState<ViewState>("LOADING");
  const [detail, setDetail] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setState("ERROR");
      setErr("Missing orderId");
      return;
    }

    let alive = true;

    async function poll() {
      try {
        const res = await fetch(
          `/api/orders/get?orderId=${encodeURIComponent(orderId)}`,
          { cache: "no-store" }
        );
        const j = await res.json().catch(() => null);

        if (!alive) return;

        setDetail(j);

if (!j || j.ok !== true) {
  setState("ERROR");
  setErr(String(j?.error || "Failed to get status"));
  return;
}

const status = String(j.status || "UNKNOWN").toUpperCase();

if (status === "PAID") setState("PAID");
else if (status === "FAILED") setState("FAILED");
else if (status === "PENDING") setState("PENDING");
else setState("UNKNOWN");

      } catch (e: any) {
        if (!alive) return;
        setState("ERROR");
        setErr(e?.message ?? String(e));
      }
    }

    poll();
    const t = setInterval(poll, 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [orderId]);

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Pay Result</h1>

      <p>
        OrderId: <code>{orderId || "(none)"}</code>
      </p>

      {state === "LOADING" && <p>Loading...</p>}
      {state === "PAID" && <p style={{ color: "green" }}>PAID</p>}
      {state === "FAILED" && <p style={{ color: "crimson" }}>FAILED</p>}
      {state === "UNKNOWN" && <p>UNKNOWN (still processing?)</p>}
      {state === "ERROR" && <p style={{ color: "crimson" }}>ERROR: {err}</p>}

      <details style={{ marginTop: 16 }}>
        <summary>Debug</summary>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
          {JSON.stringify(detail, null, 2)}
        </pre>
      </details>
    </main>
  );
}
