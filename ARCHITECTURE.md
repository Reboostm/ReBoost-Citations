# SaaS Onboarding & Support System Architecture

This document outlines the complete file-by-file architecture for implementing a four-component SaaS system. Implementation follows a bottom-up approach: data structures → services → components → pages → routing.

---

## PART 1: SUPPORT TICKET SYSTEM

### 1.1 Data Structure (Firestore Collection)

**Collection Path:** `supportTickets` (auto-generated IDs)

```firestore
{
  clientId: string,
  clientName: string,
  clientEmail: string,
  subject: string,
  description: string,
  priority: "low" | "medium" | "high",
  status: "open" | "resolved",
  createdAt: timestamp,
  resolvedAt: timestamp | null,
  replies: [
    {
      adminEmail: string,
      message: string,
      timestamp: string (ISO 8601),
    }
  ]
}
```

### 1.2 Firestore Service Functions

**File:** `/src/services/firestore.js` (MODIFY EXISTING)

Add these functions to the existing file:

```
createSupportTicket(data) → string (ticketId)
  - Already exists (line 231), no changes needed

getSupportTickets(constraints = []) → Promise<supportTicket[]>
  - Already exists (line 233), returns all tickets ordered by createdAt desc

updateSupportTicket(id, data) → Promise<void>
  - Already exists (line 236), updates ticket document

[NEW] getSupportTicketsByStatus(status) → Promise<supportTicket[]>
  - Query: where('status', '==', status), orderBy('createdAt', 'desc')
  - Returns: filtered support tickets

[NEW] getSupportTicketsForClient(clientId) → Promise<supportTicket[]>
  - Query: where('clientId', '==', clientId), orderBy('createdAt', 'desc')
  - Returns: tickets for a specific client

[NEW] addTicketReply(ticketId, reply) → Promise<void>
  - Update: arrayUnion(reply) to ticket.replies
  - Set: updatedAt: serverTimestamp()

[NEW] markTicketAsResolved(ticketId) → Promise<void>
  - Update: status: 'resolved', resolvedAt: serverTimestamp()
```

### 1.3 Client-Facing Components

#### Component A: `/src/components/HelpButton.jsx` (NEW)

- Simple icon button (Question mark / HelpCircle from lucide-react)
- Positioned in client dashboard header/sidebar
- onClick opens SupportTicketModal
- No styling needed (inherits from Button component)

```jsx
export default function HelpButton({ onClick }) {
  return <button onClick={onClick} className="...">
    <HelpCircle className="w-5 h-5" />
  </button>
}
```

#### Component B: `/src/components/SupportTicketModal.jsx` (NEW)

- Modal wrapper with title "Send Support Request"
- Form with fields:
  - **subject** (required, text input, max 100 chars)
  - **description** (required, textarea, 10 rows)
  - **priority** (required, select: low/medium/high)
- Two buttons:
  - Cancel (closes modal)
  - Send Request (submits)
- On submit:
  - Get clientId + clientName from useAuth()
  - Get clientEmail from userProfile
  - Call createSupportTicket()
  - Show success toast
  - Close modal
  - Reset form
- Loading state while submitting
- Form validation with react-hook-form + zod

**Props:**
```jsx
{
  open: boolean,
  onClose: () => void,
}
```

### 1.4 Admin-Facing Page

#### Page: `/src/pages/admin/SupportTickets.jsx` (NEW)

**Features:**
- PageHeader with title "Support Tickets"
- Search/filter bar:
  - Text search by subject/clientName
  - Status filter dropdown (All / Open / Resolved)
- Table view showing:
  - Client Name (link to client detail)
  - Subject
  - Priority (badge: red=high, yellow=medium, green=low)
  - Status (badge)
  - Created date (formatted)
  - Click row to open TicketDetailModal

**Interactions:**
- Click row → opens SupportTicketDetailModal
- Real-time updates (optional, use subscribeToCollection if needed)
- Pagination (optional, but good UX for many tickets)

**Data Loading:**
```jsx
useEffect(() => {
  const loadTickets = async () => {
    const tickets = await getSupportTickets()
    setAllTickets(tickets)
  }
})
```

#### Modal: `SupportTicketDetailModal.jsx` (NEW)

