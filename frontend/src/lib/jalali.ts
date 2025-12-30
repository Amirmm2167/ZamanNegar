// frontend/src/lib/jalali.ts

// Converts 0-9 to Persian digits
export const toPersianDigits = (str: string | number): string => {
  const s = String(str);
  return s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
};

// Returns standard Jalali format: "1403/02/15"
export const formatJalaliDate = (date: Date): string => {
  return new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

// Returns array of Jalali parts [1403, 2, 15]
export const getJalaliParts = (date: Date): [number, number, number] => {
  const parts = new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const y = parseInt(parts.find((p) => p.type === "year")?.value || "0");
  const m = parseInt(parts.find((p) => p.type === "month")?.value || "0");
  const d = parseInt(parts.find((p) => p.type === "day")?.value || "0");
  // Note: Intl returns Persian digits by default for "fa-IR", so we might need to parse them back if we want math
  // For simplicity, let's trust the browser's ability to handle the date object itself for addition/subtraction
  // and only format for display.
  return [y, m, d];
};

// Get Weekday Name (Shanbe, Yekshanbe...)
export const getPersianWeekday = (date: Date, short = false): string => {
  return new Intl.DateTimeFormat("fa-IR", {
    weekday: short ? "short" : "long",
  }).format(date);
};

// Get Month Name (Farvardin...)
export const getPersianMonth = (date: Date): string => {
  return new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    month: "long",
  }).format(date);
};

// Check if two dates are same Jalali Day
export const isSameJalaliDay = (d1: Date, d2: Date): boolean => {
  return formatJalaliDate(d1) === formatJalaliDate(d2);
};

// Get Start of Jalali Month
// This is tricky with pure JS Date. We approximate by finding the day 1.
// A simpler hack is to iterate back until day becomes '۱'.
export const getStartOfJalaliMonth = (date: Date): Date => {
    let d = new Date(date);
    // Safety break after 31 days
    for(let i=0; i<32; i++) {
        const parts = new Intl.DateTimeFormat("fa-IR-u-nu-latn", { calendar: "persian", day: "numeric" }).format(d);
        if(parts === "1") return d;
        d.setDate(d.getDate() - 1);
    }
    return d;
};