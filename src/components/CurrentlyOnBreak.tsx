import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useOrganization } from '../contexts/OrganizationContext'
import { localDateInTz } from '../lib/attendance'
import { Avatar } from './Avatar'
import { Coffee } from 'lucide-react'
import type { AttendanceEntry, Profile } from '../lib/types'

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function CurrentlyOnBreak() {
  const { currentOrganization } = useOrganization()
  const [onBreak, setOnBreak] = useState<{ userId: string; name: string; avatar: string | null; since: string }[]>([])
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (!currentOrganization) return
    ;(async () => {
      const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
      const [entriesRes, membersRes] = await Promise.all([
        supabase.from('attendance_entries').select('*').eq('organization_id', currentOrganization.id).gte('occurred_at', since).order('occurred_at', { ascending: true }),
        supabase.from('organization_members').select('user_id').eq('organization_id', currentOrganization.id),
      ])
      const userIds = (membersRes.data || []).map(m => m.user_id)
      const profilesRes = userIds.length ? await supabase.from('profiles').select('*').in('id', userIds) : { data: [] as Profile[] }
      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]))

      const today = localDateInTz(new Date(), currentOrganization.timezone)
      const byUser = new Map<string, AttendanceEntry[]>()
      ;(entriesRes.data || []).forEach((e: AttendanceEntry) => {
        if (localDateInTz(e.occurred_at, currentOrganization.timezone) !== today) return
        const list = byUser.get(e.user_id) || []
        list.push(e)
        byUser.set(e.user_id, list)
      })

      const result: { userId: string; name: string; avatar: string | null; since: string }[] = []
      byUser.forEach((entries, userId) => {
        const last = entries[entries.length - 1]
        if (last.event_type === 'break_start') {
          const profile = profileMap.get(userId)
          result.push({
            userId,
            name: profile?.display_name || profile?.email || 'Unknown',
            avatar: profile?.avatar_url || null,
            since: last.occurred_at,
          })
        }
      })
      setOnBreak(result)
    })()
  }, [currentOrganization?.id])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  if (onBreak.length === 0) return null

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-3 flex items-center gap-1.5">
        <Coffee size={14} /> Currently on Break
      </h3>
      <div className="flex flex-wrap gap-3">
        {onBreak.map(p => (
          <div key={p.userId} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <Avatar url={p.avatar} name={p.name} size={6} />
            <div>
              <p className="text-xs font-medium text-ink-900 dark:text-ink-50">{p.name}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">{formatDuration(now.getTime() - new Date(p.since).getTime())}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
