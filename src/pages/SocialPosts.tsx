import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { SOCIAL_POST_STATUSES } from '../lib/types'
import type { SocialPost, SocialPostStatus, SocialPostComment, Profile } from '../lib/types'
import { Avatar } from '../components/Avatar'
import { Modal } from '../components/Modal'
import { formatDate } from '../lib/utils'
import { Plus, Check, RotateCcw, X, ExternalLink, Send } from 'lucide-react'

const STATUS_LABELS: Record<SocialPostStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  revise: 'Needs Revision',
  disapproved: 'Disapproved',
}

const STATUS_BADGE: Record<SocialPostStatus, string> = {
  pending: 'badge-gray',
  approved: 'badge-green',
  revise: 'badge-gold',
  disapproved: 'badge-red',
}

const STATUS_ICON: Record<SocialPostStatus, typeof Check> = {
  pending: RotateCcw,
  approved: Check,
  revise: RotateCcw,
  disapproved: X,
}

export default function SocialPosts() {
  const { user } = useAuth()
  const { currentOrganization, currentMembership } = useOrganization()
  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'admin'

  const [posts, setPosts] = useState<SocialPost[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [mediaUrls, setMediaUrls] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<SocialPostStatus>('pending')
  const [showAdd, setShowAdd] = useState(false)
  const [caption, setCaption] = useState('')
  const [link, setLink] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [openPostId, setOpenPostId] = useState<string | null>(null)
  const [comments, setComments] = useState<SocialPostComment[]>([])
  const [commentAuthors, setCommentAuthors] = useState<Record<string, Profile>>({})
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)

  const fetchPosts = async () => {
    if (!currentOrganization) return
    setLoading(true)
    const [postsRes, membersRes] = await Promise.all([
      supabase.from('social_posts').select('*').order('created_at', { ascending: false }),
      supabase.from('organization_members').select('user_id').eq('organization_id', currentOrganization.id),
    ])
    const rows = postsRes.data || []
    setPosts(rows)

    const userIds = (membersRes.data || []).map(m => m.user_id)
    if (userIds.length) {
      const { data: profileRows } = await supabase.from('profiles').select('*').in('id', userIds)
      const map: Record<string, Profile> = {}
      ;(profileRows || []).forEach((p: Profile) => { map[p.id] = p })
      setProfiles(map)
    }

    const urls: Record<string, string[]> = {}
    await Promise.all(rows.map(async (p: SocialPost) => {
      if (!p.media_paths.length) return
      const signedUrls = await Promise.all(p.media_paths.map(async path => {
        const { data } = await supabase.storage.from('social-media').createSignedUrl(path, 3600)
        return data?.signedUrl || null
      }))
      urls[p.id] = signedUrls.filter((u): u is string => !!u)
    }))
    setMediaUrls(urls)
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [currentOrganization?.id])

  const addPost = async () => {
    if (!currentOrganization || !user) return
    if (!caption.trim() && !link.trim() && files.length === 0) return
    setSaving(true)

    const mediaPaths: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${currentOrganization.id}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('social-media').upload(path, file)
      if (!error) mediaPaths.push(path)
    }

    const { error } = await supabase.from('social_posts').insert({
      organization_id: currentOrganization.id,
      submitted_by: user.id,
      caption: caption.trim() || null,
      link: link.trim() || null,
      media_paths: mediaPaths,
    })
    if (error) console.error('Submit social post error:', error)

    setCaption('')
    setLink('')
    setFiles([])
    setShowAdd(false)
    setSaving(false)
    fetchPosts()
  }

  const review = async (post: SocialPost, status: SocialPostStatus) => {
    if (!user) return
    const { error } = await supabase.from('social_posts').update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', post.id)
    if (error) { console.error('Review social post error:', error); return }
    setPosts(posts.map(p => p.id === post.id ? { ...p, status, reviewed_by: user.id, reviewed_at: new Date().toISOString() } : p))
  }

  const openPost = async (post: SocialPost) => {
    setOpenPostId(post.id)
    setCommentsLoading(true)
    const { data, error } = await supabase.from('social_post_comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true })
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

  const closePost = () => { setOpenPostId(null); setComments([]); setCommentText('') }

  const postComment = async () => {
    if (!openPostId || !currentOrganization || !user || !commentText.trim()) return
    const { data, error } = await supabase.from('social_post_comments').insert({
      post_id: openPostId,
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

  const visiblePosts = posts.filter(p => p.status === tab)
  const counts = SOCIAL_POST_STATUSES.reduce((acc, s) => ({ ...acc, [s]: posts.filter(p => p.status === s).length }), {} as Record<string, number>)
  const openPostData = openPostId ? posts.find(p => p.id === openPostId) || null : null

  const nameFor = (userId: string | null) => {
    if (!userId) return 'Unknown'
    const p = profiles[userId]
    return p?.display_name || p?.email || 'Unknown'
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Social Media Post Approvals</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{visiblePosts.length} {STATUS_LABELS[tab].toLowerCase()}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-accent">
          <Plus size={16} /> Submit Post
        </button>
      </div>

      <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 rounded-lg p-1 w-fit">
        {SOCIAL_POST_STATUSES.map(s => (
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
            <label className="label">Caption</label>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} className="input" rows={3} placeholder="Post caption..." />
          </div>
          <div>
            <label className="label">Link (optional)</label>
            <input type="url" value={link} onChange={e => setLink(e.target.value)} className="input" placeholder="https://..." />
          </div>
          <div>
            <label className="label">Media (optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={e => setFiles(Array.from(e.target.files || []))}
              className="input"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowAdd(false); setCaption(''); setLink(''); setFiles([]) }} className="btn-ghost">Cancel</button>
            <button onClick={addPost} disabled={saving} className="btn-primary">{saving ? 'Submitting...' : 'Submit'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-ink-400 dark:text-ink-500">Loading...</div>
      ) : visiblePosts.length === 0 ? (
        <div className="card p-8 text-center text-ink-400 dark:text-ink-500">No {STATUS_LABELS[tab].toLowerCase()} posts.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visiblePosts.map(post => (
            <div key={post.id} className="card p-4 space-y-3 cursor-pointer hover:border-ink-300 dark:hover:border-ink-700" onClick={() => openPost(post)}>
              <div className="flex items-center justify-between">
                <span className={STATUS_BADGE[post.status as SocialPostStatus]}>{STATUS_LABELS[post.status as SocialPostStatus]}</span>
                <span className="text-xs text-ink-400 dark:text-ink-500">{formatDate(post.created_at)}</span>
              </div>

              {mediaUrls[post.id]?.length > 0 && (
                <div className="grid grid-cols-2 gap-1">
                  {mediaUrls[post.id].map((url, i) => (
                    <img key={i} src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                  ))}
                </div>
              )}

              {post.caption && <p className="text-sm text-ink-700 dark:text-ink-300 whitespace-pre-wrap line-clamp-3">{post.caption}</p>}
              {post.link && (
                <a href={post.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-sm text-accent-600 dark:text-accent-400 hover:underline inline-flex items-center gap-1 break-all">
                  {post.link} <ExternalLink size={11} className="flex-shrink-0" />
                </a>
              )}

              <div className="flex items-center gap-2 text-xs text-ink-400 dark:text-ink-500">
                <Avatar url={profiles[post.submitted_by || '']?.avatar_url} name={nameFor(post.submitted_by)} size={6} />
                <span>{nameFor(post.submitted_by)}</span>
              </div>

              {isAdmin && (
                <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                  {SOCIAL_POST_STATUSES.filter(s => s !== post.status).map(s => {
                    const Icon = STATUS_ICON[s]
                    const color = s === 'approved' ? 'text-accent-700 dark:text-accent-400' : s === 'disapproved' ? 'text-red-600 dark:text-red-400' : s === 'revise' ? 'text-gold-700 dark:text-gold-400' : 'text-ink-500 dark:text-ink-400'
                    return (
                      <button key={s} onClick={() => review(post, s)} className={`btn-secondary text-xs flex-1 justify-center ${color}`} title={STATUS_LABELS[s]}>
                        <Icon size={13} /> {s === 'pending' ? 'Reopen' : STATUS_LABELS[s]}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {openPostData && (
        <Modal title="Post" onClose={closePost}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={STATUS_BADGE[openPostData.status as SocialPostStatus]}>{STATUS_LABELS[openPostData.status as SocialPostStatus]}</span>
              <span className="text-xs text-ink-400 dark:text-ink-500">{formatDate(openPostData.created_at)}</span>
            </div>
            {mediaUrls[openPostData.id]?.length > 0 && (
              <div className="grid grid-cols-2 gap-1">
                {mediaUrls[openPostData.id].map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full h-32 object-cover rounded-lg" />
                ))}
              </div>
            )}
            {openPostData.caption && <p className="text-sm text-ink-700 dark:text-ink-300 whitespace-pre-wrap">{openPostData.caption}</p>}
            {openPostData.link && (
              <a href={openPostData.link} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-600 dark:text-accent-400 hover:underline inline-flex items-center gap-1 break-all">
                {openPostData.link} <ExternalLink size={11} className="flex-shrink-0" />
              </a>
            )}
            <div className="flex items-center gap-2 text-xs text-ink-400 dark:text-ink-500">
              <Avatar url={profiles[openPostData.submitted_by || '']?.avatar_url} name={nameFor(openPostData.submitted_by)} size={6} />
              <span>Submitted by {nameFor(openPostData.submitted_by)}</span>
            </div>

            {isAdmin && (
              <div className="flex gap-2 pt-1">
                {SOCIAL_POST_STATUSES.filter(s => s !== openPostData.status).map(s => {
                  const Icon = STATUS_ICON[s]
                  return (
                    <button key={s} onClick={() => review(openPostData, s)} className="btn-secondary text-xs flex-1 justify-center">
                      <Icon size={13} /> {s === 'pending' ? 'Reopen' : STATUS_LABELS[s]}
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
