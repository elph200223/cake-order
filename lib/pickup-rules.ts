export const PICKUP_TIME_OPTIONS = [
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
  ] as const;
  
  export type PickupTimeOption = (typeof PICKUP_TIME_OPTIONS)[number];
  
  export type PickupBlockedDateItem = {
    date: string;
    reason?: string | null;
  };
  
  export type PickupRuleEvaluation = {
    isDateBlocked: boolean;
    blockedReason: string;
    availableTimes: string[];
    timeRestrictedAfterHoliday: boolean;
  };
  
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const LEAD_DAYS = 2;
  const HOLIDAY_NEXT_DAY_START_TIME = "13:00";
  
  function pad2(value: number) {
    return String(value).padStart(2, "0");
  }
  
  function buildLocalDateString(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }
  
  function parseDateString(value: string) {
    const trimmed = value.trim();
  
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return null;
    }
  
    const [yearText, monthText, dayText] = trimmed.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
  
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return null;
    }
  
    const date = new Date(year, month - 1, day);
  
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
  
    return date;
  }
  
  function addDays(dateString: string, days: number) {
    const base = parseDateString(dateString);
  
    if (!base) {
      return null;
    }
  
    const next = new Date(base.getTime() + days * MS_PER_DAY);
    return buildLocalDateString(next);
  }
  
  function normalizeBlockedDateSet(blockedDates: PickupBlockedDateItem[]) {
    return new Set(
      blockedDates
        .map((item) => item.date.trim())
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    );
  }
  
  function buildBlockedDateReasonMap(blockedDates: PickupBlockedDateItem[]) {
    const map = new Map<string, string>();
  
    for (const item of blockedDates) {
      const date = item.date.trim();
  
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
  
      const reason = item.reason?.trim() ?? "";
      map.set(date, reason);
    }
  
    return map;
  }
  
  export function getTodayDateString(now = new Date()) {
    return buildLocalDateString(now);
  }
  
  export function getEarliestPickupDateString(now = new Date()) {
    const today = getTodayDateString(now);
    return addDays(today, LEAD_DAYS + 1) ?? today;
  }
  
  export function getLeadBlockedDateStrings(now = new Date()) {
    const today = getTodayDateString(now);
  
    return [0, 1, 2]
      .map((offset) => addDays(today, offset))
      .filter((value): value is string => Boolean(value));
  }
  
  export function isPickupDateBlockedByLeadTime(date: string, now = new Date()) {
    return getLeadBlockedDateStrings(now).includes(date);
  }
  
  export function isPickupDateBlockedByStoreHoliday(
    date: string,
    blockedDates: PickupBlockedDateItem[]
  ) {
    const blockedSet = normalizeBlockedDateSet(blockedDates);
    return blockedSet.has(date);
  }
  
  export function isPickupDateNextDayAfterStoreHoliday(
    date: string,
    blockedDates: PickupBlockedDateItem[]
  ) {
    const blockedSet = normalizeBlockedDateSet(blockedDates);
  
    for (const blockedDate of blockedSet) {
      const nextDay = addDays(blockedDate, 1);
      if (nextDay === date) {
        return true;
      }
    }
  
    return false;
  }
  
  export function getAvailablePickupTimesForDate(
    date: string,
    blockedDates: PickupBlockedDateItem[]
  ) {
    if (isPickupDateNextDayAfterStoreHoliday(date, blockedDates)) {
      return PICKUP_TIME_OPTIONS.filter((time) => time >= HOLIDAY_NEXT_DAY_START_TIME);
    }
  
    return [...PICKUP_TIME_OPTIONS];
  }
  
  export function evaluatePickupDateRules(input: {
    date: string;
    blockedDates: PickupBlockedDateItem[];
    now?: Date;
  }): PickupRuleEvaluation {
    const date = input.date.trim();
    const now = input.now ?? new Date();
  
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        isDateBlocked: true,
        blockedReason: "PICKUP_DATE_INVALID",
        availableTimes: [],
        timeRestrictedAfterHoliday: false,
      };
    }
  
    if (isPickupDateBlockedByLeadTime(date, now)) {
      return {
        isDateBlocked: true,
        blockedReason: "PICKUP_DATE_LEAD_TIME_REQUIRED",
        availableTimes: [],
        timeRestrictedAfterHoliday: false,
      };
    }
  
    if (isPickupDateBlockedByStoreHoliday(date, input.blockedDates)) {
      const reasonMap = buildBlockedDateReasonMap(input.blockedDates);
      const customReason = reasonMap.get(date);
  
      return {
        isDateBlocked: true,
        blockedReason: customReason || "PICKUP_DATE_BLOCKED",
        availableTimes: [],
        timeRestrictedAfterHoliday: false,
      };
    }
  
    const timeRestrictedAfterHoliday = isPickupDateNextDayAfterStoreHoliday(
      date,
      input.blockedDates
    );
  
    return {
      isDateBlocked: false,
      blockedReason: "",
      availableTimes: getAvailablePickupTimesForDate(date, input.blockedDates),
      timeRestrictedAfterHoliday,
    };
  }
  
  export function isPickupSelectionValid(input: {
    date: string;
    time: string;
    blockedDates: PickupBlockedDateItem[];
    now?: Date;
  }) {
    const dateEvaluation = evaluatePickupDateRules({
      date: input.date,
      blockedDates: input.blockedDates,
      now: input.now,
    });
  
    if (dateEvaluation.isDateBlocked) {
      return {
        ok: false as const,
        error: dateEvaluation.blockedReason || "PICKUP_DATE_BLOCKED",
      };
    }
  
    const normalizedTime = input.time.trim();
  
    if (!normalizedTime) {
      return {
        ok: false as const,
        error: "PICKUP_TIME_REQUIRED",
      };
    }
  
    if (!dateEvaluation.availableTimes.includes(normalizedTime)) {
      return {
        ok: false as const,
        error: "PICKUP_TIME_NOT_ALLOWED",
      };
    }
  
    return {
      ok: true as const,
      error: "",
    };
  }
  
  export {};