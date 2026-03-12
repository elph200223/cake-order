"use client";

import { useEffect, useMemo, useState } from "react";

type PickupBlockDateItem = {
  id: number;
  date: string;
  reason: string;
  isActive: boolean;
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
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [reason, setReason] = useState("店休日");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

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

  const monthDates = useMemo(() => {
    return dates.filter((item) => item.date.startsWith(`${month}-`));
  }, [dates, month]);

  const monthActiveDates = useMemo(() => {
    return monthDates
      .filter((item) => item.isActive)
      .map((item) => item.date)
      .sort();
  }, [monthDates]);

  const monthActiveDateSet = useMemo(() => {
    return new Set(monthActiveDates);
  }, [monthActiveDates]);

  const monthDayCells = useMemo(() => {
    return buildCalendarCells(month);
  }, [month]);

  const selectedDateSet = useMemo(() => {
    return new Set(selectedDates);
  }, [selectedDates]);

  const hasUnsavedChanges = useMemo(() => {
    return !datesEqual(selectedDates, monthActiveDates);
  }, [selectedDates, monthActiveDates]);

  useEffect(() => {
    setSelectedDates(monthActiveDates);
    setSubmitError("");
    setSubmitMessage("");

    const firstActiveReason = monthDates.find((item) => item.isActive)?.reason?.trim();
    if (firstActiveReason) {
      setReason(firstActiveReason);
    }
  }, [month, monthActiveDates, monthDates]);

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

  async function handleSaveSelectedDates() {
    setSaving(true);
    setSubmitError("");
    setSubmitMessage("");

    const existingByDate = new Map(monthDates.map((item) => [item.date, item]));
    const selectedSet = new Set(selectedDates);
    const activeSet = new Set(monthActiveDates);

    const toCreate = selectedDates.filter((date) => !existingByDate.has(date));
    const toActivate = monthDates.filter(
      (item) => !item.isActive && selectedSet.has(item.date)
    );
    const toDeactivate = monthDates.filter(
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date,
            reason: reason.trim(),
            isActive: true,
          }),
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: true,
            reason: reason.trim(),
          }),
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: false,
          }),
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
    } else {
      setSubmitError("");
    }

    if (
      createdCount === 0 &&
      activatedCount === 0 &&
      deactivatedCount === 0 &&
      datesEqual(selectedDates, monthActiveDates)
    ) {
      setSubmitMessage("本月店休日沒有變更。");
      return;
    }

    const summary: string[] = [];

    if (createdCount > 0) {
      summary.push(`新增 ${createdCount} 天`);
    }

    if (activatedCount > 0) {
      summary.push(`重新啟用 ${activatedCount} 天`);
    }

    if (deactivatedCount > 0) {
      summary.push(`取消 ${deactivatedCount} 天`);
    }

    setSubmitMessage(
      summary.length > 0
        ? `已儲存本月變更：${summary.join("、")}`
        : "本月店休日已同步。"
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10 text-stone-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-sm tracking-[0.25em] text-stone-500">ADMIN</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[0.08em]">
            店休日管理
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            月曆會保留本月已儲存的店休日。點一下已選日期可取消，點新日期可新增，最後按一次儲存同步本月變更。
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[460px_minmax(0,1fr)]">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-[0.06em] text-stone-900">
              編輯本月店休日
            </h2>

            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="pickup-block-month"
                  className="block text-sm font-medium text-stone-700"
                >
                  月份
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMonth((prev) => shiftMonth(prev, -1))}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-300 bg-white text-sm text-stone-700 transition hover:bg-stone-50"
                  >
                    ←
                  </button>

                  <input
                    id="pickup-block-month"
                    type="month"
                    value={month}
                    onChange={(event) => {
                      setMonth(event.target.value);
                      setSubmitError("");
                      setSubmitMessage("");
                    }}
                    className="block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-500"
                  />

                  <button
                    type="button"
                    onClick={() => setMonth((prev) => shiftMonth(prev, 1))}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-300 bg-white text-sm text-stone-700 transition hover:bg-stone-50"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="pickup-block-reason"
                  className="block text-sm font-medium text-stone-700"
                >
                  原因
                </label>
                <input
                  id="pickup-block-reason"
                  type="text"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="例如：店休日"
                  className="block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-500"
                />
                <p className="text-xs leading-6 text-stone-500">
                  新增或重新啟用日期時，會套用這個原因。
                </p>
              </div>

              <div>
                <div className="mb-3 text-sm font-medium text-stone-700">
                  {formatMonthLabel(month)}
                </div>

                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                  <div className="grid grid-cols-7 gap-2">
                    {WEEKDAY_LABELS.map((label) => (
                      <div
                        key={label}
                        className="text-center text-xs font-medium text-stone-500"
                      >
                        {label}
                      </div>
                    ))}

                    {monthDayCells.map((cell) => {
                      if (!cell.date) {
                        return <div key={cell.key} className="h-11" />;
                      }

                      const selected = selectedDateSet.has(cell.date);
                      const stored = monthActiveDateSet.has(cell.date);

                      return (
                        <button
                          key={cell.key}
                          type="button"
                          onClick={() => toggleDate(cell.date!)}
                          disabled={saving}
                          className={[
                            "h-11 rounded-2xl border text-sm transition",
                            selected
                              ? "border-stone-900 bg-stone-900 font-semibold text-white"
                              : "border-stone-300 bg-white text-stone-800 hover:bg-stone-100",
                          ].join(" ")}
                          title={stored ? "已儲存店休日，再點一下可取消" : "點一下選為店休日"}
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

              {submitError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              ) : null}

              {submitMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {submitMessage}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handleSaveSelectedDates()}
                disabled={saving || !hasUnsavedChanges}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium tracking-[0.08em] text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {saving ? "儲存中…" : "儲存本月變更"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-[0.06em] text-stone-900">
                  已設定店休日
                </h2>
                <p className="mt-2 text-sm text-stone-600">
                  目前列出所有已啟用店休日日期。
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

            {loading ? (
              <div className="mt-6 rounded-2xl bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">
                讀取中...
              </div>
            ) : null}

            {!loading && loadError ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                {loadError}
              </div>
            ) : null}

            {!loading && !loadError && activeDates.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">
                目前還沒有店休日資料
              </div>
            ) : null}

            {!loading && !loadError && activeDates.length > 0 ? (
              <div className="mt-6 space-y-6">
                <section className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                  <div className="text-sm font-medium text-stone-900">
                    {formatMonthLabel(month)} 已儲存
                  </div>
                  <div className="mt-2 text-sm leading-7 text-stone-700">
                    {monthActiveDates.length > 0
                      ? monthActiveDates.map((item) => formatDateLabel(item)).join("、")
                      : "本月份尚未設定店休日"}
                  </div>
                </section>

                <div className="overflow-hidden rounded-3xl border border-stone-200">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-stone-50 text-left">
                        <th className="px-4 py-3 font-medium text-stone-600">日期</th>
                        <th className="px-4 py-3 font-medium text-stone-600">原因</th>
                        <th className="px-4 py-3 font-medium text-stone-600">狀態</th>
                        <th className="px-4 py-3 font-medium text-stone-600">建立時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDates.map((item) => (
                        <tr key={item.id} className="border-t border-stone-200 bg-white">
                          <td className="px-4 py-3 font-medium text-stone-900">
                            {formatDateLabel(item.date)}
                          </td>
                          <td className="px-4 py-3 text-stone-700">
                            {item.reason?.trim() ? item.reason : "—"}
                          </td>
                          <td className="px-4 py-3 text-stone-700">
                            {item.isActive ? "啟用" : "停用"}
                          </td>
                          <td className="px-4 py-3 text-stone-500">
                            {formatDateTime(item.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}