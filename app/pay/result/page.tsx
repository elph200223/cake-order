"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ViewState = "LOADING" | "PAID" | "FAILED" | "PENDING" | "UNKNOWN" | "ERROR";

type OrderItem = {
  id?: number;
  name?: string;
  price?: number;
  qty?: number;
};

type OrderData = {
  id?: number;
  orderNo?: string;
  customer?: string;
  phone?: string;
  pickupDate?: string;
  pickupTime?: string;
  note?: string;
  status?: string;
  totalAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  items?: OrderItem[];
};

type OrderStatusResponse = {
  ok?: boolean;
  status?: string;
  error?: string;
  order?: OrderData;
};

function isOrderStatusResponse(value: unknown): value is OrderStatusResponse {
  return typeof value === "object" && value !== null;
}

function normalizeStatus(raw: string | undefined): ViewState {
  const status = String(raw ?? "").trim().toUpperCase();

  if (status === "PAID") return "PAID";
  if (status === "FAILED" || status === "CANCELLED") return "FAILED";
  if (status === "PENDING" || status === "PENDING_PAYMENT" || status === "UNPAID") {
    return "PENDING";
  }
  if (!status) return "UNKNOWN";
  return "UNKNOWN";
}

function getStatusText(state: ViewState) {
  if (state === "PAID") return "已付款";
  if (state === "FAILED") return "付款失敗";
  if (state === "PENDING") return "確認中";
  if (state === "UNKNOWN") return "確認中";
  if (state === "LOADING") return "讀取中";
  return "讀取失敗";
}

function getTitle(state: ViewState) {
  if (state === "PAID") return "付款完成";
  if (state === "FAILED") return "付款未完成";
  if (state === "PENDING") return "付款結果確認中";
  if (state === "UNKNOWN") return "付款結果確認中";
  if (state === "LOADING") return "正在讀取付款結果";
  return "付款結果載入失敗";
}

function getDescription(state: ViewState) {
  if (state === "PAID") {
    return "我們已收到這筆付款資訊，訂單狀態已更新。";
  }
  if (state === "FAILED") {
    return "目前尚未確認到付款成功，請稍後再次確認，或重新操作付款流程。";
  }
  if (state === "PENDING") {
    return "系統正在同步這筆訂單的付款狀態，請稍候片刻。";
  }
  if (state === "UNKNOWN") {
    return "目前尚未取得明確付款結果，請稍後再回來確認。";
  }
  if (state === "LOADING") {
    return "系統正在讀取這筆訂單的最新付款狀態。";
  }
  return "目前無法讀取付款結果，請稍後重新查看。";
}

function statusColor(state: ViewState) {
  if (state === "PAID") return "#66745f";
  if (state === "FAILED" || state === "ERROR") return "#8c6a70";
  return "#73706b";
}

function formatPickupDate(raw: string | undefined) {
  if (!raw) return "";

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return raw;
  }

  return d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

function formatCurrency(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  return `NT$ ${value.toLocaleString("zh-TW")}`;
}

function formatPhone(value: string | undefined) {
  return String(value ?? "").trim();
}

function formatItemLine(item: OrderItem) {
  const name = String(item.name ?? "").trim() || "未命名品項";
  const qty = typeof item.qty === "number" && Number.isFinite(item.qty) ? item.qty : 0;
  const priceText = formatCurrency(item.price);

  if (qty > 0 && priceText) {
    return `${name} × ${qty}｜${priceText}`;
  }

  if (qty > 0) {
    return `${name} × ${qty}`;
  }

  if (priceText) {
    return `${name}｜${priceText}`;
  }

  return name;
}

