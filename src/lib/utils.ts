import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type CurrencyCode } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currencyCode: CurrencyCode = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function getMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { start, end }
}

export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const day = date.getDay()
  const start = new Date(date)
  start.setDate(date.getDate() - day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

// Get month key in YYYY-MM format
export function getMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

// Format month for display (e.g., "November 2025")
export function formatMonthYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date + '-01') : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
  }).format(d)
}

// Get list of month keys for the past N months
export function getPastMonthKeys(count: number): string[] {
  const months: string[] = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(getMonthKey(date))
  }

  return months
}

// Parse month key to get start and end dates
export function getMonthDateRange(monthKey: string): { start: string; end: string } {
  const [year, month] = monthKey.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0) // Last day of month

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}
