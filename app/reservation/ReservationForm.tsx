"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function generateTimes() {
  const times: string[] = [];
  for (let h = 11; h <= 20; h++) {
    times.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 20) times.push(`${String(h).padStart(2, "0")}:30`);
  }
  return times;
}

async function fetchBlockedDates(): Promise<string[]> {
  try {
    const res = await fetch("/api/pickup-block-dates");
    const data = await res.json() as { ok: boolean; blockedDates?: { date: string }[] };
    if (!data.ok || !data.blockedDates) return [];
    return data.blockedDates.map((d) => d.date);
  } catch {
    return [];
  }
}

function tomorrowString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const LINE_OA_ID = process.env.NEXT_PUBLIC_LINE_OA_ID ?? "";
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
const TIMES = generateTimes();

// ── Shared style tokens ───────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  card: {
    background: "#f3efea",
    padding: "38px 28px 36px",
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 500,
    letterSpacing: "0.08em",
    color: "#403b37",
    textAlign: "center",
  },
  subtitle: {
    margin: "12px auto 0",
    maxWidth: 340,
    fontSize: 14,
    lineHeight: 1.95,
    color: "#716b64",
    textAlign: "center",
  },
  divider: {
    margin: "24px auto 28px",
    width: 36,
    borderTop: "1px solid #ddd4c8",
  },
  label: {
    display: "block",
    fontSize: 13,
    letterSpacing: "0.04em",
    color: "#8d877f",
    marginBottom: 7,
  },
  input: {
    width: "100%",
    border: "1px solid #ddd4c8",
    background: "#faf7f2",
    color: "#4d4a46",
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  },
  inputError: {
    width: "100%",
    border: "1px solid #c49a94",
    background: "#faf7f2",
    color: "#4d4a46",
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  },
  counterBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    border: "1px solid #ddd4c8",
    background: "#faf7f2",
    color: "#8d877f",
    cursor: "pointer",
    fontSize: 18,
    flexShrink: 0,
    fontFamily: "inherit",
    lineHeight: 1,
  },
  infoBox: {
    background: "#faf7f2",
    border: "1px solid #e8d9c4",
    padding: "12px 16px",
    fontSize: 13,
    lineHeight: 1.9,
    color: "#8d6b40",
  },
  fieldRow: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "1fr 1fr",
  },
  fieldFull: {
    gridColumn: "1 / -1" as const,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: "#9a5f5a",
  },
  submitBtn: {
    width: "100%",
    background: "#06C755",
    color: "#fff",
    border: "none",
    padding: "13px 16px",
    fontSize: 14,
    letterSpacing: "0.04em",
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: 24,
  },
  submitBtnDisabled: {
    width: "100%",
    background: "#8dbb9a",
    color: "#fff",
    border: "none",
    padding: "13px 16px",
    fontSize: 14,
    letterSpacing: "0.04em",
    cursor: "not-allowed",
    fontFamily: "inherit",
    marginTop: 24,
  },
  hint: {
    marginTop: 12,
    textAlign: "center" as const,
    fontSize: 12,
    color: "#a8a098",
    lineHeight: 1.7,
  },
};

