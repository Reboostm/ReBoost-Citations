# Component Specifications & Code Structure Guide

This document provides detailed specifications for each component, including expected props, state management, and code structure hints (NOT full implementation).

---

## 1. HelpButton Component

**File:** `/src/components/HelpButton.jsx`

**Purpose:** Floating button to open support ticket form

**Props:**
```jsx
{
  onClick: () => void,  // handler to open SupportTicketModal
}
```

**Structure:**
```jsx
import { HelpCircle } from 'lucide-react'

export default function HelpButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
      title="Get help"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  )
}
```

**Notes:**
- Pure presentational component
- No state
- Inherits styling from existing Button pattern
- Icon only (no text)

---

## 2. SupportTicketModal Component

**File:** `/src/components/SupportTicketModal.jsx`

**Purpose:** Form modal for clients to submit support tickets

**Props:**
```jsx
{
  open: boolean,
  onClose: () => void,
}
```

**Internal State:**
```jsx
{
  isSubmitting: boolean,
  // form state managed by react-hook-form via register()
}
```

**Key Imports:**
```jsx
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
```

**Form Fields:**
1. **subject** - Input component
2. **description** - Textarea component
3. **priority** - Select component with options: low, medium, high

**Validation Schema (zod):**
```jsx
const supportTicketSchema = z.object({
  subject: z.string()
    .min(1, 'Subject is required')
    .max(100, 'Subject must be under 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be under 1000 characters'),
  priority: z.enum(['low', 'medium', 'high']),
})
```

**Form Submission Logic:**
```jsx
const onSubmit = async (data) => {
  // 1. Get clientId, clientName from useAuth()
  // 2. Get clientEmail from userProfile
  // 3. Call createSupportTicket() with complete data
  // 4. Show toast success
  // 5. Close modal
  // 6. Reset form
}
```

**Error Handling:**
- Validation errors displayed below fields
- Toast error on submission failure
- Try/catch around createSupportTicket call

**Component Structure:**
```
Modal (open, onClose, title="Send Support Request")
├── Form
│   ├── Input "Subject"
│   ├── Textarea "Description"
│   ├── Select "Priority"
│   └── Buttons
│       ├── Cancel
│       └── Send Request (disabled while submitting)
```

---

## 3. SupportTicketDetailModal Component

**File:** `/src/components/SupportTicketDetailModal.jsx`

**Purpose:** Admin modal to view ticket details, add replies, and change status

**Props:**
```jsx
{
  ticket: {
    id: string,
    clientId: string,
    clientName: string,
    clientEmail: string,
    subject: string,
    description: string,
    priority: 'low' | 'medium' | 'high',
    status: 'open' | 'resolved',
    createdAt: timestamp,
    resolvedAt: timestamp | null,
    replies: Array<{
      adminEmail: string,
      message: string,
      timestamp: string,
    }>,
  },
  open: boolean,
  onClose: () => void,
  onUpdate: () => void,  // callback to refresh parent table
}
```

**Internal State:**
```jsx
{
  replyText: string,
  isSubmittingReply: boolean,
  isUpdatingStatus: boolean,
  localTicket: ticket,  // to show updates without parent reload
}
```

**Key Imports:**
```jsx
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Modal from '@/components/ui/Modal'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { addTicketReply, markTicketAsResolved, updateSupportTicket } from '@/services/firestore'
import toast from 'react-hot-toast'
import { formatDate } from '@/utils/helpers'
```

**Component Structure:**

```
Modal (open, onClose, title={ticket?.subject})
├── Section 1: Ticket Header
│   ├── Title (from ticket.subject)
│   ├── Badge: Priority (color coded)
│   ├── Badge: Status (color coded)
│   └── Info: Created date, Client name
├── Section 2: Original Description
│   └── Read-only text block with ticket.description
├── Section 3: Replies
│   └── List of replies (reverse chronological)
│       └── Each reply shows:
│           ├── Admin email
│           ├── Message text
│           └── Formatted timestamp
├── Section 4: Reply Form
│   ├── Textarea "Reply message"
│   └── Button "Send Reply"
└── Section 5: Status Management
    ├── IF status === 'open':
    │   └── Button "Mark as Resolved"
    └── IF status === 'resolved':
        └── Button "Reopen Ticket"
```