**Props:**
```jsx
{
  ticket: supportTicket,
  open: boolean,
  onClose: () => void,
  onUpdate: () => void, // callback to refresh parent table
}
```

**Sections:**
1. **Ticket Header:**
   - Title: ticket.subject
   - Info: Client name, priority badge, status badge
   - Created date

2. **Original Ticket:**
   - Display ticket.description in a read-only text block

3. **Replies Section:**
   - List all replies (reverse chronological)
   - Each reply shows:
     - Admin email
     - Message text
     - Timestamp (formatted)

4. **New Reply Form:**
   - Textarea for admin to type reply
   - Submit button: "Send Reply"
   - On submit:
     - Call addTicketReply() with { adminEmail, message, timestamp }
     - Clear textarea
     - Refresh replies list
     - Show toast success

5. **Status Management:**
   - If status === 'open':
     - Button "Mark as Resolved"
     - onClick: markTicketAsResolved() + close modal + callback
   - If status === 'resolved':
     - Button "Reopen Ticket"
     - onClick: updateSupportTicket(ticketId, { status: 'open' })

### 1.5 Client Dashboard Integration

**File:** `/src/pages/client/Dashboard.jsx` (MODIFY EXISTING)

- Add HelpButton to dashboard header (top-right near user avatar)
- Create state for SupportTicketModal visibility
- Render SupportTicketModal below the page content

---

## PART 2: ADMIN EMAIL CONFIGURATION

### 2.1 Data Structure (Firestore)

**Document Path:** `settings/global`

```firestore
{
  captchaApiKey: string,                    // existing
  gmailAddress: string,                     // existing
  gmailAppPassword: string,                 // existing
  supportTicketEmails: string,              // NEW: comma-separated emails
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### 2.2 Firestore Service Functions

**File:** `/src/services/firestore.js` (MODIFY EXISTING)

Add:
```
[NEW] getSupportTicketEmails() → Promise<string[]>
  - Get: settings/global
  - Parse: supportTicketEmails.split(',').map(e => e.trim())
  - Return: array of emails
