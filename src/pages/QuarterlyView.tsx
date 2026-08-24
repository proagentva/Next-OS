import { useEffect, useState } from 'react'
import { getFinancialRollupByQuarter, getAcqRollupByQuarter, getDispoRollupByQuarter, getMarketingCostByChannel, computeFunnelRatios } from '../lib/rollups'
import { formatCurrency, formatNumber, safeRate } from '../lib/utils'
import type { FinancialRollup, AcqRollup, DispoRollup } from '../lib/types'

const ACQ_METRICS = [
  { key: 'dials', label: 'Dials' },
  { key: 'conversations', label: 'Conversations' },
  { key: 'leads_pushed', label: 'Leads Pushed' },
  { key: 'pass_offs', label: 'Pass-Offs' },
  { key: 'process', label: 'Process' },
  { key: 'appts_set', label: 'Appts Set' },
  { key: 'offers', label: 'Offers' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'closed', label: 'Closed' },
  { key: 'dropped', label: 'Dropped' },
]

const DISPO_METRICS = [
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

export default function QuarterlyView({ year }: { year: number }) {
  const [quarter, setQuarter] = useState(1)
  const [loading, setLoading] = useState(true)
  const [financial, setFinancial] = useState<FinancialRollup | null>(null)
  const [acq, setAcq] = useState<AcqRollup | null>(null)
  const [dispo, setDispo] = useState<DispoRollup | null>(null)
  const [marketing, setMarketing] = useState<{ channel: string; cost: number }[]>([])

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [f, a, d, m] = await Promise.all([
          getFinancialRollupByQuarter(year, quarter),
          getAcqRollupByQuarter(year, quarter),
          getDispoRollupByQuarter(year, quarter),
          getMarketingCostByChannel(year, quarter),
        ])
        setFinancial(f[`Q${quarter}`] || null)
        setAcq(a[`Q${quarter}`] || null)
        setDispo(d[`Q${quarter}`] || null)
        setMarketing(m)
      } catch (e) {
        console.error('Quarterly view error:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [year, quarter])

  if (loading) return <div className="p-6 text-ink-400">Loading Q{quarter}...</div>

  const ratios = acq ? computeFunnelRatios(acq) : null
  const totalMarketing = marketing.reduce((s, m) => s + m.cost, 0)
  const totalExpensesExclComm = (financial?.expenses || 0) - (financial?.by_bucket['Commissions'] || 0)
  const dealsClosed = acq?.closed || 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Quarterly View</h1>
          <p className="text-sm text-ink-500">{year} — Read-only consolidated report</p>
        </div>
        <div className="flex gap-1 bg-ink-100 rounded-lg p-1">
          {[1, 2, 3, 4].map(q => (
            <button
              key={q}
              onClick={() => setQuarter(q)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${quarter === q ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
            >
              Q{q}
            </button>
          ))}
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="stat-card">
          <p className="stat-label">Marketing Spend</p>
          <p className="stat-value">{formatCurrency(totalMarketing)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Acquisition Cost</p>
          <p className="stat-value">{formatCurrency(financial?.by_bucket['Acquisition'] || 0)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Processing Cost</p>
          <p className="stat-value">{formatCurrency(financial?.by_bucket['Processing'] || 0)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Expenses (excl. commissions)</p>
          <p className="stat-value">{formatCurrency(totalExpensesExclComm)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Deals Closed</p>
          <p className="stat-value">{formatNumber(dealsClosed)}</p>
        </div>
      </div>

      {/* Section A — Marketing by Channel */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Section A — Marketing by Channel</h2>
        {marketing.length === 0 ? (
          <p className="text-sm text-ink-400">No Acquisition-bucket expenses for Q{quarter}.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-200">
                <th className="table-header text-left px-4 py-2">Channel</th>
                <th className="table-header text-right px-4 py-2">Cost</th>
                <th className="table-header text-right px-4 py-2">% of Marketing</th>
                {dealsClosed > 0 && <th className="table-header text-right px-4 py-2">Cost/Deal</th>}
              </tr>
            </thead>
            <tbody>
              {marketing.map(m => (
                <tr key={m.channel} className="border-b border-ink-100">
                  <td className="table-cell">{m.channel}</td>
                  <td className="table-cell text-right font-mono">{formatCurrency(m.cost)}</td>
                  <td className="table-cell text-right font-mono text-ink-500">{totalMarketing > 0 ? `${((m.cost / totalMarketing) * 100).toFixed(1)}%` : '—'}</td>
                  {dealsClosed > 0 && <td className="table-cell text-right font-mono text-ink-500">{dealsClosed > 0 ? formatCurrency(m.cost / dealsClosed) : '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Section B — ACQ KPIs */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Section B — Acquisitions KPI Activity</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {ACQ_METRICS.map(m => (
            <div key={m.key} className="bg-ink-50 rounded-lg p-3">
              <p className="text-xs text-ink-500">{m.label}</p>
              <p className="text-lg font-bold font-mono text-ink-900">{formatNumber((acq as any)?.[m.key] || 0)}</p>
            </div>
          ))}
        </div>
        {ratios && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-accent-50 rounded-lg p-3">
              <p className="text-xs text-accent-700">Conversation Rate (Conv/Dials)</p>
              <p className="text-lg font-bold font-mono text-accent-800">{safeRate(acq?.conversations || 0, acq?.dials || 0)}</p>
            </div>
            <div className="bg-accent-50 rounded-lg p-3">
              <p className="text-xs text-accent-700">Pass-Off Rate (PassOffs/Conv)</p>
              <p className="text-lg font-bold font-mono text-accent-800">{safeRate(acq?.pass_offs || 0, acq?.conversations || 0)}</p>
            </div>
            <div className="bg-accent-50 rounded-lg p-3">
              <p className="text-xs text-accent-700">Offer→Contract Rate</p>
              <p className="text-lg font-bold font-mono text-accent-800">{safeRate(acq?.contracts || 0, acq?.offers || 0)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Section B2 — Dispo KPIs */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Section B2 — Dispositions KPI Activity</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {DISPO_METRICS.map(m => (
            <div key={m.key} className="bg-ink-50 rounded-lg p-3">
              <p className="text-xs text-ink-500">{m.label}</p>
              <p className="text-lg font-bold font-mono text-ink-900">{formatNumber((dispo as any)?.[m.key] || 0)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section C — Expenses by Bucket */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Section C — Expenses by Bucket</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink-200">
              <th className="table-header text-left px-4 py-2">Bucket</th>
              <th className="table-header text-right px-4 py-2">Amount</th>
              <th className="table-header text-right px-4 py-2">% of Total</th>
              {dealsClosed > 0 && <th className="table-header text-right px-4 py-2">Cost/Deal</th>}
            </tr>
          </thead>
          <tbody>
            {Object.entries(financial?.by_bucket || {}).map(([bucket, amt]) => (
              <tr key={bucket} className="border-b border-ink-100">
                <td className="table-cell">{bucket}</td>
                <td className="table-cell text-right font-mono">{formatCurrency(amt)}</td>
                <td className="table-cell text-right font-mono text-ink-500">
                  {(financial?.expenses || 0) > 0 ? `${((amt / (financial?.expenses || 1)) * 100).toFixed(1)}%` : '—'}
                </td>
                {dealsClosed > 0 && <td className="table-cell text-right font-mono text-ink-500">{formatCurrency(amt / dealsClosed)}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink-300 bg-ink-50 font-semibold">
              <td className="table-cell">Total Expenses</td>
              <td className="table-cell text-right font-mono">{formatCurrency(financial?.expenses || 0)}</td>
              <td className="table-cell text-right font-mono">100%</td>
              {dealsClosed > 0 && <td className="table-cell text-right font-mono">{formatCurrency((financial?.expenses || 0) / dealsClosed)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
