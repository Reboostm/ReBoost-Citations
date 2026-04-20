import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns'
import { getShareToken, getAllCitations, getClient } from '@/services/firestore'
import { PageLoader } from '@/components/ui/Spinner'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatDate, statusColor } from '@/utils/helpers'
import { Download, Globe, CheckCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'

const STATUS_PIE_COLORS = {
  live:      '#22c55e',
  submitted: '#3b82f6',
  pending:   '#f59e0b',
  failed:    '#ef4444',
  duplicate: '#9ca3af',
}

function buildMonthlyData(citations) {
  const now = new Date()
  const months = eachMonthOfInterval({ start: subMonths(now, 11), end: now })
  return months.map(m => {
    const start = startOfMonth(m)
    const end   = endOfMonth(m)
    const count = citations.filter(c => {
      const d = c.dateSubmitted?.toDate?.() ?? new Date(c.dateSubmitted)
      return d >= start && d <= end
    }).length
    return { month: format(m, 'MMM yy'), count }
  })
}

function buildStatusData(citations) {
  const counts = {}
  citations.forEach(c => { counts[c.status] = (counts[c.status] ?? 0) + 1 })
  return Object.entries(counts).map(([status, value]) => ({ status, value }))
}

export default function PublicReport() {
  const { token } = useParams()
  const [report, setReport] = useState(null)
  const [client, setClient] = useState(null)
  const [citations, setCitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const shareToken = await getShareToken(token)
        if (!shareToken) {
          setError('Report not found or link expired')
          setLoading(false)
          return
        }

        // Get client and citations
        const [c, cits] = await Promise.all([
          getClient(shareToken.clientId),
          (async () => {
            const all = await getAllCitations([])
            return all.filter(cit => cit.clientId === shareToken.clientId)
          })(),
        ])

        setReport(shareToken)
        setClient(c)
        setCitations(cits)
        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }
    load()
  }, [token])

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text('Citation Performance Report', 14, 20)
    doc.setFontSize(12)
    doc.text(`Client: ${client?.businessName ?? 'N/A'}`, 14, 30)
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 36)
    doc.text(`Total Citations: ${citations.length}`, 14, 42)

    autoTable(doc, {
      startY: 58,
      head: [['Directory', 'Status', 'Date Submitted', 'URL']],
      body: citations.map(c => [
        c.directoryName ?? '—',
        c.status,
        formatDate(c.dateSubmitted),
        c.liveUrl ?? '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    })

    doc.save(`${client?.businessName || 'report'}-citations.pdf`)
    toast.success('PDF downloaded!')
  }

  if (loading) return <PageLoader />

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Unavailable</h1>
            <p className="text-gray-500">{error}</p>
            <p className="text-sm text-gray-400 mt-4">The link may have expired. Please contact your account manager.</p>
          </div>
        </Card>
      </div>
    )
  }

  const monthlyData = buildMonthlyData(citations)
  const statusData = buildStatusData(citations)
  const liveCitations = citations.filter(c => c.status === 'live').length

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client?.businessName}</h1>
            <p className="text-gray-500 mt-1">Citation Performance Report</p>
          </div>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Citations',  value: citations.length,    color: 'text-gray-900' },
            { label: 'Live Listings',    value: liveCitations,       color: 'text-green-600' },
            { label: 'Pending',          value: citations.filter(c=>c.status==='pending').length, color: 'text-yellow-600' },
            { label: 'Failed',           value: citations.filter(c=>c.status==='failed').length, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Growth Chart */}
          <Card>
            <CardHeader><CardTitle>Citation Growth (Last 12 Months)</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Status Pie */}
          {statusData.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Citation Status</CardTitle></CardHeader>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_PIE_COLORS[entry.status] ?? '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* Citations Table */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-100">
            <CardTitle>All Citations ({citations.length})</CardTitle>
          </div>
          <div className="overflow-x-auto">
            {citations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No citations submitted yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Directory</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {citations.slice(0, 50).map(cit => (
                    <tr key={cit.id}>
                      <td className="px-5 py-3 font-medium text-gray-900 truncate max-w-[250px]">{cit.directoryName ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(cit.dateSubmitted)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(cit.status)}`}>{cit.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        {cit.liveUrl
                          ? <a href={cit.liveUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-xs font-medium">View</a>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Report generated on {format(new Date(), 'PPP')} • Powered by ReBoost Citations</p>
        </div>
      </div>
    </div>
  )
}
