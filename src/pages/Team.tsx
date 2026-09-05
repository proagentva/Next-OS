import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { ORG_TAB_IDS } from '../lib/types'
import type { OrganizationMember, OrganizationInvite, Profile } from '../lib/types'
import { Trash2, Copy, UserPlus } from 'lucide-react'

const TAB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  acquisition: 'Acquisition',
  disposition: 'Disposition',
  marketing: 'Marketing',
  quarterly: 'Quarterly View',
  reports: 'Reports',
  settings: 'Settings',
  deals: 'Deal Sheet',
  deal_roster: 'Daily Deals',
  kanban: 'Task Manager',
  calendar: 'Calendar',
  attendance: 'Attendance',
  training: 'Training',
  scripts: 'Scripts',
  team: 'Team',
  profile: 'Profile',
}

interface MemberRow extends OrganizationMember {
  profile: Profile | null
}

export default function Team() {
  const { user } = useAuth()
  const { currentOrganization, currentMembership } = useOrganization()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [invites, setInvites] = useState<OrganizationInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member', kpi_role: '', allowed_tabs: [] as string[] })
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'admin'

  const fetchData = async () => {
    if (!currentOrganization) return
    setLoading(true)

    const [membersRes, invitesRes] = await Promise.all([
      supabase.from('organization_members').select('*').eq('organization_id', currentOrganization.id).order('joined_at'),
      supabase.from('organization_invites').select('*').eq('organization_id', currentOrganization.id).is('used_at', null).order('created_at', { ascending: false }),
    ])

    const memberRows = membersRes.data || []
    const userIds = memberRows.map(m => m.user_id)
    const profilesRes = userIds.length
      ? await supabase.from('profiles').select('*').in('id', userIds)
      : { data: [] }
    const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]))

    setMembers(memberRows.map(m => ({ ...m, profile: profileMap.get(m.user_id) ?? null })))
    setInvites(invitesRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [currentOrganization?.id])

  const updateMember = async (id: string, updates: Partial<OrganizationMember>) => {
    const { data, error } = await supabase.from('organization_members').update(updates).eq('id', id).select().maybeSingle()
    if (error) { console.error('Update member error:', error); return }
    if (data) setMembers(members.map(m => m.id === id ? { ...m, ...data } : m))
  }

  const toggleTab = (member: MemberRow, tabId: string) => {
    const has = member.allowed_tabs.includes(tabId)
    const next = has ? member.allowed_tabs.filter(t => t !== tabId) : [...member.allowed_tabs, tabId]
    updateMember(member.id, { allowed_tabs: next })
  }

  const removeMember = async (id: string) => {
    if (!window.confirm('Remove this member from the organization?')) return
    const { error } = await supabase.from('organization_members').delete().eq('id', id)
    if (error) { console.error('Remove member error:', error); return }
    setMembers(members.filter(m => m.id !== id))
  }

  const sendInvite = async () => {
    if (!currentOrganization || !user || !inviteForm.email.trim()) return
    setSending(true)

    const { data, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: currentOrganization.id,
        email: inviteForm.email.trim(),
        invited_role: inviteForm.role,
        invited_kpi_role: inviteForm.kpi_role || null,
        invited_allowed_tabs: inviteForm.allowed_tabs,
        created_by: user.id,
      })
      .select()
      .maybeSingle()

    if (error) {
      console.error('Create invite error:', error)
      setSending(false)
      return
    }

    if (data) {
      const inviteUrl = `${window.location.origin}/invite/${data.token}`
      // Best-effort — the invite row + copyable link already work without this.
      supabase.functions.invoke('send-invite-email', {
        body: { email: data.email, inviteUrl, orgName: currentOrganization.name },
      }).catch(e => console.error('send-invite-email error:', e))

      setInvites([data, ...invites])
      setInviteForm({ email: '', role: 'member', kpi_role: '', allowed_tabs: [] })
    }
    setSending(false)
  }

  const revokeInvite = async (id: string) => {
    await supabase.from('organization_invites').delete().eq('id', id)
    setInvites(invites.filter(i => i.id !== id))
  }

  const copyInviteLink = (invite: OrganizationInvite) => {
    const url = `${window.location.origin}/invite/${invite.token}`
    navigator.clipboard.writeText(url)
    setCopiedId(invite.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center text-ink-500 dark:text-ink-400">Only owners and admins can view the Team page.</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Team</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">{currentOrganization?.name} — {members.length} member{members.length === 1 ? '' : 's'}</p>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-3">Invite Teammate</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="email"
            value={inviteForm.email}
            onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
            className="input"
            placeholder="email@example.com"
          />
          <select value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })} className="input">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <input
            type="text"
            value={inviteForm.kpi_role}
            onChange={e => setInviteForm({ ...inviteForm, kpi_role: e.target.value })}
            className="input"
            placeholder="KPI role (optional)"
          />
          <button onClick={sendInvite} disabled={sending || !inviteForm.email.trim()} className="btn-primary justify-center">
            <UserPlus size={16} /> Invite
          </button>
        </div>
        <div className="mt-3">
          <label className="label">Tab Access</label>
          <div className="flex flex-wrap gap-2">
            {ORG_TAB_IDS.map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setInviteForm(f => ({
                  ...f,
                  allowed_tabs: f.allowed_tabs.includes(tab) ? f.allowed_tabs.filter(t => t !== tab) : [...f.allowed_tabs, tab],
                }))}
                className={inviteForm.allowed_tabs.includes(tab) ? 'badge-green' : 'badge-gray'}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {invites.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-ink-200 dark:border-ink-800">
            <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300">Pending Invites</h3>
          </div>
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {invites.map(inv => (
              <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink-900 dark:text-ink-50">{inv.email}</p>
                  <p className="text-xs text-ink-400 dark:text-ink-500">{inv.invited_role}{inv.invited_kpi_role ? ` — ${inv.invited_kpi_role}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => copyInviteLink(inv)} className="btn-ghost text-xs">
                    <Copy size={14} /> {copiedId === inv.id ? 'Copied!' : 'Copy link'}
                  </button>
                  <button onClick={() => revokeInvite(inv.id)} className="p-1.5 rounded text-ink-300 dark:text-ink-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-ink-400 dark:text-ink-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ink-50 dark:bg-ink-800">
                <tr>
                  <th className="table-header text-left px-3 py-2">Name</th>
                  <th className="table-header text-left px-3 py-2">Role</th>
                  <th className="table-header text-left px-3 py-2">KPI Role</th>
                  <th className="table-header text-left px-3 py-2">Tab Access</th>
                  <th className="table-header px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-t border-ink-100 dark:border-ink-800">
                    <td className="table-cell">
                      <p className="font-medium">{m.profile?.display_name || 'Unknown'}</p>
                      <p className="text-xs text-ink-400 dark:text-ink-500">{m.profile?.email}</p>
                    </td>
                    <td className="table-cell">
                      {m.role === 'owner' ? (
                        <span className="badge-gold">Owner</span>
                      ) : (
                        <select value={m.role} onChange={e => updateMember(m.id, { role: e.target.value })} className="input py-1">
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="table-cell">
                      <input
                        type="text"
                        defaultValue={m.kpi_role || ''}
                        onBlur={e => updateMember(m.id, { kpi_role: e.target.value || null })}
                        className="input py-1"
                        placeholder="—"
                      />
                    </td>
                    <td className="table-cell">
                      {m.role === 'owner' ? (
                        <span className="text-xs text-ink-400 dark:text-ink-500">All tabs (owner)</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {ORG_TAB_IDS.map(tab => (
                            <button
                              key={tab}
                              onClick={() => toggleTab(m, tab)}
                              className={m.allowed_tabs.includes(tab) ? 'badge-green' : 'badge-gray'}
                            >
                              {TAB_LABELS[tab]}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      {m.role !== 'owner' && m.user_id !== user?.id && (
                        <button onClick={() => removeMember(m.id)} className="p-1.5 rounded text-ink-300 dark:text-ink-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
