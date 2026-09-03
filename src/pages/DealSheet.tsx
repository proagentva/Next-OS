import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { formatCurrency, formatDate } from '../lib/utils'
import { DEAL_TYPES, DEAL_STATUSES } from '../lib/types'
import type { Deal } from '../lib/types'
import { Plus, Trash2 } from 'lucide-react'

const emptyForm = {
  date_locked: new Date().toISOString().split('T')[0],
  address: '',
  expected_profit: '',
  type: DEAL_TYPES[0] as string,
  expected_closing_date: '',
  status: DEAL_STATUSES[0] as string,
  comments: '',
}

export default function DealSheet() {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchDeals = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('deals').select('*').order('date_locked', { ascending: false })
    if (error) console.error('Fetch deals error:', error)
    setDeals(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchDeals() }, [])

  const addDeal = async () => {
    if (!currentOrganization || !form.address.trim() || !form.date_locked) return
    const { error } = await supabase.from('deals').insert({
      organization_id: currentOrganization.id,
      date_locked: form.date_locked,
      address: form.address.trim(),
      expected_profit: form.expected_profit ? Number(form.expected_profit) : null,
      type: form.type,
      expected_closing_date: form.expected_closing_date || null,
      status: form.status,
      comments: form.comments.trim() || null,
      created_by: user?.id,
    })
    if (error) { console.error('Add deal error:', error); return }
    setForm(emptyForm)
    setShowAdd(false)
    fetchDeals()
  }

  const updateDeal = async (id: string, updates: Partial<Deal>) => {
    const { data, error } = await supabase.from('deals').update(updates).eq('id', id).select().maybeSingle()
    if (error) { console.error('Update deal error:', error); return }
    if (data) setDeals(deals.map(d => d.id === id ? data : d))
  }

  const deleteDeal = async (id: string) => {
    if (!window.confirm('Delete this deal?')) return
    await supabase.from('deals').delete().eq('id', id)
    setDeals(deals.filter(d => d.id !== id))
  }

  const filteredDeals = statusFilter ? deals.filter(d => d.status === statusFilter) : deals

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Deal Sheet</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{filteredDeals.length} deal{filteredDeals.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-36">
            <option value="">All Statuses</option>
            {DEAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-accent">
            <Plus size={16} /> Add Deal
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card p-4 animate-fade-in space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Date Locked</label>
              <input type="date" value={form.date_locked} onChange={e => setForm({ ...form, date_locked: e.target.value })} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="input" placeholder="123 Main St" />
            </div>
            <div>
              <label className="label">Expected Profit</label>
              <input type="number" value={form.expected_profit} onChange={e => setForm({ ...form, expected_profit: e.target.value })} className="input" placeholder="0" />
            </div>
            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
                {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
                {DEAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Expected Closing Date</label>
              <input type="date" value={form.expected_closing_date} onChange={e => setForm({ ...form, expected_closing_date: e.target.value })} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Comments</label>
              <input type="text" value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
            <button onClick={addDeal} className="btn-primary">Add Deal</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-ink-400 dark:text-ink-500">Loading...</div>
        ) : filteredDeals.length === 0 ? (
          <div className="p-8 text-center text-ink-400 dark:text-ink-500">No deals yet. Click "Add Deal" to log one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ink-50 dark:bg-ink-800">
                <tr>
                  <th className="table-header text-left px-3 py-2">Date Locked</th>
                  <th className="table-header text-left px-3 py-2">Address</th>
                  <th className="table-header text-right px-3 py-2">Expected Profit</th>
                  <th className="table-header text-left px-3 py-2">Type</th>
                  <th className="table-header text-left px-3 py-2">Status</th>
                  <th className="table-header text-left px-3 py-2">Closing Date</th>
                  <th className="table-header px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map(d => (
                  <tr key={d.id} className="border-t border-ink-100 dark:border-ink-800 hover:bg-ink-50 dark:hover:bg-ink-800">
                    <td className="table-cell whitespace-nowrap">{formatDate(d.date_locked)}</td>
                    <td className="table-cell">{d.address}</td>
                    <td className="table-cell text-right font-mono">{d.expected_profit != null ? formatCurrency(d.expected_profit) : '—'}</td>
                    <td className="table-cell">
                      <select value={d.type} onChange={e => updateDeal(d.id, { type: e.target.value })} className="input py-1">
                        {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="table-cell">
                      <select value={d.status} onChange={e => updateDeal(d.id, { status: e.target.value })} className="input py-1">
                        {DEAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="table-cell whitespace-nowrap">{d.expected_closing_date ? formatDate(d.expected_closing_date) : '—'}</td>
                    <td className="table-cell text-right">
                      <button onClick={() => deleteDeal(d.id)} className="p-1.5 rounded text-ink-300 dark:text-ink-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
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
