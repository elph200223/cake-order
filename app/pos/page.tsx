"use client";

import { useState, useEffect, useCallback } from "react";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(base: string, n: number) {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function generateTimes() {
  const times: string[] = [];
  for (let h = 11; h <= 20; h++) {
    times.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 20) times.push(`${String(h).padStart(2, "0")}:30`);
  }
  return times;
}

const TIMES = generateTimes();

type Reservation = {
  id: string;
  date: string;
  time: string;
  name: string;
  title: string;
  phone: string;
  adults: number;
  children: number;
  note: string;
  status: string; // pending / arrived / noShow
  source: string;
};

export default function PosPage() {
  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Add form state
  const [fName, setFName] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fDate, setFDate] = useState(today);
  const [fTime, setFTime] = useState("18:00");
  const [fAdults, setFAdults] = useState(1);
  const [fChildren, setFChildren] = useState(0);
  const [fNote, setFNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dates = Array.from({ length: 30 }, (_, i) => addDays(today, i));

  const fetch30Days = useCallback(async () => {
    setLoading(true);
    try {
      const from = today;
      const to = addDays(today, 29);
      const res = await fetch(`/api/pos-web/reservations?from=${from}&to=${to}`);
      const data = await res.json() as { ok: boolean; reservations: Reservation[] };
      if (data.ok) setReservations(data.reservations);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { fetch30Days(); }, [fetch30Days]);

  async function setStatus(id: string, status: string) {
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    await fetch(`/api/pos-web/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteRes(id: string) {
    setReservations((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/pos-web/reservations/${id}`, { method: "DELETE" });
  }

  async function handleAdd() {
    if (!fName || !fDate || !fTime) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/pos-web/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fName, title: fTitle, phone: fPhone, date: fDate, time: fTime, adults: fAdults, children: fChildren, note: fNote }),
      });
      const data = await res.json() as { ok: boolean; id: string };
      if (data.ok) {
        setReservations((prev) => [...prev, {
          id: data.id, date: fDate, time: fTime, name: fName, title: fTitle,
          phone: fPhone, adults: fAdults, children: fChildren, note: fNote,
          status: "pending", source: "pos",
        }].sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1));
        setShowAdd(false);
        setFName(""); setFTitle(""); setFPhone(""); setFDate(today);
        setFTime("18:00"); setFAdults(1); setFChildren(0); setFNote("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const byDate: Record<string, Reservation[]> = {};
  dates.forEach((d) => { byDate[d] = []; });
  reservations.forEach((r) => { if (byDate[r.date]) byDate[r.date].push(r); });

  const dayRes = (byDate[selectedDate] ?? []).sort((a, b) => a.time < b.time ? -1 : 1);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-neutral-900">訂位管理</h1>
        <button onClick={fetch30Days} className="text-sm text-neutral-500 hover:text-neutral-900">
          {loading ? "載入中…" : "↻ 重新整理"}
        </button>
      </div>

      {/* Date strip */}
      <div className="flex overflow-x-auto bg-white border-b border-neutral-200 px-2 py-2 gap-1 scrollbar-none">
        {dates.map((date) => {
          const d = new Date(date + "T00:00:00");
          const count = byDate[date]?.length ?? 0;
          const isToday = date === today;
          const isActive = date === selectedDate;
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`flex-none flex flex-col items-center rounded-xl px-3 py-2 min-w-[48px] transition-colors ${
                isActive ? "bg-neutral-900 text-white" : isToday ? "bg-neutral-100 text-neutral-900" : "text-neutral-600"
              }`}
            >
              <span className="text-xs">{WEEKDAYS[d.getDay()]}</span>
              <span className="text-sm font-semibold">{d.getDate()}</span>
              <span className={`text-xs mt-0.5 font-medium ${count > 0 ? (isActive ? "text-green-300" : "text-green-600") : "text-neutral-300"}`}>
                {count > 0 ? count : "·"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reservation list */}
      <div className="px-4 py-4 space-y-3">
        {dayRes.length === 0 ? (
          <p className="text-center text-sm text-neutral-400 py-12">當天無訂位</p>
        ) : (
          dayRes.map((r) => {
            const done = r.status === "arrived" || r.status === "noShow";
            return (
              <div key={r.id} className={`bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm transition-opacity ${done ? "opacity-50" : ""}`}>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-semibold text-neutral-900">{r.time}　{r.name}{r.title}</span>
                  {r.source === "web" && <span className="text-xs text-blue-500">網站</span>}
                </div>
                <div className="mt-1 text-sm text-neutral-500">大人 {r.adults}・小孩 {r.children}</div>
                {r.phone && <div className="text-sm text-neutral-400">{r.phone}</div>}
                {r.note && <div className="mt-1 text-sm text-amber-700 bg-amber-50 rounded-lg px-2 py-1">{r.note}</div>}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setStatus(r.id, r.status === "arrived" ? "pending" : "arrived")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      r.status === "arrived" ? "bg-green-500 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-green-100"
                    }`}
                  >到達</button>
                  <button
                    onClick={() => setStatus(r.id, r.status === "noShow" ? "pending" : "noShow")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      r.status === "noShow" ? "bg-red-500 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-red-100"
                    }`}
                  >No Show</button>
                  <button
                    onClick={() => deleteRes(r.id)}
                    className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-500 hover:bg-red-100 hover:text-red-600"
                  >刪除</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-neutral-900 text-white text-2xl shadow-lg flex items-center justify-center hover:bg-neutral-700"
      >＋</button>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-neutral-900 mb-4">新增訂位</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">姓名 *</label>
                <input value={fName} onChange={(e) => setFName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500" />
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">稱謂</label>
                <div className="flex gap-2">
                  {["", "先生", "小姐"].map((t) => (
                    <button key={t} onClick={() => setFTitle(t)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${fTitle === t ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"}`}>
                      {t || "無"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">電話</label>
                <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} type="tel"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">日期 *</label>
                  <input value={fDate} onChange={(e) => setFDate(e.target.value)} type="date"
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">時間 *</label>
                  <select value={fTime} onChange={(e) => setFTime(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-500">
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">大人</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFAdults(Math.max(1, fAdults - 1))}
                      className="h-9 w-9 rounded-lg border border-neutral-300 text-lg hover:bg-neutral-50">−</button>
                    <span className="w-6 text-center text-sm font-semibold">{fAdults}</span>
                    <button onClick={() => setFAdults(fAdults + 1)}
                      className="h-9 w-9 rounded-lg border border-neutral-300 text-lg hover:bg-neutral-50">+</button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">小孩</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFChildren(Math.max(0, fChildren - 1))}
                      className="h-9 w-9 rounded-lg border border-neutral-300 text-lg hover:bg-neutral-50">−</button>
                    <span className="w-6 text-center text-sm font-semibold">{fChildren}</span>
                    <button onClick={() => setFChildren(fChildren + 1)}
                      className="h-9 w-9 rounded-lg border border-neutral-300 text-lg hover:bg-neutral-50">+</button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">備註</label>
                <input value={fNote} onChange={(e) => setFNote(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500" />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 rounded-2xl border border-neutral-300 py-3 text-sm font-medium text-neutral-700">
                取消
              </button>
              <button onClick={handleAdd} disabled={submitting || !fName}
                className="flex-1 rounded-2xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {submitting ? "新增中…" : "確認新增"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