**Key Functions:**

```jsx
const handleAddReply = async (e) => {
  // 1. Validate replyText not empty
  // 2. Get adminEmail from useAuth()
  // 3. Call addTicketReply() with reply object
  // 4. Update localTicket.replies
  // 5. Clear replyText
  // 6. Show success toast
}

const handleMarkResolved = async () => {
  // 1. Confirm action with user (optional)
  // 2. Call markTicketAsResolved(ticket.id)
  // 3. Update localTicket.status
  // 4. Show success toast
  // 5. Call onUpdate() to refresh parent
}

const handleReopen = async () => {
  // 1. Call updateSupportTicket(ticket.id, { status: 'open' })
  // 2. Update localTicket.status
  // 3. Show success toast
}
```

**Priority Badge Colors:**
- high → red (bg-red-100 text-red-700)
- medium → yellow (bg-yellow-100 text-yellow-700)
- low → green (bg-green-100 text-green-700)

**Status Badge Colors:**
- open → blue (bg-blue-100 text-blue-700)
- resolved → gray (bg-gray-100 text-gray-700)

---

## 4. Admin SupportTickets Page

**File:** `/src/pages/admin/SupportTickets.jsx`

**Purpose:** Admin dashboard to view, search, filter, and manage all support tickets

**State Management:**
```jsx
{
  tickets: Array<supportTicket>,
  filteredTickets: Array<supportTicket>,
  loading: boolean,
  search: string,
  statusFilter: 'all' | 'open' | 'resolved',
  selectedTicket: supportTicket | null,
  showDetailModal: boolean,
}
```

**Key Imports:**
```jsx
import { useEffect, useState } from 'react'
import { Search, MessageSquare, CheckCircle } from 'lucide-react'
import { getSupportTickets, getSupportTicketsByStatus } from '@/services/firestore'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import SupportTicketDetailModal from '@/components/SupportTicketDetailModal'
import { formatDate, statusColor } from '@/utils/helpers'
import toast from 'react-hot-toast'
```

**Load Function:**
```jsx
const loadTickets = async () => {
  // 1. If statusFilter === 'all', call getSupportTickets()
  // 2. Otherwise, call getSupportTicketsByStatus(statusFilter)
  // 3. Set state with results
  // 4. Set loading = false
}
```

**Search/Filter Logic:**
```jsx
useEffect(() => {
  // When search or statusFilter changes, filter tickets:
  // 1. Get current tickets based on statusFilter
  // 2. Filter by search term:
  //    - Match subject (case-insensitive)
  //    - Match clientName (case-insensitive)
  //    - Match clientEmail (case-insensitive)
  // 3. Set filteredTickets
}, [search, statusFilter, tickets])
```

**Table Columns:**
1. Client Name (text, clickable)
2. Subject (text, clickable to open modal)
3. Priority (badge)
4. Status (badge)
5. Created Date (formatted)

**Row Click Handler:**
```jsx
const handleRowClick = (ticket) => {
  setSelectedTicket(ticket)
  setShowDetailModal(true)
}
```

**On Modal Close:**
```jsx
const handleModalClose = () => {
  setShowDetailModal(false)
  setSelectedTicket(null)
}
```

**On Modal Update (after reply/status change):**
```jsx
const handleModalUpdate = () => {
  // Reload tickets from Firestore
  loadTickets()
}
```

**Component Layout:**
```
PageHeader
├── Title "Support Tickets"
├── Optional: subtitle or stats (total open, etc.)

Controls Section
├── Search Input (placeholder: "Search by subject, client name, email...")
├── Status Filter Dropdown (All / Open / Resolved)

Table/List View
├── Column Headers
├── For each ticket:
│   ├── Client Name
│   ├── Subject
│   ├── Priority Badge
│   ├── Status Badge
│   └── Created Date
│   (click row opens SupportTicketDetailModal)

Empty State (if no tickets)

SupportTicketDetailModal (if open)
```

