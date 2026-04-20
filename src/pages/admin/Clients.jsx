import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Building2, MapPin, Phone, ExternalLink, Trash2, Pencil } from 'lucide-react'
import { getClients, createClient, deleteClient } from '@/services/firestore'
import { uploadLogo } from '@/services/storage'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import ClientForm from '@/components/clients/ClientForm'
import PageHeader from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { formatPhone } from '@/utils/helpers'
import toast from 'react-hot-toast'

export default function Clients() {
  const [clients, setClients]     = useState([])
  const [filtered, setFiltered]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showAdd, setShowAdd]     = useState(false)
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
      setShowAdd(false)
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
          <Button onClick={() => setShowAdd(true)}>
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
          action={!search && <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Client</Button>}
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

      {/* Add Client Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Client" size="lg">
        <ClientForm onSubmit={handleCreate} loading={saving} />
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
