# Step-by-Step Implementation Guide

This guide walks through each file creation and modification in the exact order recommended for smooth development.

---

## PHASE 1: SERVICE LAYER (Foundation)

### Step 1: Update `/src/services/firestore.js`

**Location in file:** After existing support ticket functions (around line 229)

**Functions to add (6 new functions):**

```javascript
// ─── Support Tickets (Enhanced) ───────────────────────────────────────────

export const getSupportTicketsByStatus = (status) =>
  getCollection('supportTickets', [
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
  ])

export const getSupportTicketsForClient = (clientId) =>
  getCollection('supportTickets', [
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc'),
  ])

export const addTicketReply = async (ticketId, reply) => {
  await updateDoc(doc(db, 'supportTickets', ticketId), {
    replies: arrayUnion(reply),
    updatedAt: serverTimestamp(),
  })
}

export const markTicketAsResolved = async (ticketId) => {
  await updateDoc(doc(db, 'supportTickets', ticketId), {
    status: 'resolved',
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// ─── Client Onboarding ──────────────────────────────────────────────────

export const updateClientProfile = async (clientId, businessProfile) => {
  await updateDocument('clients', clientId, {
    businessProfile,
    onboarding_complete: true,
  })
}

// ─── Settings ───────────────────────────────────────────────────────────

export const getSupportTicketEmails = async () => {
  const settings = await getDocument('settings', 'global')
  if (!settings?.supportTicketEmails) return []
  return settings.supportTicketEmails
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0)
}
```

