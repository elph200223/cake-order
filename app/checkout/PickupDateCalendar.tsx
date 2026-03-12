"use client";

import { useMemo, useState } from "react";
import {
  evaluatePickupDateRules,
  getEarliestPickupDateString,
  type PickupBlockedDateItem,
} from "@/lib/pickup-rules";

type CalendarCell = {
  key: string;
  date: string | null;
};

type Props = {
  value: string;
  blockedDates: PickupBlockedDateItem[];
  loading: boolean;
  loadError: string;
  errorMessage: string;
  fallbackErrorMessage: string;
  onChange: (value: string) => void;
};

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function formatOrderErrorMessage(error: string) {
  switch (error) {
    case "PICKUP_DATE_INVALID":
      return "取貨日期格式不正確。";
    case "PICKUP_DATE_LEAD_TIME_REQUIRED":
      return "蛋糕需於兩天前預訂，今天起三天後才可取貨。";
    case "PICKUP_DATE_BLOCKED":
      return "該日期為店休日，無法選擇取貨。";
    default:
      return error || "取貨日期不可選。";
  }
}

function formatDateLabel(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const [year, month, day] = value.split("-");
  return `${year}/${month}/${day}`;
}

function formatMonthLabel(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  const [year, month] = value.split("-");
  return `${year} 年 ${month} 月`;
}

function getMonthStringFromDate(dateString: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  return dateString.slice(0, 7);
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

function compareMonthString(a: string, b: string) {
  return a.localeCompare(b);
}

function isDateBefore(a: string, b: string) {
  return a.localeCompare(b) < 0;
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
    const date = `${monthValue}-${String(day).padStart(2, "0")}`;
    cells.push({
      key: date,
      date,
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

export default function PickupDateCalendar({
  value,
  blockedDates,
  loading,
  loadError,
  errorMessage,
  fallbackErrorMessage,
  onChange,
}: Props) {
  const earliestPickupDate = useMemo(() => getEarliestPickupDateString(), []);
  const [calendarMonth, setCalendarMonth] = useState(
    getMonthStringFromDate(value || earliestPickupDate)
  );

  const calendarCells = useMemo(() => {
    return buildCalendarCells(calendarMonth);
  }, [calendarMonth]);

  const canGoPrevMonth = useMemo(() => {
    return compareMonthString(
      calendarMonth,
      getMonthStringFromDate(earliestPickupDate)
    ) > 0;
  }, [calendarMonth, earliestPickupDate]);

  return (
    <div className="md:col-span-1">
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">
        取貨日期
      </label>

      <div className="rounded-lg border border-neutral-300 bg-white p-3">
        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2">
          <button
            type="button"
            onClick={() => setCalendarMonth((prev) => shiftMonth(prev, -1))}
            disabled={!canGoPrevMonth}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-xs text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ←
          </button>

          <div className="text-xs font-semibold text-neutral-900">
            {formatMonthLabel(calendarMonth)}
          </div>

          <button
            type="button"
            onClick={() => setCalendarMonth((prev) => shiftMonth(prev, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-xs text-neutral-700 transition hover:bg-neutral-50"
          >
            →
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-[11px] font-medium text-neutral-500"
            >
              {label}
            </div>
          ))}

          {calendarCells.map((cell) => {
            if (!cell.date) {
              return <div key={cell.key} className="h-8" />;
            }

            const evaluation = evaluatePickupDateRules({
              date: cell.date,
              blockedDates,
            });
            const blockedByPastOrLead = isDateBefore(cell.date, earliestPickupDate);
            const isBlocked = blockedByPastOrLead || evaluation.isDateBlocked;
            const isSelected = value === cell.date;
            const dayLabel = Number(cell.date.slice(-2));

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => onChange(cell.date!)}
                disabled={isBlocked}
                className={[
                  "h-8 rounded-md border text-xs transition",
                  isSelected
                    ? "border-neutral-900 bg-neutral-900 font-semibold text-white"
                    : isBlocked
                      ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400"
                      : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50",
                ].join(" ")}
                title={
                  blockedByPastOrLead
                    ? "不可選日期"
                    : evaluation.isDateBlocked
                      ? formatOrderErrorMessage(evaluation.blockedReason)
                      : cell.date
                }
              >
                {dayLabel}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-1.5 text-xs text-neutral-500">
        灰色日期不可選，包含已過日期、提前天數限制與店休日。
      </p>

      {value ? (
        <p className="mt-1.5 text-sm text-neutral-700">
          目前選擇：{formatDateLabel(value)}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-1.5 text-xs text-neutral-500">正在載入店休日規則…</p>
      ) : null}

      {!loading && loadError ? (
        <p className="mt-1.5 text-sm text-amber-700">
          店休日規則讀取失敗，前端限制可能不完整；送單時後端仍會再次驗證。
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-1.5 text-sm text-red-600">{errorMessage}</p>
      ) : fallbackErrorMessage ? (
        <p className="mt-1.5 text-sm text-red-600">{fallbackErrorMessage}</p>
      ) : null}
    </div>
  );
}