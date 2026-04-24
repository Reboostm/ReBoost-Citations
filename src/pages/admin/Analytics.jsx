import { useEffect, useState } from 'react'
import { AlertTriangle, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react'
import { getGlobalAnalytics } from '@/services/firestore'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import PageHeader from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true)
        const data = await getGlobalAnalytics(days)
        setAnalytics(data)
      } catch (err) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [days])

  if (loading) return <PageLoader />

  if (!analytics) return <div className="p-6">No data</div>

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Submission Analytics"
        subtitle="Monitor citation submission performance across all clients"
      />

      {/* Time Period Selector */}
      <div className="flex gap-2 mb-6">
        {[7, 30, 90].map(d => (
          <Button
            key={d}
            variant={days === d ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setDays(d)}
          >
            Last {d} days
          </Button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-3xl font-bold text-gray-900">{analytics.total.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total Submissions</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-3xl font-bold text-green-600">{analytics.live.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Live</p>
          <p className="text-xs text-green-600 font-medium mt-1">{analytics.successRate}% Success</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-3xl font-bold text-yellow-600">{analytics.submitted.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Submitted</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-3xl font-bold text-orange-600">{analytics.needsReview.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Needs Review</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-3xl font-bold text-red-600">{analytics.failed.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Failed</p>
          <p className="text-xs text-red-600 font-medium mt-1">{analytics.failureRate}% Failure</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failure Reasons */}
        <Card>
          <CardHeader><CardTitle>Failure Reasons</CardTitle></CardHeader>
          <div className="px-5 pb-5 space-y-3">
            {Object.entries(analytics.failureReasons).length > 0 ? (
              Object.entries(analytics.failureReasons)
                .sort(([, a], [, b]) => b - a)
                .map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <span className="text-sm font-medium text-gray-900">{reason}</span>
                    <Badge color="red">{count}</Badge>
                  </div>
                ))
            ) : (
              <p className="text-sm text-gray-500">No failures</p>
            )}
          </div>
        </Card>

        {/* Problematic Directories */}
        <Card>
          <CardHeader><CardTitle>Problematic Directories</CardTitle></CardHeader>
          <div className="px-5 pb-5 space-y-3">
            {analytics.problematicDirectories.length > 0 ? (
              analytics.problematicDirectories.map((dir, idx) => {
                const failRate = Math.round((dir.failed / dir.total) * 100)
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{dir.name}</p>
                      <p className="text-xs text-gray-500">{dir.failed} / {dir.total} failed</p>
                    </div>
                    <Badge color={failRate > 70 ? 'red' : 'yellow'}>{failRate}%</Badge>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-gray-500">No problematic directories</p>
            )}
          </div>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card className="mt-6">
        <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
        <div className="px-5 pb-5">
          <div className="space-y-4">
            {[
              { label: 'Live', value: analytics.live, color: 'bg-green-100 text-green-800' },
              { label: 'Submitted', value: analytics.submitted, color: 'bg-yellow-100 text-yellow-800' },
              { label: 'Needs Review', value: analytics.needsReview, color: 'bg-orange-100 text-orange-800' },
              { label: 'Failed', value: analytics.failed, color: 'bg-red-100 text-red-800' },
              { label: 'Pending', value: analytics.pending, color: 'bg-gray-100 text-gray-800' },
            ].map(status => {
              const percent = analytics.total > 0 ? Math.round((status.value / analytics.total) * 100) : 0
              return (
                <div key={status.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{status.label}</span>
                    <span className="text-sm text-gray-600">{status.value.toLocaleString()} ({percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${status.color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
