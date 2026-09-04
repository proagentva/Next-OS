import { Fragment, useEffect, useMemo, useState } from 'react'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { EVENT_LABELS, localDateInTz, localTimeInTz, logAttendanceEvent, computeClockState } from '../lib/attendance'
import type { AttendanceEntry, Profile } from '../lib/types'
import { LogIn, LogOut, Coffee, Check } from 'lucide-react'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function Attendance({ year }: { year: number }) {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()
  const tz = currentOrganization!.timezone
  const [view, setView] = useState<'clock' | 'yearly'>('clock')

  const [myEntries, setMyEntries] = useState<AttendanceEntry[]>([])
  const [clockLoading, setClockLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const fetchMyToday = async () => {
    if (!user || !currentOrganization) return
    setClockLoading(true)
    const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString()
    const { data, error } = await supabase.from('attendance_entries').select('*')
      .eq('organization_id', currentOrganization.id).eq('user_id', user.id)
      .gte('occurred_at', since).order('occurred_at', { ascending: true })
    if (error) console.error('Fetch attendance error:', error)
    const today = localDateInTz(new Date(), tz)
    setMyEntries((data || []).filter((e: AttendanceEntry) => localDateInTz(e.occurred_at, tz) === today))
    setClockLoading(false)
  }

  useEffect(() => { fetchMyToday() }, [currentOrganization?.id, user?.id])

  const clockState = computeClockState(myEntries)

  const doAction = async (eventType: 'sign_in' | 'sign_out' | 'break_start' | 'break_end') => {
    if (!currentOrganization) return
    setActing(true)
    try {
      await logAttendanceEvent(currentOrganization.id, eventType)
      await fetchMyToday()
    } catch (e) {
      console.error('Log attendance error:', e)
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Attendance</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{currentOrganization?.name} — {tz.replace('_', ' ')}</p>
        </div>
        <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 rounded-lg p-1">
          <button onClick={() => setView('clock')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'clock' ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 shadow-sm' : 'text-ink-500 dark:text-ink-400'}`}>Clock</button>
          <button onClick={() => setView('yearly')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'yearly' ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 shadow-sm' : 'text-ink-500 dark:text-ink-400'}`}>Yearly View</button>
        </div>
      </div>

      {view === 'clock' ? (
        <div className="card p-6 max-w-xl space-y-5">
          {clockLoading ? (
            <p className="text-sm text-ink-400 dark:text-ink-500">Loading...</p>
          ) : (
            <>
              <div>
                <p className="text-sm text-ink-500 dark:text-ink-400">
                  {clockState.signedIn
                    ? clockState.onBreak ? 'On break' : 'Signed in'
                    : 'Not signed in'}
                  {clockState.lastEntry && ` — ${EVENT_LABELS[clockState.lastEntry.event_type]} at ${localTimeInTz(clockState.lastEntry.occurred_at, tz)}`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => doAction('sign_in')} disabled={!clockState.canSignIn || acting} className="btn-accent justify-center py-3">
                  <LogIn size={16} /> Sign In
                </button>
                <button onClick={() => doAction('sign_out')} disabled={!clockState.canSignOut || acting} className="btn-secondary justify-center py-3">
                  <LogOut size={16} /> Sign Out
                </button>
                <button onClick={() => doAction('break_start')} disabled={!clockState.canStartBreak || acting} className="btn-secondary justify-center py-3">
                  <Coffee size={16} /> Start Break
                </button>
                <button onClick={() => doAction('break_end')} disabled={!clockState.canEndBreak || acting} className="btn-secondary justify-center py-3">
                  <Check size={16} /> End Break
                </button>
              </div>
              {myEntries.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-2">Today</p>
                  <div className="space-y-1">
                    {myEntries.map(e => (
                      <div key={e.id} className="flex items-center justify-between text-sm">
                        <span className="text-ink-600 dark:text-ink-300">{EVENT_LABELS[e.event_type]}</span>
                        <span className="text-ink-400 dark:text-ink-500 font-mono">{localTimeInTz(e.occurred_at, tz)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <YearlyView year={year} tz={tz} orgId={currentOrganization!.id} />
      )}
    </div>
  )
}

function YearlyView({ year, tz, orgId }: { year: number; tz: string; orgId: string }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [members, setMembers] = useState<{ id: string; name: string }[]>([])
  const [entries, setEntries] = useState<AttendanceEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const monthStart = startOfMonth(new Date(year, month - 1, 1))
      const monthEnd = endOfMonth(monthStart)
      const rangeFrom = new Date(monthStart.getTime() - 24 * 3600 * 1000).toISOString()
      const rangeTo = new Date(monthEnd.getTime() + 48 * 3600 * 1000).toISOString()

      const [membersRes, entriesRes] = await Promise.all([
        supabase.from('organization_members').select('user_id').eq('organization_id', orgId),
        supabase.from('attendance_entries').select('*').eq('organization_id', orgId).gte('occurred_at', rangeFrom).lte('occurred_at', rangeTo).order('occurred_at', { ascending: true }),
      ])
      const userIds = (membersRes.data || []).map(m => m.user_id)
      const profilesRes = userIds.length ? await supabase.from('profiles').select('*').in('id', userIds) : { data: [] as Profile[] }
      setMembers((profilesRes.data || []).map((p: Profile) => ({ id: p.id, name: p.display_name || p.email || 'Unknown' })))
      setEntries(entriesRes.data || [])
      setLoading(false)
    })()
  }, [year, month, orgId])

  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(monthStart)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // entriesByUserDay: userId -> localDateString -> entries[]
  const entriesByUserDay = useMemo(() => {
    const map = new Map<string, Map<string, AttendanceEntry[]>>()
    entries.forEach(e => {
      const localDay = localDateInTz(e.occurred_at, tz)
      if (!map.has(e.user_id)) map.set(e.user_id, new Map())
      const dayMap = map.get(e.user_id)!
      if (!dayMap.has(localDay)) dayMap.set(localDay, [])
      dayMap.get(localDay)!.push(e)
    })
    return map
  }, [entries, tz])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="input w-40">
          {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <span className="text-sm text-ink-500 dark:text-ink-400">{year}</span>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-ink-400 dark:text-ink-500">Loading...</div>
      ) : members.length === 0 ? (
        <div className="card p-8 text-center text-ink-400 dark:text-ink-500">No team members yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                <th rowSpan={2} className="table-header text-left px-3 py-2 sticky left-0 bg-ink-50 dark:bg-ink-800 whitespace-nowrap">Employee</th>
                <th rowSpan={2} className="table-header text-right px-3 py-2 bg-ink-50 dark:bg-ink-800 whitespace-nowrap">Days Worked</th>
                {days.map(d => {
                  const weekend = getDay(d) === 0 || getDay(d) === 6
                  return (
                    <th key={d.toISOString()} colSpan={2} className={`table-header text-center px-2 py-1 border-l border-ink-100 dark:border-ink-800 ${weekend ? 'bg-ink-100 dark:bg-ink-800' : 'bg-ink-50 dark:bg-ink-800'}`}>
                      {format(d, 'd')}
                    </th>
                  )
                })}
              </tr>
              <tr>
                {days.map(d => {
                  const weekend = getDay(d) === 0 || getDay(d) === 6
                  return (
                    <Fragment key={d.toISOString()}>
                      <th className={`text-[10px] font-medium text-ink-400 dark:text-ink-500 px-2 py-1 border-l border-ink-100 dark:border-ink-800 ${weekend ? 'bg-ink-100 dark:bg-ink-800' : ''}`}>In</th>
                      <th className={`text-[10px] font-medium text-ink-400 dark:text-ink-500 px-2 py-1 ${weekend ? 'bg-ink-100 dark:bg-ink-800' : ''}`}>Out</th>
                    </Fragment>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const dayMap = entriesByUserDay.get(m.id) || new Map<string, AttendanceEntry[]>()
                const daysWorked = Array.from(dayMap.values()).filter(list => list.some(e => e.event_type === 'sign_in')).length
                return (
                  <tr key={m.id} className="border-t border-ink-100 dark:border-ink-800">
                    <td className="table-cell whitespace-nowrap sticky left-0 bg-white dark:bg-ink-900 font-medium">{m.name}</td>
                    <td className="table-cell text-right font-mono">{daysWorked}</td>
                    {days.map(d => {
                      const localDay = format(d, 'yyyy-MM-dd')
                      const dayEntries = dayMap.get(localDay) || []
                      const signIn = dayEntries.find((e: AttendanceEntry) => e.event_type === 'sign_in')
                      const signOuts = dayEntries.filter((e: AttendanceEntry) => e.event_type === 'sign_out')
                      const signOut = signOuts[signOuts.length - 1]
                      const weekend = getDay(d) === 0 || getDay(d) === 6
                      return (
                        <Fragment key={localDay}>
                          <td className={`text-xs text-center px-2 py-1.5 border-l border-ink-100 dark:border-ink-800 font-mono text-ink-600 dark:text-ink-300 ${weekend ? 'bg-ink-50/50 dark:bg-ink-800/30' : ''}`}>
                            {signIn ? localTimeInTz(signIn.occurred_at, tz) : ''}
                          </td>
                          <td className={`text-xs text-center px-2 py-1.5 font-mono text-ink-600 dark:text-ink-300 ${weekend ? 'bg-ink-50/50 dark:bg-ink-800/30' : ''}`}>
                            {signOut ? localTimeInTz(signOut.occurred_at, tz) : ''}
                          </td>
                        </Fragment>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