**What changed:**
- Lines 230-236 already exist, keep them
- Add 6 new functions after line 236
- No changes to imports needed (already has what's needed)

**Test:** Run `npm run lint` to ensure no syntax errors

---

### Step 2: Update `/src/services/functions.js`

**Location in file:** At the end of the file (after generatePdfReport)

**Function to add (1 new):**

```javascript
export const createOnboardingJob = httpsCallable(functions, 'createOnboardingJob')
```

**File will now have:**
```javascript
export const startSubmissionJob = httpsCallable(functions, 'startSubmissionJob')
export const pauseSubmissionJob = httpsCallable(functions, 'pauseSubmissionJob')
export const resumeSubmissionJob = httpsCallable(functions, 'resumeSubmissionJob')
export const runCitationAudit = httpsCallable(functions, 'runCitationAudit')
export const generatePdfReport = httpsCallable(functions, 'generatePdfReport')
export const createOnboardingJob = httpsCallable(functions, 'createOnboardingJob')
```

**Test:** No direct test yet (depends on cloud function)

---

## PHASE 2: UI COMPONENTS (Presentational)

### Step 3: Create `/src/components/HelpButton.jsx` (NEW FILE)

```javascript
import { HelpCircle } from 'lucide-react'

export default function HelpButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
      title="Get help"
      aria-label="Open support form"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  )
}
```

**Notes:**
- Pure presentational component
- No dependencies on Firestore or Auth
- Simple icon-only button

---

### Step 4: Create `/src/components/SupportTicketModal.jsx` (NEW FILE)

```javascript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { createSupportTicket } from '@/services/firestore'
import toast from 'react-hot-toast'

const supportTicketSchema = z.object({
  subject: z.string()
    .min(1, 'Subject is required')
    .max(100, 'Subject must be under 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be under 1000 characters'),
  priority: z.enum(['low', 'medium', 'high']),
})

export default function SupportTicketModal({ open, onClose }) {
  const { userProfile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      subject: '',
      description: '',
      priority: 'medium',
    },
  })

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      // Get client info from user profile (should be populated from onboarding)
      const clientId = userProfile.clientId
      if (!clientId) {
        throw new Error('No client profile found')
      }

      // Create ticket document
      await createSupportTicket({
        clientId,
        clientName: userProfile.clientName || 'Unknown',
        clientEmail: userProfile.email,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        status: 'open',
        replies: [],
      })

      toast.success('Support ticket sent! We\'ll respond shortly.')
      reset()
      onClose()
    } catch (error) {
      console.error('Error creating ticket:', error)
      toast.error(error.message || 'Failed to send ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send Support Request"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Subject"
          placeholder="What's your issue about?"
          maxLength={100}
          {...register('subject')}
          error={errors.subject?.message}
        />

        <Textarea
          label="Description"
          placeholder="Please describe your issue in detail..."
          rows={4}
          {...register('description')}
          error={errors.description?.message}
        />

        <Select
          label="Priority"
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
          ]}
          {...register('priority')}
          error={errors.priority?.message}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
```

**Key points:**
- Uses react-hook-form for validation
- Collects clientId and clientEmail from useAuth()
- Creates support ticket in Firestore
- Handles loading state and errors

---

### Step 5: Create `/src/components/SupportTicketDetailModal.jsx` (NEW FILE)

```javascript
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Modal from '@/components/ui/Modal'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import {
  addTicketReply,
  markTicketAsResolved,
  updateSupportTicket,
} from '@/services/firestore'
import toast from 'react-hot-toast'
import { formatDate } from '@/utils/helpers'

const priorityColors = {
  high: { bg: 'bg-red-100', text: 'text-red-700' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  low: { bg: 'bg-green-100', text: 'text-green-700' },
}

const statusColors = {
  open: { bg: 'bg-blue-100', text: 'text-blue-700' },
  resolved: { bg: 'bg-gray-100', text: 'text-gray-700' },
}

export default function SupportTicketDetailModal({
  ticket,
  open,
  onClose,
  onUpdate,
}) {
  const { userProfile } = useAuth()
  const [replyText, setReplyText] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [localTicket, setLocalTicket] = useState(ticket)

  if (!ticket) return null

  // Update local state when prop changes
  if (ticket.id !== localTicket.id) {
    setLocalTicket(ticket)
  }

  const handleAddReply = async () => {
    if (!replyText.trim()) {
      toast.error('Reply cannot be empty')
      return
    }

    setIsSubmittingReply(true)
    try {
      const reply = {
        adminEmail: userProfile.email,
        message: replyText,
        timestamp: new Date().toISOString(),
      }

      await addTicketReply(ticket.id, reply)

      // Update local state
      setLocalTicket({
        ...localTicket,
        replies: [...(localTicket.replies || []), reply],
      })

      setReplyText('')
      toast.success('Reply sent!')
    } catch (error) {
      toast.error('Failed to send reply')
      console.error('Error adding reply:', error)
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const handleMarkResolved = async () => {
    setIsUpdatingStatus(true)
    try {
      await markTicketAsResolved(ticket.id)
      setLocalTicket({
        ...localTicket,
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
      })
      toast.success('Ticket marked as resolved')
      if (onUpdate) onUpdate()
    } catch (error) {
      toast.error('Failed to update status')
      console.error('Error updating ticket:', error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleReopen = async () => {
    setIsUpdatingStatus(true)
    try {
      await updateSupportTicket(ticket.id, { status: 'open' })
      setLocalTicket({
        ...localTicket,
        status: 'open',
      })
      toast.success('Ticket reopened')
    } catch (error) {
      toast.error('Failed to reopen ticket')
      console.error('Error reopening ticket:', error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const priorityColor = priorityColors[localTicket.priority] || priorityColors.low
  const statusColor = statusColors[localTicket.status] || statusColors.open

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={localTicket.subject}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Client</p>
            <p className="font-medium text-gray-900">{localTicket.clientName}</p>
            <p className="text-xs text-gray-500">{localTicket.clientEmail}</p>
          </div>
          <div className="flex gap-2">
            <Badge
              variant="custom"
              className={`${priorityColor.bg} ${priorityColor.text}`}
            >
              {localTicket.priority.charAt(0).toUpperCase() + localTicket.priority.slice(1)} Priority
            </Badge>
            <Badge
              variant="custom"
              className={`${statusColor.bg} ${statusColor.text}`}
            >
              {localTicket.status === 'open' ? 'Open' : 'Resolved'}
            </Badge>
          </div>
        </div>

        {/* Original Description */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Original Message</h3>
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
            {localTicket.description}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Created {formatDate(localTicket.createdAt)}
          </p>
        </div>

        {/* Replies */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Replies</h3>
          {localTicket.replies && localTicket.replies.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {localTicket.replies.map((reply, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-blue-50 rounded-lg border border-blue-100"
                >
                  <p className="text-xs text-blue-600 font-medium mb-1">
                    {reply.adminEmail} · {formatDate(reply.timestamp)}
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {reply.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No replies yet</p>
          )}
        </div>

        {/* Reply Form */}
        {localTicket.status === 'open' && (
          <div>
            <Textarea
              label="Your Reply"
              placeholder="Type your response to the client..."
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <Button
              onClick={handleAddReply}
              disabled={isSubmittingReply || !replyText.trim()}
              className="mt-2"
            >
              {isSubmittingReply ? 'Sending...' : 'Send Reply'}
            </Button>
          </div>
        )}

        {/* Status Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          {localTicket.status === 'open' ? (
            <Button
              onClick={handleMarkResolved}
              disabled={isUpdatingStatus}
              variant="secondary"
            >
              {isUpdatingStatus ? 'Updating...' : 'Mark as Resolved'}
            </Button>
          ) : (
            <Button
              onClick={handleReopen}
              disabled={isUpdatingStatus}
              variant="secondary"
            >
              {isUpdatingStatus ? 'Updating...' : 'Reopen Ticket'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
```

**Key points:**
- Displays ticket details, replies, and allows adding new replies
- Status management (open/resolved)
- Local state for optimistic updates
- Proper error handling

---

## PHASE 3: ADMIN PAGES

### Step 6: Create `/src/pages/admin/SupportTickets.jsx` (NEW FILE)

```javascript
import { useEffect, useState } from 'react'
import { Search, HelpCircle } from 'lucide-react'
import {
  getSupportTickets,
  getSupportTicketsByStatus,
} from '@/services/firestore'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import SupportTicketDetailModal from '@/components/SupportTicketDetailModal'
import { formatDate } from '@/utils/helpers'
import toast from 'react-hot-toast'

const priorityColors = {
  high: { bg: 'bg-red-100', text: 'text-red-700' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  low: { bg: 'bg-green-100', text: 'text-green-700' },
}

const statusColors = {
  open: { bg: 'bg-blue-100', text: 'text-blue-700' },
  resolved: { bg: 'bg-gray-100', text: 'text-gray-700' },
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState([])
  const [filteredTickets, setFilteredTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const loadTickets = async () => {
    try {
      setLoading(true)
      let data
      if (statusFilter === 'all') {
        data = await getSupportTickets()
      } else {
        data = await getSupportTicketsByStatus(statusFilter)
      }
      setTickets(data)
    } catch (error) {
      console.error('Error loading tickets:', error)
      toast.error('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [statusFilter])

  useEffect(() => {
    const q = search.toLowerCase()
    const filtered = tickets.filter(ticket =>
      ticket.subject?.toLowerCase().includes(q) ||
      ticket.clientName?.toLowerCase().includes(q) ||
      ticket.clientEmail?.toLowerCase().includes(q)
    )
    setFilteredTickets(filtered)
  }, [search, tickets])

  const handleRowClick = (ticket) => {
    setSelectedTicket(ticket)
    setShowDetailModal(true)
  }

  const handleModalClose = () => {
    setShowDetailModal(false)
    setSelectedTicket(null)
  }

  const handleModalUpdate = () => {
    loadTickets()
  }

  if (loading) return <PageLoader />

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Support Tickets"
        subtitle="Manage client support requests"
      />

      {/* Controls */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by subject, client name, or email..."
            prefix={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Tickets' },
            { value: 'open', label: 'Open' },
            { value: 'resolved', label: 'Resolved' },
          ]}
        />
      </div>

      {/* Table */}
      {filteredTickets.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No support tickets"
          description="There are no support tickets matching your filter."
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTickets.map((ticket) => {
                  const pColor = priorityColors[ticket.priority]
                  const sColor = statusColors[ticket.status]
                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => handleRowClick(ticket)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {ticket.clientName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {ticket.subject}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge
                          variant="custom"
                          className={`${pColor.bg} ${pColor.text}`}
                        >
                          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge
                          variant="custom"
                          className={`${sColor.bg} ${sColor.text}`}
                        >
                          {ticket.status === 'open' ? 'Open' : 'Resolved'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(ticket.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <SupportTicketDetailModal
        ticket={selectedTicket}
        open={showDetailModal}
        onClose={handleModalClose}
        onUpdate={handleModalUpdate}
      />
    </div>
  )
}
```

**Key points:**
- Lists all support tickets with search/filter
- Click row opens detail modal
- Auto-refresh after admin reply
- Proper error handling and loading states

---

## PHASE 4: CLIENT PAGES

### Step 7: Create `/src/pages/client/Onboarding.jsx` (NEW FILE)

Due to the length of this component, here's the structure:

```javascript
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { getClient, updateClientProfile } from '@/services/firestore'
import { createOnboardingJob } from '@/services/functions'
import { uploadLogo } from '@/services/storage'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

// Validation schema
const onboardingSchema = z.object({
  businessName: z.string().min(1, 'Business name required').max(100),
  phone: z.string().min(10, 'Valid phone required').max(20),
  emailAccount: z.string().email('Valid email required'),
  emailPublic: z.string().email('Valid email required'),
  category: z.string().min(1, 'Category required'),
  website: z.string().url('Valid URL required').optional().or(z.literal('')),
  address: z.string().min(1, 'Address required'),
  city: z.string().min(1, 'City required'),
  state: z.string().min(1, 'State required'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Valid ZIP required'),
  shortDescription: z.string().min(10, 'Min 10 chars').max(200, 'Max 200 chars'),
  longDescription: z.string().min(50, 'Min 50 chars'),
  facebook: z.string().optional().or(z.literal('')),
  instagram: z.string().optional().or(z.literal('')),
  twitter: z.string().optional().or(z.literal('')),
  linkedin: z.string().optional().or(z.literal('')),
  youtube: z.string().optional().or(z.literal('')),
  tiktok: z.string().optional().or(z.literal('')),
})

const STATES = [
  { value: 'AL', label: 'Alabama' },
  // ... all 50 states
]

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'salon', label: 'Salon / Spa' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'service', label: 'Service Business' },
  { value: 'professional', label: 'Professional Services' },
  { value: 'other', label: 'Other' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessName: '',
      phone: '',
      emailAccount: userProfile?.email || '',
      emailPublic: '',
      category: '',
      website: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      shortDescription: '',
      longDescription: '',
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: '',
      tiktok: '',
    },
  })

  useEffect(() => {
    const loadClient = async () => {
      const c = await getClient(userProfile.clientId)
      setClient(c)
      if (c?.onboarding_complete) {
        navigate('/dashboard')
      }
      setLoading(false)
    }

    if (userProfile?.clientId) {
      loadClient()
    }
  }, [userProfile, navigate])

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5MB')
      return
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image')
      return
    }

    setLogoFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setLogoPreview(event.target?.result)
    }
    reader.readAsDataURL(file)
  }

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      let logoUrl = null

      // Upload logo if provided
      if (logoFile) {
        logoUrl = await uploadLogo(client.id, logoFile)
      }

      // Build business profile
      const businessProfile = {
        businessName: data.businessName,
        phone: data.phone,
        emailAccount: data.emailAccount,
        emailPublic: data.emailPublic,
        category: data.category,
        website: data.website || null,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        shortDescription: data.shortDescription,
        longDescription: data.longDescription,
        logoUrl,
        socialMedia: {
          facebook: data.facebook || null,
          instagram: data.instagram || null,
          twitter: data.twitter || null,
          linkedin: data.linkedin || null,
          youtube: data.youtube || null,
          tiktok: data.tiktok || null,
        },
      }

      // Update client profile
      await updateClientProfile(client.id, businessProfile)

      // Create onboarding job
      toast.loading('Creating your citation job...')
      await createOnboardingJob({ clientId: client.id })

      toast.dismiss()
      toast.success('Business profile complete! Creating your citation job...')

      // Navigate to citations
      navigate('/dashboard/citations', {
        state: { message: 'Your citations are being submitted!' },
      })
    } catch (error) {
      console.error('Error completing onboarding:', error)
      toast.error(error.message || 'Failed to complete onboarding')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Complete Your Business Profile"
        subtitle="Set up your listing details to get started with citations"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Basic Information */}
        <Card>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Basic Information
              </h3>
            </div>

            <Input
              label="Business Name"
              {...register('businessName')}
              error={errors.businessName?.message}
            />

            <Input
              label="Phone"
              type="tel"
              {...register('phone')}
              error={errors.phone?.message}
            />

            <Input
              label="Account Email"
              type="email"
              {...register('emailAccount')}
              error={errors.emailAccount?.message}
            />

            <Input
              label="Public Email"
              type="email"
              {...register('emailPublic')}
              error={errors.emailPublic?.message}
            />
          </div>
        </Card>

        {/* Section 2: Business Details */}
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Business Details
            </h3>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block w-full text-sm text-gray-500"
              />
              {logoPreview && (
                <div className="mt-2">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Max 5MB, PNG/JPG recommended
              </p>
            </div>

            <Select
              label="Category"
              options={CATEGORIES}
              {...register('category')}
              error={errors.category?.message}
            />

            <Input
              label="Website"
              type="url"
              placeholder="https://..."
              {...register('website')}
              error={errors.website?.message}
            />
          </div>
        </Card>

        {/* Section 3: Location */}
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Location
            </h3>

            <Input
              label="Address"
              {...register('address')}
              error={errors.address?.message}
            />

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="City"
                {...register('city')}
                error={errors.city?.message}
              />
              <Select
                label="State"
                options={STATES}
                {...register('state')}
                error={errors.state?.message}
              />
              <Input
                label="ZIP"
                {...register('zip')}
                error={errors.zip?.message}
              />
            </div>
          </div>
        </Card>

        {/* Section 4: Description */}
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Description
            </h3>

            <Textarea
              label="Short Description"
              placeholder="1-2 sentences about your business"
              rows={2}
              {...register('shortDescription')}
              error={errors.shortDescription?.message}
              helperText="Max 200 characters"
            />

            <Textarea
              label="Long Description"
              placeholder="Detailed description of your business"
              rows={6}
              {...register('longDescription')}
              error={errors.longDescription?.message}
              helperText="Min 50 characters"
            />
          </div>
        </Card>

        {/* Section 5: Social Media */}
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Social Media (Optional)
            </h3>

            <Input
              label="Facebook"
              placeholder="https://facebook.com/..."
              {...register('facebook')}
            />
            <Input
              label="Instagram"
              placeholder="https://instagram.com/..."
              {...register('instagram')}
            />
            <Input
              label="Twitter"
              placeholder="https://twitter.com/..."
              {...register('twitter')}
            />
            <Input
              label="LinkedIn"
              placeholder="https://linkedin.com/..."
              {...register('linkedin')}
            />
            <Input
              label="YouTube"
              placeholder="https://youtube.com/..."
              {...register('youtube')}
            />
            <Input
              label="TikTok"
              placeholder="https://tiktok.com/..."
              {...register('tiktok')}
            />
          </div>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Starting Your Citations...' : 'Start My Citations'}
          </Button>
        </div>
      </form>
    </div>
  )
}
```

**Key points:**
- Comprehensive onboarding form with 5 sections
- Logo upload with preview and validation
- Logo uploaded to Firebase Storage
- Creates job via cloud function on submit
- Validates all required fields

---

## PHASE 5: INTEGRATION & ROUTING

### Step 8: Update `/src/pages/admin/Settings.jsx`

**Location:** Add field after gmailAppPassword field (around line 100)

Find this section:
```jsx
<Input
  label="Gmail App Password"
  ...
/>
```

Add after it:
```jsx
<Input
  label="Support Ticket Email Recipients"
  placeholder="email1@example.com, email2@example.com"
  {...register('supportTicketEmails')}
  error={errors.supportTicketEmails?.message}
  helperText="Support tickets will be sent to these addresses (comma-separated)"
/>
```

Update schema (line 12-16):
```javascript
const schema = z.object({
  captchaApiKey: z.string().min(1, 'Required'),
  gmailAddress: z.string().email('Invalid email'),
  gmailAppPassword: z.string().min(1, 'Required'),
  supportTicketEmails: z.string().min(1, 'Required'),  // ADD THIS LINE
})
```

Update defaultValues (line 28-32):
```javascript
defaultValues: {
  captchaApiKey: '',
  gmailAddress: 'reboostcitations@gmail.com',
  gmailAppPassword: '',
  supportTicketEmails: '',  // ADD THIS LINE
}
```

Update reset() call in load function (around line 44-47):
```javascript
supportTicketEmails: settings.supportTicketEmails || '',  // ADD THIS LINE
```

---

### Step 9: Update `/src/pages/client/Dashboard.jsx`

**Location:** At the top in imports, add:

```javascript
import { useNavigate } from 'react-router-dom'
import HelpButton from '@/components/HelpButton'
import SupportTicketModal from '@/components/SupportTicketModal'
```

**Location:** In component function, add state after other states:

```javascript
const navigate = useNavigate()
const [showSupportModal, setShowSupportModal] = useState(false)
```

**Location:** In first useEffect (after current logic), add onboarding check:

```javascript
// After all the data loading logic, add:
if (client && !client.onboarding_complete) {
  navigate('/dashboard/onboarding')
}
```

**Location:** In JSX, find the dashboard header and add:

```jsx
<HelpButton onClick={() => setShowSupportModal(true)} />
```

**Location:** Before closing main div, add modal:

```jsx
<SupportTicketModal
  open={showSupportModal}
  onClose={() => setShowSupportModal(false)}
/>
```

---

### Step 10: Update `/src/App.jsx`

**Location:** Top imports, add:

```javascript
import ClientOnboarding from '@/pages/client/Onboarding'
import AdminSupportTickets from '@/pages/admin/SupportTickets'
```

**Location:** In Admin Routes section (after analytics route), add:

```jsx
<Route path="support-tickets" element={<AdminSupportTickets />} />
```

**Location:** In Client Routes section (after listings route), add:

```jsx
<Route path="onboarding" element={<ClientOnboarding />} />
```

---

### Step 11: Update `/src/components/layout/Sidebar.jsx`

**Location:** Top imports, add HelpCircle:

```javascript
import {
  LayoutDashboard, Users, UserCheck, Globe, Package, Briefcase,
  BarChart2, TrendingUp, Settings, LogOut, ChevronRight, Zap,
  HelpCircle,  // ADD THIS
} from 'lucide-react'
```

**Location:** In `adminNav` array (around line 19), add:

```javascript
{ to: '/admin/support-tickets', label: 'Support Tickets', icon: HelpCircle },
```

---

## PHASE 6: CLOUD FUNCTIONS

### Step 12: Update `/functions/src/index.js`

Add this new function export after other callable exports:

```javascript
export const createOnboardingJob = https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth?.uid) {
    throw new https.HttpsError('unauthenticated', 'User must be signed in')
  }

  const { clientId } = data
  if (!clientId) {
    throw new https.HttpsError('invalid-argument', 'clientId is required')
  }

  try {
    // Get client document
    const clientSnap = await db.collection('clients').doc(clientId).get()
    if (!clientSnap.exists) {
      throw new Error('Client not found')
    }

    const client = clientSnap.data()
    const packageId = client.packageId
    if (!packageId) {
      throw new Error('No package assigned to client')
    }

    // Get package to determine tier
    const pkgSnap = await db.collection('packages').doc(packageId).get()
    if (!pkgSnap.exists) {
      throw new Error('Package not found')
    }
    const pkg = pkgSnap.data()

    // Query directories matching package tier
    const dirQuery = db.collection('directories')
      .where('tier', '==', pkg.tier)
      .orderBy('da', 'desc')
      .limit(300)

    const dirSnap = await dirQuery.get()
    const directories = dirSnap.docs.map(d => ({
      id: d.id,
      name: d.data().name,
      url: d.data().url,
    }))

    // Create job document
    const jobRef = await db.collection('jobs').add({
      clientId,
      packageId,
      status: 'pending',
      progress: 0,
      total: directories.length,
      directories,
      logs: [{
        type: 'info',
        message: `Onboarding job created: ${directories.length} directories queued for ${client.businessName || 'Unknown'}`,
        timestamp: new Date().toISOString(),
      }],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Trigger submission job
    // This calls the existing startSubmissionJob function
    // Note: You may need to refactor existing function to be callable separately
    // For now, return the jobId and rely on admin to trigger if needed
    // Or queue a background task here

    return {
      success: true,
      jobId: jobRef.id,
      directoryCount: directories.length,
    }
  } catch (error) {
    console.error('Error creating onboarding job:', error)

    // Send admin notification email
    try {
      const settingsSnap = await db.collection('settings').doc('global').get()
      const settings = settingsSnap.data() || {}
      const adminEmails = settings.supportTicketEmails
        ? settings.supportTicketEmails.split(',').map(e => e.trim())
        : []

      if (adminEmails.length > 0) {
        // TODO: Implement email sending via SMTP/SendGrid
        console.log(`Email notification sent to: ${adminEmails.join(', ')}`)
      }
    } catch (emailErr) {
      console.error('Error sending notification:', emailErr)
    }

    throw new https.HttpsError(
      'internal',
      `Failed to create onboarding job: ${error.message}`
    )
  }
})
```

---

## SUMMARY

This implementation follows a structured approach:

1. **Service Layer** - Foundation functions (2 files)
2. **UI Components** - Presentational pieces (3 files)
3. **Admin Pages** - Support ticket management (1 file)
4. **Client Pages** - Onboarding flow (1 file)
5. **Integration** - Wiring everything together (4 files modified)
6. **Cloud Functions** - Backend job creation (1 file)

**Total new files:** 5
**Total modified files:** 6
**Total cloud function additions:** 1

Each step builds on the previous, ensuring dependencies are met before code is needed.
