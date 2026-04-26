import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Package, Check, ArrowUp } from 'lucide-react'
import Select from '@/components/ui/Select'
import { getPackages, createPackage, updatePackage, deletePackage } from '@/services/firestore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { formatCurrency } from '@/utils/helpers'
import toast from 'react-hot-toast'

const schema = z.object({
  name:                  z.string().min(2, 'Required'),
  citationCount:         z.coerce.number().min(1, 'Must be at least 1'),
  price:                 z.coerce.number().min(0, 'Must be 0 or more'),
  description:           z.string().optional(),
  features:              z.string().optional(),
  highlighted:           z.boolean().optional(),
  stripeProductId:       z.string().optional(),
  upgradeFromPackageId:  z.string().optional(),
  upgradePrice:          z.coerce.number().min(0, 'Must be 0 or more').optional(),
  packageType:           z.enum(['citation', 'tool']).default('citation'),
  // Allow empty string (form default) OR a valid URL
  toolLink:              z.union([z.literal(''), z.string().url('Must be a valid URL')]).optional(),
  toolCtaText:           z.string().max(20, 'Keep it short').optional(),
})

function PackageForm({ pkg, packages = [], onSubmit, loading }) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name:                  pkg?.name                  ?? '',
      citationCount:         pkg?.citationCount         ?? 50,
      price:                 pkg?.price                 ?? 0,
      description:           pkg?.description           ?? '',
      features:              pkg?.features?.join('\n') ?? '',
      highlighted:           pkg?.highlighted           ?? false,
      stripeProductId:       pkg?.stripeProductId       ?? '',
      upgradeFromPackageId:  pkg?.upgradeFromPackageId  ?? '',
      upgradePrice:          pkg?.upgradePrice          ?? 0,
      packageType:           pkg?.packageType           ?? 'citation',
      toolLink:              pkg?.toolLink              ?? '',
      toolCtaText:           pkg?.toolCtaText           ?? 'Learn More',
    },
  })

  const packageType = watch('packageType')

  const submit = (data) => {
    const payload = {
      ...data,
      features: data.features ? data.features.split('\n').map(f => f.trim()).filter(Boolean) : [],
    }
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Package Name *" placeholder="e.g. Growth" error={errors.name?.message} {...register('name')} />
        <Select
          label="Type *"
          options={[
            { value: 'citation', label: '📦 Citation Package' },
            { value: 'tool', label: '🛠️ Cross-Sell Tool' },
          ]}
          error={errors.packageType?.message}
          {...register('packageType')}
        />
      </div>

      {packageType === 'citation' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Citation Count *" type="number" min={1} error={errors.citationCount?.message} {...register('citationCount')} />
          <Input label="Price (USD) *" type="number" min={0} step="0.01" placeholder="299.00" error={errors.price?.message} {...register('price')} />
        </div>
      )}

      {packageType === 'tool' && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-900">Tool Configuration</h4>
          <Input label="Product Link" type="url" placeholder="https://..." error={errors.toolLink?.message} {...register('toolLink')} />
          <Input label="CTA Button Text" placeholder="Learn More, Get It Now, etc" error={errors.toolCtaText?.message} {...register('toolCtaText')} />
        </div>
      )}
      <Textarea label="Description" placeholder="Brief description of what's included" {...register('description')} />

      {packageType === 'citation' && (
        <Textarea
          label="Features (one per line)"
          rows={5}
          placeholder={"50 high-authority citations\nManual review of all submissions\nMonthly progress report\nDuplicate checking"}
          hint="Each line becomes a feature bullet"
          {...register('features')}
        />
      )}

      {/* Stripe Configuration */}
      {packageType === 'citation' && (
        <>
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              💳 Stripe Integration (for checkout)
            </h4>
            <Input
              label="Stripe Product ID"
              placeholder="price_1234567890"
              hint="Get from Stripe dashboard or use any ID for testing (e.g., price_test_123)"
              error={errors.stripeProductId?.message}
              {...register('stripeProductId')}
            />
          </div>

          {/* Upgrade Configuration */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ArrowUp className="w-4 h-4" /> Upgrade Path (Optional)
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              Let customers upgrade from a lower package to this one. Leave blank if this is the lowest tier.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Upgrades From Package"
                placeholder="Select a package"
                options={[
                  { value: '', label: 'None (lowest tier)' },
                  ...packages.filter(p => p.id !== pkg?.id).map(p => ({ value: p.id, label: p.name })),
                ]}
                error={errors.upgradeFromPackageId?.message}
                {...register('upgradeFromPackageId')}
              />
              <Input
                label="Upgrade Price (Additional Cost)"
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                hint="How much extra to upgrade to this package"
                error={errors.upgradePrice?.message}
                {...register('upgradePrice')}
              />
            </div>
          </div>
        </>
      )}

      {packageType === 'citation' && (
        <div className="flex items-center gap-2">
          <input type="checkbox" id="highlighted" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" {...register('highlighted')} />
          <label htmlFor="highlighted" className="text-sm text-gray-700">Mark as featured/recommended package</label>
        </div>
      )}
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>{pkg ? 'Save Changes' : 'Create Package'}</Button>
      </div>
    </form>
  )
}

