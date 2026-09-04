import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { useTheme } from '../contexts/ThemeContext'
import { KANBAN_LISTS, ORIGIN_BADGE, type KanbanListKey } from '../lib/kanban'
import { FIXED_COLORS, getColorById, colorBadgeStyle } from '../lib/colors'
import type { KanbanCard, KanbanComment, Profile } from '../lib/types'
import { formatDate } from '../lib/utils'
import { Avatar } from '../components/Avatar'
import { Modal } from '../components/Modal'
import { Plus, Archive, ArchiveRestore, CalendarDays, Send } from 'lucide-react'

const emptyForm = {
  title: '',
  description: '',
  due_date: '',
  color_id: FIXED_COLORS[0].id,
  assigned_to: '',
}

type Member = { id: string; name: string; avatar_url: string | null }

export default function Kanban() {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [cards, setCards] = useState<KanbanCard[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [view, setView] = useState<'board' | 'archive'>('board')
  const [dragCardId, setDragCardId] = useState<string | null>(null)
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [comments, setComments] = useState<KanbanComment[]>([])
  const [commentAuthors, setCommentAuthors] = useState<Record<string, Member>>({})
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)

  const fetchCards = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('kanban_cards').select('*').order('position', { ascending: true })
    if (error) console.error('Fetch kanban cards error:', error)
    setCards(data || [])
    setLoading(false)
  }

  const fetchMembers = async () => {
    if (!currentOrganization) return
    const { data: memberRows } = await supabase.from('organization_members').select('user_id').eq('organization_id', currentOrganization.id)
    const userIds = (memberRows || []).map(m => m.user_id)
    if (!userIds.length) return
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds)
    setMembers((profiles || []).map((p: Profile) => ({ id: p.id, name: p.display_name || p.email || 'Unknown', avatar_url: p.avatar_url })))
  }

  useEffect(() => { fetchCards(); fetchMembers() }, [currentOrganization?.id])

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
      assigned_to: form.assigned_to || null,
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

  const openCard = async (card: KanbanCard) => {
    setOpenCardId(card.id)
    setCommentsLoading(true)
    const { data, error } = await supabase.from('kanban_comments').select('*').eq('card_id', card.id).order('created_at', { ascending: true })
    if (error) console.error('Fetch comments error:', error)
    const rows = data || []
    setComments(rows)
    const authorIds = Array.from(new Set(rows.map(c => c.user_id).filter(Boolean))) as string[]
    const missing = authorIds.filter(id => !members.find(m => m.id === id))
    if (missing.length) {
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', missing)
      const extra: Record<string, Member> = {}
      ;(profiles || []).forEach((p: Profile) => { extra[p.id] = { id: p.id, name: p.display_name || p.email || 'Unknown', avatar_url: p.avatar_url } })
      setCommentAuthors(prev => ({ ...prev, ...extra }))
    }
    setCommentsLoading(false)
  }

  const closeCard = () => { setOpenCardId(null); setComments([]); setCommentText('') }

  const postComment = async () => {
    if (!openCardId || !currentOrganization || !user || !commentText.trim()) return
    const { data, error } = await supabase.from('kanban_comments').insert({
      card_id: openCardId,
      organization_id: currentOrganization.id,
      user_id: user.id,
      body: commentText.trim(),
    }).select().maybeSingle()
    if (error) { console.error('Post comment error:', error); return }
    if (data) setComments(c => [...c, data])
    setCommentText('')
  }

  const authorOf = (userId: string | null): Member | null => {
    if (!userId) return null
    return members.find(m => m.id === userId) || commentAuthors[userId] || null
  }

  const activeCards = cards.filter(c => !c.archived)
  const archivedCards = cards.filter(c => c.archived).sort((a, b) => (b.archived_at || '').localeCompare(a.archived_at || ''))
  const openCard_ = openCardId ? cards.find(c => c.id === openCardId) || null : null

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
            <div>
              <label className="label">Assign To</label>
              <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="input">
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
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
                    const assignee = card.assigned_to ? members.find(m => m.id === card.assigned_to) : null
                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={() => setDragCardId(card.id)}
                        onClick={() => openCard(card)}
                        className="rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-3 cursor-grab active:cursor-grabbing space-y-1.5 hover:border-ink-300 dark:hover:border-ink-700"
                        style={{ borderLeftWidth: 4, borderLeftColor: color.dark }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={card.checked}
                              onChange={() => toggleChecked(card)}
                              onClick={e => e.stopPropagation()}
                              className="mt-0.5"
                            />
                            <span className={`text-sm font-medium text-ink-900 dark:text-ink-50 break-words ${card.checked ? 'line-through text-ink-400 dark:text-ink-500' : ''}`}>
                              {card.title}
                            </span>
                          </div>
                          <button onClick={e => { e.stopPropagation(); archiveCard(card) }} className="p-1 rounded text-ink-300 dark:text-ink-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex-shrink-0">
                            <Archive size={13} />
                          </button>
                        </div>
                        {card.description && (
                          <p className="text-xs text-ink-500 dark:text-ink-400 break-words">{card.description}</p>
                        )}
                        <div className="flex items-center justify-between gap-2">
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
                          {assignee && <Avatar url={assignee.avatar_url} name={assignee.name} size={6} />}
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

      {openCard_ && (
        <Modal title={openCard_.title} onClose={closeCard}>
          <div className="space-y-3">
            {openCard_.description && (
              <p className="text-sm text-ink-600 dark:text-ink-300">{openCard_.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm">
              {openCard_.due_date && (
                <span className="badge-gray inline-flex items-center gap-1">
                  <CalendarDays size={12} /> {formatDate(openCard_.due_date)}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-ink-500 dark:text-ink-400">Assignee:</span>
                <select
                  value={openCard_.assigned_to || ''}
                  onChange={e => updateCard(openCard_.id, { assigned_to: e.target.value || null })}
                  className="input py-1 w-40"
                >
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-ink-200 dark:border-ink-800 pt-3 space-y-3">
            <h4 className="text-xs font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide">Comments</h4>
            {commentsLoading ? (
              <p className="text-sm text-ink-400 dark:text-ink-500">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-ink-400 dark:text-ink-500">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {comments.map(c => {
                  const author = authorOf(c.user_id)
                  return (
                    <div key={c.id} className="flex items-start gap-2">
                      <Avatar url={author?.avatar_url} name={author?.name || 'Unknown'} size={6} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-ink-900 dark:text-ink-50">{author?.name || 'Unknown'}</span>
                          <span className="text-xs text-ink-400 dark:text-ink-500">{formatDate(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-ink-600 dark:text-ink-300 break-words">{c.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') postComment() }}
                className="input"
                placeholder="Add a comment..."
              />
              <button onClick={postComment} disabled={!commentText.trim()} className="btn-primary px-3">
                <Send size={14} />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
