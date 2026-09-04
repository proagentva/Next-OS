import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ImportExportToolbar } from '../components/ImportExportToolbar'
import { useOrganization } from '../contexts/OrganizationContext'
import { formatDate, formatNumber } from '../lib/utils'
import type { DispoActivity } from '../lib/types'
import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

const DISPO_ROLES = ['Disposition Agent', 'Sr Dispo', 'Jr Dispo']
const PAGE_SIZE = 50

const NUMERIC_FIELDS: { key: keyof typeof emptyForm; label: string }[] = [
  { key: 'total_dials', label: 'Total Dials' },
  { key: 'calls_connected', label: 'Calls Connected' },
  { key: 'follow_ups', label: 'Follow-Ups' },
  { key: 'buyer_box_collected', label: 'Buyer Box Collected' },
  { key: 'scheduled_deals', label: 'Scheduled Deals' },
  { key: 'deals_pitched', label: 'Deals Pitched' },
  { key: 'queries', label: 'Queries' },
  { key: 'offers', label: 'Offers' },
  { key: 'offers_made', label: 'Offers Made' },
  { key: 'deals_locked_up', label: 'Deals Locked Up' },
]

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  employee: '',
  role: DISPO_ROLES[0],
  total_dials: '', calls_connected: '', follow_ups: '', buyer_box_collected: '', scheduled_deals: '',
  deals_pitched: '', queries: '', offers: '', offers_made: '', deals_locked_up: '',
  notes: '',
}

export default function Disposition({ year }: { year: number }) {
  const { currentOrganization } = useOrganization()
  const [rows, setRows] = useState<DispoActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ employee: '', role: '', dateFrom: '', dateTo: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('dispo_activity').select('*', { count: 'exact' }).eq('year', year)
      .order('date', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filters.employee) query = query.ilike('employee', `%${filters.employee}%`)
    if (filters.role) query = query.eq('role', filters.role)
    if (filters.dateFrom) query = query.gte('date', filters.dateFrom)
    if (filters.dateTo) query = query.lte('date', filters.dateTo)

    const { data, error, count } = await query
    if (error) console.error('Fetch error:', error)
    setRows(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [year, page, filters])

  useEffect(() => { fetchRows() }, [fetchRows])

  const addRow = async () => {
    if (!currentOrganization || !form.employee.trim() || !form.date) return
    const { error } = await supabase.from('dispo_activity').insert({
      organization_id: currentOrganization.id,
      date: form.date,
      employee: form.employee.trim(),
      role: form.role,
      total_dials: Number(form.total_dials) || 0,
      calls_connected: Number(form.calls_connected) || 0,
      follow_ups: Number(form.follow_ups) || 0,
      buyer_box_collected: Number(form.buyer_box_collected) || 0,
      scheduled_deals: Number(form.scheduled_deals) || 0,
      deals_pitched: Number(form.deals_pitched) || 0,
      queries: Number(form.queries) || 0,
      offers: Number(form.offers) || 0,
      offers_made: Number(form.offers_made) || 0,
      deals_locked_up: Number(form.deals_locked_up) || 0,
      notes: form.notes.trim() || null,
    })
    if (error) { console.error('Add dispo entry error:', error); return }
    setForm(emptyForm)
    setShowAdd(false)
    fetchRows()
  }

  const exportRows = rows.map(r => ({
    Date: r.date,
    Employee: r.employee,
    Role: r.role,
    'Total Dials': r.total_dials,
    'Calls Connected': r.calls_connected,
    'Follow-Ups': r.follow_ups,
    'Buyer Box Collected': r.buyer_box_collected,
    'Scheduled Deals': r.scheduled_deals,
    'Deals Pitched': r.deals_pitched,
    Queries: r.queries,
    Offers: r.offers,
    'Offers Made': r.offers_made,
    'Deals Locked Up': r.deals_locked_up,
    Notes: r.notes || '',
  }))

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Disposition KPIs</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{total} records — {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAdd(!showAdd)} className="btn-accent">
            <Plus size={16} /> Add Entry
          </button>
          <ImportExportToolbar
            schema="dispo"
            tableName="dispo_activity"
            organizationId={currentOrganization!.id}
            onImported={fetchRows}
            exportRows={exportRows}
            exportFilename={`dispo_export_${new Date().toISOString().split('T')[0]}.csv`}
          />
        </div>
      </div>

      {showAdd && (
        <div className="card p-4 animate-fade-in space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Employee</label>
              <input type="text" value={form.employee} onChange={e => setForm({ ...form, employee: e.target.value })} className="input" placeholder="Name" />
            </div>
            <div>
              <label className="label">Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input">
                {DISPO_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {NUMERIC_FIELDS.map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input type="number" value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="input" placeholder="0" />
              </div>
            ))}
            <div className="col-span-2 md:col-span-4">
              <label className="label">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
            <button onClick={addRow} className="btn-primary">Add Entry</button>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Employee</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 dark:text-ink-500" />
              <input type="text" value={filters.employee} onChange={e => { setFilters(f => ({ ...f, employee: e.target.value })); setPage(0) }} className="input pl-9" placeholder="Search employee..." />
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <select value={filters.role} onChange={e => { setFilters(f => ({ ...f, role: e.target.value })); setPage(0) }} className="input">
              <option value="">All Roles</option>
              {DISPO_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date From</label>
            <input type="date" value={filters.dateFrom} onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(0) }} className="input" />
          </div>
          <div>
            <label className="label">Date To</label>
            <input type="date" value={filters.dateTo} onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(0) }} className="input" />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-ink-400 dark:text-ink-500">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-ink-400 dark:text-ink-500">No records found. Import a CSV to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ink-50 dark:bg-ink-800">
                <tr>
                  <th className="table-header text-left px-3 py-2">Date</th>
                  <th className="table-header text-left px-3 py-2">Employee</th>
                  <th className="table-header text-left px-3 py-2">Role</th>
                  <th className="table-header text-right px-3 py-2">Total Dials</th>
                  <th className="table-header text-right px-3 py-2">Calls Conn</th>
                  <th className="table-header text-right px-3 py-2">Follow-Ups</th>
                  <th className="table-header text-right px-3 py-2">Buyer Box</th>
                  <th className="table-header text-right px-3 py-2">Sched Deals</th>
                  <th className="table-header text-right px-3 py-2">Deals Pitched</th>
                  <th className="table-header text-right px-3 py-2">Queries</th>
                  <th className="table-header text-right px-3 py-2">Offers</th>
                  <th className="table-header text-right px-3 py-2">Offers Made</th>
                  <th className="table-header text-right px-3 py-2">Deals Locked</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-ink-100 dark:border-ink-800 hover:bg-ink-50 dark:hover:bg-ink-800">
                    <td className="table-cell whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="table-cell">{r.employee}</td>
                    <td className="table-cell"><span className="badge-gray">{r.role}</span></td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.total_dials)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.calls_connected)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.follow_ups)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.buyer_box_collected)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.scheduled_deals)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.deals_pitched)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.queries)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.offers)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.offers_made)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.deals_locked_up)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ink-200 dark:border-ink-800">
            <span className="text-sm text-ink-500 dark:text-ink-400">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-ghost p-2"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total} className="btn-ghost p-2"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
