import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getCitationsForClient, getClient } from '@/services/firestore'
import { Globe, Search, Filter, Download, CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate, statusColor } from '@/utils/helpers'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'

const statusIcon = (status) => {
  const map = {
    live:      <CheckCircle className="w-4 h-4 text-green-500" />,
    failed:    <XCircle className="w-4 h-4 text-red-500" />,
    pending:   <AlertCircle className="w-4 h-4 text-yellow-500" />,
    submitted: <Clock className="w-4 h-4 text-blue-500" />,
  }
  return map[status?.toLowerCase()] ?? <AlertCircle className="w-4 h-4 text-gray-400" />
}

export default function Citations() {
  const { userProfile } = useAuth()
  const [client, setClient]   = useState(null)
  const [citations, setCitations] = useState([])
  const [filtered, setFiltered]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    if (!userProfile?.clientId) {
      setLoading(false)
      return
    }
    Promise.all([
      getClient(userProfile.clientId),
      getCitationsForClient(userProfile.clientId),
    ]).then(([c, cit]) => {
      setClient(c)
      setCitations(cit)
      setFiltered(cit)
      setLoading(false)
    })
  }, [userProfile])

  useEffect(() => {
    let result = citations
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c => c.directoryName?.toLowerCase().includes(q))
    }
    if (statusFilter) {
      result = result.filter(c => c.status === statusFilter)
    }
    setFiltered(result)
  }, [search, statusFilter, citations])

  const exportCSV = () => {
    const csv = [
      ['Directory', 'Date Submitted', 'Status', 'URL'],
      ...filtered.map(c => [c.directoryName ?? '—', formatDate(c.dateSubmitted), c.status, c.liveUrl ?? '—']),
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${client?.businessName || 'citations'}-export.csv`
    a.click()
    toast.success('CSV exported!')
  }

  if (loading) return <PageLoader />

  if (!client) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No client profile associated with your account.</p>
        <p className="text-xs mt-2">Contact support to get set up.</p>
      </div>
    )
  }

  const stats = [
    { label: 'Total', value: citations.length, color: 'text-gray-900' },
    { label: 'Live', value: citations.filter(c => c.status === 'live').length, color: 'text-green-600' },
    { label: 'Pending', value: citations.filter(c => c.status === 'pending').length, color: 'text-yellow-600' },
    { label: 'Failed', value: citations.filter(c => c.status === 'failed').length, color: 'text-red-600' },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Citations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track all citations for {client?.businessName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search directories…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="live">Live</option>
            <option value="submitted">Submitted</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <Button variant="secondary" onClick={exportCSV}>
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No citations found</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Directory</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Date Submitted</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Live URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(cit => (
                  <tr key={cit.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900 truncate">{cit.directoryName ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(cit.dateSubmitted)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(cit.status)}`}>
                        {statusIcon(cit.status)} {cit.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {cit.liveUrl
                        ? <a href={cit.liveUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-xs font-medium">View →</a>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
