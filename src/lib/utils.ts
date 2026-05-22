import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// shadcn/ui style class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format SGD amount
export function formatSGD(amount: number): string {
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(amount)
}

// Format CNY amount
export function formatCNY(amount: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(amount)
}

// Format date for display
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

// Days until a date
export function daysUntil(date: string | Date): number {
  const target = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
