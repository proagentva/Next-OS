// Shared fixed color palette — 10 hues, each at a dark/saturated tone (solid
// fills, badge text) and a light tint (badge backgrounds). Not user-editable.
// Reused by any feature needing a fixed color set (ledger buckets today;
// Kanban card colors, Training tags, Script editor highlight colors later).
import type { CSSProperties } from 'react'

export interface FixedColor {
  id: string
  label: string
  dark: string
  light: string
}

export const FIXED_COLORS: FixedColor[] = [
  { id: 'red', label: 'Red', dark: '#dc2626', light: '#fecaca' },
  { id: 'orange', label: 'Orange', dark: '#ea580c', light: '#fed7aa' },
  { id: 'amber', label: 'Amber', dark: '#d97706', light: '#fde68a' },
  { id: 'yellow', label: 'Yellow', dark: '#ca8a04', light: '#fef08a' },
  { id: 'lime', label: 'Lime', dark: '#65a30d', light: '#d9f99d' },
  { id: 'green', label: 'Green', dark: '#16a34a', light: '#bbf7d0' },
  { id: 'teal', label: 'Teal', dark: '#0d9488', light: '#99f6e4' },
  { id: 'cyan', label: 'Cyan', dark: '#0891b2', light: '#a5f3fc' },
  { id: 'blue', label: 'Blue', dark: '#2563eb', light: '#bfdbfe' },
  { id: 'purple', label: 'Purple', dark: '#9333ea', light: '#e9d5ff' },
]

export function getColorById(id: string): FixedColor {
  return FIXED_COLORS.find(c => c.id === id) ?? FIXED_COLORS[FIXED_COLORS.length - 1]
}

export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Fixed mapping for the ledger_entries.bucket taxonomy — not user-editable,
// applied everywhere a bucket name is displayed.
const BUCKET_COLOR_IDS: Record<string, string> = {
  Acquisition: 'green',
  Processing: 'blue',
  Commissions: 'amber',
  Admin: 'purple',
  Misc: 'cyan',
  'Non-Operating': 'orange',
}

export function getBucketColor(bucket: string): FixedColor {
  return getColorById(BUCKET_COLOR_IDS[bucket] ?? 'cyan')
}

// Fixed mapping for the training_materials.tag taxonomy — a separate
// taxonomy from the ledger buckets above, not user-editable.
const TRAINING_TAG_COLOR_IDS: Record<string, string> = {
  Acquisitions: 'green',
  Dispositions: 'orange',
  Operations: 'blue',
  Admin: 'purple',
  'Content Marketing': 'teal',
}

export function getTrainingTagColor(tag: string): FixedColor {
  return getColorById(TRAINING_TAG_COLOR_IDS[tag] ?? 'cyan')
}

// Style for a badge/chip in the given color, adapted for the current theme:
// solid light tint + dark text in light mode, translucent dark fill + light
// text in dark mode (matches the existing .badge-* pattern in index.css).
export function colorBadgeStyle(color: FixedColor, dark: boolean): CSSProperties {
  return dark
    ? { backgroundColor: hexToRgba(color.dark, 0.25), color: color.light }
    : { backgroundColor: color.light, color: color.dark }
}