export function ReservationForm() {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [requestDate, setRequestDate] = useState(tomorrowString());
  const [requestTime, setRequestTime] = useState("18:00");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lineUrl, setLineUrl] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState("");
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    fetchBlockedDates().then(setBlockedDates);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (blockedDates.includes(requestDate)) {
      setError("該日期為公休日，請選擇其他日期。");
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/reservations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, phone, adults, children, requestDate, requestTime, note }),
      });
      const data = (await res.json()) as { ok: boolean; reservation?: { id: number }; error?: string };

      if (!data.ok) {
        setError("送出失敗，請再試一次。");
        return;
      }

      const liffUrl = `https://liff.line.me/${LIFF_ID}?rid=${data.reservation?.id ?? ""}`;

      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = liffUrl;
        return;
      }

      setLineUrl(liffUrl);
      setSubmitted(true);
    } catch {
      setError("網路錯誤，請再試一次。");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submitted view ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={S.card}>
        <h1 style={S.title}>訂位資料已送出</h1>
        <p style={S.subtitle}>
          請點下方按鈕，直接開啟 LINE 並帶入您的訂位資料，確認後送出即完成申請。
        </p>
        <div style={S.divider} />

        {isMobile ? (
          <a
            href={lineUrl}
            style={{ ...S.submitBtn, display: "block", textAlign: "center", textDecoration: "none" }}
          >
            開啟 LINE 自動送出訂位申請
          </a>
        ) : (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#8d877f", marginBottom: 18, lineHeight: 1.8 }}>
              用手機掃描 QR Code，自動在 LINE 送出訂位申請
            </p>
            <div
              style={{
                display: "inline-block",
                padding: 16,
                background: "#faf7f2",
                border: "1px solid #ddd4c8",
              }}
            >
              <QRCodeSVG value={lineUrl} size={192} />
            </div>
          </div>
        )}

        <p style={S.hint}>掃描或點擊後，請在 LINE 對話框中按送出完成申請</p>
      </div>
    );
  }

  // ── Form view ───────────────────────────────────────────────────────────────
  const dateIsBlocked = blockedDates.includes(requestDate);

  return (
    <div style={S.card}>
      <h1 style={S.title}>線上訂位</h1>
      <p style={S.subtitle}>
        填寫以下資料後，系統將透過 LINE 與您確認訂位。
      </p>
      <div style={S.divider} />

      <form onSubmit={handleSubmit}>
        <div style={S.fieldRow}>
          {/* 姓名 */}
          <div>
            <label style={S.label}>姓名 *</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={S.input}
            />
          </div>

          {/* 電話 */}
          <div>
            <label style={S.label}>電話 *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={S.input}
            />
          </div>

          {/* 大人 */}
          <div>
            <label style={S.label}>大人</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))} style={S.counterBtn}>−</button>
              <span style={{ fontSize: 15, color: "#403b37", minWidth: 24, textAlign: "center" }}>{adults}</span>
              <button type="button" onClick={() => setAdults(adults + 1)} style={S.counterBtn}>+</button>
            </div>
          </div>

          {/* 小孩 */}
          <div>
            <label style={S.label}>小孩</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="button" onClick={() => setChildren(Math.max(0, children - 1))} style={S.counterBtn}>−</button>
              <span style={{ fontSize: 15, color: "#403b37", minWidth: 24, textAlign: "center" }}>{children}</span>
              <button type="button" onClick={() => setChildren(children + 1)} style={S.counterBtn}>+</button>
            </div>
          </div>

          {/* 注意事項 */}
          <div style={S.fieldFull}>
            <div style={S.infoBox}>
              訂位最多 <strong>4 人</strong>。本店環境偏安靜，如有小朋友同行，請評估是否適合後再行預約。
            </div>
          </div>

          {/* 希望日期 */}
          <div>
            <label style={S.label}>希望日期 *</label>
            <input
              type="date"
              required
              min={tomorrowString()}
              value={requestDate}
              onChange={(e) => {
                setRequestDate(e.target.value);
                if (blockedDates.includes(e.target.value)) {
                  setError("該日期為公休日，請選擇其他日期。");
                } else {
                  setError("");
                }
              }}
              style={dateIsBlocked ? S.inputError : S.input}
            />
            {dateIsBlocked && (
              <p style={S.errorText}>此日期為公休日</p>
            )}
          </div>

          {/* 希望時間 */}
          <div>
            <label style={S.label}>希望時間 *</label>
            <select
              required
              value={requestTime}
              onChange={(e) => setRequestTime(e.target.value)}
              style={{ ...S.input, appearance: "auto" }}
            >
              {TIMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 備註 */}
          <div style={S.fieldFull}>
            <label style={S.label}>備註</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="特殊需求、過敏資訊等"
              style={{ ...S.input, resize: "vertical" }}
            />
          </div>
        </div>

        {error && (
          <p style={{ ...S.errorText, marginTop: 12, fontSize: 13 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={submitting ? S.submitBtnDisabled : S.submitBtn}
        >
          {submitting ? "送出中…" : "送出並用 LINE 確認"}
        </button>

        <p style={S.hint}>送出後會自動開啟 LINE，請在對話框中按送出完成申請</p>
      </form>
    </div>
  );
}