**Edge Cases:**
- No tickets yet → show EmptyState with message "No support tickets yet"
- Loading → show PageLoader
- Filter has no results → show EmptyState with message "No tickets matching filter"

---

## 5. Client Onboarding Page

**File:** `/src/pages/client/Onboarding.jsx`

**Purpose:** First-time setup form for new client business profile

**Redirect Logic:**
```jsx
useEffect(() => {
  if (client?.onboarding_complete) {
    navigate('/dashboard')
  }
}, [client, navigate])
```

**State Management:**
```jsx
{
  client: clientDocument,
  isSubmitting: boolean,
  logoFile: File | null,
  logoPreview: string | null,
  // form state managed by react-hook-form
}
```

**Key Imports:**
```jsx
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
import toast from 'react-hot-toast'
```

**Form Validation Schema (zod):**
```jsx
const onboardingSchema = z.object({
  // Basic Info
  businessName: z.string()
    .min(1, 'Business name required')
    .max(100),
  phone: z.string()
    .min(10, 'Valid phone required')
    .max(20),
  emailAccount: z.string()
    .email('Valid email required'),
  emailPublic: z.string()
    .email('Valid email required'),

  // Business Details
  category: z.string()
    .min(1, 'Category required'),
  website: z.string()
    .url('Valid URL required')
    .optional()
    .or(z.literal('')),

  // Location
  address: z.string()
    .min(1, 'Address required'),
  city: z.string()
    .min(1, 'City required'),
  state: z.string()
    .min(1, 'State required'),
  zip: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'Valid ZIP format required (12345 or 12345-6789)'),

  // Description
  shortDescription: z.string()
    .min(10, 'Must be at least 10 characters')
    .max(200, 'Must be under 200 characters'),
  longDescription: z.string()
    .min(50, 'Must be at least 50 characters')
    .max(2000, 'Must be under 2000 characters'),

  // Social Media (optional)
  facebook: z.string().optional().or(z.literal('')),
  instagram: z.string().optional().or(z.literal('')),
  twitter: z.string().optional().or(z.literal('')),
  linkedin: z.string().optional().or(z.literal('')),
  youtube: z.string().optional().or(z.literal('')),
  tiktok: z.string().optional().or(z.literal('')),
})
```

**Form Submission:**
```jsx
const onSubmit = async (data) => {
  // 1. Validate all fields (handled by zod)
  // 2. If logoFile exists:
  //    - Call uploadLogo(clientId, logoFile)
  //    - Get logoUrl
  // 3. Build businessProfile object with all fields + logoUrl
  // 4. Call updateClientProfile(clientId, businessProfile)
  // 5. Call createOnboardingJob({ clientId })
  // 6. Show success toast
  // 7. Navigate to /dashboard/citations with state message
}
```

**Logo Upload Handling:**
```jsx
const handleLogoChange = (e) => {
  // 1. Get file from input
  // 2. Validate: type is image/*, size < 5MB
  // 3. Set logoFile state
  // 4. Create preview URL with FileReader
  // 5. Set logoPreview state
}
```

**Component Structure:**

```
PageHeader
├── Title "Complete Your Business Profile"
├── Subtitle "Set up your listing details to get started"

Form (single page, grouped sections)

Section 1: Basic Information
├── Card wrapper
├── Business Name (Input)
├── Phone (Input, type="tel")
├── Email (Account) (Input, type="email")
├── Email (Public) (Input, type="email")

Section 2: Business Details
├── Card wrapper
├── Logo Upload (file input with preview)
├── Category (Select)
├── Website (Input, type="url", optional)

Section 3: Location
├── Card wrapper
├── Address (Input)
├── City (Input)
├── State (Input)
├── ZIP (Input)

Section 4: Description
├── Card wrapper
├── Short Description (Textarea, 2 rows)
│   └── Hint: "1-2 sentences, max 200 characters"
├── Long Description (Textarea, 6 rows)
│   └── Hint: "Detailed description of your business"

Section 5: Social Media (Optional)
├── Card wrapper
├── Facebook (Input)
├── Instagram (Input)
├── Twitter (Input)
├── LinkedIn (Input)
├── YouTube (Input)
├── TikTok (Input)

Bottom: Submit Button
├── Label "Start My Citations"
├── Loading state while submitting
```

