import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, Loader, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getClient, updateClient, getPackages, createJob } from '@/services/firestore'
import { uploadLogo } from '@/services/storage'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/services/firebase'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { BUSINESS_CATEGORIES, US_STATES } from '@/utils/constants'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

const onboardingSchema = z.object({
  businessName:   z.string().min(2, 'Business name is required'),
  address:        z.string().min(3, 'Address is required'),
  city:           z.string().min(2, 'City is required'),
  state:          z.string().min(2, 'State is required'),
  zip:            z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  phone:          z.string().min(10, 'Valid phone number required'),
  website:        z.string().url('Must be a valid URL').or(z.literal('')),
  category:       z.string().min(1, 'Category is required'),
  accountEmail:   z.string().email('Invalid email'),
  publicEmail:    z.string().email('Invalid email').or(z.literal('')),
  shortDesc:      z.string().max(160, 'Max 160 characters').optional(),
  longDesc:       z.string().optional(),
  facebook:       z.string().url().or(z.literal('')).optional(),
  instagram:      z.string().url().or(z.literal('')).optional(),
  twitter:        z.string().url().or(z.literal('')).optional(),
  linkedin:       z.string().url().or(z.literal('')).optional(),
  youtube:        z.string().url().or(z.literal('')).optional(),
  tiktok:         z.string().url().or(z.literal('')).optional(),
})

