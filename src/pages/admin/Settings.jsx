import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Save, AlertCircle } from 'lucide-react'
import { getDocument, createDocument, updateDocument } from '@/services/firestore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PageHeader from '@/components/layout/PageHeader'
import toast from 'react-hot-toast'

const schema = z.object({
  captchaApiKey: z.string().min(1, 'Required'),
  gmailAddress: z.string().email('Invalid email'),
  gmailAppPassword: z.string().min(1, 'Required'),
})

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState({
    captchaApiKey: false,
    gmailAppPassword: false,
  })

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      captchaApiKey: '',
      gmailAddress: 'reboostcitations@gmail.com',
      gmailAppPassword: '',
    },
  })

  const captchaKey = watch('captchaApiKey')
  const gmailPassword = watch('gmailAppPassword')

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getDocument('settings', 'global')
        if (settings) {
          reset({
            captchaApiKey: settings.captchaApiKey || '',
            gmailAddress: settings.gmailAddress || 'reboostcitations@gmail.com',
            gmailAppPassword: settings.gmailAppPassword || '',
          })
        }
      } catch (err) {
        console.error('Error loading settings:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [reset])

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      // Check if settings document exists
      const existing = await getDocument('settings', 'global')

      if (existing) {
        // Update existing
        await updateDocument('settings', 'global', data)
      } else {
        // Create new
        await createDocument('settings', data, 'global')
      }

      toast.success('Settings saved successfully!')
    } catch (err) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Configuration Settings"
        subtitle="Manage API keys and email configuration for citation automation"
      />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* 2Captcha Section */}
          <div className="border-b pb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              2Captcha Configuration
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Used for automatically solving ReCAPTCHA challenges during citation submissions.
              <a href="https://2captcha.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                Sign up for free →
              </a>
            </p>

            <div className="relative">
              <Input
                label="2Captcha API Key *"
                type={showPassword.captchaApiKey ? 'text' : 'password'}
                placeholder="Enter your 2Captcha API key"
                error={errors.captchaApiKey?.message}
                {...register('captchaApiKey')}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('captchaApiKey')}
                className="absolute right-3 top-10 text-gray-400 hover:text-gray-600"
              >
                {showPassword.captchaApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {captchaKey && (
              <p className="text-xs text-green-600 mt-2">✓ Key configured</p>
            )}
          </div>

          {/* Gmail Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Gmail Configuration
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Email account for receiving and auto-verifying citation confirmation emails.
              Uses Gmail + trick: reboostcitations+clientname@gmail.com routes to single inbox.
            </p>

            <div className="space-y-4">
              <Input
                label="Gmail Address *"
                type="email"
                placeholder="reboostcitations@gmail.com"
                error={errors.gmailAddress?.message}
                {...register('gmailAddress')}
              />

              <div className="relative">
                <Input
                  label="Gmail App Password *"
                  type={showPassword.gmailAppPassword ? 'text' : 'password'}
                  placeholder="xxxx-xxxx-xxxx-xxxx (16 characters)"
                  hint="Generate at: https://myaccount.google.com/apppasswords"
                  error={errors.gmailAppPassword?.message}
                  {...register('gmailAppPassword')}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('gmailAppPassword')}
                  className="absolute right-3 top-10 text-gray-400 hover:text-gray-600"
                >
                  {showPassword.gmailAppPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {gmailPassword && (
                <p className="text-xs text-green-600">✓ Gmail configured</p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4 text-sm text-yellow-800">
              <strong>Setup Steps:</strong>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Create/use Gmail account for citations</li>
                <li>Enable 2-Step Verification in Google Account</li>
                <li>Generate app-specific password (select "Mail" and "Windows Computer")</li>
                <li>Enable IMAP in Gmail settings</li>
                <li>Paste the 16-character password above</li>
              </ol>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-between pt-6 border-t">
            <p className="text-xs text-gray-500">
              These settings are stored securely and only accessible to admins.
            </p>
            <Button
              type="submit"
              loading={saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </Button>
          </div>
        </form>
      </div>

      {/* Info Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">How It Works</h4>
          <p className="text-sm text-blue-800">
            When submitting to citation sites:
            <br />1. Forms auto-filled with client info
            <br />2. CAPTCHAs auto-solved (2Captcha)
            <br />3. Verification emails auto-confirmed (Gmail IMAP)
            <br />4. All tracked in citation status
          </p>
        </div>

        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <h4 className="font-semibold text-green-900 mb-2">Costs</h4>
          <p className="text-sm text-green-800">
            <strong>2Captcha:</strong> ~$0.10-0.50 per campaign
            <br />
            <strong>Gmail:</strong> Free (native IMAP)
            <br />
            <strong>Total:</strong> Minimal cost per campaign
          </p>
        </div>
      </div>
    </div>
  )
}