**Category Select Options:**
```jsx
[
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'salon', label: 'Salon / Spa' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'service', label: 'Service Business' },
  { value: 'professional', label: 'Professional Services' },
  { value: 'other', label: 'Other' },
]
```

**State Select Options:**
```jsx
// All 50 US states + DC
[
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  // ... etc
]
```

**Error Messages:**
- Validation errors displayed below each field
- Submission error shown as toast
- Logo validation errors shown as toast

**Success Behavior:**
- Toast: "Business profile complete! Creating your citation job..."
- Navigate to `/dashboard/citations`
- Optionally show banner: "Your citations are being submitted!"

---

## 6. Updated Settings Page

**File:** `/src/pages/admin/Settings.jsx` (EXISTING - ADD FIELD)

**What to Add:**

After the `gmailAppPassword` field, add:

```jsx
<Input
  label="Support Ticket Email Recipients"
  placeholder="email1@example.com, email2@example.com"
  {...register('supportTicketEmails')}
  error={errors.supportTicketEmails?.message}
  helperText="Support tickets will be sent to these addresses (comma-separated)"
/>
```

**Schema Update:**

In the zod schema at top of file, add field:

```jsx
const schema = z.object({
  captchaApiKey: z.string().min(1, 'Required'),
  gmailAddress: z.string().email('Invalid email'),
  gmailAppPassword: z.string().min(1, 'Required'),
  supportTicketEmails: z.string().min(1, 'Required'),  // NEW
})
```

**Default Values Update:**

```jsx
defaultValues: {
  captchaApiKey: '',
  gmailAddress: 'reboostcitations@gmail.com',
  gmailAppPassword: '',
  supportTicketEmails: '',  // NEW
}
```

**Load Function Update:**

After loading other settings:

```jsx
supportTicketEmails: settings.supportTicketEmails || '',
```

---

## 7. Updated Client Dashboard

**File:** `/src/pages/client/Dashboard.jsx` (EXISTING - ADD FEATURES)

**Add Onboarding Check:**

```jsx
useEffect(() => {
  // After loading client, check onboarding status
  if (client && !client.onboarding_complete) {
    navigate('/dashboard/onboarding')
  }
}, [client, navigate])
```

**Add Help Button:**

In the header or near user profile section:

```jsx
const [showSupportModal, setShowSupportModal] = useState(false)

// In render:
<HelpButton onClick={() => setShowSupportModal(true)} />

// At bottom:
<SupportTicketModal
  open={showSupportModal}
  onClose={() => setShowSupportModal(false)}
/>
```

**Imports to Add:**

```jsx
import { useNavigate } from 'react-router-dom'
import HelpButton from '@/components/HelpButton'
import SupportTicketModal from '@/components/SupportTicketModal'
```

---

## 8. Updated App Routes

**File:** `/src/App.jsx`

**Imports to Add:**

```jsx
import ClientOnboarding from '@/pages/client/Onboarding'
import AdminSupportTickets from '@/pages/admin/SupportTickets'
```

**Routes to Add:**

In Admin Routes section (after other routes):
```jsx
<Route path="support-tickets" element={<AdminSupportTickets />} />
```

In Client Routes section (after other routes):
```jsx
<Route path="onboarding" element={<ClientOnboarding />} />
```

---

## 9. Updated Sidebar Navigation

**File:** `/src/components/layout/Sidebar.jsx`

**Import to Add:**

```jsx
import { HelpCircle } from 'lucide-react'
```

**In adminNav array, add after analytics:**

```jsx
{ to: '/admin/support-tickets', label: 'Support Tickets', icon: HelpCircle },
```

