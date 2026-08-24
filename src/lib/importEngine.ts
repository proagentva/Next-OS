// Generic Import/Export Engine
// Handles CSV, XLSX, JSON for three schemas: ledger, acq, dispo

export type SchemaType = 'ledger' | 'acq' | 'dispo'

export interface SchemaField {
  header: string
  key: string
  type: 'date' | 'string' | 'integer' | 'decimal' | 'enum'
  required: boolean
  enumValues?: string[]
  default?: any
}

export const SCHEMAS: Record<SchemaType, SchemaField[]> = {
  ledger: [
    { header: 'Date', key: 'date', type: 'date', required: true },
    { header: 'Description', key: 'description', type: 'string', required: true },
    { header: 'Category', key: 'category', type: 'string', required: true },
    { header: 'Type', key: 'type', type: 'string', required: true, default: 'Expense' },
    { header: 'Amount', key: 'amount', type: 'decimal', required: true },
    { header: 'Payment Method', key: 'payment_method', type: 'string', required: false },
    { header: 'Payment Type', key: 'payment_type', type: 'string', required: false },
    { header: 'Bucket', key: 'bucket', type: 'string', required: true, default: 'Misc' },
    { header: 'Notes', key: 'notes', type: 'string', required: false },
  ],
  acq: [
    { header: 'Date', key: 'date', type: 'date', required: true },
    { header: 'Employee', key: 'employee', type: 'string', required: true },
    { header: 'Role', key: 'role', type: 'string', required: true, default: 'Cold Caller' },
    { header: 'Dials', key: 'dials', type: 'integer', required: false, default: 0 },
    { header: 'Conversations', key: 'conversations', type: 'integer', required: false, default: 0 },
    { header: 'Leads Pushed', key: 'leads_pushed', type: 'integer', required: false, default: 0 },
    { header: 'Pass-Offs', key: 'pass_offs', type: 'integer', required: false, default: 0 },
    { header: 'Process', key: 'process', type: 'integer', required: false, default: 0 },
    { header: 'Appts Set', key: 'appts_set', type: 'integer', required: false, default: 0 },
    { header: 'Offers', key: 'offers', type: 'integer', required: false, default: 0 },
    { header: 'Contracts', key: 'contracts', type: 'integer', required: false, default: 0 },
    { header: 'Closed', key: 'closed', type: 'integer', required: false, default: 0 },
    { header: 'Dropped', key: 'dropped', type: 'integer', required: false, default: 0 },
    { header: 'Notes', key: 'notes', type: 'string', required: false },
  ],
  dispo: [
    { header: 'Date', key: 'date', type: 'date', required: true },
    { header: 'Employee', key: 'employee', type: 'string', required: true },
    { header: 'Role', key: 'role', type: 'string', required: true, default: 'Disposition Agent' },
    { header: 'Total Dials', key: 'total_dials', type: 'integer', required: false, default: 0 },
    { header: 'Calls Connected', key: 'calls_connected', type: 'integer', required: false, default: 0 },
    { header: 'Follow-Ups', key: 'follow_ups', type: 'integer', required: false, default: 0 },
    { header: 'Buyer Box Collected', key: 'buyer_box_collected', type: 'integer', required: false, default: 0 },
    { header: 'Scheduled Deals', key: 'scheduled_deals', type: 'integer', required: false, default: 0 },
    { header: 'Deals Pitched', key: 'deals_pitched', type: 'integer', required: false, default: 0 },
    { header: 'Queries', key: 'queries', type: 'integer', required: false, default: 0 },
    { header: 'Offers', key: 'offers', type: 'integer', required: false, default: 0 },
    { header: 'Offers Made', key: 'offers_made', type: 'integer', required: false, default: 0 },
    { header: 'Deals Locked Up', key: 'deals_locked_up', type: 'integer', required: false, default: 0 },
    { header: 'Notes', key: 'notes', type: 'string', required: false },
  ],
}

export function getSchemaHeaders(schema: SchemaType): string[] {
  return SCHEMAS[schema].map(f => f.header)
}

export function detectSchema(headers: string[]): SchemaType | null {
  const normalized = headers.map(h => h.trim().toLowerCase())
  for (const [type, fields] of Object.entries(SCHEMAS)) {
    const schemaHeaders = fields.map(f => f.header.toLowerCase())
    const matches = schemaHeaders.every(h => normalized.includes(h))
    if (matches) return type as SchemaType
  }
  return null
}

export interface ParsedRow {
  data: Record<string, any>
  errors: string[]
  rowNumber: number
}

export interface ParseResult {
  schema: SchemaType
  rows: ParsedRow[]
  totalRows: number
  validRows: number
  errorRows: number
  headerErrors: string[]
}

