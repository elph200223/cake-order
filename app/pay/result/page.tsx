"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ViewState = "LOADING" | "PAID" | "FAILED" | "PENDING" | "UNKNOWN" | "ERROR";

type OrderStatusResponse = {
  ok?: boolean;
  status?: string;
  error?: string;
  [key: string]: unknown;
};

function isOrderStatusResponse(value: unknown): value is OrderStatusResponse {
  return typeof value === "object" && value !== null;
}

function PayResultContent() {
  const sp = useSearchParams();
  const orderId = useMemo(() => String(sp.get("orderId") ?? "").trim(), [sp]);

  const [state, setState] = useState<ViewState>(orderId ? "LOADING" : "ERROR");
  const [detail, setDetail] = useState<OrderStatusResponse | null>(null);
  const [err, setErr] = useState<string | null>(orderId ? null : "Missing orderId");

  useEffect(() => {
    if (!orderId) return;

    let alive = true;

    async function poll() {
      try {
        const res = await fetch(
          `/api/orders/get?orderId=${encodeURIComponent(orderId)}`,
          { cache: "no-store" }
        );

        const raw: unknown = await res.json().catch(() => null);
        if (!alive) return;

        const data = isOrderStatusResponse(raw) ? raw : null;
        setDetail(data);

        if (!data || data.ok !== true) {
          setState("ERROR");
          setErr(String(data?.error ?? "Failed to get status"));
          return;
        }

        const status = String(data.status ?? "UNKNOWN").toUpperCase();

        if (status === "PAID") setState("PAID");
        else if (status === "FAILED") setState("FAILED");
        else if (status === "PENDING") setState("PENDING");
        else setState("UNKNOWN");

        setErr(null);
      } catch (error: unknown) {
        if (!alive) return;

        setState("ERROR");
        setErr(error instanceof Error ? error.message : String(error));
      }
    }

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      alive = false;
      clearInterval(timer);
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
      {state === "PENDING" && <p>PENDING</p>}
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

export default function PayResultPage() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 520, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
          <p>Loading...</p>
        </main>
      }
    >
      <PayResultContent />
    </Suspense>
  );
}