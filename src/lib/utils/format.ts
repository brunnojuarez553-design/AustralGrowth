import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy", { locale: es });
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
