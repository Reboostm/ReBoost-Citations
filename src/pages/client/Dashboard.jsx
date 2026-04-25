import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Clock, Globe, Package, TrendingUp, BarChart2, ArrowRight, Zap, ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getClient, getCitationsForClient, getJobsForClient, getDocument, getPackages } from '@/services/firestore'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate, statusColor, formatPhone } from '@/utils/helpers'
import { cn } from '@/utils/cn'

export default function ClientDashboard() {
  const { userProfile } = useAuth()
  const [client, setClient]     = useState(null)
  const [citations, setCitations] = useState([])
  const [jobs, setJobs]         = useState([])
  const [pkg, setPkg]           = useState(null)
  const [tools, setTools]       = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!userProfile?.clientId) return
    const cid = userProfile.clientId
    Promise.all([
      getClient(cid),
      getCitationsForClient(cid),
      getJobsForClient(cid),
      getPackages(),
    ]).then(async ([c, cit, j, packages]) => {
      setClient(c)
      setCitations(cit)
      setJobs(j)

      // Fetch the most recent job's package
      if (j.length > 0 && j[0].packageId) {
        const p = await getDocument('packages', j[0].packageId)
        setPkg(p)
      }

      // Filter for cross-sell tools (packageType='tool')
      const toolPackages = packages.filter(p => p.packageType === 'tool')
      setTools(toolPackages)

      setLoading(false)
    })
  }, [userProfile])

  if (loading) return <PageLoader />
  if (!client) return (
    <div className="p-8 text-center text-gray-500">No client profile associated with your account. Contact support.</div>
  )

  const liveCitations   = citations.filter(c => c.status === 'live').length
  const activeJob       = jobs.find(j => j.status === 'running' || j.status === 'pending')
  const packageProgress = activeJob ? Math.round((activeJob.progress / activeJob.total) * 100) : null

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const newThisMonth = citations.filter(c => {
    const d = c.dateSubmitted?.toDate?.() ?? new Date(c.dateSubmitted)
    return d >= monthStart
  }).length

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {client.logoUrl
            ? <img src={client.logoUrl} alt="" className="w-full h-full object-cover" />
            : <span className="text-brand-700 font-bold text-2xl">{client.businessName?.[0]}</span>
          }
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{client.businessName}</h1>
          <p className="text-sm text-gray-500">{client.city}, {client.state} · {client.category}</p>
        </div>
      </div>

      {/* Start Here CTA - if onboarding incomplete */}
      {!client?.businessProfile && (
        <div className="mb-8 bg-gradient-to-r from-brand-50 to-blue-50 border border-brand-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-600" />
                Let's Get Started!
              </h2>
              <p className="text-sm text-gray-600 mt-1">Complete your business profile to begin submitting citations.</p>
            </div>
            <Link to="/onboarding">
              <Button className="flex items-center gap-2 whitespace-nowrap">
                Start Here
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Citations',   value: citations.length, icon: Globe,        color: 'blue'   },
          { label: 'Live Listings',     value: liveCitations,    icon: CheckCircle,  color: 'green'  },
          { label: 'New This Month',    value: newThisMonth,     icon: TrendingUp,   color: 'purple' },
          { label: 'Jobs Completed',    value: jobs.filter(j=>j.status==='completed').length, icon: Package, color: 'orange' },
        ].map(s => {
          const Icon = s.icon
          const colors = {
            blue:   'bg-blue-50 text-blue-600',
            green:  'bg-green-50 text-green-600',
            purple: 'bg-purple-50 text-purple-600',
            orange: 'bg-orange-50 text-orange-600',
          }
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', colors[s.color])}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* Your Package Section */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">📦 Your Package</h2>
        {pkg ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Package */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>Current Plan</CardTitle>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Active</span>
              </div>
              <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl p-4 text-white mb-4">
                <p className="font-bold text-lg">{pkg.name}</p>
                <p className="text-brand-200 text-sm">{pkg.citationCount?.toLocaleString()} citations included</p>
              </div>
              {activeJob && (
                <>
                  <div className="flex justify-between text-sm text-gray-600 mb-1.5">
                    <span>Submission Progress</span>
                    <span>{activeJob.progress ?? 0} / {activeJob.total ?? 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                    <div
                      className="h-3 rounded-full bg-brand-500 transition-all duration-500"
                      style={{ width: `${packageProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">{packageProgress}% complete</p>
                </>
              )}
            </Card>

            {/* Upgrade Option */}
            <Card>
              <CardTitle className="mb-4">Upgrade Available</CardTitle>
              <p className="text-sm text-gray-600 mb-4">
                Get more citations and expand your online presence.
              </p>
              <Link to="/dashboard/billing">
                <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  View Upgrade Options
                </Button>
              </Link>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Questions? <a href="#" onClick={() => {}} className="text-brand-600 hover:underline">Contact support</a>
              </p>
            </Card>
          </div>
        ) : (
          <Card>
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">No Package Active</p>
              <p className="text-xs text-gray-400 mt-1">Contact your account manager to get started</p>
            </div>
          </Card>
        )}
      </div>

      {/* Cross-Sell Tools */}
      {tools.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🛠️ Recommended Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map(tool => (
              <Card key={tool.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{tool.toolIcon || '🛠️'}</span>
                  {tool.highlighted && (
                    <Badge color="purple">Recommended</Badge>
                  )}
                </div>
                <CardTitle className="mb-2">{tool.name}</CardTitle>
                {tool.description && (
                  <p className="text-sm text-gray-600 mb-4">{tool.description}</p>
                )}
                <a
                  href={tool.toolLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!tool.toolLink) e.preventDefault()
                  }}
                >
                  <Button
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-2"
                    disabled={!tool.toolLink}
                  >
                    {tool.toolCtaText || 'Learn More'}
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Business Info */}
        <div className="space-y-4 lg:col-span-1">

          {/* Business Info */}
          <Card>
            <CardTitle className="mb-4">Business Info</CardTitle>
            <dl className="space-y-2 text-sm">
              {[
                { label: 'Address', value: `${client.address}, ${client.city}, ${client.state} ${client.zip}` },
                { label: 'Phone',   value: formatPhone(client.phone) },
                { label: 'Website', value: client.website, href: client.website },
                { label: 'Email',   value: client.publicEmail },
              ].filter(i => i.value).map(i => (
                <div key={i.label} className="flex items-start gap-2">
                  <dt className="text-xs text-gray-400 font-medium w-16 flex-shrink-0 mt-0.5">{i.label}</dt>
                  <dd className="text-gray-700 flex-1">
                    {i.href
                      ? <a href={i.href} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline break-all">{i.value}</a>
                      : i.value
                    }
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        {/* Recent Citations */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <CardTitle>Recent Citations</CardTitle>
              <Link to="/dashboard/citations" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View all</Link>
            </div>
            {citations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No citations yet. Your campaign is being prepared.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Directory</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {citations.slice(0, 10).map(cit => (
                      <tr key={cit.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900 truncate max-w-[200px]">{cit.directoryName ?? '—'}</td>
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(cit.dateSubmitted)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(cit.status)}`}>{cit.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
