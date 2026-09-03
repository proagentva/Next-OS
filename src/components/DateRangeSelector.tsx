import { useState } from 'react'
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter, startOfYear, endOfYear, format,
} from 'date-fns'

export type RangePreset = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom' },
]

const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

function computeRange(preset: RangePreset, customFrom: string, customTo: string) {
  const now = new Date()
  switch (preset) {
    case 'daily':
      return { from: fmt(startOfDay(now)), to: fmt(endOfDay(now)), label: format(now, 'MMM d, yyyy') }
    case 'weekly': {
      const s = startOfWeek(now), e = endOfWeek(now)
      return { from: fmt(s), to: fmt(e), label: `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}` }
    }
    case 'monthly': {
      const s = startOfMonth(now), e = endOfMonth(now)
      return { from: fmt(s), to: fmt(e), label: format(now, 'MMMM yyyy') }
    }
    case 'quarterly': {
      const s = startOfQuarter(now), e = endOfQuarter(now)
      return { from: fmt(s), to: fmt(e), label: `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}` }
    }
    case 'yearly': {
      const s = startOfYear(now), e = endOfYear(now)
      return { from: fmt(s), to: fmt(e), label: String(now.getFullYear()) }
    }
    case 'custom':
      return {
        from: customFrom,
        to: customTo,
        label: customFrom && customTo ? `${customFrom} – ${customTo}` : 'Select a range',
      }
  }
}

export function useDateRange() {
  const [preset, setPreset] = useState<RangePreset>('yearly')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const range = computeRange(preset, customFrom, customTo)
  return { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range }
}

export function DateRangeSelector(props: ReturnType<typeof useDateRange>) {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo } = props
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 rounded-lg p-1">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              preset === p.id ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 shadow-sm' : 'text-ink-500 dark:text-ink-400'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="input w-36" />
          <span className="text-ink-400 dark:text-ink-500 text-sm">to</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="input w-36" />
        </div>
      )}
    </div>
  )
}
