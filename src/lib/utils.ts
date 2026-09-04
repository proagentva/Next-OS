import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { OrganizationMember } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Owners implicitly have every tab — not stored on the membership row.
export function hasTabAccess(membership: OrganizationMember | null, tabId: string): boolean {
  if (!membership) return false
  if (membership.role === 'owner') return true
  return membership.allowed_tabs.includes(tabId)
}

export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount)
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs)
  return amount < 0 ? `-${formatted}` : formatted
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

export function formatPercent(n: number): string {
  if (n === 0 || !isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

export function safeDivide(a: number, b: number): number {
  if (b === 0) return 0
  return a / b
}

export function safeRate(a: number, b: number): string {
  if (b === 0) return '—'
  return `${((a / b) * 100).toFixed(1)}%`
}

export function quarterName(q: number): string {
  return `Q${q}`
}

export function monthName(m: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return names[m - 1] || ''
}

export function formatDate(date: string | Date): string {
  // A bare "YYYY-MM-DD" (no time component) is a calendar date, not an
  // instant — parse it as local so it doesn't shift a day when the
  // browser's timezone is behind UTC (new Date('2026-09-05') is midnight
  // UTC, which renders as Sep 4 in negative-UTC-offset timezones).
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
