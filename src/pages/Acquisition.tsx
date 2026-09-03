import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ImportExportToolbar } from '../components/ImportExportToolbar'
import { useOrganization } from '../contexts/OrganizationContext'
import { formatDate, formatNumber } from '../lib/utils'
import type { AcqActivity } from '../lib/types'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

const ACQ_ROLES = ['ACQ Manager', 'Cold Caller', 'FUS', 'OM', 'Admin', 'SMM', 'PPC', 'PPL']
const PAGE_SIZE = 50

export default function Acquisition({ year }: { year: number }) {
  const { currentOrganization } = useOrganization()
  const [rows, setRows] = useState<AcqActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ employee: '', role: '', dateFrom: '', dateTo: '' })

  const fetchRows = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('acq_activity').select('*', { count: 'exact' }).eq('year', year)
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

  const exportRows = rows.map(r => ({
    Date: r.date,
    Employee: r.employee,
    Role: r.role,
    Dials: r.dials,
    Conversations: r.conversations,
    'Leads Pushed': r.leads_pushed,
    'Pass-Offs': r.pass_offs,
    Process: r.process,
    'Appts Set': r.appts_set,
    Offers: r.offers,
    Contracts: r.contracts,
    Closed: r.closed,
    Dropped: r.dropped,
    Notes: r.notes || '',
  }))

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Acquisition KPIs</h1>
          <p className="text-sm text-ink-500">{total} records — {year}</p>
        </div>
        <ImportExportToolbar
          schema="acq"
          tableName="acq_activity"
          organizationId={currentOrganization!.id}
          onImported={fetchRows}
          exportRows={exportRows}
          exportFilename={`acq_export_${new Date().toISOString().split('T')[0]}.csv`}
        />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Employee</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={filters.employee}
                onChange={e => { setFilters(f => ({ ...f, employee: e.target.value })); setPage(0) }}
                className="input pl-9"
                placeholder="Search employee..."
              />
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <select
              value={filters.role}
              onChange={e => { setFilters(f => ({ ...f, role: e.target.value })); setPage(0) }}
              className="input"
            >
              <option value="">All Roles</option>
              {ACQ_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
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

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-ink-400">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-ink-400">No records found. Import a CSV to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ink-50">
                <tr>
                  <th className="table-header text-left px-3 py-2">Date</th>
                  <th className="table-header text-left px-3 py-2">Employee</th>
                  <th className="table-header text-left px-3 py-2">Role</th>
                  <th className="table-header text-right px-3 py-2">Dials</th>
                  <th className="table-header text-right px-3 py-2">Conv</th>
                  <th className="table-header text-right px-3 py-2">Leads</th>
                  <th className="table-header text-right px-3 py-2">Pass-Offs</th>
                  <th className="table-header text-right px-3 py-2">Process</th>
                  <th className="table-header text-right px-3 py-2">Appts</th>
                  <th className="table-header text-right px-3 py-2">Offers</th>
                  <th className="table-header text-right px-3 py-2">Contracts</th>
                  <th className="table-header text-right px-3 py-2">Closed</th>
                  <th className="table-header text-right px-3 py-2">Dropped</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50">
                    <td className="table-cell whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="table-cell">{r.employee}</td>
                    <td className="table-cell"><span className="badge-gray">{r.role}</span></td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.dials)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.conversations)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.leads_pushed)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.pass_offs)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.process)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.appts_set)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.offers)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.contracts)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.closed)}</td>
                    <td className="table-cell text-right font-mono">{formatNumber(r.dropped)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ink-200">
            <span className="text-sm text-ink-500">
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
