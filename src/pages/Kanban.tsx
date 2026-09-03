import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { useTheme } from '../contexts/ThemeContext'
import { KANBAN_LISTS, ORIGIN_BADGE, type KanbanListKey } from '../lib/kanban'
import { FIXED_COLORS, getColorById, colorBadgeStyle } from '../lib/colors'
import type { KanbanCard } from '../lib/types'
import { formatDate } from '../lib/utils'
import { Plus, Archive, ArchiveRestore, CalendarDays } from 'lucide-react'

const emptyForm = {
  title: '',
  description: '',
  due_date: '',
  color_id: FIXED_COLORS[0].id,
}

export default function Kanban() {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [cards, setCards] = useState<KanbanCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [view, setView] = useState<'board' | 'archive'>('board')
  const [dragCardId, setDragCardId] = useState<string | null>(null)

  const fetchCards = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('kanban_cards').select('*').order('position', { ascending: true })
    if (error) console.error('Fetch kanban cards error:', error)
    setCards(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCards() }, [currentOrganization?.id])

  const addCard = async () => {
    if (!currentOrganization || !form.title.trim()) return
    const listCards = cards.filter(c => c.list_key === 'new' && !c.archived)
    const nextPosition = listCards.length ? Math.max(...listCards.map(c => c.position)) + 1 : 0
    const { error } = await supabase.from('kanban_cards').insert({
      organization_id: currentOrganization.id,
      list_key: 'new',
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_date: form.due_date || null,
      color_id: form.color_id,
      position: nextPosition,
      created_by: user?.id,
    })
    if (error) { console.error('Add kanban card error:', error); return }
    setForm(emptyForm)
    setShowAdd(false)
    fetchCards()
  }

  const updateCard = async (id: string, updates: Partial<KanbanCard>) => {
    const { data, error } = await supabase.from('kanban_cards').update(updates).eq('id', id).select().maybeSingle()
    if (error) { console.error('Update kanban card error:', error); return }
    if (data) setCards(cards.map(c => c.id === id ? data : c))
  }

  const toggleChecked = (card: KanbanCard) => {
    if (!card.checked) {
      updateCard(card.id, { checked: true, origin_list_key: card.list_key, list_key: 'completed' })
    } else {
      updateCard(card.id, { checked: false, origin_list_key: null, list_key: card.origin_list_key || 'new' })
    }
  }

  const moveToList = (card: KanbanCard, targetList: KanbanListKey) => {
    if (card.list_key === targetList) return
    const targetCards = cards.filter(c => c.list_key === targetList && !c.archived)
    const nextPosition = targetCards.length ? Math.max(...targetCards.map(c => c.position)) + 1 : 0
    if (targetList === 'completed') {
      updateCard(card.id, { list_key: 'completed', checked: true, origin_list_key: card.list_key, position: nextPosition })
    } else if (card.list_key === 'completed') {
      updateCard(card.id, { list_key: targetList, checked: false, origin_list_key: null, position: nextPosition })
    } else {
      updateCard(card.id, { list_key: targetList, position: nextPosition })
    }
  }

  const archiveCard = (card: KanbanCard) => updateCard(card.id, { archived: true, archived_at: new Date().toISOString() })
  const restoreCard = (card: KanbanCard) => updateCard(card.id, { archived: false, archived_at: null })

  const activeCards = cards.filter(c => !c.archived)
  const archivedCards = cards.filter(c => c.archived).sort((a, b) => (b.archived_at || '').localeCompare(a.archived_at || ''))

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Task Manager</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{currentOrganization?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 rounded-lg p-1">
            <button
              onClick={() => setView('board')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'board' ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 shadow-sm' : 'text-ink-500 dark:text-ink-400'}`}
            >
              Board
            </button>
            <button
              onClick={() => setView('archive')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'archive' ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 shadow-sm' : 'text-ink-500 dark:text-ink-400'}`}
            >
              Archive {archivedCards.length > 0 ? `(${archivedCards.length})` : ''}
            </button>
          </div>
          {view === 'board' && (
            <button onClick={() => setShowAdd(!showAdd)} className="btn-accent">
              <Plus size={16} /> Add Card
            </button>
          )}
        </div>
      </div>

      {showAdd && view === 'board' && (
        <div className="card p-4 animate-fade-in space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Title</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" placeholder="Card title" />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Color</label>
              <div className="flex flex-wrap gap-2">
                {FIXED_COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm({ ...form, color_id: c.id })}
                    title={c.label}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c.dark, borderColor: form.color_id === c.id ? (dark ? '#f8fafc' : '#0f172a') : 'transparent' }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
            <button onClick={addCard} className="btn-primary">Add Card</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-ink-400 dark:text-ink-500">Loading...</div>
      ) : view === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {KANBAN_LISTS.map(list => {
            const listCards = activeCards.filter(c => c.list_key === list.key).sort((a, b) => a.position - b.position)
            return (
              <div
                key={list.key}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (!dragCardId) return
                  const card = cards.find(c => c.id === dragCardId)
                  if (card) moveToList(card, list.key)
                  setDragCardId(null)
                }}
                className="card p-3 min-h-[300px] flex flex-col gap-2"
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300">{list.label}</h3>
                  <span className="text-xs text-ink-400 dark:text-ink-500">{listCards.length}</span>
                </div>
                <div className="flex-1 space-y-2">
                  {listCards.map(card => {
                    const color = getColorById(card.color_id || FIXED_COLORS[0].id)
                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={() => setDragCardId(card.id)}
                        className="rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-3 cursor-grab active:cursor-grabbing space-y-1.5"
                        style={{ borderLeftWidth: 4, borderLeftColor: color.dark }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={card.checked}
                              onChange={() => toggleChecked(card)}
                              className="mt-0.5"
                            />
                            <span className={`text-sm font-medium text-ink-900 dark:text-ink-50 break-words ${card.checked ? 'line-through text-ink-400 dark:text-ink-500' : ''}`}>
                              {card.title}
                            </span>
                          </label>
                          <button onClick={() => archiveCard(card)} className="p-1 rounded text-ink-300 dark:text-ink-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex-shrink-0">
                            <Archive size={13} />
                          </button>
                        </div>
                        {card.description && (
                          <p className="text-xs text-ink-500 dark:text-ink-400 break-words">{card.description}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          {card.due_date && (
                            <span className="badge-gray inline-flex items-center gap-1">
                              <CalendarDays size={11} /> {formatDate(card.due_date)}
                            </span>
                          )}
                          {card.list_key === 'completed' && card.origin_list_key && ORIGIN_BADGE[card.origin_list_key] && (
                            <span className="badge" style={colorBadgeStyle(color, dark)}>{ORIGIN_BADGE[card.origin_list_key]}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {listCards.length === 0 && (
                    <p className="text-xs text-ink-400 dark:text-ink-500 text-center py-6">Drop cards here</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {archivedCards.length === 0 ? (
            <div className="p-8 text-center text-ink-400 dark:text-ink-500">No archived cards.</div>
          ) : (
            <div className="divide-y divide-ink-100 dark:divide-ink-800">
              {archivedCards.map(card => {
                const color = getColorById(card.color_id || FIXED_COLORS[0].id)
                return (
                  <div key={card.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color.dark }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900 dark:text-ink-50 truncate">{card.title}</p>
                        <p className="text-xs text-ink-400 dark:text-ink-500">
                          {KANBAN_LISTS.find(l => l.key === card.list_key)?.label || card.list_key}
                          {card.archived_at ? ` — archived ${formatDate(card.archived_at)}` : ''}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => restoreCard(card)} className="btn-ghost text-xs flex-shrink-0">
                      <ArchiveRestore size={14} /> Restore
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
