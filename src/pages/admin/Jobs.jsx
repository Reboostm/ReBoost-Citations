import { useEffect, useState } from 'react'
import { Plus, Play, Pause, RefreshCw, Terminal, ChevronDown, ChevronUp, Briefcase } from 'lucide-react'
import { subscribeToJobs, getClients, getPackages, createJob, updateJob } from '@/services/firestore'
import { startSubmissionJob, pauseSubmissionJob, resumeSubmissionJob } from '@/services/functions'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDateTime, statusColor, timeAgo } from '@/utils/helpers'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

const schema = z.object({
  clientId:  z.string().min(1, 'Select a client'),
  packageId: z.string().min(1, 'Select a package'),
  tier:      z.enum(['high', 'medium', 'low', 'all']),
})

function NewJobForm({ clients, packages, onSubmit, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { clientId: '', packageId: '', tier: 'all' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Client *"
        placeholder="Select client…"
        options={clients.map(c => ({ value: c.id, label: c.businessName }))}
        error={errors.clientId?.message}
        {...register('clientId')}
      />
      <Select
        label="Citation Package *"
        placeholder="Select package…"
        options={packages.map(p => ({ value: p.id, label: `${p.name} — ${p.citationCount} citations` }))}
        error={errors.packageId?.message}
        {...register('packageId')}
      />
      <Select
        label="Directory Tier Filter"
        options={[
          { value: 'all',    label: 'All Tiers' },
          { value: 'high',   label: 'High Authority Only (DA 50+)' },
          { value: 'medium', label: 'Medium Authority Only (DA 20–49)' },
          { value: 'low',    label: 'Low Authority Only (DA <20)' },
        ]}
        {...register('tier')}
      />
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Note:</strong> The submission engine will run Playwright inside Firebase Cloud Functions. Processing happens asynchronously — monitor progress in the job logs below.
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={loading}><Play className="w-4 h-4" /> Start Job</Button>
      </div>
    </form>
  )
}

function JobCard({ job, onPause, onResume }) {
  const [expanded, setExpanded] = useState(false)
  const progress = job.total > 0 ? Math.round((job.progress / job.total) * 100) : 0

  const STATUS_COLOR = {
    pending:   'blue',
    running:   'green',
    paused:    'yellow',
    completed: 'green',
    failed:    'red',
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">{job.clientName ?? 'Unknown Client'}</p>
              <Badge color={STATUS_COLOR[job.status] ?? 'gray'}>{job.status}</Badge>
              {job.packageName && <Badge color="indigo">{job.packageName}</Badge>}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{timeAgo(job.createdAt)}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {job.status === 'running' && (
              <Button variant="secondary" size="xs" onClick={() => onPause(job.id)}>
                <Pause className="w-3.5 h-3.5" /> Pause
              </Button>
            )}
            {job.status === 'paused' && (
              <Button size="xs" onClick={() => onResume(job.id)}>
                <Play className="w-3.5 h-3.5" /> Resume
              </Button>
            )}
            <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>{job.progress ?? 0} / {job.total ?? '?'} citations</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-500',
                job.status === 'completed' ? 'bg-green-500' :
                job.status === 'failed'    ? 'bg-red-500' :
                job.status === 'running'   ? 'bg-brand-500' : 'bg-gray-300',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Logs */}
      {expanded && (
        <div className="border-t border-gray-100">
          <div className="flex items-center gap-2 px-5 py-3 bg-gray-50">
            <Terminal className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">Submission Logs</span>
          </div>
          <div className="bg-gray-950 p-4 max-h-64 overflow-y-auto font-mono text-xs">
            {(!job.logs || job.logs.length === 0) ? (
              <p className="text-gray-500">No logs yet…</p>
            ) : (
              job.logs.map((log, i) => (
                <div key={i} className={cn(
                  'mb-1',
                  log.type === 'error'   ? 'text-red-400' :
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'warn'    ? 'text-yellow-400' : 'text-gray-300',
                )}>
                  <span className="text-gray-600">[{log.timestamp?.slice(11,19)}]</span>{' '}
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Jobs() {
  const [jobs, setJobs]       = useState([])
  const [clients, setClients] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    Promise.all([getClients(), getPackages()]).then(([c, p]) => {
      setClients(c)
      setPackages(p)
    })

    const unsub = subscribeToJobs(data => {
      setJobs(data)
      setLoading(false)
    })
    return unsub
  }, [])

  const handleStart = async (data) => {
    setStarting(true)
    try {
      const client  = clients.find(c => c.id === data.clientId)
      const pkg     = packages.find(p => p.id === data.packageId)

      const jobId = await createJob({
        clientId:    data.clientId,
        clientName:  client?.businessName ?? 'Unknown',
        packageId:   data.packageId,
        packageName: pkg?.name ?? 'Unknown',
        tier:        data.tier,
        status:      'pending',
        progress:    0,
        total:       pkg?.citationCount ?? 0,
        logs:        [],
      })

      // Trigger the Cloud Function
      try {
        await startSubmissionJob({ jobId, clientId: data.clientId, packageId: data.packageId, tier: data.tier })
      } catch (fnErr) {
        // Function may not be deployed yet — job is still queued in Firestore
        await updateJob(jobId, { status: 'pending', logs: [{ type: 'warn', message: 'Cloud Function not yet deployed — job queued. Deploy functions to begin automation.', timestamp: new Date().toISOString() }] })
      }

      toast.success('Job created!')
      setShowNew(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setStarting(false)
    }
  }

  const handlePause = async (jobId) => {
    try {
      await updateJob(jobId, { status: 'paused' })
      await pauseSubmissionJob({ jobId }).catch(() => {})
      toast.success('Job paused')
    } catch (err) { toast.error(err.message) }
  }

  const handleResume = async (jobId) => {
    try {
      await updateJob(jobId, { status: 'running' })
      await resumeSubmissionJob({ jobId }).catch(() => {})
      toast.success('Job resumed')
    } catch (err) { toast.error(err.message) }
  }

  if (loading) return <PageLoader />

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Submission Jobs"
        subtitle="Start, monitor, and manage citation submission campaigns"
        action={<Button onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> New Job</Button>}
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description="Start a submission job to begin building citations for your clients."
          action={<Button onClick={() => setShowNew(true)}><Play className="w-4 h-4" /> Start First Job</Button>}
        />
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} onPause={handlePause} onResume={handleResume} />
          ))}
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Submission Job" size="md">
        <NewJobForm clients={clients} packages={packages} onSubmit={handleStart} loading={starting} />
      </Modal>
    </div>
  )
}
