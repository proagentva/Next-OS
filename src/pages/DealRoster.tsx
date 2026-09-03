import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { formatDate } from '../lib/utils'
import { ROSTER_STATUSES, DEAL_TYPES } from '../lib/types'
import type { DealRosterEntry, Profile } from '../lib/types'
import { Plus, Trash2 } from 'lucide-react'

const emptyForm = {
  date_added: new Date().toISOString().split('T')[0],
  full_name: '',
  address: '',
  lead_source: '',
  status: ROSTER_STATUSES[0] as string,
  notes: '',
  next_touch: '',
  agenda: '',
  deal_type: '',
  owner: '',
}

function timeLapse(dateAdded: string, nextTouch: string | null): string {
  if (!nextTouch) return ''
  const days = Math.round((new Date(nextTouch).getTime() - new Date(dateAdded).getTime()) / 86400000)
  return String(days)
}

export default function DealRoster() {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()
  const [rows, setRows] = useState<DealRosterEntry[]>([])
  const [members, setMembers] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [statusFilter, setStatusFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [sortByTouch, setSortByTouch] = useState(false)

  const fetchData = async () => {
    if (!currentOrganization) return
    setLoading(true)

    const [rosterRes, membersRes] = await Promise.all([
      supabase.from('deal_roster').select('*').order('date_added', { ascending: false }),
      supabase.from('organization_members').select('user_id').eq('organization_id', currentOrganization.id),
    ])

    const userIds = (membersRes.data || []).map(m => m.user_id)
    const profilesRes = userIds.length
      ? await supabase.from('profiles').select('*').in('id', userIds)
      : { data: [] as Profile[] }

    setMembers((profilesRes.data || []).map(p => ({ id: p.id, name: p.display_name || p.email || 'Unknown' })))
    setRows(rosterRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [currentOrganization?.id])

  const addRow = async () => {
    if (!currentOrganization || !form.full_name.trim()) return
    const { error } = await supabase.from('deal_roster').insert({
      organization_id: currentOrganization.id,
      date_added: form.date_added,
      full_name: form.full_name.trim(),
      address: form.address.trim() || null,
      lead_source: form.lead_source.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
      next_touch: form.next_touch || null,
      agenda: form.agenda.trim() || null,
      deal_type: form.deal_type || null,
      owner: form.owner || null,
      created_by: user?.id,
    })
    if (error) { console.error('Add roster row error:', error); return }
    setForm(emptyForm)
    setShowAdd(false)
    fetchData()
  }

  const updateRow = async (id: string, updates: Partial<DealRosterEntry>) => {
    const { data, error } = await supabase.from('deal_roster').update(updates).eq('id', id).select().maybeSingle()
    if (error) { console.error('Update roster row error:', error); return }
    if (data) setRows(rows.map(r => r.id === id ? data : r))
  }

  const deleteRow = async (id: string) => {
    if (!window.confirm('Remove this lead from the roster?')) return
    await supabase.from('deal_roster').delete().eq('id', id)
    setRows(rows.filter(r => r.id !== id))
  }

  let visibleRows = rows
  if (statusFilter) visibleRows = visibleRows.filter(r => r.status === statusFilter)
  if (ownerFilter) visibleRows = visibleRows.filter(r => r.owner === ownerFilter)
  if (sortByTouch) {
    visibleRows = [...visibleRows].sort((a, b) => {
      const da = a.next_touch ? new Date(a.next_touch).getTime() : Infinity
      const db = b.next_touch ? new Date(b.next_touch).getTime() : Infinity
      return da - db
    })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Daily Deals Roster</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{visibleRows.length} lead{visibleRows.length === 1 ? '' : 's'}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-accent">
          <Plus size={16} /> Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input">
              <option value="">All Statuses</option>
              {ROSTER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Owner</label>
            <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="input">
              <option value="">All Owners</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
              <input type="checkbox" checked={sortByTouch} onChange={e => setSortByTouch(e.target.checked)} />
              Sort by next touch
            </label>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="card p-4 animate-fade-in space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Date Added</label>
              <input type="date" value={form.date_added} onChange={e => setForm({ ...form, date_added: e.target.value })} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Full Name</label>
              <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="input" placeholder="Jane Doe" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Lead Source</label>
              <input type="text" value={form.lead_source} onChange={e => setForm({ ...form, lead_source: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
                {ROSTER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Deal Type</label>
              <select value={form.deal_type} onChange={e => setForm({ ...form, deal_type: e.target.value })} className="input">
                <option value="">—</option>
                {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Owner</label>
              <select value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} className="input">
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Next Touch</label>
              <input type="date" value={form.next_touch} onChange={e => setForm({ ...form, next_touch: e.target.value })} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Agenda</label>
              <input type="text" value={form.agenda} onChange={e => setForm({ ...form, agenda: e.target.value })} className="input" />
            </div>
            <div className="md:col-span-3">
              <label className="label">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
            <button onClick={addRow} className="btn-primary">Add Lead</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-ink-400 dark:text-ink-500">Loading...</div>
        ) : visibleRows.length === 0 ? (
          <div className="p-8 text-center text-ink-400 dark:text-ink-500">No leads yet. Click "Add Lead" to start the roster.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ink-50 dark:bg-ink-800">
                <tr>
                  <th className="table-header text-left px-3 py-2">Date Added</th>
                  <th className="table-header text-left px-3 py-2">Name</th>
                  <th className="table-header text-left px-3 py-2">Source</th>
                  <th className="table-header text-left px-3 py-2">Status</th>
                  <th className="table-header text-left px-3 py-2">Owner</th>
                  <th className="table-header text-left px-3 py-2">Next Touch</th>
                  <th className="table-header text-right px-3 py-2">Time Lapse</th>
                  <th className="table-header px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(r => (
                  <tr key={r.id} className="border-t border-ink-100 dark:border-ink-800 hover:bg-ink-50 dark:hover:bg-ink-800">
                    <td className="table-cell whitespace-nowrap">{formatDate(r.date_added)}</td>
                    <td className="table-cell">
                      <p className="font-medium">{r.full_name}</p>
                      {r.address && <p className="text-xs text-ink-400 dark:text-ink-500">{r.address}</p>}
                    </td>
                    <td className="table-cell">{r.lead_source || '—'}</td>
                    <td className="table-cell">
                      <select value={r.status} onChange={e => updateRow(r.id, { status: e.target.value })} className="input py-1">
                        {ROSTER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="table-cell">
                      <select value={r.owner || ''} onChange={e => updateRow(r.id, { owner: e.target.value || null })} className="input py-1">
                        <option value="">Unassigned</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </td>
                    <td className="table-cell whitespace-nowrap">{r.next_touch ? formatDate(r.next_touch) : '—'}</td>
                    <td className="table-cell text-right font-mono">{timeLapse(r.date_added, r.next_touch) || '—'}</td>
                    <td className="table-cell text-right">
                      <button onClick={() => deleteRow(r.id)} className="p-1.5 rounded text-ink-300 dark:text-ink-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                        <Trash2 size={14} />
                      </button>
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