const PACKAGE_COLORS = [
  'from-blue-500 to-blue-600',
  'from-brand-600 to-brand-700',
  'from-purple-500 to-purple-600',
  'from-green-500 to-green-600',
]

export default function Packages() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [editing, setEditing]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    const data = await getPackages()
    setPackages(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (data) => {
    setSaving(true)
    try {
      console.log('Creating package with data:', data)
      const result = await createPackage(data)
      console.log('Package created with ID:', result)
      toast.success('Package created!')
      setShowAdd(false)
      load()
    } catch (err) {
      console.error('Package creation error:', err)
      toast.error(err.message || 'Failed to create package')
    }
    finally { setSaving(false) }
  }

  const handleEdit = async (data) => {
    setSaving(true)
    try {
      console.log('Updating package:', editing.id, data)
      await updatePackage(editing.id, data)
      toast.success('Package updated!')
      setEditing(null)
      load()
    } catch (err) {
      console.error('Package update error:', err)
      toast.error(err.message || 'Failed to update package')
    }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      console.log('Deleting package:', deleteTarget.id)
      await deletePackage(deleteTarget.id)
      toast.success('Package deleted')
      setDeleteTarget(null)
      load()
    } catch (err) {
      console.error('Package delete error:', err)
      toast.error(err.message || 'Failed to delete package')
    }
    finally { setDeleting(false) }
  }

  if (loading) return <PageLoader />

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Citation Packages"
        subtitle="Create and manage citation tiers for your clients"
        action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> New Package</Button>}
      />

      {packages.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No packages yet"
          description="Create your first citation package to offer clients."
          action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Create Package</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {packages.map((pkg, i) => (
            <div key={pkg.id} className={`relative rounded-2xl overflow-hidden shadow-sm border ${pkg.highlighted ? 'border-brand-300 shadow-brand-100 shadow-lg' : 'border-gray-200'}`}>
              {pkg.highlighted && pkg.packageType === 'citation' && (
                <div className="absolute top-0 inset-x-0 bg-amber-400 text-amber-900 text-xs font-bold text-center py-1 tracking-wide">
                  MOST POPULAR
                </div>
              )}
              <div className={`bg-gradient-to-br ${PACKAGE_COLORS[i % PACKAGE_COLORS.length]} p-6 ${pkg.highlighted ? 'pt-8' : ''}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium">{pkg.name}</p>
                    <div className="mt-2 flex items-end gap-1">
                      <span className="text-4xl font-bold text-white">{formatCurrency(pkg.price)}</span>
                    </div>
                  </div>
                  <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">
                    {pkg.packageType === 'citation' ? '📦' : '🛠️'}
                  </span>
                </div>
                {pkg.packageType === 'citation' && (
                  <p className="text-white/70 text-sm mt-1">{pkg.citationCount.toLocaleString()} citations</p>
                )}
              </div>
              <div className="bg-white p-5">
                {pkg.description && <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>}
                {pkg.features?.length > 0 && (
                  <ul className="space-y-2 mb-5">
                    {pkg.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditing(pkg)}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(pkg)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Package" size="md">
        <PackageForm packages={packages} onSubmit={handleAdd} loading={saving} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Package" size="md">
        {editing && <PackageForm pkg={editing} packages={packages} onSubmit={handleEdit} loading={saving} />}
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Package"
        message={`Delete the "${deleteTarget?.name}" package? This cannot be undone.`}
      />
    </div>
  )
}
