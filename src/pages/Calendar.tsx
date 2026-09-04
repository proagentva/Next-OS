import { useEffect, useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, addWeeks, subWeeks, format, isSameMonth, isToday, isSameDay,
} from 'date-fns'
import { supabase } from '../lib/supabase'
import { useOrganization } from '../contexts/OrganizationContext'
import { getColorById } from '../lib/colors'
import type { KanbanCard, Deal } from '../lib/types'
import { ChevronLeft, ChevronRight, Handshake } from 'lucide-react'

type CalEvent = {
  date: string
  title: string
  type: 'kanban' | 'deal'
  color: string
}

export default function CalendarPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { currentOrganization } = useOrganization()
  const [view, setView] = useState<'month' | 'week'>('month')
  const [anchor, setAnchor] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [kanbanRes, dealsRes] = await Promise.all([
        supabase.from('kanban_cards').select('*').eq('archived', false).not('due_date', 'is', null),
        supabase.from('deals').select('*').not('expected_closing_date', 'is', null),
      ])
      const kanbanEvents: CalEvent[] = ((kanbanRes.data || []) as KanbanCard[]).map(c => ({
        date: c.due_date as string,
        title: c.title,
        type: 'kanban',
        color: getColorById(c.color_id || 'blue').dark,
      }))
      const dealEvents: CalEvent[] = ((dealsRes.data || []) as Deal[]).map(d => ({
        date: d.expected_closing_date as string,
        title: d.address,
        type: 'deal',
        color: getColorById('teal').dark,
      }))
      setEvents([...kanbanEvents, ...dealEvents])
      setLoading(false)
    })()
  }, [currentOrganization?.id])

  const rangeStart = view === 'month' ? startOfWeek(startOfMonth(anchor)) : startOfWeek(anchor)
  const rangeEnd = view === 'month' ? endOfWeek(endOfMonth(anchor)) : endOfWeek(anchor)
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })

  const eventsFor = (day: Date) => events.filter(e => isSameDay(new Date(e.date + 'T00:00:00'), day))

  const goPrev = () => setAnchor(view === 'month' ? subMonths(anchor, 1) : subWeeks(anchor, 1))
  const goNext = () => setAnchor(view === 'month' ? addMonths(anchor, 1) : addWeeks(anchor, 1))
  const goToday = () => setAnchor(new Date())

  const label = view === 'month' ? format(anchor, 'MMMM yyyy') : `${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d, yyyy')}`

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Calendar</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">Task due dates and deal closings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 rounded-lg p-1">
            <button onClick={() => setView('month')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'month' ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 shadow-sm' : 'text-ink-500 dark:text-ink-400'}`}>Month</button>
            <button onClick={() => setView('week')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'week' ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 shadow-sm' : 'text-ink-500 dark:text-ink-400'}`}>Week</button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="btn-ghost p-2"><ChevronLeft size={16} /></button>
            <button onClick={goToday} className="btn-secondary text-sm px-3 py-1.5">Today</button>
            <button onClick={goNext} className="btn-ghost p-2"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50">{label}</h2>
        <div className="flex items-center gap-4 text-xs text-ink-500 dark:text-ink-400">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Task due date</span>
          <span className="inline-flex items-center gap-1.5"><Handshake size={12} className="text-teal-500" /> Deal closing</span>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-ink-400 dark:text-ink-500">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-ink-200 dark:border-ink-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="table-header text-center py-2">{d}</div>
            ))}
          </div>
          <div className={`grid grid-cols-7 ${view === 'week' ? '' : 'auto-rows-fr'}`}>
            {days.map(day => {
              const dayEvents = eventsFor(day)
              const inMonth = view === 'week' || isSameMonth(day, anchor)
              return (
                <div
                  key={day.toISOString()}
                  className={`border-r border-b border-ink-100 dark:border-ink-800 p-2 ${view === 'week' ? 'min-h-[200px]' : 'min-h-[100px]'} ${inMonth ? '' : 'bg-ink-50/50 dark:bg-ink-900/50'}`}
                >
                  <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday(day) ? 'bg-ink-900 dark:bg-ink-700 text-white' : inMonth ? 'text-ink-700 dark:text-ink-300' : 'text-ink-300 dark:text-ink-600'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.map((e, i) => (
                      <button
                        key={i}
                        onClick={() => onNavigate(e.type === 'kanban' ? 'kanban' : 'deals')}
                        title={e.title}
                        className="w-full text-left text-xs px-1.5 py-0.5 rounded truncate block hover:opacity-80"
                        style={{ backgroundColor: `${e.color}22`, color: e.color }}
                      >
                        {e.title}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
