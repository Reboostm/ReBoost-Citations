import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Globe, Briefcase, TrendingUp, Package, CheckCircle } from 'lucide-react'
import { getDashboardStats, getJobs, getClients } from '@/services/firestore'
import StatCard from '@/components/ui/StatCard'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate, statusColor, timeAgo } from '@/utils/helpers'

export default function AdminDashboard() {
  const [stats, setStats]   = useState(null)
  const [jobs, setJobs]     = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getJobs(),
      getClients(),
    ]).then(([s, j, c]) => {
      setStats(s)
      setJobs(j.slice(0, 5))
      setClients(c.slice(0, 5))
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back — here's what's happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Clients"
          value={stats?.totalClients ?? 0}
          icon={Users}
          color="blue"
          subtitle="All time"
        />
        <StatCard
          title="Citations This Month"
          value={stats?.citationsThisMonth ?? 0}
          icon={CheckCircle}
          color="green"
          subtitle={`${stats?.totalCitations ?? 0} total`}
        />
        <StatCard
          title="Active Jobs"
          value={stats?.activeJobs ?? 0}
          icon={Briefcase}
          color="orange"
          subtitle="Running or queued"
        />
        <StatCard
          title="Packages"
          value={stats?.packagesSold ?? 0}
          icon={Package}
          color="purple"
          subtitle="Available tiers"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <Link to="/admin/jobs" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View all</Link>
          </CardHeader>
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No jobs yet</p>
          ) : (
            <div className="space-y-3">
              {jobs.map(job => (
                <div key={job.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{job.clientName ?? 'Unknown Client'}</p>
                    <p className="text-xs text-gray-400">{timeAgo(job.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">{job.progress ?? 0}/{job.total ?? 0}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Clients</CardTitle>
            <Link to="/admin/clients" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View all</Link>
          </CardHeader>
          {clients.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No clients yet</p>
          ) : (
            <div className="space-y-3">
              {clients.map(client => (
                <Link key={client.id} to={`/admin/clients/${client.id}`} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {client.logoUrl
                      ? <img src={client.logoUrl} alt="" className="w-full h-full object-cover" />
                      : <span className="text-brand-700 font-bold text-sm">{client.businessName?.[0] ?? '?'}</span>
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{client.businessName}</p>
                    <p className="text-xs text-gray-400 truncate">{client.city}, {client.state}</p>
                  </div>
                  <Badge color="blue">{client.category ?? 'General'}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
