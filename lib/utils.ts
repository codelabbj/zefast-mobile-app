import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats phone number for API: removes +, spaces, and other non-digit characters
 * Example: "+229 01 57455419" -> "2290157455419"
 */
export function formatPhoneNumberForAPI(phone: string): string {
  // Remove all non-digit characters (+, spaces, dashes, etc.)
  return phone.replace(/\D/g, "")
}