```

### 2.3 Admin Settings Page

**File:** `/src/pages/admin/Settings.jsx` (MODIFY EXISTING)

**Changes:**
1. Update zod schema to include: `supportTicketEmails: z.string().min(1, 'Required')`

2. Update form defaultValues:
   ```jsx
   {
     captchaApiKey: '',
     gmailAddress: 'reboostcitations@gmail.com',
     gmailAppPassword: '',
     supportTicketEmails: '', // NEW
   }
   ```

3. Add new field in form before Save button:
   ```jsx
   <Input
     label="Support Ticket Email Recipients"
     placeholder="email1@example.com, email2@example.com"
     {...register('supportTicketEmails')}
     error={errors.supportTicketEmails?.message}
   />
   <p className="text-xs text-gray-500 mt-1">
     Support tickets will be sent to these addresses (comma-separated)
   </p>
   ```

4. In onSubmit, pass supportTicketEmails to the update call

---

## PART 3: ONBOARDING FORM (Client-Facing)

### 3.1 Data Structure (Firestore)

**Document Path:** `clients/{clientId}`

Existing structure + new field:

```firestore
{
  // existing fields...
  businessProfile: {
    businessName: string,
    phone: string,
    emailAccount: string,        // account email for contact
    emailPublic: string,          // public-facing email
    logoUrl: string,              // Firebase Storage URL after upload
    category: string,             // e.g., "Restaurant", "Salon", etc.
    website: string,
    address: string,
    city: string,
    state: string,
    zip: string,
    shortDescription: string,     // 1-2 sentences
    longDescription: string,      // detailed description
    socialMedia: {
      facebook: string,           // URLs or handles
      instagram: string,
      twitter: string,
      linkedin: string,
      youtube: string,
      tiktok: string,
    }
  },
  onboarding_complete: boolean,   // NEW
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### 3.2 Firestore Service Functions

**File:** `/src/services/firestore.js` (MODIFY EXISTING)

Existing functions already handle this, but add helper:

```
[NEW] updateClientProfile(clientId, businessProfile) → Promise<void>
  - Update: clients/{clientId}
  - Set: businessProfile, onboarding_complete: true
```

### 3.3 Onboarding Form Component

#### Page: `/src/pages/client/Onboarding.jsx` (NEW)

**Behavior:**
- If user has businessProfile, redirect to /dashboard
- Otherwise, show form
- Form is multi-section, single page (not stepped)

**Sections:**

1. **Basic Information**
   - Business Name (required, text)
   - Phone (required, text/tel)
   - Email (Account) (required, email)
   - Email (Public) (required, email)

2. **Business Details**
   - Logo Upload (file input, accept image/*, optional)
     - Show preview if uploaded
     - Max 5MB, hint text
   - Category (required, select dropdown)
     - Options: "Restaurant", "Salon", "Retail", "Service", "Professional", "Other"
   - Website (optional, URL)

3. **Location**
   - Address (required, text)
   - City (required, text)
   - State (required, select or text)
   - ZIP (required, text)

4. **Description**
   - Short Description (required, textarea, 2 rows, max 200 chars)
   - Long Description (required, textarea, 6 rows, min 50 chars)

5. **Social Media (Optional)**
   - Six input fields (Facebook, Instagram, Twitter, LinkedIn, YouTube, TikTok)
   - Placeholder examples: "https://..." or "@username"
   - All optional

6. **Submit**
   - Primary button: "Start My Citations"
   - Loading state while processing
   - Success message: "Your citations are being submitted! Redirecting..."

**Form Behavior:**
- Validation with react-hook-form + zod
- Logo upload to Firebase Storage via uploadLogo() service
- On submit:
  1. Validate all required fields
  2. Upload logo if provided → get logoUrl
  3. Call updateClientProfile() with businessProfile + logo URL
  4. Call createOnboardingJob() (cloud function) with clientId
  5. Show success toast
  6. Redirect to /dashboard/citations (or job monitoring page)

### 3.4 Client Dashboard Integration

**File:** `/src/pages/client/Dashboard.jsx` (MODIFY EXISTING)

On mount:
```jsx
useEffect(() => {
  if (client && !client.onboarding_complete) {
    navigate('/dashboard/onboarding')
  }
}, [client, navigate])
```

This forces first-time users to complete onboarding before seeing dashboard.

### 3.5 App Routing

**File:** `/src/App.jsx` (MODIFY EXISTING)

In the Client Routes section, add:
```jsx
<Route path="onboarding" element={<ClientOnboarding />} />
```

Import at top:
```jsx
import ClientOnboarding from '@/pages/client/Onboarding'
```

---

## PART 4: AUTO-DEPLOY FROM FORM (Cloud Function)

### 4.1 Cloud Function Overview

**Function Name:** `createOnboardingJob`

**Trigger:** HTTPS callable (not webhook, called from client form)

**Input:**
```javascript
{
  clientId: string,
  // businessProfile auto-loaded from Firestore
}
```

**Logic:**
1. Fetch client document (has packageId from GHL webhook)
2. Get package details
3. Query directories for:
   - Tier matching package tier
   - Limit to top 300 by DA
4. Create job document:
   ```javascript
   {
     clientId: string,
     packageId: string,
     status: "pending",
     progress: 0,
     total: <directory count>,
     directories: [{ id, name, url }],
     logs: [],
     createdAt: timestamp,
     updatedAt: timestamp,
   }
   ```
5. Trigger startSubmissionJob() cloud function with jobId
6. Return: { success: true, jobId: string }

**Error Handling:**
- Try/catch all async operations
- Log errors to Firestore
- Send email to admin emails (from settings)
- Return error details in response

### 4.2 Cloud Function Code

**File:** `/functions/src/index.js` (MODIFY EXISTING)

Add new export:

```javascript
export const createOnboardingJob = https.onCall(async (data, context) => {
  // 1. Verify authentication
  if (!context.auth?.uid) throw new HttpsError('unauthenticated', 'Not signed in')

  const { clientId } = data
  if (!clientId) throw new HttpsError('invalid-argument', 'clientId required')

  try {
    // 2. Fetch client + verify ownership
    const clientSnap = await db.collection('clients').doc(clientId).get()
    if (!clientSnap.exists) throw new Error('Client not found')
    
    const client = clientSnap.data()
    const packageId = client.packageId
    if (!packageId) throw new Error('No package assigned to client')

    // 3. Get package details (for tier matching)
    const pkgSnap = await db.collection('packages').doc(packageId).get()
    if (!pkgSnap.exists) throw new Error('Package not found')
    const pkg = pkgSnap.data()

    // 4. Query directories (top 300, matching tier)
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

    // 5. Create job document
    const jobRef = await db.collection('jobs').add({
      clientId,
      packageId,
      status: 'pending',
      progress: 0,
      total: directories.length,
      directories,
      logs: [{
        type: 'info',
        message: `Onboarding job created for ${client.businessName}. ${directories.length} directories queued.`,
        timestamp: new Date().toISOString(),
      }],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // 6. Trigger submission job
    await startSubmissionJob({
      jobId: jobRef.id,
      clientId,
    })

    return {
      success: true,
      jobId: jobRef.id,
      directoryCount: directories.length,
    }
  } catch (err) {
    console.error('Error creating onboarding job:', err)

    // Send admin notification email (get from settings)
    const settingsSnap = await db.collection('settings').doc('global').get()
    const settings = settingsSnap.data() || {}
    const adminEmails = settings.supportTicketEmails
      ?.split(',')
      .map(e => e.trim()) || []

    if (adminEmails.length > 0) {
      // Queue email to send via background function or direct SMTP
      await logErrorEmail({
        to: adminEmails,
        subject: `Onboarding Error for Client ${clientId}`,
        message: err.message,
        timestamp: new Date().toISOString(),
      })
    }

    throw new HttpsError('internal', `Failed to create onboarding job: ${err.message}`)
  }
})
```

### 4.3 Frontend Service Function

**File:** `/src/services/functions.js` (MODIFY EXISTING)

Add:
```javascript
export const createOnboardingJob = httpsCallable(functions, 'createOnboardingJob')
```

---

## PART 5: GHL WEBHOOK ENDPOINT (Documentation)

### 5.1 Cloud Function Specification

**Function Name:** `webhookCreateAccount`

**Trigger:** HTTPS POST (public, no auth required)

**Request Payload (from GHL):**
```json
{
  "email": "business@example.com",
  "packageId": "pkg_1234567890",
  "businessName": "Acme Corp",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response Payload:**
```json
{
  "success": true,
  "userId": "uid_xxxxxxxxx",
  "clientId": "client_xxxxxxxxx",
  "loginUrl": "https://app.reboostcitations.com/login"
}
```

**Database Operations:**
1. Create Auth user with email + password "123456"
2. Create Firestore user document:
   ```javascript
   {
     email: string,
     role: "client",
     clientId: string,
     createdAt: timestamp,
   }
   ```
3. Create Firestore client document:
   ```javascript
   {
     businessName: string,
     packageId: string,
     logoUrl: null,
     onboarding_complete: false,
     businessProfile: null,
     createdAt: timestamp,
   }
   ```
4. Link user to client via user.clientId

**Error Handling:**
- Invalid payload → 400 Bad Request
- Duplicate email → 409 Conflict
- Internal error → 500 Internal Server Error

**Status:** This function should be stubbed/documented but not implemented yet (GHL integration is separate task)

---

## PART 6: ROUTING UPDATES

### File: `/src/App.jsx`

**Changes:**

1. Import new components:
```jsx
import ClientOnboarding from '@/pages/client/Onboarding'
import AdminSupportTickets from '@/pages/admin/SupportTickets'
```

2. In Admin Routes (after other routes):
```jsx
<Route path="support-tickets" element={<AdminSupportTickets />} />
```

3. In Client Routes (after other routes):
```jsx
<Route path="onboarding" element={<ClientOnboarding />} />
```

---

## PART 7: NAVIGATION UPDATES

### File: `/src/components/layout/Sidebar.jsx`

**Changes:**

1. Admin navigation - add to `adminNav` array:
```jsx
{ to: '/admin/support-tickets', label: 'Support Tickets', icon: HelpCircle },
```

2. Import HelpCircle at top:
```jsx
import { ... HelpCircle ... } from 'lucide-react'
```

---

## PART 8: FILE TREE SUMMARY

```
src/
├── components/
│   ├── HelpButton.jsx                    (NEW)
│   ├── SupportTicketModal.jsx            (NEW)
│   ├── SupportTicketDetailModal.jsx      (NEW)
│   └── layout/
│       └── Sidebar.jsx                   (MODIFY)
├── pages/
│   ├── admin/
│   │   ├── SupportTickets.jsx            (NEW)
│   │   └── Settings.jsx                  (MODIFY)
│   └── client/
│       ├── Dashboard.jsx                 (MODIFY)
│       └── Onboarding.jsx                (NEW)
├── services/
│   ├── firestore.js                      (MODIFY - add 6 new functions)
│   └── functions.js                      (MODIFY - add 1 new callable)
└── App.jsx                               (MODIFY - add 2 routes)

functions/
└── src/
    └── index.js                          (MODIFY - add 1 cloud function)
```

---

## PART 9: IMPLEMENTATION SEQUENCE

**Recommended order:**

1. **Firestore Service Functions** (`firestore.js`)
   - Add support ticket helpers
   - Add client profile helper
   - Add settings helper

2. **Components** (in this order)
   - `HelpButton.jsx`
   - `SupportTicketModal.jsx`
   - `SupportTicketDetailModal.jsx`

3. **Pages**
   - `admin/SupportTickets.jsx`
   - `admin/Settings.jsx` (update)
   - `client/Onboarding.jsx`

4. **Service Functions**
   - `functions.js` (add callables)

5. **Cloud Functions**
   - `functions/src/index.js` (add createOnboardingJob)

6. **Integration**
   - `client/Dashboard.jsx` (update)
   - `App.jsx` (update)
   - `Sidebar.jsx` (update)

---

## PART 10: FORM VALIDATION SCHEMAS

### SupportTicketModal - Zod Schema

```javascript
const schema = z.object({
  subject: z.string().min(1, 'Subject required').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  priority: z.enum(['low', 'medium', 'high']),
})
```

### Onboarding Form - Zod Schema

```javascript
const schema = z.object({
  businessName: z.string().min(1, 'Business name required').max(100),
  phone: z.string().min(10, 'Valid phone required'),
  emailAccount: z.string().email('Valid email required'),
  emailPublic: z.string().email('Valid email required'),
  category: z.string().min(1, 'Category required'),
  website: z.string().url('Valid URL').optional().or(z.literal('')),
  address: z.string().min(1, 'Address required'),
  city: z.string().min(1, 'City required'),
  state: z.string().min(1, 'State required'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Valid ZIP required'),
  shortDescription: z.string().min(10).max(200),
  longDescription: z.string().min(50),
  socialMedia: z.object({
    facebook: z.string().optional().or(z.literal('')),
    instagram: z.string().optional().or(z.literal('')),
    twitter: z.string().optional().or(z.literal('')),
    linkedin: z.string().optional().or(z.literal('')),
    youtube: z.string().optional().or(z.literal('')),
    tiktok: z.string().optional().or(z.literal('')),
  }).optional(),
})
```

---

## PART 11: KEY DESIGN DECISIONS

1. **Support Tickets:**
   - Separate collection, not nested in client
   - Admin emails stored in global settings for centralized management
   - Replies stored as array (keeps everything together, good for small datasets)

2. **Onboarding:**
   - Force completion via dashboard redirect
   - Logo uploaded to Firebase Storage (not embedded in doc)
   - businessProfile nested object for clean organization
   - Auto-create job on form submit (not admin-triggered)

3. **Cloud Function:**
   - Called from client form (not webhook yet)
   - Fetches package tier to match directories intelligently
   - Returns jobId for client-side monitoring
   - Queues submission job immediately

4. **Navigation:**
   - Support Tickets added to admin sidebar
   - Help button integrated into client dashboard
   - Onboarding route forces first-time users before access

---

## IMPLEMENTATION CHECKLIST

- [ ] Add firestore.js helper functions
- [ ] Create HelpButton component
- [ ] Create SupportTicketModal component
- [ ] Create SupportTicketDetailModal component
- [ ] Create admin/SupportTickets page
- [ ] Update admin/Settings page with email field
- [ ] Create client/Onboarding page
- [ ] Add functions.js callables
- [ ] Create createOnboardingJob cloud function
- [ ] Update client/Dashboard.jsx with onboarding check
- [ ] Update App.jsx with routes
- [ ] Update Sidebar.jsx with navigation
- [ ] Test end-to-end: client submit support ticket → admin see it → admin reply
- [ ] Test end-to-end: client complete onboarding → job created → progress visible
- [ ] Deploy cloud functions
- [ ] Test GHL webhook endpoint (stubbed)
