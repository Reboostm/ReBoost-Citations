import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getClients, getCitationsForClient, getAllCitations } from '@/services/firestore'
import { createShareToken } from '@/services/firestore'
import { generateShareToken } from '@/utils/helpers'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import PageHeader from '@/components/layout/PageHeader'
import { formatDate, statusColor } from '@/utils/helpers'
import toast from 'react-hot-toast'
import { Download, Share2, BarChart2 } from 'lucide-react'

const STATUS_PIE_COLORS = {
  live:                '#22c55e',
  submitted:           '#3b82f6',
  pending:             '#f59e0b',
  failed:              '#ef4444',
  needs_manual_review: '#f97316',
  verification_sent:   '#8b5cf6',
  duplicate:           '#9ca3af',
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

export default function Reports() {
  const [searchParams] = useSearchParams()
  const [clients, setClients]     = useState([])
  const [selectedClient, setSelectedClient] = useState(searchParams.get('clientId') ?? '')
  const [citations, setCitations] = useState([])
  const [loading, setLoading]     = useState(true)
  const [sharing, setSharing]     = useState(false)
  const [shareUrl, setShareUrl]   = useState('')

  useEffect(() => {
    getClients().then(c => {
      setClients(c)
      if (!selectedClient && c.length > 0) setSelectedClient(c[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedClient) return
    setLoading(true)
    getCitationsForClient(selectedClient).then(data => {
      setCitations(data)
      setLoading(false)
    })
  }, [selectedClient])

  const client = clients.find(c => c.id === selectedClient)
  const monthlyData = buildMonthlyData(citations)
  const statusData  = buildStatusData(citations)

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text('Citation Report', 14, 20)
    doc.setFontSize(12)
    doc.text(`Client: ${client?.businessName ?? ''}`, 14, 30)
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 36)
    doc.text(`Total Citations: ${citations.length}`, 14, 42)

    const live = citations.filter(c => c.status === 'live').length
    doc.text(`Live: ${live}  |  Submitted: ${citations.filter(c=>c.status==='submitted').length}  |  Pending: ${citations.filter(c=>c.status==='pending').length}`, 14, 48)

    autoTable(doc, {
      startY: 58,
      head: [['Directory', 'Status', 'Date Submitted', 'Live URL']],
      body: citations.map(c => [
        c.directoryName ?? '—',
        c.status,
        formatDate(c.dateSubmitted),
        c.liveUrl ?? '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    })

    doc.save(`${client?.businessName ?? 'report'}-citations.pdf`)
    toast.success('PDF exported!')
  }

  const createShare = async () => {
    setSharing(true)
    try {
      const token = generateShareToken()
      await createShareToken(token, {
        clientId:     selectedClient,
        clientName:   client?.businessName,
        citationCount: citations.length,
        generatedAt:  new Date().toISOString(),
      })
      const url = `${window.location.origin}/report/${token}`
      setShareUrl(url)
      await navigator.clipboard.writeText(url)
      toast.success('Share link copied to clipboard!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Reports"
        subtitle="Track citation growth and export client reports"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportPDF} disabled={!selectedClient}>
              <Download className="w-4 h-4" /> Export PDF
            </Button>
            <Button variant="secondary" onClick={createShare} loading={sharing} disabled={!selectedClient}>
              <Share2 className="w-4 h-4" /> Share Link
            </Button>
          </div>
        }
      />

      {/* Client selector */}
      <div className="max-w-xs mb-6">
        <Select
          placeholder="Select client…"
          options={clients.map(c => ({ value: c.id, label: c.businessName }))}
          value={selectedClient}
          onChange={e => setSelectedClient(e.target.value)}
        />
      </div>

      {shareUrl && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-green-800">Share link created!</p>
            <p className="text-xs text-green-600 break-all">{shareUrl}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy</Button>
        </div>
      )}

      {loading ? <PageLoader /> : (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total',    value: citations.length,                             color: 'text-gray-900' },
              { label: 'Live',     value: citations.filter(c=>c.status==='live').length, color: 'text-green-600' },
              { label: 'Pending',  value: citations.filter(c=>c.status==='pending').length, color: 'text-yellow-600' },
              { label: 'Failed',   value: citations.filter(c=>c.status==='failed').length, color: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Growth Chart */}
          <Card>
            <CardHeader><CardTitle>Citation Growth (Last 12 Months)</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Area type="monotone" dataKey="count" name="Citations" stroke="#2563eb" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Existing / Live Citations */}
          {citations.filter(c => c.status === 'live').length > 0 && (
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-gray-100">
                <CardTitle>Live Listings ({citations.filter(c => c.status === 'live').length})</CardTitle>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Directory</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date Submitted</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Email Used</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Live URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {citations.filter(c => c.status === 'live').map(cit => (
                      <tr key={cit.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{cit.directoryName}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(cit.dateSubmitted)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[200px]">{cit.emailUsed ?? '—'}</td>
                        <td className="px-4 py-3">
                          {cit.liveUrl
                            ? <a href={cit.liveUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-xs">View</a>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Status Breakdown */}
          {statusData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Status Breakdown</CardTitle></CardHeader>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={({status, percent}) => `${status} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_PIE_COLORS[entry.status] ?? '#9ca3af'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* Recent citations table */}
              <Card padding={false}>
                <div className="px-5 py-4 border-b border-gray-100">
                  <CardTitle>Recent Citations</CardTitle>
                </div>
                <div className="overflow-y-auto max-h-60">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Directory</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {citations.slice(0,20).map(cit => (
                        <tr key={cit.id}>
                          <td className="px-4 py-2.5 font-medium text-gray-900 truncate max-w-[160px]">{cit.directoryName}</td>
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatDate(cit.dateSubmitted)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(cit.status)}`}>{cit.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
