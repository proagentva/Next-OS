import { useState, useRef } from 'react'
import { Upload, Download, Info, X, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { parseFile, exportToCSV, downloadCSV, getSchemaHeaders, type SchemaType, type ParseResult } from '../lib/importEngine'

interface ImportExportToolbarProps {
  schema: SchemaType
  tableName: string
  organizationId: string
  onImported: () => void
  exportRows: Record<string, any>[]
  exportFilename: string
}

export function ImportExportToolbar({ schema, tableName, organizationId, onImported, exportRows, exportFilename }: ImportExportToolbarProps) {
  const [showInfo, setShowInfo] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [forcedSchema, setForcedSchema] = useState<SchemaType | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)

  const headers = getSchemaHeaders(schema)

  const handleFile = async (file: File) => {
    setImportMsg(null)
    const text = await file.text()
    const result = parseFile(text, file.name, forcedSchema || schema)
    setParseResult(result)
    setShowImport(true)
  }

  const handleExport = () => {
    const csv = exportToCSV(exportRows, schema)
    downloadCSV(csv, exportFilename)
  }

  const handleImport = async () => {
    if (!parseResult || parseResult.validRows === 0) return
    setImporting(true)
    setImportMsg(null)

    const validData = parseResult.rows
      .filter(r => r.errors.length === 0)
      .map(r => ({ ...r.data, organization_id: organizationId }))

    try {
      // Insert in batches of 500
      const batchSize = 500
      let totalInserted = 0
      for (let i = 0; i < validData.length; i += batchSize) {
        const batch = validData.slice(i, i + batchSize)
        const { error } = await supabase.from(tableName).insert(batch)
        if (error) throw error
        totalInserted += batch.length
      }
      setImportMsg(`Successfully imported ${totalInserted} rows.`)
      onImported()
    } catch (e: any) {
      setImportMsg(`Import error: ${e.message}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <button onClick={() => fileRef.current?.click()} className="btn-secondary">
        <Upload size={16} /> Import
      </button>
      <button onClick={handleExport} className="btn-secondary">
        <Download size={16} /> Export
      </button>
      <div className="relative">
        <button
          onMouseEnter={() => setShowInfo(true)}
          onMouseLeave={() => setShowInfo(false)}
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-600"
        >
          <Info size={16} />
        </button>
        {showInfo && (
          <div className="absolute right-0 top-full mt-2 z-50 card p-4 w-72 animate-fade-in">
            <p className="text-xs font-semibold text-ink-700 mb-2">Required Columns ({parseResult?.schema || schema}):</p>
            <ol className="text-xs text-ink-600 space-y-1 list-decimal list-inside">
              {headers.map(h => <li key={h}>{h}</li>)}
            </ol>
            <p className="text-xs text-ink-400 mt-2">CSV, XLSX, or JSON. Headers must match exactly.</p>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && parseResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowImport(false)}>
          <div className="card p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-900">Import Preview — {parseResult.schema}</h3>
              <button onClick={() => setShowImport(false)} className="text-ink-400 hover:text-ink-600">
                <X size={20} />
              </button>
            </div>

            {parseResult.headerErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                  <AlertCircle size={16} /> Header Validation Errors
                </div>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {parseResult.headerErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
                <div className="mt-3">
                  <p className="text-xs text-ink-500 mb-1">Select the correct format:</p>
                  <div className="flex gap-2">
                    {(['ledger', 'acq', 'dispo'] as SchemaType[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setForcedSchema(s)}
                        className={`px-3 py-1 rounded-md text-xs font-medium ${forcedSchema === s ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600'}`}
                      >
                        {s === 'ledger' ? 'Ledger' : s === 'acq' ? 'Acquisition' : 'Disposition'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet size={16} className="text-ink-400" />
                <span className="text-ink-600">{parseResult.totalRows} rows</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-accent-600" />
                <span className="text-accent-700">{parseResult.validRows} valid</span>
              </div>
              {parseResult.errorRows > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle size={16} className="text-red-500" />
                  <span className="text-red-600">{parseResult.errorRows} errors</span>
                </div>
              )}
            </div>

            {parseResult.errorRows > 0 && parseResult.rows.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto border border-ink-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-ink-50 sticky top-0">
                    <tr>
                      <th className="table-header text-left px-3 py-2">Row</th>
                      <th className="table-header text-left px-3 py-2">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.rows.filter(r => r.errors.length > 0).slice(0, 50).map(r => (
                      <tr key={r.rowNumber} className="border-t border-ink-100">
                        <td className="px-3 py-2 text-xs text-ink-500 font-mono">{r.rowNumber}</td>
                        <td className="px-3 py-2 text-xs text-red-600">{r.errors.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {importMsg && (
              <div className={`rounded-lg p-3 mb-4 text-sm ${importMsg.includes('error') ? 'bg-red-50 text-red-600' : 'bg-accent-50 text-accent-700'}`}>
                {importMsg}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowImport(false)} className="btn-ghost">Cancel</button>
              <button
                onClick={handleImport}
                disabled={importing || parseResult.validRows === 0 || parseResult.headerErrors.length > 0}
                className="btn-primary"
              >
                {importing ? 'Importing...' : `Import ${parseResult.validRows} rows`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
