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

function tomorrowString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function formatLineText(data: {
  customerName: string; phone: string; adults: number; children: number;
  requestDate: string; requestTime: string; note: string;
}) {
  const d = new Date(data.requestDate);
  const weekday = WEEKDAYS[d.getDay()];
  const people = data.children > 0
    ? `${data.adults} 大人 / ${data.children} 小孩`
    : `${data.adults} 大人`;
  const lines = [
    "【訂位申請】",
    `姓名：${data.customerName}`,
    `電話：${data.phone}`,
    `人數：${people}`,
    `希望時間：${data.requestDate}（${weekday}）${data.requestTime}`,
  ];
  if (data.note) lines.push(`備註：${data.note}`);
  return lines.join("\n");
}

const LINE_OA_ID = process.env.NEXT_PUBLIC_LINE_OA_ID ?? "";
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
const TIMES = generateTimes();

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
  const [lineText, setLineText] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/reservations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, phone, adults, children, requestDate, requestTime, note }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };

      if (!data.ok) {
        setError("送出失敗，請再試一次。");
        return;
      }

      const text = formatLineText({ customerName, phone, adults, children, requestDate, requestTime, note });
      // LIFF URL：在 LINE 內開啟並自動傳送訂位資料
      const liffUrl = `https://liff.line.me/${LIFF_ID}?text=${encodeURIComponent(text)}`;

      setLineUrl(liffUrl);
      setLineText(text);
      setSubmitted(true);
    } catch {
      setError("網路錯誤，請再試一次。");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-900">訂位資料已送出！</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          請點下方按鈕，直接開啟 LINE 並帶入您的訂位資料，確認後送出即完成申請。
        </p>

        {/* 手機：直接點開 LINE 自動送出 */}
        {isMobile ? (
          <a
            href={lineUrl}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#06C755] py-3.5 text-sm font-semibold text-white hover:opacity-90"
          >
            開啟 LINE 自動送出訂位申請
          </a>
        ) : (
          /* 電腦：QR code，手機掃描後在 LINE 自動送出 */
          <div className="mt-5 text-center">
            <p className="mb-3 text-sm text-neutral-600">用手機掃描，自動在 LINE 送出訂位申請：</p>
            <div className="flex justify-center">
              <div className="inline-block rounded-xl border border-neutral-200 bg-white p-3">
                <QRCodeSVG value={lineUrl} size={200} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-800">姓名 *</label>
          <input
            type="text"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-800">電話 *</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-800">大人</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-lg hover:bg-neutral-50">−</button>
            <span className="w-8 text-center text-sm font-semibold">{adults}</span>
            <button type="button" onClick={() => setAdults(adults + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-lg hover:bg-neutral-50">+</button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-800">小孩</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setChildren(Math.max(0, children - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-lg hover:bg-neutral-50">−</button>
            <span className="w-8 text-center text-sm font-semibold">{children}</span>
            <button type="button" onClick={() => setChildren(children + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-lg hover:bg-neutral-50">+</button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-800">希望日期 *</label>
          <input
            type="date"
            required
            min={tomorrowString()}
            value={requestDate}
            onChange={(e) => setRequestDate(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-800">希望時間 *</label>
          <select
            required
            value={requestTime}
            onChange={(e) => setRequestTime(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
          >
            {TIMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-sm font-medium text-neutral-800">備註</label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="特殊需求、過敏資訊等"
          className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#06C755] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "送出中…" : "送出並用 LINE 確認"}
      </button>

      <p className="mt-3 text-center text-xs text-neutral-400">
        送出後會自動開啟 LINE，請在對話框中按送出完成申請
      </p>
    </form>
  );
}