---

## 10. Firestore Service Functions to Add

**File:** `/src/services/firestore.js`

**Add these 6 functions:**

```jsx
// Support Tickets
export const getSupportTicketsByStatus = (status) =>
  getCollection('supportTickets', [
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  ])

export const getSupportTicketsForClient = (clientId) =>
  getCollection('supportTickets', [
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
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

// Client Onboarding
export const updateClientProfile = async (clientId, businessProfile) => {
  await updateDocument('clients', clientId, {
    businessProfile,
    onboarding_complete: true,
  })
}

// Settings
export const getSupportTicketEmails = async () => {
  const settings = await getDocument('settings', 'global')
  if (!settings?.supportTicketEmails) return []
  return settings.supportTicketEmails
    .split(',')
    .map(e => e.trim())
    .filter(e => e)
}
```

---

## 11. Cloud Functions to Add

**File:** `/functions/src/index.js`

**Add this callable export:**

```jsx
export const createOnboardingJob = https.onCall(async (data, context) => {
  // See ARCHITECTURE.md Part 4 for full implementation
  // Key steps:
  // 1. Authenticate user
  // 2. Fetch client + packageId
  // 3. Fetch package for tier matching
  // 4. Query directories (top 300, matching tier)
  // 5. Create job document
  // 6. Trigger startSubmissionJob
  // 7. Return { success, jobId, directoryCount }
})
```

**In functions.js service, add:**

```jsx
export const createOnboardingJob = httpsCallable(functions, 'createOnboardingJob')
```

---

## 12. Helper Utilities Needed

These likely already exist in `/src/utils/helpers.js`, but verify:

```jsx
// For formatting
formatDate(timestamp) → formatted string
statusColor(status) → CSS class name
formatPhone(number) → formatted phone string

// Add if missing:
getStatusBadgeColor(status) → { bg, text } classes
getPriorityBadgeColor(priority) → { bg, text } classes
```

---

## 13. Styling Notes

- Use existing Tailwind utilities consistently
- Badge colors should match existing patterns:
  - Open/Info: bg-blue-100 text-blue-700
  - Resolved: bg-gray-100 text-gray-700
  - High priority: bg-red-100 text-red-700
  - Medium priority: bg-yellow-100 text-yellow-700
  - Low priority: bg-green-100 text-green-700

- Modal max-width:
  - SupportTicketModal: md (max-w-2xl)
  - DetailModal: lg (max-w-4xl)

- Cards use existing Card component from `/src/components/ui/Card.jsx`

- Buttons use existing Button component with variants:
  - Primary: default
  - Secondary: `variant="secondary"`

---

## 14. Testing Checklist

- [ ] Client can open help button → SupportTicketModal appears
- [ ] Client can submit ticket → appears in admin page
- [ ] Client sees success message
- [ ] Admin can view all tickets in table
- [ ] Admin can filter by status
- [ ] Admin can search by subject/client
- [ ] Admin can click ticket → detail modal opens
- [ ] Admin can see full description + replies
- [ ] Admin can add reply → saved to Firestore
- [ ] Admin can mark resolved → status changes
- [ ] Client onboarding redirects on first login
- [ ] Client can upload logo → preview shows
- [ ] Client can submit onboarding → job created
- [ ] Client redirects to citations after onboarding
- [ ] Settings page has email field
- [ ] Emails save correctly

---

## 15. Component Dependencies Map

```
App.jsx
├── Sidebar.jsx
│   └── Support Tickets link
├── ClientLayout
│   └── Dashboard.jsx
│       ├── HelpButton
│       └── SupportTicketModal
│           └── (creates supportTicket in Firestore)
│       └── Onboarding.jsx
│           └── (creates job via Cloud Function)
└── AdminLayout
    └── SupportTickets.jsx
        └── SupportTicketDetailModal
            ├── addTicketReply
            ├── markTicketAsResolved
            └── updateSupportTicket
```

---

This completes the detailed specifications for all components. Each component is designed to be built incrementally with clear dependencies and testing criteria.
