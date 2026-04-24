import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, Facebook, Instagram, Twitter, Linkedin, Globe, Play, Music } from 'lucide-react'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { BUSINESS_CATEGORIES, US_STATES } from '@/utils/constants'
import { uploadLogo } from '@/services/storage'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

const schema = z.object({
  businessName:   z.string().min(2, 'Required'),
  address:        z.string().min(3, 'Required'),
  city:           z.string().min(2, 'Required'),
  state:          z.string().min(2, 'Required'),
  zip:            z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP'),
  phone:          z.string().min(10, 'Required'),
  website:        z.string().url('Must be a valid URL').or(z.literal('')),
  category:       z.string().min(1, 'Required'),
  accountEmail:   z.string().email('Invalid email'),
  publicEmail:    z.string().email('Invalid email').or(z.literal('')),
  hours:          z.string().optional(),
  shortDesc:      z.string().max(160, 'Max 160 characters').optional(),
  longDesc:       z.string().optional(),
  facebook:       z.string().url().or(z.literal('')).optional(),
  instagram:      z.string().url().or(z.literal('')).optional(),
  twitter:        z.string().url().or(z.literal('')).optional(),
  linkedin:       z.string().url().or(z.literal('')).optional(),
  yelp:           z.string().url().or(z.literal('')).optional(),
  youtube:        z.string().url().or(z.literal('')).optional(),
  tiktok:         z.string().url().or(z.literal('')).optional(),
})

export default function ClientForm({ client, onSubmit, loading }) {
  const [logoFile, setLogoFile]       = useState(null)
  const [logoPreview, setLogoPreview] = useState(client?.logoUrl ?? null)
  const [uploading, setUploading]     = useState(false)

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      businessName:  client?.businessName  ?? '',
      address:       client?.address       ?? '',
      city:          client?.city          ?? '',
      state:         client?.state         ?? '',
      zip:           client?.zip           ?? '',
      phone:         client?.phone         ?? '',
      website:       client?.website       ?? '',
      category:      client?.category      ?? '',
      accountEmail:  client?.accountEmail  ?? '',
      publicEmail:   client?.publicEmail   ?? '',
      hours:         client?.hours         ?? '',
      shortDesc:     client?.shortDesc     ?? '',
      longDesc:      client?.longDesc      ?? '',
      facebook:      client?.socials?.facebook  ?? '',
      instagram:     client?.socials?.instagram ?? '',
      twitter:       client?.socials?.twitter   ?? '',
      linkedin:      client?.socials?.linkedin  ?? '',
      yelp:          client?.socials?.yelp      ?? '',
      youtube:       client?.socials?.youtube   ?? '',
      tiktok:        client?.socials?.tiktok    ?? '',
    },
  })

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5MB')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleFormSubmit = async (data) => {
    let logoUrl = client?.logoUrl ?? null

    if (logoFile && client?.id) {
      setUploading(true)
      try {
        logoUrl = await uploadLogo(client.id, logoFile)
      } catch {
        toast.error('Logo upload failed')
      } finally {
        setUploading(false)
      }
    }

    const payload = {
      ...data,
      logoUrl,
      socials: {
        facebook:  data.facebook  || null,
        instagram: data.instagram || null,
        twitter:   data.twitter   || null,
        linkedin:  data.linkedin  || null,
        yelp:      data.yelp      || null,
        youtube:   data.youtube   || null,
        tiktok:    data.tiktok    || null,
      },
    }
    // remove flat social fields
    delete payload.facebook; delete payload.instagram
    delete payload.twitter;  delete payload.linkedin; delete payload.yelp
    delete payload.youtube;  delete payload.tiktok

    onSubmit(payload, logoFile)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Logo Upload */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Business Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
            {logoPreview
              ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              : <Upload className="w-6 h-6 text-gray-400" />
            }
          </div>
          <div>
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors">
                <Upload className="w-4 h-4" /> Choose file
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
          </div>
        </div>
      </div>

      {/* Business Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input label="Business Name *" error={errors.businessName?.message} {...register('businessName')} />
        </div>
        <div className="sm:col-span-2">
          <Input label="Address *" placeholder="123 Main St" error={errors.address?.message} {...register('address')} />
        </div>
        <Input label="City *" error={errors.city?.message} {...register('city')} />
        <Select
          label="State *"
          placeholder="Select state"
          options={US_STATES.map(s => ({ value: s, label: s }))}
          error={errors.state?.message}
          {...register('state')}
        />
        <Input label="ZIP Code *" placeholder="12345" error={errors.zip?.message} {...register('zip')} />
        <Input label="Phone *" placeholder="(555) 000-0000" error={errors.phone?.message} {...register('phone')} />
        <div className="sm:col-span-2">
          <Input label="Website" placeholder="https://example.com" error={errors.website?.message} {...register('website')} />
        </div>
        <div className="sm:col-span-2">
          <Select
            label="Business Category *"
            placeholder="Select a category"
            options={BUSINESS_CATEGORIES.map(c => ({ value: c, label: c }))}
            error={errors.category?.message}
            {...register('category')}
          />
        </div>
        <Input label="Hours" placeholder="Mon-Fri 9am-5pm" error={errors.hours?.message} {...register('hours')} />
      </div>

      {/* Email Fields */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-amber-900">Email Configuration</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Account / Registration Email *"
            type="email"
            placeholder="submissions@example.com"
            hint="Used when registering on citation directories (receives spam/verifications)"
            error={errors.accountEmail?.message}
            {...register('accountEmail')}
          />
          <Input
            label="Public Listing Email"
            type="email"
            placeholder="info@example.com"
            hint="Displayed publicly inside directory listings"
            error={errors.publicEmail?.message}
            {...register('publicEmail')}
          />
        </div>
      </div>

      {/* Descriptions */}
      <div className="space-y-4">
        <Textarea
          label="Short Description"
          rows={2}
          placeholder="Up to 160 characters shown in directory snippets"
          hint={`Used in brief directory descriptions (160 char max)`}
          error={errors.shortDesc?.message}
          {...register('shortDesc')}
        />
        <Textarea
          label="Long Description"
          rows={4}
          placeholder="Full business description for directory listings"
          {...register('longDesc')}
        />
      </div>

      {/* Social Media */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Social Media & Video Links</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/...' },
            { name: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
            { name: 'twitter',   label: 'X (Twitter)', placeholder: 'https://x.com/...' },
            { name: 'linkedin',  label: 'LinkedIn',  placeholder: 'https://linkedin.com/...' },
            { name: 'youtube',   label: 'YouTube',   placeholder: 'https://youtube.com/...' },
            { name: 'tiktok',    label: 'TikTok',    placeholder: 'https://tiktok.com/...' },
            { name: 'yelp',      label: 'Yelp',      placeholder: 'https://yelp.com/biz/...' },
          ].map(s => (
            <Input
              key={s.name}
              label={s.label}
              type="url"
              placeholder={s.placeholder}
              error={errors[s.name]?.message}
              {...register(s.name)}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading || uploading} size="lg">
          {client ? 'Save Changes' : 'Create Client'}
        </Button>
      </div>
    </form>
  )
}