function PayResultContent() {
  const sp = useSearchParams();
  const orderId = useMemo(() => String(sp.get("orderId") ?? "").trim(), [sp]);

  const [state, setState] = useState<ViewState>(orderId ? "LOADING" : "ERROR");
  const [detail, setDetail] = useState<OrderStatusResponse | null>(null);
  const [err, setErr] = useState<string | null>(orderId ? null : "缺少 orderId");

  useEffect(() => {
    if (!orderId) return;

    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

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
          setErr(String(data?.error ?? "無法取得訂單狀態"));
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          return;
        }

        const nextState = normalizeStatus(data.status ?? data.order?.status);
        setState(nextState);
        setErr(null);

        if (nextState === "PAID" || nextState === "FAILED") {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
        }
      } catch (error: unknown) {
        if (!alive) return;
        setState("ERROR");
        setErr(error instanceof Error ? error.message : String(error));
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }
    }

    void poll();

    timer = setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      alive = false;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [orderId]);

  const order = detail?.order;
  const displayOrderNo = order?.orderNo || String(order?.id ?? "") || orderId || "未提供";
  const displayPickupDate = formatPickupDate(order?.pickupDate);
  const displayPickupTime = String(order?.pickupTime ?? "").trim();
  const displayCustomer = String(order?.customer ?? "").trim();
  const displayPhone = formatPhone(order?.phone);
  const displayTotal = formatCurrency(order?.totalAmount);
  const items = Array.isArray(order?.items) ? order.items : [];
  const itemCount = items.length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f4ef",
        padding: "64px 20px 80px",
        color: "#4d4a46",
        fontFamily:
          '"Noto Serif TC","Iowan Old Style","Palatino Linotype","Times New Roman",serif',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.22em",
            color: "#9a948b",
            marginBottom: 16,
          }}
        >
          NOSTALGIA COFFEE ROASTERY
        </div>

        <div
          style={{
            background: state === "PAID" ? "#f4f1eb" : "#f3efea",
            padding: "38px 28px 34px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "0.08em",
              color: "#403b37",
            }}
          >
            {getTitle(state)}
          </h1>

          <p
            style={{
              margin: "12px auto 0",
              maxWidth: 340,
              fontSize: 14,
              lineHeight: 1.95,
              color: "#716b64",
            }}
          >
            {getDescription(state)}
          </p>

          <div
            style={{
              margin: "24px auto 0",
              width: 36,
              borderTop: "1px solid #ddd4c8",
            }}
          />

          <div
            style={{
              marginTop: 24,
              display: "grid",
              gap: 10,
              justifyItems: "center",
              fontSize: 14,
              lineHeight: 1.85,
              color: "#605b55",
            }}
          >
            <div>
              <span style={{ color: "#8d877f" }}>訂單編號　</span>
              <span>{displayOrderNo}</span>
            </div>

            <div>
              <span style={{ color: "#8d877f" }}>付款狀態　</span>
              <span style={{ color: statusColor(state) }}>{getStatusText(state)}</span>
            </div>

            {displayPickupDate ? (
              <div>
                <span style={{ color: "#8d877f" }}>取貨日期　</span>
                <span>{displayPickupDate}</span>
              </div>
            ) : null}

            {displayPickupTime ? (
              <div>
                <span style={{ color: "#8d877f" }}>取貨時間　</span>
                <span>{displayPickupTime}</span>
              </div>
            ) : null}

            {displayCustomer ? (
              <div>
                <span style={{ color: "#8d877f" }}>訂購人　　</span>
                <span>{displayCustomer}</span>
              </div>
            ) : null}

            {displayPhone ? (
              <div>
                <span style={{ color: "#8d877f" }}>聯絡電話　</span>
                <span>{displayPhone}</span>
              </div>
            ) : null}

            {displayTotal ? (
              <div>
                <span style={{ color: "#8d877f" }}>訂單金額　</span>
                <span>{displayTotal}</span>
              </div>
            ) : null}

            {itemCount > 0 ? (
              <div>
                <span style={{ color: "#8d877f" }}>品項數量　</span>
                <span>{itemCount} 項</span>
              </div>
            ) : null}

            {state === "ERROR" && err ? (
              <div style={{ color: "#8c6a70", marginTop: 2 }}>{err}</div>
            ) : null}
          </div>

          {items.length > 0 ? (
            <div
              style={{
                marginTop: 28,
                padding: "18px 18px 16px",
                background: "#faf7f2",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  marginBottom: 10,
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  color: "#8d877f",
                }}
              >
                訂單內容
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                {items.map((item) => (
                  <div
                    key={String(item.id ?? `${item.name ?? "item"}-${item.qty ?? 0}`)}
                    style={{
                      fontSize: 14,
                      lineHeight: 1.9,
                      color: "#5d5750",
                    }}
                  >
                    {formatItemLine(item)}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div
            style={{
              marginTop: 28,
              padding: "14px 16px",
              background: "#faf7f2",
              fontSize: 13,
              lineHeight: 1.95,
              color: "#736d66",
            }}
          >
            <div>鮮奶油蛋糕會隨附蠟燭、盤叉。</div>
            <div>取貨時請提供姓名、電話。</div>
          </div>

          <div
            style={{
              marginTop: 26,
              display: "flex",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link
              href={`/orders${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ""}`}
              style={{
                minWidth: 112,
                padding: "10px 16px",
                background: "#fffdf9",
                color: "#4d4843",
                textDecoration: "none",
                fontSize: 13,
                letterSpacing: "0.04em",
              }}
            >
              查看訂單
            </Link>

            <Link
              href="/cakes"
              style={{
                minWidth: 112,
                padding: "10px 16px",
                background: "#fffdf9",
                color: "#4d4843",
                textDecoration: "none",
                fontSize: 13,
                letterSpacing: "0.04em",
              }}
            >
              返回商品頁
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PayResultPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            background: "#f7f4ef",
            padding: "64px 20px 80px",
            color: "#4d4a46",
            fontFamily:
              '"Noto Serif TC","Iowan Old Style","Palatino Linotype","Times New Roman",serif',
          }}
        >
          <div
            style={{
              maxWidth: 520,
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <div
              style={{
                background: "#f3efea",
                padding: "38px 28px 34px",
                fontSize: 14,
                lineHeight: 1.95,
                color: "#716b64",
              }}
            >
              讀取中...
            </div>
          </div>
        </main>
      }
    >
      <PayResultContent />
    </Suspense>
  );
}