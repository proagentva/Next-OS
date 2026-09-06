import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SCHEMAS, validateAndParseRow, type SchemaType } from '../lib/importEngine'
import { AlertCircle, Plus, Trash2 } from 'lucide-react'

interface PasteSheetProps {
  schema: SchemaType
  tableName: string
  organizationId: string
  onSaved: () => void
}

const INITIAL_ROWS = 25
const GROW_ROWS = 20

function emptyGrid(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(''))
}

export function PasteSheet({ schema, tableName, organizationId, onSaved }: PasteSheetProps) {
  const fields = SCHEMAS[schema]
  const [grid, setGrid] = useState<string[][]>(() => emptyGrid(INITIAL_ROWS, fields.length))
  const [rowErrors, setRowErrors] = useState<Record<number, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const cellRefs = useRef<(HTMLInputElement | null)[][]>([])

  const ensureRows = (grid: string[][], neededRows: number): string[][] => {
    const next = grid.map(row => [...row])
    while (next.length < neededRows) next.push(Array(fields.length).fill(''))
    return next
  }

  const updateCell = (r: number, c: number, value: string) => {
    setGrid(prev => {
      const next = prev.map(row => [...row])
      next[r][c] = value
      return next
    })
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startRow: number, startCol: number) => {
    const text = e.clipboardData.getData('text/plain')
    if (!text || !text.includes('\t') && !text.includes('\n')) return // let plain single-value paste happen natively
    e.preventDefault()

    const lines = text.split(/\r\n|\n|\r/)
    if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
    const matrix = lines.map(line => line.split('\t'))

    setGrid(prev => {
      let next = ensureRows(prev, startRow + matrix.length)
      matrix.forEach((rowVals, ri) => {
        rowVals.forEach((val, ci) => {
          const col = startCol + ci
          if (col < fields.length) next[startRow + ri][col] = val
        })
      })
      return next
    })
    setRowErrors({})
    setMessage(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (r + 1 >= grid.length) setGrid(prev => ensureRows(prev, r + 2))
      setTimeout(() => cellRefs.current[r + 1]?.[c]?.focus(), 0)
    }
  }

  const addRows = () => setGrid(prev => [...prev, ...emptyGrid(GROW_ROWS, fields.length)])

  const clearAll = () => {
    if (!window.confirm('Clear all rows in this sheet? This cannot be undone.')) return
    setGrid(emptyGrid(INITIAL_ROWS, fields.length))
    setRowErrors({})
    setMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const validRowIndices: number[] = []
    const validData: Record<string, any>[] = []
    const errors: Record<number, string[]> = {}

    grid.forEach((rowVals, i) => {
      const hasContent = rowVals.some(v => v.trim() !== '')
      if (!hasContent) return
      const rawRow: Record<string, string> = {}
      fields.forEach((f, ci) => { rawRow[f.header] = rowVals[ci] ?? '' })
      const parsed = validateAndParseRow(rawRow, schema, i + 1)
      if (parsed.errors.length) {
        errors[i] = parsed.errors
      } else {
        validRowIndices.push(i)
        validData.push({ ...parsed.data, organization_id: organizationId })
      }
    })

    if (!validData.length && !Object.keys(errors).length) {
      setMessage('Nothing to save — paste or type some rows first.')
      setSaving(false)
      return
    }

    try {
      const batchSize = 500
      for (let i = 0; i < validData.length; i += batchSize) {
        const batch = validData.slice(i, i + batchSize)
        const { error } = await supabase.from(tableName).insert(batch)
        if (error) throw error
      }
      // Only clear the rows that actually saved — leave errored/untouched rows in place.
      setGrid(prev => prev.map((row, i) => validRowIndices.includes(i) ? Array(fields.length).fill('') : row))
      setRowErrors(errors)
      const errorCount = Object.keys(errors).length
      setMessage(
        errorCount > 0
          ? `Saved ${validData.length} row${validData.length === 1 ? '' : 's'}. ${errorCount} row${errorCount === 1 ? '' : 's'} had errors and were not saved — fix and save again.`
          : `Saved ${validData.length} row${validData.length === 1 ? '' : 's'}.`
      )
      if (validData.length) onSaved()
    } catch (e: any) {
      setMessage(`Save error: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Paste a block copied from Excel/Sheets directly into the grid — it fills starting from whichever cell you click.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={addRows} className="btn-secondary text-xs">
            <Plus size={14} /> Add {GROW_ROWS} Rows
          </button>
          <button onClick={clearAll} className="btn-secondary text-xs text-red-600 dark:text-red-400">
            <Trash2 size={14} /> Clear
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
            {saving ? 'Saving...' : 'Save All Rows'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.startsWith('Save error') ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300' : 'bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400'}`}>
          {message}
        </div>
      )}

      <div className="card overflow-auto max-h-[70vh]">
        <table className="border-collapse">
          <thead className="sticky top-0 z-10 bg-ink-50 dark:bg-ink-800">
            <tr>
              <th className="w-10 text-xs text-ink-400 dark:text-ink-500 font-normal border-b border-r border-ink-200 dark:border-ink-800 px-2 py-1.5"></th>
              {fields.map(f => (
                <th key={f.key} className="text-left text-xs font-semibold text-ink-600 dark:text-ink-300 border-b border-r border-ink-200 dark:border-ink-800 px-2 py-1.5 whitespace-nowrap">
                  {f.header}{f.required ? '' : ' (opt.)'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((rowVals, r) => (
              <tr key={r} className={rowErrors[r] ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                <td className="text-xs text-ink-300 dark:text-ink-600 text-center border-b border-r border-ink-100 dark:border-ink-800 px-1">
                  {rowErrors[r] ? (
                    <span title={rowErrors[r].join('; ')}>
                      <AlertCircle size={13} className="text-red-500 dark:text-red-400 inline" />
                    </span>
                  ) : r + 1}
                </td>
                {rowVals.map((val, c) => (
                  <td key={c} className="border-b border-r border-ink-100 dark:border-ink-800 p-0">
                    <input
                      ref={el => {
                        if (!cellRefs.current[r]) cellRefs.current[r] = []
                        cellRefs.current[r][c] = el
                      }}
                      type="text"
                      value={val}
                      onChange={e => updateCell(r, c, e.target.value)}
                      onPaste={e => handlePaste(e, r, c)}
                      onKeyDown={e => handleKeyDown(e, r, c)}
                      className="w-full min-w-[100px] bg-transparent px-2 py-1 text-sm text-ink-800 dark:text-ink-100 outline-none focus:bg-accent-50 dark:focus:bg-ink-700"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
