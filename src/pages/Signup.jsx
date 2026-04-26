import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, CheckCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/services/firebase'

// Validation schemas for each step
const step1Schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  passwordConfirm: z.string(),
}).refine(data => data.password === data.passwordConfirm, {
  message: 'Passwords do not match',
  path: ['passwordConfirm'],
})

const step2Schema = z.object({
  businessName: z.string().min(2, 'Business name required'),
  phone: z.string().min(1, 'Phone required').transform(p => p.replace(/\D/g, '')).refine(p => p.length >= 10, 'Phone must be at least 10 digits'),
  accountEmail: z.string().email('Invalid email address'),
  website: z.string().min(1, 'Website required').transform(url => {
    // Auto-add https:// if not present
    const trimmed = url.trim()
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`
    }
    return trimmed
  }).refine(url => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }, 'Invalid URL'),
  category: z.string().min(1, 'Category required'),
})

const step3Schema = z.object({
  address: z.string().min(5, 'Address required'),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
})

const CATEGORIES = [
  'General Business','Legal & Law','Medical & Health','Dental',
  // Home Services - Detailed
  'Plumbing','HVAC','Electrical','Roofing','Landscaping','General Contracting',
  'Pressure Washing','Window Cleaning','House Cleaning','Carpet Cleaning','Maid Service',
  'Handyman Services','Home Repair','Painting','Flooring','Kitchen & Bath Remodeling',
  // Food & Hospitality
  'Restaurant & Food','Bar & Lounge','Coffee Shop','Bakery','Catering',
  // Services
  'Automotive','Auto Repair','Car Detailing','Real Estate','Financial Services','Insurance',
  // Personal Services
  'Beauty & Salon','Hair Salon','Barbershop','Fitness & Gym','Personal Training',
  'Pet Services','Veterinary','Dog Grooming','Dog Training',
  // Retail & Commerce
  'Retail','E-Commerce','Grocery Store','Pharmacy',
  // Professional Services
  'Technology','IT Services','Web Design','Marketing','Consulting','Accounting',
  // Other
  'Construction','Photography','Event Planning','Travel & Tourism','Education','Non-Profit','Other',
]

export default function Signup() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({})

  // Step 1: Email & Password
  const step1Form = useForm({
    resolver: zodResolver(step1Schema),
    mode: 'onChange',
  })

  // Step 2: Business Info
  const step2Form = useForm({
    resolver: zodResolver(step2Schema),
    mode: 'onChange',
  })

  // Step 3: Address
  const step3Form = useForm({
    resolver: zodResolver(step3Schema),
    mode: 'onChange',
  })

  const onStep1Submit = async (data) => {
    setFormData(prev => ({
      ...prev,
      email: data.email,
      password: data.password,
    }))
    setStep(2)
  }

  const onStep2Submit = async (data) => {
    setFormData(prev => ({
      ...prev,
      businessName: data.businessName,
      phone: data.phone,
      accountEmail: data.accountEmail,
      website: data.website,
      category: data.category,
    }))
    setStep(3)
  }

  const onStep3Submit = async (data) => {
    setLoading(true)
    try {
      // Call Cloud Function to create user + client
      const createUserWithClient = httpsCallable(functions, 'createUserWithClient')

      const response = await createUserWithClient({
        email: formData.email,
        password: formData.password,
        role: 'client',
        businessData: {
          businessName: formData.businessName,
          phone: formData.phone,
          accountEmail: formData.accountEmail,
          website: formData.website,
          category: formData.category,
          address: data.address,
          city: data.city,
          state: data.state,
          zip: data.zip,
        },
      })

      // Auto-login
      await login(formData.email, formData.password)

      toast.success('Account created successfully!')
      navigate('/dashboard')
    } catch (err) {
      console.error('Signup error full:', err)
      console.error('Signup error message:', err.message)
      console.error('Signup error code:', err.code)

      // Show the actual error — details is set when the Cloud Function throws HttpsError
      const errorMsg = err.details || err.message || 'Failed to create account'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">ReBoost Citations</h1>
          <p className="text-brand-200 mt-1">Local SEO Citation Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Progress */}
          <div className="flex justify-between mb-8">
            {[1, 2, 3].map(num => (
              <div key={num} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  num < step ? 'bg-green-500 text-white' :
                  num === step ? 'bg-brand-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {num < step ? <CheckCircle className="w-6 h-6" /> : num}
                </div>
                <span className="text-xs mt-2 text-gray-600">{['Email', 'Business', 'Address'][num - 1]}</span>
              </div>
            ))}
          </div>

          {/* Step 1: Email & Password */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Create your account</h2>
              <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  error={step1Form.formState.errors.email?.message}
                  {...step1Form.register('email')}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  hint="At least 6 characters (e.g., 123456)"
                  error={step1Form.formState.errors.password?.message}
                  {...step1Form.register('password')}
                />
                <Input
                  label="Confirm password"
                  type="password"
                  placeholder="••••••••"
                  error={step1Form.formState.errors.passwordConfirm?.message}
                  {...step1Form.register('passwordConfirm')}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!step1Form.formState.isValid}
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </>
          )}

          {/* Step 2: Business Info */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Business information</h2>
              <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
                <Input
                  label="Business name *"
                  placeholder="Your Business Name"
                  error={step2Form.formState.errors.businessName?.message}
                  {...step2Form.register('businessName')}
                />
                <Input
                  label="Phone number *"
                  type="tel"
                  placeholder="5551234567"
                  hint="10+ digits (spaces, dashes, parentheses accepted)"
                  error={step2Form.formState.errors.phone?.message}
                  {...step2Form.register('phone')}
                />
                <Input
                  label="Business email *"
                  type="email"
                  placeholder="contact@business.com"
                  hint="This will be displayed on citation sites"
                  error={step2Form.formState.errors.accountEmail?.message}
                  {...step2Form.register('accountEmail')}
                />
                <Input
                  label="Website *"
                  type="text"
                  placeholder="marketingreboost.com"
                  hint="Enter with or without https:// (we'll add it automatically)"
                  error={step2Form.formState.errors.website?.message}
                  {...step2Form.register('website')}
                />
                <Select
                  label="Business category *"
                  options={CATEGORIES.map(c => ({ value: c, label: c }))}
                  error={step2Form.formState.errors.category?.message}
                  {...step2Form.register('category')}
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={!step2Form.formState.isValid}
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Step 3: Address */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Business address</h2>
              <form onSubmit={step3Form.handleSubmit(onStep3Submit)} className="space-y-4">
                <Input
                  label="Street address *"
                  placeholder="123 Main St"
                  error={step3Form.formState.errors.address?.message}
                  {...step3Form.register('address')}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="City *"
                    placeholder="New York"
                    error={step3Form.formState.errors.city?.message}
                    {...step3Form.register('city')}
                  />
                  <Input
                    label="State *"
                    placeholder="NY"
                    error={step3Form.formState.errors.state?.message}
                    {...step3Form.register('state')}
                  />
                </div>
                <Input
                  label="ZIP code *"
                  placeholder="10001"
                  error={step3Form.formState.errors.zip?.message}
                  {...step3Form.register('zip')}
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    loading={loading}
                    className="flex-1"
                    disabled={!step3Form.formState.isValid || loading}
                  >
                    Create Account
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-brand-300 text-xs mt-6">
          © {new Date().getFullYear()} ReBoost Citations. All rights reserved.
        </p>
      </div>
    </div>
  )
}
