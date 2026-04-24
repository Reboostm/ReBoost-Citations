import { useState, useRef } from 'react'
import { Upload, AlertCircle, CheckCircle, Trash2 } from 'lucide-react'
import { createDirectory } from '@/services/firestore'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

export default function DirectoryImporter({ onComplete }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef(null)

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const rows = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length < headers.length) continue

      const row = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx]
      })
      rows.push(row)
    }

    return rows
  }

  const validateRow = (row, index) => {
    const errors = []

    if (!row.name || row.name.length < 2) errors.push('Name too short')
    if (!row.url || !row.url.startsWith('http')) errors.push('Invalid URL')
    if (row.submissionurl && !row.submissionurl.startsWith('http')) errors.push('Invalid submission URL')
    if (!['high', 'medium', 'low'].includes(row.tier?.toLowerCase())) errors.push('Invalid tier (must be high/medium/low)')

    const da = parseInt(row.da)
    if (isNaN(da) || da < 0 || da > 100) errors.push('Invalid DA (0-100)')

    if (!['web_form', 'api', 'manual'].includes(row.type?.toLowerCase())) errors.push('Invalid type (web_form/api/manual)')

    return { valid: errors.length === 0, errors }
  }

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result
        const rows = parseCSV(text)

        const validated = rows.map((row, idx) => {
          const { valid, errors } = validateRow(row, idx)
          return { ...row, valid, errors, rowNumber: idx + 2 }
        })

        setFile(selectedFile)
        setPreview(validated)
        toast.success(`Loaded ${validated.length} rows`)
      } catch (err) {
        toast.error(`Error parsing CSV: ${err.message}`)
      }
    }
    reader.readAsText(selectedFile)
  }

  const handleImport = async () => {
    const validRows = preview.filter(r => r.valid)
    if (validRows.length === 0) {
      toast.error('No valid rows to import')
      return
    }

    setImporting(true)
    let imported = 0
    let failed = 0

    for (let i = 0; i < validRows.length; i++) {
      try {
        const row = validRows[i]
        const useCustomerEmail = row.usecustomeremail?.toLowerCase() === 'true'
        await createDirectory({
          name: row.name,
          url: row.url,
          submissionUrl: row.submissionurl || '',
          category: row.category || 'General Business',
          da: parseInt(row.da),
          tier: row.tier.toLowerCase(),
          type: row.type.toLowerCase(),
          useCustomerEmail,
        })
        imported++
      } catch (err) {
        failed++
      }

      setProgress(Math.round(((i + 1) / validRows.length) * 100))
    }

    setImporting(false)
    toast.success(`Imported ${imported} directories${failed > 0 ? `, ${failed} failed` : ''}`)
    setFile(null)
    setPreview([])
    setProgress(0)
    onComplete?.()
  }

  const validCount = preview.filter(r => r.valid).length
  const invalidCount = preview.filter(r => !r.valid).length

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-colors"
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="font-medium text-gray-900">Drag & drop CSV here</p>
        <p className="text-sm text-gray-500 mt-1">or click to select</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* CSV Format Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-2">CSV Format (required columns):</p>
        <code className="block bg-white p-2 rounded text-xs font-mono overflow-x-auto">
          name,url,submissionUrl,category,da,tier,type,useCustomerEmail
        </code>
        <p className="mt-2 text-xs">
          <strong>useCustomerEmail:</strong> true for high-value sites (Yelp, BBB, Angi), false for standard sites (optional, defaults to false)
          <br />
          Example: Google My Business,https://myBusiness.google.com,https://myBusiness.google.com/create,General Business,100,high,web_form,true
        </p>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Preview ({preview.length} rows)</h3>
            <button
              onClick={() => {
                setFile(null)
                setPreview([])
                setProgress(0)
              }}
              className="text-sm text-gray-500 hover:text-red-600"
            >
              Clear
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-green-900 font-medium">{validCount}</p>
                <p className="text-xs text-green-700">Valid</p>
              </div>
            </div>
            <div className={`rounded-lg p-3 flex items-center gap-2 border ${invalidCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <AlertCircle className={`w-5 h-5 flex-shrink-0 ${invalidCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              <div>
                <p className={`font-medium ${invalidCount > 0 ? 'text-red-900' : 'text-gray-600'}`}>{invalidCount}</p>
                <p className={`text-xs ${invalidCount > 0 ? 'text-red-700' : 'text-gray-500'}`}>Invalid</p>
              </div>
            </div>
          </div>

          {/* Issues list */}
          {invalidCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto text-sm">
              <p className="font-medium text-red-900 mb-2">Issues:</p>
              {preview.filter(r => !r.valid).map((row, idx) => (
                <p key={idx} className="text-red-700 text-xs mb-1">
                  Row {row.rowNumber}: {row.errors.join(', ')}
                </p>
              ))}
            </div>
          )}

          {/* Progress bar */}
          {importing && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Importing...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-brand-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Import button */}
          {!importing && validCount > 0 && (
            <Button
              onClick={handleImport}
              className="w-full"
              disabled={importing}
            >
              Import {validCount} Directories
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
