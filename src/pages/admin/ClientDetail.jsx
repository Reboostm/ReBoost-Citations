import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Phone, Globe, Mail, Clock, Pencil,
  Facebook, Instagram, Twitter, Linkedin, Star, Play, Music,
  CheckCircle, XCircle, AlertCircle, Send, BarChart2,
} from 'lucide-react'
import { getClient, updateClient, getCitationsForClient, getJobsForClient } from '@/services/firestore'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import ClientForm from '@/components/clients/ClientForm'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate, formatPhone, statusColor, timeAgo } from '@/utils/helpers'
import { uploadLogo } from '@/services/storage'
import toast from 'react-hot-toast'

const statusIcon = (status) => {
  const map = {
    live:      <CheckCircle className="w-4 h-4 text-green-500" />,
    failed:    <XCircle className="w-4 h-4 text-red-500" />,
    pending:   <AlertCircle className="w-4 h-4 text-yellow-500" />,
    submitted: <Send className="w-4 h-4 text-blue-500" />,
  }
  return map[status?.toLowerCase()] ?? <AlertCircle className="w-4 h-4 text-gray-400" />
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient]   = useState(null)
  const [citations, setCitations] = useState([])
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)

  const load = async () => {
    try {
      const [c, cit, j] = await Promise.all([
        getClient(id),
        getCitationsForClient(id).catch(() => []),
        getJobsForClient(id).catch(() => []),
      ])
      if (!c) { navigate('/admin/clients'); return }
      setClient(c)
      setCitations(cit)
      setJobs(j)
    } catch (err) {
      console.error('Error loading client:', err)
      toast.error('Error loading client data')
      navigate('/admin/clients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleEdit = async (data, logoFile) => {
    setSaving(true)
    try {
      if (logoFile) {
        const url = await uploadLogo(id, logoFile)
        data.logoUrl = url
      }
      await updateClient(id, data)
      toast.success('Client updated!')
      setEditing(false)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  const liveCitations   = citations.filter(c => c.status === 'live').length
  const failedCitations = citations.filter(c => c.status === 'failed').length

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Back */}
      <Link to="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-8">
        <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center overflow-hidden flex-shrink-0 border border-brand-100">
          {client.logoUrl
            ? <img src={client.logoUrl} alt="" className="w-full h-full object-cover" />
            : <span className="text-brand-700 font-bold text-3xl">{client.businessName?.[0]}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{client.businessName}</h1>
            <Badge color="blue">{client.category}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{client.address}, {client.city}, {client.state} {client.zip}</span>
            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{formatPhone(client.phone)}</span>
            {client.website && <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-brand-600"><Globe className="w-3.5 h-3.5" />{client.website.replace(/^https?:\/\//, '')}</a>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          <Link to={`/admin/jobs?clientId=${id}`}>
            <Button size="sm"><Send className="w-4 h-4" /> New Job</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Citations',  value: citations.length,    color: 'text-gray-900' },
          { label: 'Live',             value: liveCitations,       color: 'text-green-600' },
          { label: 'Failed',           value: failedCitations,     color: 'text-red-600' },
          { label: 'Jobs Run',         value: jobs.length,         color: 'text-gray-900' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Info */}
        <Card>
          <CardTitle className="mb-4">Business Info</CardTitle>
          <dl className="space-y-3 text-sm">
            {[
              { label: 'Account Email', value: client.accountEmail },
              { label: 'Public Email',  value: client.publicEmail  },
              { label: 'Hours',         value: client.hours        },
              { label: 'Short Desc',    value: client.shortDesc    },
            ].filter(i => i.value).map(i => (
              <div key={i.label}>
                <dt className="text-xs text-gray-400 font-medium mb-0.5">{i.label}</dt>
                <dd className="text-gray-700">{i.value}</dd>
              </div>
            ))}
            {client.socials && Object.entries(client.socials).some(([,v]) => v) && (
              <div>
                <dt className="text-xs text-gray-400 font-medium mb-1.5">Social Media & Video</dt>
                <dd className="flex flex-wrap gap-2">
                  {client.socials.facebook  && <a href={client.socials.facebook}  target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Facebook</a>}
                  {client.socials.instagram && <a href={client.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline text-xs">Instagram</a>}
                  {client.socials.twitter   && <a href={client.socials.twitter}   target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline text-xs">X</a>}
                  {client.socials.linkedin  && <a href={client.socials.linkedin}  target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline text-xs">LinkedIn</a>}
                  {client.socials.youtube   && <a href={client.socials.youtube}   target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline text-xs">YouTube</a>}
                  {client.socials.tiktok    && <a href={client.socials.tiktok}    target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline text-xs">TikTok</a>}
                  {client.socials.yelp      && <a href={client.socials.yelp}      target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline text-xs">Yelp</a>}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Recent Citations */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <CardTitle>Citations ({citations.length})</CardTitle>
              <Link to={`/admin/reports?clientId=${id}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                <BarChart2 className="w-4 h-4" /> View Report
              </Link>
            </div>
            <div className="overflow-x-auto">
              {citations.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No citations yet — start a submission job.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-5 py-3 text-xs font-medium text-gray-500">Directory</th>
                      <th className="px-5 py-3 text-xs font-medium text-gray-500">Date</th>
                      <th className="px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="px-5 py-3 text-xs font-medium text-gray-500">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {citations.slice(0, 20).map(cit => (
                      <tr key={cit.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900 truncate max-w-[200px]">{cit.directoryName ?? '—'}</td>
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(cit.dateSubmitted)}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(cit.status)}`}>
                            {statusIcon(cit.status)} {cit.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {cit.liveUrl
                            ? <a href={cit.liveUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-xs">View</a>
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
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Client" size="lg">
        <ClientForm client={client} onSubmit={handleEdit} loading={saving} />
      </Modal>
    </div>
  )
}
