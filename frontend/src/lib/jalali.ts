// frontend/src/lib/jalali.ts

// 1. Core Converter (English Digits -> Persian Digits)
export const toPersianDigits = (str: string | number): string => {
  const s = String(str);
  return s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
};

// 2. Extract Parts [Year, Month, Day] in Jalali
// Returns real integers: [1403, 11, 19]
export const getJalaliParts = (date: Date): [number, number, number] => {
  // force 'en-US' with 'persian' calendar to get clean ASCII digits for parsing
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const y = parseInt(parts.find((p) => p.type === "year")?.value || "0");
  const m = parseInt(parts.find((p) => p.type === "month")?.value || "0");
  const d = parseInt(parts.find((p) => p.type === "day")?.value || "0");

  return [y, m, d];
};

// 3. New Helpers for Views (Fixes "Gregorian Disguise" bugs)
export const getJalaliDay = (date: Date): number => {
  return getJalaliParts(date)[2];
};

export const getJalaliMonth = (date: Date): number => {
  return getJalaliParts(date)[1];
};

export const getJalaliYear = (date: Date): number => {
  return getJalaliParts(date)[0];
};

// --- ADDED THIS MISSING HELPER ---
export const getJalaliMonthName = (date: Date): string => {
  return new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    month: "long",
  }).format(date);
};

// 4. Formatting
export const formatJalaliDate = (date: Date): string => {
  return new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export const getPersianMonth = (date: Date): string => {
  return new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    month: "long",
  }).format(date);
};

export const getPersianWeekday = (date: Date, short = false): string => {
  return new Intl.DateTimeFormat("fa-IR", {
    weekday: short ? "short" : "long",
  }).format(date);
};

// 5. Logic Helpers
export const isSameJalaliDay = (d1: Date, d2: Date): boolean => {
  return formatJalaliDate(d1) === formatJalaliDate(d2);
};

// Returns the FIRST day of the current Jalali Month
export const getStartOfJalaliMonth = (date: Date): Date => {
    const dayOfMonth = getJalaliDay(date);
    const d = new Date(date);
    d.setDate(d.getDate() - (dayOfMonth - 1));
    return d;
};

// Returns the SATURDAY of the current week
export const getStartOfJalaliWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0(Sun) to 6(Sat)
  const diff = (day + 1) % 7;
  
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const addJalaliDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};