// Parse amount: strip $ and commas, handle negative
export function parseAmount(value: string): number | null {
  if (value === null || value === undefined || value === '') return null
  const cleaned = String(value).replace(/[$,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

// Parse date: accept plain date strings or Excel serial numbers
export function parseDate(value: any): string | null {
  if (!value && value !== 0) return null

  // Excel serial date
  if (typeof value === 'number' || (/^\d+$/.test(String(value)) && Number(value) > 30000)) {
    const serial = Number(value)
    // Excel epoch: Dec 30, 1899
    const epoch = new Date(1899, 11, 30)
    const date = new Date(epoch.getTime() + serial * 86400000)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }

  const dateStr = String(value).trim()
  // Try MM/DD/YYYY or M/D/YYYY
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }

  return null
}

export function parseInteger(value: any): number {
  if (value === null || value === undefined || value === '') return 0
  const num = parseInt(String(value).replace(/[,]/g, ''), 10)
  return isNaN(num) ? 0 : num
}

export function parseDecimal(value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = parseFloat(String(value).replace(/[$,\s]/g, ''))
  return isNaN(num) ? null : num
}

export function validateAndParseRow(rawRow: Record<string, any>, schemaType: SchemaType, rowNumber: number): ParsedRow {
  const fields = SCHEMAS[schemaType]
  const errors: string[] = []
  const data: Record<string, any> = {}

  for (const field of fields) {
    const rawValue = rawRow[field.header] ?? rawRow[field.key] ?? ''

    if (field.required && (rawValue === '' || rawValue === null || rawValue === undefined)) {
      // Use default if available
      if (field.default !== undefined) {
        data[field.key] = field.default
      } else {
        errors.push(`Missing required field: ${field.header}`)
        continue
      }
    }

    if (rawValue === '' || rawValue === null || rawValue === undefined) {
      if (field.default !== undefined) {
        data[field.key] = field.default
      } else if (field.type === 'integer') {
        data[field.key] = 0
      } else {
        data[field.key] = null
      }
      continue
    }

    switch (field.type) {
      case 'date': {
        const parsed = parseDate(rawValue)
        if (!parsed) {
          errors.push(`Invalid date: ${field.header} = "${rawValue}"`)
        } else {
          data[field.key] = parsed
        }
        break
      }
      case 'integer': {
        // Blank is valid → 0
        if (rawValue === '' || rawValue === null || rawValue === undefined) {
          data[field.key] = 0
        } else {
          data[field.key] = parseInteger(rawValue)
        }
        break
      }
      case 'decimal': {
        const parsed = parseDecimal(rawValue)
        if (parsed === null && field.required) {
          errors.push(`Invalid amount: ${field.header} = "${rawValue}"`)
        } else {
          data[field.key] = parsed ?? 0
        }
        break
      }
      case 'string':
      case 'enum':
      default: {
        data[field.key] = String(rawValue).trim()
        break
      }
    }
  }

  return { data, errors, rowNumber }
}

// CSV parsing
export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? ''
    })
    rows.push(row)
  }
  return { headers, rows }
}

// JSON parsing (array of objects)
export function parseJSON(text: string): { headers: string[]; rows: Record<string, any>[] } {
  const data = JSON.parse(text)
  if (!Array.isArray(data)) throw new Error('JSON must be an array of objects')
  if (data.length === 0) return { headers: [], rows: [] }
  const headers = Object.keys(data[0])
  return { headers, rows: data }
}

// Main parse function
export function parseFile(text: string, filename: string, forcedSchema?: SchemaType): ParseResult {
  let headers: string[] = []
  let rawRows: Record<string, any>[] = []
  let parseError: string | null = null

  const ext = filename.split('.').pop()?.toLowerCase()

  try {
    if (ext === 'json') {
      const result = parseJSON(text)
      headers = result.headers
      rawRows = result.rows
    } else {
      // CSV (also handle .xlsx converted to CSV by the browser)
      const result = parseCSV(text)
      headers = result.headers
      rawRows = result.rows
    }
  } catch (e: any) {
    return {
      schema: forcedSchema || 'ledger',
      rows: [],
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      headerErrors: [`Failed to parse file: ${e.message}`],
    }
  }

  // Detect or use forced schema
  const schema = forcedSchema || detectSchema(headers)
  if (!schema) {
    return {
      schema: 'ledger',
      rows: [],
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      headerErrors: ['Could not detect schema from headers. Please select the correct format manually.'],
    }
  }

  // Validate headers
  const schemaHeaders = SCHEMAS[schema].map(f => f.header.toLowerCase())
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase())
  const headerErrors: string[] = []

  for (const required of schemaHeaders) {
    if (!normalizedHeaders.includes(required)) {
      headerErrors.push(`Missing required column: ${required}`)
    }
  }

  // Check for extra unrecognized columns
  for (const h of normalizedHeaders) {
    if (!schemaHeaders.includes(h)) {
      headerErrors.push(`Unrecognized column: ${h}`)
    }
  }

  if (headerErrors.length > 0) {
    return { schema, rows: [], totalRows: rawRows.length, validRows: 0, errorRows: 0, headerErrors }
  }

  // Parse rows
  const parsedRows: ParsedRow[] = rawRows.map((row, idx) => validateAndParseRow(row, schema, idx + 2))
  const validRows = parsedRows.filter(r => r.errors.length === 0)
  const errorRows = parsedRows.filter(r => r.errors.length > 0)

  return {
    schema,
    rows: parsedRows,
    totalRows: parsedRows.length,
    validRows: validRows.length,
    errorRows: errorRows.length,
    headerErrors,
  }
}

// Export to CSV
export function exportToCSV(rows: Record<string, any>[], schemaType: SchemaType): string {
  const headers = getSchemaHeaders(schemaType)
  const lines = [headers.join(',')]

  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h] ?? ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
    lines.push(values.join(','))
  }
  return lines.join('\n')
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
