"use client";

import { useEffect, useMemo, useState } from "react";

type PickupBlockDateItem = {
  id: number;
  date: string;
  reason: string;
  isActive: boolean;
  orderOnly: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type PickupBlockDatesResponse = {
  ok?: boolean;
  dates?: PickupBlockDateItem[];
  error?: string;
};

type CreatePickupBlockDateResponse = {
  ok?: boolean;
  pickupBlockDate?: PickupBlockDateItem;
  error?: string;
};

type UpdatePickupBlockDateResponse = {
  ok?: boolean;
  pickupBlockDate?: PickupBlockDateItem;
  error?: string;
};

type CalendarCell = {
  key: string;
  date: string | null;
};

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function formatDateLabel(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const [year, month, day] = value.split("-");
  return `${year}/${month}/${day}`;
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMonthLabel(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  const [year, month] = value.split("-");
  return `${year} 年 ${month} 月`;
}

function shiftMonth(monthValue: string, diff: number) {
  if (!/^\d{4}-\d{2}$/.test(monthValue)) {
    return monthValue;
  }

  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return monthValue;
  }

  const date = new Date(year, month - 1 + diff, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildCalendarCells(monthValue: string): CalendarCell[] {
  if (!/^\d{4}-\d{2}$/.test(monthValue)) {
    return [];
  }

  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return [];
  }

  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = firstDay.getDay();
  const lastDate = new Date(year, month, 0).getDate();

  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({
      key: `empty-start-${i}`,
      date: null,
    });
  }

  for (let day = 1; day <= lastDate; day += 1) {
    cells.push({
      key: `${monthValue}-${String(day).padStart(2, "0")}`,
      date: `${monthValue}-${String(day).padStart(2, "0")}`,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `empty-end-${cells.length}`,
      date: null,
    });
  }

  return cells;
}

function getCurrentMonthString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function datesEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

export default function AdminCakesPage() {
  const [dates, setDates] = useState<PickupBlockDateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [month, setMonth] = useState(getCurrentMonthString());

  // ── 店休日 state ───────────────────────────────────────────────────────────
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [reason, setReason] = useState("店休日");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  // ── 蛋糕接滿 state ────────────────────────────────────────────────────────
  const [selectedOrderOnlyDates, setSelectedOrderOnlyDates] = useState<string[]>([]);
  const [savingOrderOnly, setSavingOrderOnly] = useState(false);
  const [submitErrorOrderOnly, setSubmitErrorOrderOnly] = useState("");
  const [submitMessageOrderOnly, setSubmitMessageOrderOnly] = useState("");

  async function loadDates() {
    setLoading(true);
    setLoadError("");

    try {
      const res = await fetch("/api/admin/pickup-block-dates", {
        method: "GET",
        cache: "no-store",
      });

      const json: PickupBlockDatesResponse = await res.json().catch(() => ({}));

      if (!res.ok || json.ok !== true) {
        throw new Error(json.error || "LIST_FAILED");
      }

      setDates(Array.isArray(json.dates) ? json.dates : []);
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "LIST_FAILED");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDates();
  }, []);

  const activeDates = useMemo(() => {
    return dates.filter((item) => item.isActive);
  }, [dates]);

  // 本月 店休日（orderOnly = false）
  const monthClosedDates = useMemo(() => {
    return dates.filter((item) => item.date.startsWith(`${month}-`) && !item.orderOnly);
  }, [dates, month]);

  const monthActiveClosedDates = useMemo(() => {
    return monthClosedDates
      .filter((item) => item.isActive)
      .map((item) => item.date)
      .sort();
  }, [monthClosedDates]);

  const monthActiveClosedDateSet = useMemo(() => {
    return new Set(monthActiveClosedDates);
  }, [monthActiveClosedDates]);

  // 本月 蛋糕接滿（orderOnly = true）
  const monthOrderOnlyDates = useMemo(() => {
    return dates.filter((item) => item.date.startsWith(`${month}-`) && item.orderOnly);
  }, [dates, month]);

  const monthActiveOrderOnlyDates = useMemo(() => {
    return monthOrderOnlyDates
      .filter((item) => item.isActive)
      .map((item) => item.date)
      .sort();
  }, [monthOrderOnlyDates]);

  const monthActiveOrderOnlyDateSet = useMemo(() => {
    return new Set(monthActiveOrderOnlyDates);
  }, [monthActiveOrderOnlyDates]);

  const monthDayCells = useMemo(() => {
    return buildCalendarCells(month);
  }, [month]);

  const selectedDateSet = useMemo(() => new Set(selectedDates), [selectedDates]);
  const selectedOrderOnlyDateSet = useMemo(() => new Set(selectedOrderOnlyDates), [selectedOrderOnlyDates]);

  const hasUnsavedChanges = useMemo(() => {
    return !datesEqual(selectedDates, monthActiveClosedDates);
  }, [selectedDates, monthActiveClosedDates]);

  const hasUnsavedOrderOnlyChanges = useMemo(() => {
    return !datesEqual(selectedOrderOnlyDates, monthActiveOrderOnlyDates);
  }, [selectedOrderOnlyDates, monthActiveOrderOnlyDates]);

  useEffect(() => {
    setSelectedDates(monthActiveClosedDates);
    setSelectedOrderOnlyDates(monthActiveOrderOnlyDates);
    setSubmitError("");
    setSubmitMessage("");
    setSubmitErrorOrderOnly("");
    setSubmitMessageOrderOnly("");

    const firstActiveReason = monthClosedDates.find((item) => item.isActive)?.reason?.trim();
    if (firstActiveReason) {
      setReason(firstActiveReason);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, monthActiveClosedDates, monthActiveOrderOnlyDates]);

  function toggleDate(date: string) {
    setSubmitError("");
    setSubmitMessage("");
    setSelectedDates((prev) => {
      if (prev.includes(date)) {
        return prev.filter((item) => item !== date).sort();
      }
      return [...prev, date].sort();
    });
  }

  function toggleOrderOnlyDate(date: string) {
    setSubmitErrorOrderOnly("");
    setSubmitMessageOrderOnly("");
    setSelectedOrderOnlyDates((prev) => {
      if (prev.includes(date)) {
        return prev.filter((item) => item !== date).sort();
      }
      return [...prev, date].sort();
    });
  }

  // ── 儲存店休日 ────────────────────────────────────────────────────────────
  async function handleSaveSelectedDates() {
    setSaving(true);
    setSubmitError("");
    setSubmitMessage("");

    // Only look at non-orderOnly dates for this month
    const existingByDate = new Map(monthClosedDates.map((item) => [item.date, item]));
    const selectedSet = new Set(selectedDates);

    const toCreate = selectedDates.filter((date) => !existingByDate.has(date));
    const toActivate = monthClosedDates.filter(
      (item) => !item.isActive && selectedSet.has(item.date)
    );
    const toDeactivate = monthClosedDates.filter(
      (item) => item.isActive && !selectedSet.has(item.date)
    );

    const failedActions: string[] = [];
    let createdCount = 0;
    let activatedCount = 0;
    let deactivatedCount = 0;

    for (const date of toCreate) {
      try {
        const res = await fetch("/api/admin/pickup-block-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, reason: reason.trim(), isActive: true, orderOnly: false }),
        });
        const json: CreatePickupBlockDateResponse = await res.json().catch(() => ({}));
        if (!res.ok || json.ok !== true) {
          failedActions.push(`${formatDateLabel(date)}（新增失敗）`);
          continue;
        }
        createdCount += 1;
      } catch {
        failedActions.push(`${formatDateLabel(date)}（新增失敗）`);
      }
    }

    for (const item of toActivate) {
      try {
        const res = await fetch(`/api/admin/pickup-block-dates/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: true, reason: reason.trim(), orderOnly: false }),
        });
        const json: UpdatePickupBlockDateResponse = await res.json().catch(() => ({}));
        if (!res.ok || json.ok !== true) {
          failedActions.push(`${formatDateLabel(item.date)}（重新啟用失敗）`);
          continue;
        }
        activatedCount += 1;
      } catch {
        failedActions.push(`${formatDateLabel(item.date)}（重新啟用失敗）`);
      }
    }

    for (const item of toDeactivate) {
      try {
        const res = await fetch(`/api/admin/pickup-block-dates/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
        const json: UpdatePickupBlockDateResponse = await res.json().catch(() => ({}));
        if (!res.ok || json.ok !== true) {
          failedActions.push(`${formatDateLabel(item.date)}（取消失敗）`);
          continue;
        }
        deactivatedCount += 1;
      } catch {
        failedActions.push(`${formatDateLabel(item.date)}（取消失敗）`);
      }
    }

    await loadDates();
    setSaving(false);

    if (failedActions.length > 0) {
      setSubmitError(failedActions.join("、"));
    }

    if (createdCount === 0 && activatedCount === 0 && deactivatedCount === 0) {
      setSubmitMessage("本月店休日沒有變更。");
      return;
    }

    const summary: string[] = [];
    if (createdCount > 0) summary.push(`新增 ${createdCount} 天`);
    if (activatedCount > 0) summary.push(`重新啟用 ${activatedCount} 天`);
    if (deactivatedCount > 0) summary.push(`取消 ${deactivatedCount} 天`);
    setSubmitMessage(summary.length > 0 ? `已儲存本月變更：${summary.join("、")}` : "本月店休日已同步。");
  }

  // ── 儲存蛋糕接滿 ──────────────────────────────────────────────────────────
  async function handleSaveOrderOnlyDates() {
    setSavingOrderOnly(true);
    setSubmitErrorOrderOnly("");
    setSubmitMessageOrderOnly("");

    // Look at all dates in this month (across both types) to find conflicts
    const allMonthByDate = new Map(
      dates.filter((item) => item.date.startsWith(`${month}-`)).map((item) => [item.date, item])
    );
    const selectedSet = new Set(selectedOrderOnlyDates);

    const toCreate = selectedOrderOnlyDates.filter((date) => !allMonthByDate.has(date));
    const toActivateOrConvert = selectedOrderOnlyDates
      .map((date) => allMonthByDate.get(date))
      .filter((item): item is PickupBlockDateItem => item !== undefined);
    const toDeactivate = monthOrderOnlyDates.filter(
      (item) => item.isActive && !selectedSet.has(item.date)
    );

    const failedActions: string[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let deactivatedCount = 0;

    for (const date of toCreate) {
      try {
        const res = await fetch("/api/admin/pickup-block-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, reason: "蛋糕接滿", isActive: true, orderOnly: true }),
        });
        const json: CreatePickupBlockDateResponse = await res.json().catch(() => ({}));
        if (!res.ok || json.ok !== true) {
          failedActions.push(`${formatDateLabel(date)}（新增失敗）`);
          continue;
        }
        createdCount += 1;
      } catch {
        failedActions.push(`${formatDateLabel(date)}（新增失敗）`);
      }
    }

    for (const item of toActivateOrConvert) {
      try {
        const res = await fetch(`/api/admin/pickup-block-dates/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: true, orderOnly: true, reason: "蛋糕接滿" }),
        });
        const json: UpdatePickupBlockDateResponse = await res.json().catch(() => ({}));
        if (!res.ok || json.ok !== true) {
          failedActions.push(`${formatDateLabel(item.date)}（更新失敗）`);
          continue;
        }
        updatedCount += 1;
      } catch {
        failedActions.push(`${formatDateLabel(item.date)}（更新失敗）`);
      }
    }

    for (const item of toDeactivate) {
      try {
        const res = await fetch(`/api/admin/pickup-block-dates/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
        const json: UpdatePickupBlockDateResponse = await res.json().catch(() => ({}));
        if (!res.ok || json.ok !== true) {
          failedActions.push(`${formatDateLabel(item.date)}（取消失敗）`);
          continue;
        }
        deactivatedCount += 1;
      } catch {
        failedActions.push(`${formatDateLabel(item.date)}（取消失敗）`);
      }
    }

    await loadDates();
    setSavingOrderOnly(false);

    if (failedActions.length > 0) {
      setSubmitErrorOrderOnly(failedActions.join("、"));
    }

    if (createdCount === 0 && updatedCount === 0 && deactivatedCount === 0) {
      setSubmitMessageOrderOnly("本月蛋糕接滿沒有變更。");
      return;
    }

    const summary: string[] = [];
    if (createdCount > 0) summary.push(`新增 ${createdCount} 天`);
    if (updatedCount > 0) summary.push(`更新 ${updatedCount} 天`);
    if (deactivatedCount > 0) summary.push(`取消 ${deactivatedCount} 天`);
    setSubmitMessageOrderOnly(summary.length > 0 ? `已儲存本月蛋糕接滿：${summary.join("、")}` : "本月蛋糕接滿已同步。");
  }

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10 text-stone-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-sm tracking-[0.25em] text-stone-500">ADMIN</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[0.08em]">
            店休日 / 蛋糕接滿 管理
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            <strong>店休日</strong>：整天不接受訂單與訂位。<br />
            <strong>蛋糕接滿</strong>：只擋蛋糕訂單，訂位仍可預約。
          </p>
        </header>

        {/* 月份切換（共用） */}
        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMonth((prev) => shiftMonth(prev, -1))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-300 bg-white text-sm text-stone-700 transition hover:bg-stone-50"
          >
            ←
          </button>
          <input
            type="month"
            value={month}
            onChange={(event) => {
              setMonth(event.target.value);
              setSubmitError("");
              setSubmitMessage("");
              setSubmitErrorOrderOnly("");
              setSubmitMessageOrderOnly("");
            }}
            className="block rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-500"
          />
          <button
            type="button"
            onClick={() => setMonth((prev) => shiftMonth(prev, 1))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-300 bg-white text-sm text-stone-700 transition hover:bg-stone-50"
          >
            →
          </button>
          <span className="text-sm text-stone-600">{formatMonthLabel(month)}</span>
        </div>

        <section className="grid gap-8 lg:grid-cols-2">

          {/* ── 店休日 月曆 ──────────────────────────────────────────────── */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-[0.06em] text-stone-900">
              店休日
            </h2>
            <p className="mt-1 text-sm text-stone-500">蛋糕訂單 + 訂位 全部關閉</p>

            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <label htmlFor="pickup-block-reason" className="block text-sm font-medium text-stone-700">
                  原因標籤
                </label>
                <input
                  id="pickup-block-reason"
                  type="text"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="例如：店休日"
                  className="block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-500"
                />
              </div>

              <div>
                <div className="mb-3 text-sm font-medium text-stone-700">{formatMonthLabel(month)}</div>
                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                  <div className="grid grid-cols-7 gap-2">
                    {WEEKDAY_LABELS.map((label) => (
                      <div key={label} className="text-center text-xs font-medium text-stone-500">
                        {label}
                      </div>
                    ))}
                    {monthDayCells.map((cell) => {
                      if (!cell.date) {
                        return <div key={cell.key} className="h-11" />;
                      }
                      const selected = selectedDateSet.has(cell.date);
                      const stored = monthActiveClosedDateSet.has(cell.date);
                      // 若這天已是蛋糕接滿，不可選為店休日
                      const isOrderOnly = selectedOrderOnlyDateSet.has(cell.date) || monthActiveOrderOnlyDateSet.has(cell.date);
                      return (
                        <button
                          key={cell.key}
                          type="button"
                          onClick={() => !isOrderOnly && toggleDate(cell.date!)}
                          disabled={saving || isOrderOnly}
                          title={
                            isOrderOnly
                              ? "此日期已設為蛋糕接滿"
                              : stored
                              ? "已儲存店休日，再點一下可取消"
                              : "點一下選為店休日"
                          }
                          className={[
                            "h-11 rounded-2xl border text-sm transition",
                            isOrderOnly
                              ? "cursor-not-allowed border-amber-200 bg-amber-50 text-amber-400"
                              : selected
                              ? "border-stone-900 bg-stone-900 font-semibold text-white"
                              : "border-stone-300 bg-white text-stone-800 hover:bg-stone-100",
                          ].join(" ")}
                        >
                          {cell.date.slice(-2)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-700">
                <div className="font-medium text-stone-900">本月目前選取</div>
                <div className="mt-2 leading-7">
                  {selectedDates.length > 0
                    ? selectedDates.map((item) => formatDateLabel(item)).join("、")
                    : "本月未選任何店休日"}
                </div>
              </div>

              {submitError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}
              {submitMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {submitMessage}
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleSaveSelectedDates()}
                disabled={saving || !hasUnsavedChanges}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium tracking-[0.08em] text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {saving ? "儲存中…" : "儲存本月店休日"}
              </button>
            </div>
          </div>

          {/* ── 蛋糕接滿 月曆 ────────────────────────────────────────────── */}
          <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-[0.06em] text-amber-800">
              蛋糕接滿
            </h2>
            <p className="mt-1 text-sm text-amber-600">只擋蛋糕訂單，訂位仍可預約</p>

            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
                原因標籤固定為「蛋糕接滿」，不需要另外輸入。
              </div>

              <div>
                <div className="mb-3 text-sm font-medium text-stone-700">{formatMonthLabel(month)}</div>
                <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
                  <div className="grid grid-cols-7 gap-2">
                    {WEEKDAY_LABELS.map((label) => (
                      <div key={label} className="text-center text-xs font-medium text-amber-500">
                        {label}
                      </div>
                    ))}
                    {monthDayCells.map((cell) => {
                      if (!cell.date) {
                        return <div key={cell.key} className="h-11" />;
                      }
                      const selected = selectedOrderOnlyDateSet.has(cell.date);
                      const stored = monthActiveOrderOnlyDateSet.has(cell.date);
                      // 若這天已是店休日，不可選為蛋糕接滿
                      const isClosed = selectedDateSet.has(cell.date) || monthActiveClosedDateSet.has(cell.date);
                      return (
                        <button
                          key={cell.key}
                          type="button"
                          onClick={() => !isClosed && toggleOrderOnlyDate(cell.date!)}
                          disabled={savingOrderOnly || isClosed}
                          title={
                            isClosed
                              ? "此日期已設為店休日"
                              : stored
                              ? "已儲存蛋糕接滿，再點一下可取消"
                              : "點一下選為蛋糕接滿"
                          }
                          className={[
                            "h-11 rounded-2xl border text-sm transition",
                            isClosed
                              ? "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-300"
                              : selected
                              ? "border-amber-600 bg-amber-500 font-semibold text-white"
                              : "border-amber-200 bg-white text-stone-800 hover:bg-amber-50",
                          ].join(" ")}
                        >
                          {cell.date.slice(-2)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 px-4 py-4 text-sm text-amber-800">
                <div className="font-medium">本月目前選取</div>
                <div className="mt-2 leading-7">
                  {selectedOrderOnlyDates.length > 0
                    ? selectedOrderOnlyDates.map((item) => formatDateLabel(item)).join("、")
                    : "本月未選任何蛋糕接滿"}
                </div>
              </div>

              {submitErrorOrderOnly && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitErrorOrderOnly}
                </div>
              )}
              {submitMessageOrderOnly && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {submitMessageOrderOnly}
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleSaveOrderOnlyDates()}
                disabled={savingOrderOnly || !hasUnsavedOrderOnlyChanges}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-500 px-5 py-3 text-sm font-medium tracking-[0.08em] text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-200"
              >
                {savingOrderOnly ? "儲存中…" : "儲存本月蛋糕接滿"}
              </button>
            </div>
          </div>
        </section>

        {/* ── 總覽列表 ────────────────────────────────────────────────────── */}
        <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-[0.06em] text-stone-900">
                已設定日期總覽
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                所有已啟用的店休日與蛋糕接滿日期。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadDates()}
              className="inline-flex items-center justify-center rounded-2xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              重新整理
            </button>
          </div>

          {loading && (
            <div className="mt-6 rounded-2xl bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">
              讀取中...
            </div>
          )}

          {!loading && loadError && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {loadError}
            </div>
          )}

          {!loading && !loadError && activeDates.length === 0 && (
            <div className="mt-6 rounded-2xl bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">
              目前還沒有任何設定資料
            </div>
          )}

          {!loading && !loadError && activeDates.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-3xl border border-stone-200">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-stone-50 text-left">
                    <th className="px-4 py-3 font-medium text-stone-600">日期</th>
                    <th className="px-4 py-3 font-medium text-stone-600">類型</th>
                    <th className="px-4 py-3 font-medium text-stone-600">原因</th>
                    <th className="px-4 py-3 font-medium text-stone-600">建立時間</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDates.map((item) => (
                    <tr key={item.id} className="border-t border-stone-200 bg-white">
                      <td className="px-4 py-3 font-medium text-stone-900">
                        {formatDateLabel(item.date)}
                      </td>
                      <td className="px-4 py-3">
                        {item.orderOnly ? (
                          <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            蛋糕接滿
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
                            店休日
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-700">
                        {item.reason?.trim() ? item.reason : "—"}
                      </td>
                      <td className="px-4 py-3 text-stone-500">
                        {formatDateTime(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
