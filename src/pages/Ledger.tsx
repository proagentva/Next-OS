import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ImportExportToolbar } from '../components/ImportExportToolbar'
import { useOrganization } from '../contexts/OrganizationContext'
import { formatCurrency, formatDate } from '../lib/utils'
import { LEDGER_TYPES, EXPENSE_BUCKETS } from '../lib/types'
import type { LedgerEntry } from '../lib/types'
import { getLedgerTypeColor, getBucketColor, colorBadgeStyle } from '../lib/colors'
import { useTheme } from '../contexts/ThemeContext'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'

const PAGE_SIZE = 50

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  description: '',
  category: '',
  type: LEDGER_TYPES[0] as string,
  amount: '',
  payment_method: '',
  payment_type: '',
  bucket: EXPENSE_BUCKETS[4] as string, // Misc
  notes: '',
}

export default function Ledger({ year }: { year: number }) {
  const { currentOrganization } = useOrganization()
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [rows, setRows] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [totals, setTotals] = useState({ income: 0, expenses: 0 })
  const [filters, setFilters] = useState({ type: '', bucket: '', dateFrom: '', dateTo: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const applyFilters = useCallback((query: any) => {
    if (filters.type) query = query.eq('type', filters.type)
    if (filters.bucket) query = query.eq('bucket', filters.bucket)
    if (filters.dateFrom) query = query.gte('date', filters.dateFrom)
    if (filters.dateTo) query = query.lte('date', filters.dateTo)
    return query
  }, [filters])

  const fetchRows = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('ledger_entries').select('*', { count: 'exact' }).eq('year', year)
      .order('date', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    query = applyFilters(query)

    const { data, error, count } = await query
    if (error) console.error('Fetch ledger error:', error)
    setRows(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [year, page, applyFilters])

  const fetchTotals = useCallback(async () => {
    let query = supabase.from('ledger_entries').select('income_amt,expense_amt').eq('year', year)
    query = applyFilters(query)
    const { data, error } = await query
    if (error) { console.error('Fetch ledger totals error:', error); return }
    const rows = data || []
    setTotals({
      income: rows.reduce((s, r) => s + Number(r.income_amt), 0),
      expenses: rows.reduce((s, r) => s + Number(r.expense_amt), 0),
    })
  }, [year, applyFilters])

  useEffect(() => { fetchRows() }, [fetchRows])
  useEffect(() => { fetchTotals() }, [fetchTotals])
  useEffect(() => { setPage(0) }, [filters])

  const addEntry = async () => {
    if (!currentOrganization || !form.description.trim() || !form.category.trim() || !form.date || !form.amount) return
    const rawAmount = Math.abs(Number(form.amount) || 0)
    const signedAmount = form.type === 'Expense' ? -rawAmount : rawAmount

    const { error } = await supabase.from('ledger_entries').insert({
      organization_id: currentOrganization.id,
      date: form.date,
      description: form.description.trim(),
      category: form.category.trim(),
      type: form.type,
      amount: signedAmount,
      payment_method: form.payment_method.trim() || null,
      payment_type: form.payment_type.trim() || null,
      bucket: form.bucket,
      notes: form.notes.trim() || null,
    })
    if (error) { console.error('Add ledger entry error:', error); return }
    setForm(emptyForm)
    setShowAdd(false)
    fetchRows()
    fetchTotals()
  }

  const updateEntry = async (id: string, updates: Partial<LedgerEntry>) => {
    const { data, error } = await supabase.from('ledger_entries').update(updates).eq('id', id).select().maybeSingle()
    if (error) { console.error('Update ledger entry error:', error); return }
    if (data) {
      setRows(rows.map(r => r.id === id ? data : r))
      fetchTotals()
    }
  }

  const deleteEntry = async (id: string) => {
    if (!window.confirm('Delete this ledger entry?')) return
    const { error } = await supabase.from('ledger_entries').delete().eq('id', id)
    if (error) { console.error('Delete ledger entry error:', error); return }
    setRows(rows.filter(r => r.id !== id))
    fetchTotals()
    setTotal(t => Math.max(0, t - 1))
  }

  const exportRows = rows.map(r => ({
    Date: r.date,
    Description: r.description,
    Category: r.category,
    Type: r.type,
    Amount: r.amount,
    'Payment Method': r.payment_method || '',
    'Payment Type': r.payment_type || '',
    Bucket: r.bucket,
    Notes: r.notes || '',
  }))

  const net = totals.income - totals.expenses

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Ledger</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{total} record{total === 1 ? '' : 's'} — {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAdd(!showAdd)} className="btn-accent">
            <Plus size={16} /> Add Entry
          </button>
          {currentOrganization && (
            <ImportExportToolbar
              schema="ledger"
              tableName="ledger_entries"
              organizationId={currentOrganization.id}
              onImported={() => { fetchRows(); fetchTotals() }}
              exportRows={exportRows}
              exportFilename={`ledger_export_${new Date().toISOString().split('T')[0]}.csv`}
            />
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-400 dark:text-ink-500 uppercase tracking-wide">Income</p>
          <p className="text-xl font-bold text-accent-700 dark:text-accent-400 mt-1">{formatCurrency(totals.income)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-400 dark:text-ink-500 uppercase tracking-wide">Expenses</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(totals.expenses)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-400 dark:text-ink-500 uppercase tracking-wide">Net</p>
          <p className={`text-xl font-bold mt-1 ${net >= 0 ? 'text-accent-700 dark:text-accent-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(net)}</p>
        </div>
      </div>

      {showAdd && (
        <div className="card p-4 animate-fade-in space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input" placeholder="What was this for?" />
            </div>
            <div>
              <label className="label">Category</label>
              <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input" placeholder="e.g. Cold Calling Software" />
            </div>
            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
                {LEDGER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="input" placeholder="0" />
            </div>
            <div>
              <label className="label">Bucket</label>
              <select value={form.bucket} onChange={e => setForm({ ...form, bucket: e.target.value })} className="input">
                {EXPENSE_BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Payment Method</label>
              <input type="text" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="input" placeholder="e.g. Card, ACH" />
            </div>
            <div>
              <label className="label">Payment Type</label>
              <input type="text" value={form.payment_type} onChange={e => setForm({ ...form, payment_type: e.target.value })} className="input" placeholder="e.g. Recurring, One-time" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowAdd(false); setForm(emptyForm) }} className="btn-ghost">Cancel</button>
            <button onClick={addEntry} className="btn-primary">Add Entry</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Type</label>
            <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} className="input">
              <option value="">All Types</option>
              {LEDGER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Bucket</label>
            <select value={filters.bucket} onChange={e => setFilters(f => ({ ...f, bucket: e.target.value }))} className="input">
              <option value="">All Buckets</option>
              {EXPENSE_BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date From</label>
            <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Date To</label>
            <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="input" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-ink-400 dark:text-ink-500">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-ink-400 dark:text-ink-500">No entries found. Add one, or import a CSV to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ink-50 dark:bg-ink-800">
                <tr>
                  <th className="table-header text-left px-3 py-2">Date</th>
                  <th className="table-header text-left px-3 py-2">Description</th>
                  <th className="table-header text-left px-3 py-2">Category</th>
                  <th className="table-header text-left px-3 py-2">Type</th>
                  <th className="table-header text-left px-3 py-2">Bucket</th>
                  <th className="table-header text-right px-3 py-2">Amount</th>
                  <th className="table-header text-left px-3 py-2">Payment</th>
                  <th className="table-header px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-ink-100 dark:border-ink-800 hover:bg-ink-50 dark:hover:bg-ink-800">
                    <td className="table-cell whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="table-cell">{r.description}</td>
                    <td className="table-cell">{r.category}</td>
                    <td className="table-cell">
                      <select
                        value={r.type}
                        onChange={e => updateEntry(r.id, { type: e.target.value })}
                        className="rounded-full text-xs font-medium px-2 py-1 border-0 cursor-pointer"
                        style={colorBadgeStyle(getLedgerTypeColor(r.type), dark)}
                      >
                        {LEDGER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="table-cell">
                      <select
                        value={r.bucket}
                        onChange={e => updateEntry(r.id, { bucket: e.target.value })}
                        className="rounded-full text-xs font-medium px-2 py-1 border-0 cursor-pointer"
                        style={colorBadgeStyle(getBucketColor(r.bucket), dark)}
                      >
                        {EXPENSE_BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </td>
                    <td className={`table-cell text-right font-mono ${r.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-accent-700 dark:text-accent-400'}`}>
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="table-cell whitespace-nowrap text-xs text-ink-500 dark:text-ink-400">
                      {r.payment_method || '—'}{r.payment_type ? ` / ${r.payment_type}` : ''}
                    </td>
                    <td className="table-cell text-right">
                      <button onClick={() => deleteEntry(r.id)} className="p-1.5 rounded text-ink-300 dark:text-ink-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ink-200 dark:border-ink-800">
            <span className="text-sm text-ink-500 dark:text-ink-400">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-ghost p-2">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total} className="btn-ghost p-2">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
