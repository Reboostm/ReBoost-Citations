import { useEffect, useState } from 'react'
import { Plus, Search, Globe, ExternalLink, Pencil, Trash2, Filter, Upload, Trash } from 'lucide-react'
import { getDirectories, createDirectory, updateDirectory, deleteDirectory, deleteDirectories } from '@/services/firestore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import DirectoryImporter from '@/components/DirectoryImporter'
import PageHeader from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { tierColor } from '@/utils/helpers'
import toast from 'react-hot-toast'

const schema = z.object({
  name:              z.string().min(2, 'Required'),
  url:               z.string().url('Must be a valid URL'),
  submissionUrl:     z.string().url('Must be a valid URL').or(z.literal('')),
  category:          z.string().min(1, 'Required'),
  da:                z.coerce.number().min(0).max(100),
  type:              z.enum(['web_form', 'api', 'manual']),
  tier:              z.enum(['high', 'medium', 'low']),
  useCustomerEmail:  z.boolean().optional(),
})

function DirectoryForm({ directory, onSubmit, loading }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name:              directory?.name              ?? '',
      url:               directory?.url               ?? '',
      submissionUrl:     directory?.submissionUrl     ?? '',
      category:          directory?.category          ?? 'General Business',
      da:                directory?.da                ?? 30,
      type:              directory?.type              ?? 'web_form',
      tier:              directory?.tier              ?? 'medium',
      useCustomerEmail:  directory?.useCustomerEmail  ?? false,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><Input label="Directory Name *" error={errors.name?.message} {...register('name')} /></div>
        <div className="sm:col-span-2"><Input label="Directory URL *" placeholder="https://..." error={errors.url?.message} {...register('url')} /></div>
        <div className="sm:col-span-2"><Input label="Submission URL" placeholder="https://..." hint="Direct link to the listing submission form" error={errors.submissionUrl?.message} {...register('submissionUrl')} /></div>
        <Select label="Category *" placeholder="Select..." options={DIRECTORY_CATEGORIES.map(c=>({value:c,label:c}))} error={errors.category?.message} {...register('category')} />
        <Input label="Domain Authority (DA)" type="number" min={0} max={100} error={errors.da?.message} {...register('da')} />
        <Select label="Submission Type *" options={[{value:'web_form',label:'Web Form'},{value:'api',label:'API'},{value:'manual',label:'Manual'}]} error={errors.type?.message} {...register('type')} />
        <Select label="Authority Tier *" options={[{value:'high',label:'High (DA 50+)'},{value:'medium',label:'Medium (DA 20–49)'},{value:'low',label:'Low (DA <20)'}]} error={errors.tier?.message} {...register('tier')} />
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('useCustomerEmail')}
              className="rounded border-gray-300 text-brand-600"
            />
            <span className="text-sm text-gray-700">Use customer's real email (for high-value sites like Yelp, BBB, Angi)</span>
          </label>
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>{directory ? 'Save Changes' : 'Add Directory'}</Button>
      </div>
    </form>
  )
}

const DIRECTORY_CATEGORIES = [
  'General Business','Legal & Law','Medical & Health','Dental','Home Services',
  'Plumbing','HVAC','Electrical','Roofing','Landscaping','Cleaning Services',
  'Restaurant & Food','Automotive','Real Estate','Financial Services','Insurance',
  'Education','Beauty & Salon','Fitness & Gym','Pet Services','Retail',
  'Technology','Marketing','Construction','Photography','Event Planning',
  'Travel & Tourism','Non-Profit','Other',
]

const TIER_COLORS = { high: 'green', medium: 'yellow', low: 'gray' }

export default function Directories() {
  const [dirs, setDirs]         = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterTier, setFilterTier] = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDeleteCount, setBulkDeleteCount] = useState(0)

  const load = async () => {
    const data = await getDirectories()
    setDirs(data)
    setFiltered(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let result = dirs
    const q = search.toLowerCase()
    if (q) result = result.filter(d => d.name?.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q))
    if (filterTier) result = result.filter(d => d.tier === filterTier)
    if (filterCat)  result = result.filter(d => d.category === filterCat)
    setFiltered(result)
  }, [search, filterTier, filterCat, dirs])

  const handleAdd = async (data) => {
    setSaving(true)
    try {
      await createDirectory(data)
      toast.success('Directory added!')
      setShowAdd(false)
      load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleEdit = async (data) => {
    setSaving(true)
    try {
      await updateDirectory(editing.id, data)
      toast.success('Directory updated!')
      setEditing(null)
      load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteDirectory(deleteTarget.id)
      toast.success('Directory deleted')
      setDeleteTarget(null)
      load()
    } catch (err) { toast.error(err.message) }
    finally { setDeleting(false) }
  }

  const handleToggleSelect = (id) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)))
    }
  }

  const handleBulkDelete = async () => {
    setDeleting(true)
    try {
      await deleteDirectories(Array.from(selectedIds))
      toast.success(`Deleted ${selectedIds.size} directories`)
      setSelectedIds(new Set())
      load()
    } catch (err) { toast.error(err.message) }
    finally { setDeleting(false) }
  }

  if (loading) return <PageLoader />

  const categories = [...new Set(dirs.map(d => d.category))].sort()

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Directory Database"
        subtitle={`${filtered.length.toLocaleString()} of ${dirs.length.toLocaleString()} directories`}
        action={
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={() => setBulkDeleteCount(selectedIds.size)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Trash className="w-4 h-4" /> Delete {selectedIds.size} Selected
              </button>
            )}
            <Button variant="secondary" onClick={() => setShowImport(true)}><Upload className="w-4 h-4" /> Import CSV</Button>
            <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Directory</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search directories…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={filterTier} onChange={e => setFilterTier(e.target.value)} className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Tiers</option>
          <option value="high">High Authority</option>
          <option value="medium">Medium Authority</option>
          <option value="low">Low Authority</option>
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[200px]">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={Globe} title="No directories found" description="Try adjusting your filters or add new directories." />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-brand-600 cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Directory</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">DA</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Tier</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.slice(0, 100).map(dir => (
                  <tr key={dir.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(dir.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(dir.id)}
                        onChange={() => handleToggleSelect(dir.id)}
                        className="rounded border-gray-300 text-brand-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">{dir.name}</p>
                          <a href={dir.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline truncate block max-w-[200px]">{dir.url}</a>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{dir.category}</td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-gray-900">{dir.da}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge color={TIER_COLORS[dir.tier] ?? 'gray'}>{dir.tier}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge color={dir.useCustomerEmail ? 'blue' : 'gray'}>
                        {dir.useCustomerEmail ? 'Real Email' : 'Dummy Email'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500 capitalize">{dir.type?.replace('_', ' ')}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(dir)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(dir)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <p className="px-5 py-3 text-sm text-gray-400 text-center border-t border-gray-100">
                Showing 100 of {filtered.length.toLocaleString()} — use search/filters to narrow results
              </p>
            )}
          </div>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Directory" size="md">
        <DirectoryForm onSubmit={handleAdd} loading={saving} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Directory" size="md">
        {editing && <DirectoryForm directory={editing} onSubmit={handleEdit} loading={saving} />}
      </Modal>
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import Directories from CSV" size="lg">
        <DirectoryImporter onComplete={() => { setShowImport(false); load() }} />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Directory"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
      />
      <ConfirmDialog
        open={bulkDeleteCount > 0}
        onClose={() => setBulkDeleteCount(0)}
        onConfirm={handleBulkDelete}
        loading={deleting}
        title="Delete Directories"
        message={`Delete ${bulkDeleteCount} selected directories? This cannot be undone.`}
      />
    </div>
  )
}
