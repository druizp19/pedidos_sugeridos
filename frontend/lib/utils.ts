import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | null | undefined, isCurrency = false): string {
  if (num === null || num === undefined || isNaN(num)) return "0";
  const rounded = Math.round(num);
  const formatted = rounded.toLocaleString("es-PE");
  return isCurrency ? `S/ ${formatted}` : formatted;
}

export function formatPercent(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return "0.0%";
  return (num * 100).toFixed(1) + "%";
}

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/sugerido";

export function formatPublicationDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date);
}

export function getApiPath(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${cleanPath}`;
}
