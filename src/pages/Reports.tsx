import { useEffect, useState } from 'react'
import { getReportData, getFinancialRollupByQuarter, getAcqRollupByQuarter, getDispoRollupByQuarter, getMarketingCostByChannel, type ReportData } from '../lib/rollups'
import { formatCurrency, formatNumber, formatPercent, safeRate } from '../lib/utils'
import { FileText, Download, Loader2 } from 'lucide-react'

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export default function Reports({ year }: { year: number }) {
  const [period, setPeriod] = useState<PeriodType>('quarterly')
  const [selectedQuarter, setSelectedQuarter] = useState(1)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ReportData | null>(null)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [narrativeError, setNarrativeError] = useState<string | null>(null)

  const generateReport = async () => {
    setLoading(true)
    setNarrative(null)
    setNarrativeError(null)
    try {
      const data = await getReportData(year, period === 'yearly' ? undefined : selectedQuarter)
      setReport(data)

      // Call edge function for AI narrative
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period,
          year,
          quarter: period === 'quarterly' ? selectedQuarter : undefined,
          data: data,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        setNarrativeError(`Report generation failed (${response.status}). ${errText}`)
      } else {
        const result = await response.json()
        if (result.error) {
          setNarrativeError(result.error)
        } else {
          setNarrative(result.report || result.narrative || 'No narrative returned.')
        }
      }
    } catch (e: any) {
      setNarrativeError(`Failed to generate report: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const exportPDF = () => {
    window.print()
  }

  const ytdFin = report?.financial['YTD'] || { income: 0, expenses: 0, net_profit: 0, by_bucket: {} }
  const quarterFin = report?.financial[`Q${selectedQuarter}`] || { income: 0, expenses: 0, net_profit: 0, by_bucket: {} }
  const displayFin = period === 'yearly' ? ytdFin : quarterFin
  const acqData = report?.acq?.[period === 'yearly' ? 'YTD' : `Q${selectedQuarter}`] || {}
  const dispoData = report?.dispo?.[period === 'yearly' ? 'YTD' : `Q${selectedQuarter}`] || {}

  // Comparison data for quarterly
  const comparisonRows = report && period === 'quarterly' ? [1, 2, 3, 4].map(q => {
    const f = report.financial[`Q${q}`] || { income: 0, expenses: 0, net_profit: 0 }
    const a = report.acq[`Q${q}`] || { dials: 0, contracts: 0 }
    const d = report.dispo[`Q${q}`] || { deals_locked_up: 0 }
    return { quarter: `Q${q}`, income: f.income, expenses: f.expenses, net: f.net_profit, dials: (a as any).dials, contracts: (a as any).contracts, deals: (d as any).deals_locked_up }
  }) : []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Reports</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">AI-generated analytical reports</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={e => setPeriod(e.target.value as PeriodType)} className="input w-32">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          {period !== 'yearly' && period !== 'daily' && period !== 'weekly' && (
            <select value={selectedQuarter} onChange={e => setSelectedQuarter(Number(e.target.value))} className="input w-24">
              <option value={1}>Q1</option>
              <option value={2}>Q2</option>
              <option value={3}>Q3</option>
              <option value={4}>Q4</option>
            </select>
          )}
          <button onClick={generateReport} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {report && (
            <button onClick={exportPDF} className="btn-secondary no-print">
              <Download size={16} /> PDF
            </button>
          )}
        </div>
      </div>

      {report && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="stat-label">Income</p>
              <p className="stat-value">{formatCurrency(displayFin.income)}</p>
            </div>
            <div className="card p-4">
              <p className="stat-label">Expenses</p>
              <p className="stat-value">{formatCurrency(displayFin.expenses)}</p>
            </div>
            <div className="card p-4">
              <p className="stat-label">Net Profit</p>
              <p className={`stat-value ${displayFin.net_profit >= 0 ? 'text-accent-600 dark:text-accent-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(displayFin.net_profit)}
              </p>
            </div>
            <div className="card p-4">
              <p className="stat-label">ACQ Dials</p>
              <p className="stat-value">{formatNumber((acqData as any)?.dials || 0)}</p>
            </div>
          </div>

          {/* Comparison Table */}
          {period === 'quarterly' && comparisonRows.length > 0 && (
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50 mb-4">Quarterly Comparison</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ink-200 dark:border-ink-800">
                      <th className="table-header text-left px-3 py-2">Metric</th>
                      {comparisonRows.map(c => <th key={c.quarter} className="table-header text-right px-3 py-2">{c.quarter}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Income', key: 'income', fmt: formatCurrency },
                      { label: 'Expenses', key: 'expenses', fmt: formatCurrency },
                      { label: 'Net Profit', key: 'net', fmt: formatCurrency },
                      { label: 'ACQ Dials', key: 'dials', fmt: formatNumber },
                      { label: 'ACQ Contracts', key: 'contracts', fmt: formatNumber },
                      { label: 'Dispo Deals Locked', key: 'deals', fmt: formatNumber },
                    ].map(row => {
                      const values = comparisonRows.map(c => (c as any)[row.key])
                      const current = values[selectedQuarter - 1]
                      return (
                        <tr key={row.key} className="border-b border-ink-100 dark:border-ink-800">
                          <td className="table-cell font-medium">{row.label}</td>
                          {comparisonRows.map((c, i) => {
                            const val = (c as any)[row.key]
                            const pct = i === selectedQuarter - 1 || current === 0 ? null : ((val - current) / Math.abs(current)) * 100
                            return (
                              <td key={i} className="table-cell text-right font-mono">
                                {row.fmt(val)}
                                {pct !== null && (
                                  <span className={`ml-2 text-xs ${pct > 0 ? 'text-accent-600 dark:text-accent-400' : pct < 0 ? 'text-red-500 dark:text-red-400' : 'text-ink-400 dark:text-ink-500'}`}>
                                    {formatPercent(pct)}
                                  </span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expense by Bucket */}
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50 mb-4">Expenses by Bucket</h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {Object.entries(displayFin.by_bucket || {}).map(([bucket, amt]) => (
                <div key={bucket} className="bg-ink-50 dark:bg-ink-800 rounded-lg p-3">
                  <p className="text-xs text-ink-500 dark:text-ink-400">{bucket}</p>
                  <p className="text-base font-bold font-mono">{formatCurrency(amt)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ACQ + Dispo Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50 mb-4">ACQ Funnel</h2>
              <div className="space-y-2">
                {['dials', 'conversations', 'leads_pushed', 'pass_offs', 'appts_set', 'offers', 'contracts', 'closed'].map(k => (
                  <div key={k} className="flex justify-between items-center py-1 border-b border-ink-100 dark:border-ink-800">
                    <span className="text-sm text-ink-600 dark:text-ink-300 capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="font-mono font-medium">{formatNumber((acqData as any)?.[k] || 0)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-ink-500 dark:text-ink-400">Conv Rate</span><span className="font-mono">{safeRate((acqData as any)?.conversations || 0, (acqData as any)?.dials || 0)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-ink-500 dark:text-ink-400">Pass-Off Rate</span><span className="font-mono">{safeRate((acqData as any)?.pass_offs || 0, (acqData as any)?.conversations || 0)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-ink-500 dark:text-ink-400">Offer→Contract</span><span className="font-mono">{safeRate((acqData as any)?.contracts || 0, (acqData as any)?.offers || 0)}</span></div>
              </div>
            </div>
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50 mb-4">Dispo Funnel</h2>
              <div className="space-y-2">
                {['total_dials', 'calls_connected', 'follow_ups', 'deals_pitched', 'offers_made', 'deals_locked_up'].map(k => (
                  <div key={k} className="flex justify-between items-center py-1 border-b border-ink-100 dark:border-ink-800">
                    <span className="text-sm text-ink-600 dark:text-ink-300 capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="font-mono font-medium">{formatNumber((dispoData as any)?.[k] || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Narrative */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50 mb-4">AI Analysis & Recommendations</h2>
            {narrativeError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-600 dark:text-red-300">
                {narrativeError}
                <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">The AI narrative requires a Gemini API key configured as an edge function secret. The data tables above are fully functional without it.</p>
              </div>
            ) : narrative ? (
              <div className="prose prose-sm max-w-none text-ink-700 dark:text-ink-300 whitespace-pre-wrap">{narrative}</div>
            ) : (
              <p className="text-sm text-ink-400 dark:text-ink-500">Click "Generate Report" to produce the AI analysis.</p>
            )}
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="card p-12 text-center">
          <FileText size={48} className="mx-auto mb-3 text-ink-300 dark:text-ink-600" />
          <p className="text-ink-400 dark:text-ink-500">Select a period and click "Generate Report" to produce an analytical report with AI commentary.</p>
        </div>
      )}
    </div>
  )
}
