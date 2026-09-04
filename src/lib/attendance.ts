import { supabase } from './supabase'
import type { AttendanceEntry, AttendanceEventType } from './types'

export const EVENT_LABELS: Record<AttendanceEventType, string> = {
  sign_in: 'Sign In',
  sign_out: 'Sign Out',
  break_start: 'Start Break',
  break_end: 'End Break',
}

// The calendar date (YYYY-MM-DD) a UTC instant falls on within a given
// IANA timezone — used to determine "today" and day boundaries per the
// org's configured timezone, independent of the viewer's own browser tz.
export function localDateInTz(date: Date | string, timezone: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

export function localTimeInTz(date: Date | string, timezone: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour: 'numeric', minute: '2-digit',
  }).format(d)
}

export async function logAttendanceEvent(orgId: string, eventType: AttendanceEventType): Promise<AttendanceEntry> {
  const { data, error } = await supabase.rpc('log_attendance_event', { p_org_id: orgId, p_event_type: eventType })
  if (error) throw error
  return data as AttendanceEntry
}

// Determine which of the four clock actions are currently valid, from a
// user's attendance entries for the current local day, in chronological order.
export function computeClockState(todayEntries: AttendanceEntry[]) {
  const last = todayEntries[todayEntries.length - 1]
  const signedIn = todayEntries.some(e => e.event_type === 'sign_in') &&
    !(last?.event_type === 'sign_out')
  const onBreak = signedIn && last?.event_type === 'break_start'
  return {
    canSignIn: !signedIn,
    canSignOut: signedIn && !onBreak,
    canStartBreak: signedIn && !onBreak,
    canEndBreak: onBreak,
    signedIn,
    onBreak,
    lastEntry: last || null,
  }
}
