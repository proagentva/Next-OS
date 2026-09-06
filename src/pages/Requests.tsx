import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { REQUEST_STATUSES } from '../lib/types'
import type { OrgRequest, RequestStatus, RequestComment, Profile } from '../lib/types'
import { Avatar } from '../components/Avatar'
import { Modal } from '../components/Modal'
import { formatDate } from '../lib/utils'
import { Plus, Play, Loader, AlertTriangle, CheckCircle2, Circle, Send } from 'lucide-react'

const STATUS_LABELS: Record<RequestStatus, string> = {
  not_started: 'Not Started',
  started: 'Started',
  under_progress: 'In Progress',
  stalled: 'Stalled',
  done: 'Done',
}

const STATUS_BADGE: Record<RequestStatus, string> = {
  not_started: 'badge-gray',
  started: 'badge-gold',
  under_progress: 'badge-gold',
  stalled: 'badge-red',
  done: 'badge-green',
}

const STATUS_ICON: Record<RequestStatus, typeof Circle> = {
  not_started: Circle,
  started: Play,
  under_progress: Loader,
  stalled: AlertTriangle,
  done: CheckCircle2,
}

export default function Requests() {
  const { user } = useAuth()
  const { currentOrganization, currentMembership } = useOrganization()
  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'admin'

  const [requests, setRequests] = useState<OrgRequest[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<RequestStatus>('not_started')
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const [openRequestId, setOpenRequestId] = useState<string | null>(null)
  const [comments, setComments] = useState<RequestComment[]>([])
  const [commentAuthors, setCommentAuthors] = useState<Record<string, Profile>>({})
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)

  const fetchRequests = async () => {
    if (!currentOrganization) return
    setLoading(true)
    const [requestsRes, membersRes] = await Promise.all([
      supabase.from('requests').select('*').order('created_at', { ascending: false }),
      supabase.from('organization_members').select('user_id').eq('organization_id', currentOrganization.id),
    ])
    setRequests(requestsRes.data || [])

    const userIds = (membersRes.data || []).map(m => m.user_id)
    if (userIds.length) {
      const { data: profileRows } = await supabase.from('profiles').select('*').in('id', userIds)
      const map: Record<string, Profile> = {}
      ;(profileRows || []).forEach((p: Profile) => { map[p.id] = p })
      setProfiles(map)
    }
    setLoading(false)
  }

  useEffect(() => { fetchRequests() }, [currentOrganization?.id])

  const addRequest = async () => {
    if (!currentOrganization || !user || !title.trim()) return
    setSaving(true)
    const { error } = await supabase.from('requests').insert({
      organization_id: currentOrganization.id,
      submitted_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
    })
    if (error) console.error('Submit request error:', error)

    setTitle('')
    setDescription('')
    setShowAdd(false)
    setSaving(false)
    fetchRequests()
  }

  const review = async (request: OrgRequest, status: RequestStatus) => {
    if (!user) return
    const { error } = await supabase.from('requests').update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', request.id)
    if (error) { console.error('Review request error:', error); return }
    setRequests(requests.map(r => r.id === request.id ? { ...r, status, reviewed_by: user.id, reviewed_at: new Date().toISOString() } : r))
  }

  const openRequest = async (request: OrgRequest) => {
    setOpenRequestId(request.id)
    setCommentsLoading(true)
    const { data, error } = await supabase.from('request_comments').select('*').eq('request_id', request.id).order('created_at', { ascending: true })
    if (error) console.error('Fetch comments error:', error)
    const rows = data || []
    setComments(rows)

    const authorIds = Array.from(new Set(rows.map(c => c.user_id).filter(Boolean))) as string[]
    const missing = authorIds.filter(id => !profiles[id])
    if (missing.length) {
      const { data: profileRows } = await supabase.from('profiles').select('*').in('id', missing)
      const extra: Record<string, Profile> = {}
      ;(profileRows || []).forEach((p: Profile) => { extra[p.id] = p })
      setCommentAuthors(prev => ({ ...prev, ...extra }))
    }
    setCommentsLoading(false)
  }

  const closeRequest = () => { setOpenRequestId(null); setComments([]); setCommentText('') }

  const postComment = async () => {
    if (!openRequestId || !currentOrganization || !user || !commentText.trim()) return
    const { data, error } = await supabase.from('request_comments').insert({
      request_id: openRequestId,
      organization_id: currentOrganization.id,
      user_id: user.id,
      body: commentText.trim(),
    }).select().maybeSingle()
    if (error) { console.error('Post comment error:', error); return }
    if (data) setComments(c => [...c, data])
    setCommentText('')
  }

  const authorOf = (userId: string | null): Profile | null => {
    if (!userId) return null
    return profiles[userId] || commentAuthors[userId] || null
  }

  const nameFor = (userId: string | null) => {
    if (!userId) return 'Unknown'
    const p = profiles[userId]
    return p?.display_name || p?.email || 'Unknown'
  }

  const visibleRequests = requests.filter(r => r.status === tab)
  const counts = REQUEST_STATUSES.reduce((acc, s) => ({ ...acc, [s]: requests.filter(r => r.status === s).length }), {} as Record<string, number>)
  const openRequestData = openRequestId ? requests.find(r => r.id === openRequestId) || null : null

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Requests</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{visibleRequests.length} {STATUS_LABELS[tab].toLowerCase()}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-accent">
          <Plus size={16} /> New Request
        </button>
      </div>

      <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 rounded-lg p-1 w-fit flex-wrap">
        {REQUEST_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${tab === s ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 shadow-sm' : 'text-ink-500 dark:text-ink-400'}`}
          >
            {STATUS_LABELS[s]} {counts[s] > 0 ? `(${counts[s]})` : ''}
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="card p-4 animate-fade-in space-y-3">
          <div>
            <label className="label">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="What do you need?" />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="input" rows={3} placeholder="More details..." />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowAdd(false); setTitle(''); setDescription('') }} className="btn-ghost">Cancel</button>
            <button onClick={addRequest} disabled={saving || !title.trim()} className="btn-primary">{saving ? 'Submitting...' : 'Submit'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-ink-400 dark:text-ink-500">Loading...</div>
      ) : visibleRequests.length === 0 ? (
        <div className="card p-8 text-center text-ink-400 dark:text-ink-500">No {STATUS_LABELS[tab].toLowerCase()} requests.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleRequests.map(request => (
            <div key={request.id} className="card p-4 space-y-3 cursor-pointer hover:border-ink-300 dark:hover:border-ink-700" onClick={() => openRequest(request)}>
              <div className="flex items-center justify-between">
                <span className={STATUS_BADGE[request.status as RequestStatus]}>{STATUS_LABELS[request.status as RequestStatus]}</span>
                <span className="text-xs text-ink-400 dark:text-ink-500">{formatDate(request.created_at)}</span>
              </div>

              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">{request.title}</p>
              {request.description && <p className="text-sm text-ink-700 dark:text-ink-300 whitespace-pre-wrap line-clamp-3">{request.description}</p>}

              <div className="flex items-center gap-2 text-xs text-ink-400 dark:text-ink-500">
                <Avatar url={profiles[request.submitted_by || '']?.avatar_url} name={nameFor(request.submitted_by)} size={6} />
                <span>{nameFor(request.submitted_by)}</span>
              </div>

              {isAdmin && (
                <div className="flex gap-2 pt-1 flex-wrap" onClick={e => e.stopPropagation()}>
                  {REQUEST_STATUSES.filter(s => s !== request.status).map(s => {
                    const Icon = STATUS_ICON[s]
                    return (
                      <button key={s} onClick={() => review(request, s)} className="btn-secondary text-xs flex-1 justify-center" title={STATUS_LABELS[s]}>
                        <Icon size={13} /> {STATUS_LABELS[s]}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {openRequestData && (
        <Modal title="Request" onClose={closeRequest}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={STATUS_BADGE[openRequestData.status as RequestStatus]}>{STATUS_LABELS[openRequestData.status as RequestStatus]}</span>
              <span className="text-xs text-ink-400 dark:text-ink-500">{formatDate(openRequestData.created_at)}</span>
            </div>
            <p className="text-sm font-medium text-ink-900 dark:text-ink-50">{openRequestData.title}</p>
            {openRequestData.description && <p className="text-sm text-ink-700 dark:text-ink-300 whitespace-pre-wrap">{openRequestData.description}</p>}
            <div className="flex items-center gap-2 text-xs text-ink-400 dark:text-ink-500">
              <Avatar url={profiles[openRequestData.submitted_by || '']?.avatar_url} name={nameFor(openRequestData.submitted_by)} size={6} />
              <span>Submitted by {nameFor(openRequestData.submitted_by)}</span>
            </div>

            {isAdmin && (
              <div className="flex gap-2 pt-1 flex-wrap">
                {REQUEST_STATUSES.filter(s => s !== openRequestData.status).map(s => {
                  const Icon = STATUS_ICON[s]
                  return (
                    <button key={s} onClick={() => review(openRequestData, s)} className="btn-secondary text-xs flex-1 justify-center">
                      <Icon size={13} /> {STATUS_LABELS[s]}
                    </button>
                  )
                })}
              </div>
            )}
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
                      <Avatar url={author?.avatar_url} name={author?.display_name || author?.email || 'Unknown'} size={6} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-ink-900 dark:text-ink-50">{author?.display_name || author?.email || 'Unknown'}</span>
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
