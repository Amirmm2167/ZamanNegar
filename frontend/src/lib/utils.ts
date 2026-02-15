import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toPersianDigits(n: number | string): string {
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return n.toString().replace(/\d/g, (x) => farsiDigits[parseInt(x)]);
}

export function toEnglishDigits(str: string): string {
  if (!str) return "";
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  return str
    .replace(/[۰-۹]/g, w => persianDigits.indexOf(w).toString())
    .replace(/[٠-٩]/g, w => arabicDigits.indexOf(w).toString());
}

export function formatPhoneNumber(str: string): string {
  // Simple formatter for display (0912 345 6789)
  const clean = toEnglishDigits(str).replace(/\D/g, '');
  if (clean.startsWith('98')) return '0' + clean.slice(2);
  if (clean.length === 10 && clean.startsWith('9')) return '0' + clean;
  return clean;
}