export default function Onboarding() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [step, setStep] = useState(1)
  const [completed, setCompleted] = useState(false)
  const [packages, setPackages] = useState([])

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessName:  '',
      address:       '',
      city:          '',
      state:         '',
      zip:           '',
      phone:         '',
      website:       '',
      category:      '',
      accountEmail:  userProfile?.email || '',
      publicEmail:   '',
      shortDesc:     '',
      longDesc:      '',
      facebook:      '',
      instagram:     '',
      twitter:       '',
      linkedin:      '',
      youtube:       '',
      tiktok:        '',
    },
  })

  useEffect(() => {
    const loadClient = async () => {
      try {
        if (!userProfile?.clientId) {
          setLoading(false)
          return
        }

        const c = await getClient(userProfile.clientId)
        setClient(c)

        // If they already have businessProfile, they shouldn't be here
        if (c?.businessProfile) {
          navigate('/dashboard')
          return
        }

        // Pre-fill form if they have some data
        if (c) {
          reset({
            businessName:  c.businessName  || '',
            address:       c.address       || '',
            city:          c.city          || '',
            state:         c.state         || '',
            zip:           c.zip           || '',
            phone:         c.phone         || '',
            website:       c.website       || '',
            category:      c.category      || '',
            accountEmail:  c.accountEmail  || userProfile?.email || '',
            publicEmail:   c.publicEmail   || '',
            shortDesc:     c.shortDesc     || '',
            longDesc:      c.longDesc      || '',
            facebook:      c.socials?.facebook  || '',
            instagram:     c.socials?.instagram || '',
            twitter:       c.socials?.twitter   || '',
            linkedin:      c.socials?.linkedin  || '',
            youtube:       c.socials?.youtube   || '',
            tiktok:        c.socials?.tiktok    || '',
          })
          if (c.logoUrl) setLogoPreview(c.logoUrl)
        }

        // Load packages for display
        const pkgs = await getPackages()
        setPackages(pkgs)
      } catch (err) {
        console.error('Error loading client:', err)
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadClient()
  }, [userProfile, navigate, reset])

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

  const onSubmit = async (data) => {
    if (!userProfile?.clientId) {
      toast.error('Client ID not found')
      return
    }

    setSubmitting(true)
    try {
      let logoUrl = logoPreview

      // Upload logo if new file selected
      if (logoFile && userProfile.clientId) {
        setUploadingLogo(true)
        try {
          logoUrl = await uploadLogo(userProfile.clientId, logoFile)
        } catch (err) {
          toast.error('Logo upload failed, but continuing...')
        } finally {
          setUploadingLogo(false)
        }
      }

      // Prepare update payload
      const payload = {
        ...data,
        logoUrl,
        businessProfile: true, // Mark as completed
        socials: {
          facebook:  data.facebook  || null,
          instagram: data.instagram || null,
          twitter:   data.twitter   || null,
          linkedin:  data.linkedin  || null,
          youtube:   data.youtube   || null,
          tiktok:    data.tiktok    || null,
        },
      }

      // Remove flat social fields
      delete payload.facebook
      delete payload.instagram
      delete payload.twitter
      delete payload.linkedin
      delete payload.youtube
      delete payload.tiktok

      // Update client profile
      await updateClient(userProfile.clientId, payload)

      // Auto-deploy if they have a package from GHL
      if (client?.packageId) {
        try {
          // Create a job with default distribution: 30% high, 40% medium, 30% low
          const pkg = packages.find(p => p.id === client.packageId)
          if (pkg) {
            const total = pkg.citationCount
            const highCount = Math.ceil(total * 0.3)
            const mediumCount = Math.ceil(total * 0.4)
            const lowCount = Math.floor(total * 0.3)

            // Create job record
            const jobData = {
              clientId: userProfile.clientId,
              packageId: client.packageId,
              status: 'pending',
              progress: 0,
              total: total,
              highCount,
              mediumCount,
              lowCount,
              submittedDirIds: [],
              createdAt: new Date(),
            }

            const jobId = await createJob(jobData)

            // Trigger the Cloud Function to start submission
            const startSubmissionJob = httpsCallable(functions, 'startSubmissionJob')
            await startSubmissionJob({
              jobId,
              clientId: userProfile.clientId,
              packageId: client.packageId,
              highCount,
              mediumCount,
              lowCount,
              submittedDirIds: [],
            })

            toast.success('Deployment started automatically!')
          }
        } catch (err) {
          console.error('Error auto-deploying:', err)
          toast.error('Auto-deployment will be handled by admin')
        }
      }

      toast.success('Profile saved!')
      setCompleted(true)

      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err) {
      console.error('Error saving profile:', err)
      toast.error(err.message || 'Failed to save profile')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Complete!</h1>
          <p className="text-gray-600 mb-6">
            Your business profile is all set. Redirecting to your dashboard...
          </p>
          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-brand-50 to-brand-100">
      {/* Left side - Progress indicator */}
      <div className="hidden lg:flex lg:w-80 flex-col justify-between bg-white border-r border-gray-200 p-8">
        <div>
          <div className="w-12 h-12 bg-brand-600 rounded-lg flex items-center justify-center mb-6">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
          <p className="text-gray-600 text-sm mb-8">
            Let's set up your business profile so we can start building your citations.
          </p>

          {/* Steps */}
          <div className="space-y-4">
            {[
              { num: 1, title: 'Business Info', desc: 'Name, address, contact' },
              { num: 2, title: 'Details & Social', desc: 'Descriptions and profiles' },
            ].map(s => (
              <div
                key={s.num}
                className={cn(
                  'flex gap-3 cursor-pointer transition-all',
                  step >= s.num ? 'opacity-100' : 'opacity-50'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0',
                    step >= s.num
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  )}
                >
                  {s.num}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{s.title}</p>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-blue-900">
            <strong>Tip:</strong> Accurate information helps us submit to the right sites and get you approved faster.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {step === 1 ? (
              <>
                {/* Logo Upload */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-3">Business Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-white">
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
                <div className="space-y-4">
                  <div>
                    <Input label="Business Name *" error={errors.businessName?.message} {...register('businessName')} />
                  </div>

                  <div>
                    <Input label="Address *" placeholder="123 Main St" error={errors.address?.message} {...register('address')} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input label="City *" error={errors.city?.message} {...register('city')} />
                    <Select
                      label="State *"
                      placeholder="Select state"
                      error={errors.state?.message}
                      {...register('state')}
                    >
                      {US_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input label="ZIP Code *" error={errors.zip?.message} {...register('zip')} />
                    <Input label="Phone *" error={errors.phone?.message} {...register('phone')} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Website" type="url" placeholder="https://..." error={errors.website?.message} {...register('website')} />
                    <Select
                      label="Category *"
                      placeholder="Select category"
                      error={errors.category?.message}
                      {...register('category')}
                    >
                      {BUSINESS_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Select>
                  </div>

                  <Input
                    label="Account Email *"
                    type="email"
                    disabled
                    error={errors.accountEmail?.message}
                    {...register('accountEmail')}
                  />

                  <Input
                    label="Public Email (optional)"
                    type="email"
                    hint="Used for high-value citation sites. Defaults to account email."
                    error={errors.publicEmail?.message}
                    {...register('publicEmail')}
                  />
                </div>

                {/* Next Button */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6"
                  >
                    Continue
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Step 2: Details & Social */}
                <div className="space-y-4">
                  <div>
                    <Textarea
                      label="Short Description (160 chars)"
                      placeholder="Brief description for listings"
                      error={errors.shortDesc?.message}
                      {...register('shortDesc')}
                    />
                  </div>

                  <div>
                    <Textarea
                      label="Long Description"
                      placeholder="Detailed description of your business"
                      rows={4}
                      error={errors.longDesc?.message}
                      {...register('longDesc')}
                    />
                  </div>

                  {/* Social Media */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Social Media & Reviews</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'facebook', label: 'Facebook' },
                        { key: 'instagram', label: 'Instagram' },
                        { key: 'twitter', label: 'Twitter / X' },
                        { key: 'linkedin', label: 'LinkedIn' },
                        { key: 'youtube', label: 'YouTube' },
                        { key: 'tiktok', label: 'TikTok' },
                      ].map(s => (
                        <Input
                          key={s.key}
                          label={s.label}
                          type="url"
                          placeholder={`https://...`}
                          error={errors[s.key]?.message}
                          {...register(s.key)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    loading={submitting || uploadingLogo}
                  >
                    {submitting ? 'Saving...' : 'Complete Setup'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
