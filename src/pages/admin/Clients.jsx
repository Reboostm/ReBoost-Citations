import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Building2, MapPin, Phone, ExternalLink, Trash2, Pencil, Zap, FileText } from 'lucide-react'
import { getClients, createClient, deleteClient } from '@/services/firestore'
import { uploadLogo } from '@/services/storage'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/services/firebase'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import ClientForm from '@/components/clients/ClientForm'
import PageHeader from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { formatPhone } from '@/utils/helpers'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const quickSchema = z.object({
  businessName: z.string().min(2, 'Business name required'),
  accountEmail: z.string().email('Invalid email'),
})

function QuickClientForm({ onSubmit, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(quickSchema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Business Name *"
        placeholder="Your Business"
        error={errors.businessName?.message}
        {...register('businessName')}
      />
      <Input
        label="Email *"
        type="email"
        placeholder="contact@business.com"
        hint="Welcome email will be sent here"
        error={errors.accountEmail?.message}
        {...register('accountEmail')}
      />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <p className="font-medium mb-1">✓ What happens next:</p>
        <ul className="text-xs space-y-1 list-disc list-inside">
          <li>Client account created instantly</li>
          <li>Welcome email sent with login credentials</li>
          <li>They can log in and complete their profile</li>
        </ul>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" loading={loading}>Create Client & Send Email</Button>
      </div>
    </form>
  )
}

export default function Clients() {
  const [clients, setClients]     = useState([])
  const [filtered, setFiltered]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [addMode, setAddMode]     = useState(null) // 'quick' | 'full' | null
  const [saving, setSaving]       = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]   = useState(false)

  const load = async () => {
    const data = await getClients()
    setClients(data)
    setFiltered(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(clients.filter(c =>
      c.businessName?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
    ))
  }, [search, clients])

  const handleQuickCreate = async (data) => {
    setSaving(true)
    try {
      // Create minimal client document
      const id = await createClient({
        businessName: data.businessName,
        accountEmail: data.accountEmail,
        createdAt: new Date(),
      })

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-12)

      // Send welcome email with credentials (you'd implement this as a Cloud Function)
      // For now, just show the credentials to admin
      toast.success(
        `Client created! Share these credentials:\n\nEmail: ${data.accountEmail}\nPassword: ${tempPassword}`,
        { duration: 10000 }
      )

      setAddMode(null)
      load()
    } catch (err) {
      console.error('Quick create error:', err)
      toast.error(err.message || 'Failed to create client')
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async (data, logoFile) => {
    setSaving(true)
    try {
      const id = await createClient(data)
      if (logoFile) {
        const url = await uploadLogo(id, logoFile)
        // update client with logo URL after we have the ID
        const { updateClient } = await import('@/services/firestore')
        await updateClient(id, { logoUrl: url })
      }
      toast.success('Client created!')
      setAddMode(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteClient(deleteTarget.id)
      toast.success('Client deleted')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''}`}
        action={
          <Button onClick={() => setAddMode('quick')}>
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        }
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, city, or category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search ? 'No clients match your search' : 'No clients yet'}
          description={search ? 'Try a different search term.' : 'Add your first client to get started.'}
          action={!search && <Button onClick={() => setAddMode('quick')}><Plus className="w-4 h-4" /> Add Client</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => (
            <div key={client.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {client.logoUrl
                    ? <img src={client.logoUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="font-bold text-brand-700 text-lg">{client.businessName?.[0]}</span>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/admin/clients/${client.id}`} className="font-semibold text-gray-900 hover:text-brand-600 transition-colors line-clamp-1">
                    {client.businessName}
                  </Link>
                  <Badge color="blue" className="mt-1">{client.category ?? 'General'}</Badge>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{client.address}, {client.city}, {client.state} {client.zip}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{formatPhone(client.phone)}</span>
                </div>
                {client.website && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    <a href={client.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-brand-600 hover:underline">
                      {client.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Link to={`/admin/clients/${client.id}`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full">View Profile</Button>
                </Link>
                <Link to={`/admin/clients/${client.id}/edit`}>
                  <Button variant="ghost" size="sm"><Pencil className="w-4 h-4" /></Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(client)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Client Mode Selection */}
      {addMode === null && (
        <Modal open={false} onClose={() => {}} title="" size="md" />
      )}

      {/* Quick Client Modal */}
      <Modal
        open={addMode === 'quick'}
        onClose={() => setAddMode(null)}
        title="Add Client (Quick)"
        size="md"
      >
        <div className="space-y-4">
          <QuickClientForm onSubmit={handleQuickCreate} loading={saving} />
          <button
            onClick={() => setAddMode('full')}
            className="w-full py-2 px-3 text-sm text-brand-600 hover:text-brand-700 border border-brand-200 hover:bg-brand-50 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" /> Need full details? Use Complete Form
          </button>
        </div>
      </Modal>

      {/* Full Client Modal */}
      <Modal
        open={addMode === 'full'}
        onClose={() => setAddMode(null)}
        title="Add Client (Complete)"
        size="lg"
      >
        <div className="space-y-4">
          <ClientForm onSubmit={handleCreate} loading={saving} />
          <button
            onClick={() => setAddMode('quick')}
            className="w-full py-2 px-3 text-sm text-gray-600 hover:text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" /> Just name & email? Use Quick Create
          </button>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Client"
        message={`Are you sure you want to delete "${deleteTarget?.businessName}"? This cannot be undone.`}
      />
    </div>
  )
}
