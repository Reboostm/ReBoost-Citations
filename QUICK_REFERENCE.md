# Quick Reference Guide

Fast lookup for files, functions, and key decisions.

---

## FILE CHECKLIST

### New Files to Create (5 total)
- [ ] `/src/components/HelpButton.jsx`
- [ ] `/src/components/SupportTicketModal.jsx`
- [ ] `/src/components/SupportTicketDetailModal.jsx`
- [ ] `/src/pages/admin/SupportTickets.jsx`
- [ ] `/src/pages/client/Onboarding.jsx`

### Files to Modify (6 total)
- [ ] `/src/services/firestore.js` - Add 6 functions
- [ ] `/src/services/functions.js` - Add 1 callable
- [ ] `/src/pages/admin/Settings.jsx` - Add email config field
- [ ] `/src/pages/client/Dashboard.jsx` - Add help button + onboarding check
- [ ] `/src/App.jsx` - Add 2 routes
- [ ] `/src/components/layout/Sidebar.jsx` - Add navigation link

### Cloud Function to Add (1 total)
- [ ] `/functions/src/index.js` - Add createOnboardingJob

---

## FIRESTORE SCHEMA REFERENCE

### Collection: supportTickets

```
supportTickets/{documentId}
├── clientId: string
├── clientName: string
├── clientEmail: string
├── subject: string (max 100)
├── description: string (10-1000 chars)
├── priority: enum(low, medium, high)
├── status: enum(open, resolved)
├── createdAt: timestamp
├── resolvedAt: timestamp | null
├── replies: array[
│   ├── adminEmail: string
│   ├── message: string
│   └── timestamp: ISO 8601 string
│ ]
└── updatedAt: timestamp
```

### Document: settings/global (ADD FIELD)

```
settings/global
├── captchaApiKey: string (existing)
├── gmailAddress: string (existing)
├── gmailAppPassword: string (existing)
├── supportTicketEmails: string (NEW) ← "email1@example.com, email2@example.com"
├── createdAt: timestamp (existing)
└── updatedAt: timestamp (existing)
```

### Document: clients/{clientId} (ADD FIELD)

```
clients/{clientId}
├── businessName: string (existing)
├── ... other existing fields ...
├── businessProfile: object (NEW) {
│   ├── businessName: string
│   ├── phone: string
│   ├── emailAccount: string
│   ├── emailPublic: string
│   ├── logoUrl: string | null
│   ├── category: string
│   ├── website: string | null
│   ├── address: string
│   ├── city: string
│   ├── state: string
│   ├── zip: string
│   ├── shortDescription: string
│   ├── longDescription: string
│   └── socialMedia: object {
│       ├── facebook: string | null
│       ├── instagram: string | null
│       ├── twitter: string | null
│       ├── linkedin: string | null
│       ├── youtube: string | null
│       └── tiktok: string | null
│   }
├── onboarding_complete: boolean (NEW)
├── createdAt: timestamp (existing)
└── updatedAt: timestamp (existing)
```

---

## FIRESTORE SERVICE FUNCTIONS

### Existing (Keep As-Is)
```javascript
createSupportTicket(data)                    // Line 231
getSupportTickets(constraints = [])          // Line 233
updateSupportTicket(id, data)                // Line 236
```

### New to Add
```javascript
getSupportTicketsByStatus(status)
getSupportTicketsForClient(clientId)
addTicketReply(ticketId, reply)
markTicketAsResolved(ticketId)
updateClientProfile(clientId, businessProfile)
getSupportTicketEmails()
```

---

## CLOUD FUNCTIONS

### Existing Functions
- startSubmissionJob
- pauseSubmissionJob
- resumeSubmissionJob
- runCitationAudit
- generatePdfReport

### New Function
- **createOnboardingJob** (https.onCall)
  - Input: { clientId }
  - Output: { success, jobId, directoryCount }
  - Triggered from: Client onboarding form submit
  - Creates job with top 300 directories matching package tier

---

## COMPONENT HIERARCHY

```
App
├── ClientLayout
│   └── ClientDashboard
│       ├── HelpButton
│       └── SupportTicketModal
│   └── Onboarding
│       └── (form with 5 sections)
│
└── AdminLayout
    └── SupportTickets
        └── SupportTicketDetailModal
```

---

## ROUTING REFERENCE

### Admin Routes (Add to App.jsx)
```
/admin/support-tickets  → SupportTickets page
```

### Client Routes (Add to App.jsx)
```
/dashboard/onboarding   → Onboarding page
```

### Sidebar Navigation (Update Sidebar.jsx)
Admin sidebar: Add "Support Tickets" after "Settings"

---

## FORM VALIDATION SCHEMAS

### Support Ticket Form
```javascript
subject: string (1-100 chars)
description: string (10-1000 chars)
priority: enum(low, medium, high)
```

### Onboarding Form
```javascript
// Basic Info
businessName: string (1-100 chars)
phone: string (10-20 chars)
emailAccount: string (valid email)
emailPublic: string (valid email)

// Business
category: string (from enum)
website: string (valid URL, optional)

// Location
address: string
city: string
state: string (2-letter code)
zip: string (5-9 digit format)

// Description
shortDescription: string (10-200 chars)
longDescription: string (50+ chars)

// Social (all optional)
facebook: string (URL or empty)
instagram: string (URL or empty)
twitter: string (URL or empty)
linkedin: string (URL or empty)
youtube: string (URL or empty)
tiktok: string (URL or empty)
```

---

## BADGE COLORS

### Priority
- **High** → bg-red-100 text-red-700
- **Medium** → bg-yellow-100 text-yellow-700
- **Low** → bg-green-100 text-green-700

### Status
- **Open** → bg-blue-100 text-blue-700
- **Resolved** → bg-gray-100 text-gray-700

---

## KEY DEPENDENCIES

### Components
- Modal (existing)
- Input (existing)
- Textarea (existing)
- Select (existing)
- Button (existing)
- Badge (existing)
- Card (existing)
- PageHeader (existing)
- PageLoader (existing)
- EmptyState (existing)

### Libraries
- react-hook-form
- zod (validation)
- react-hot-toast (notifications)
- lucide-react (icons)
- firebase (Firestore, Functions, Storage)

### Utilities
- `/src/utils/helpers.js` - formatDate, statusColor, etc.
- `/src/utils/cn.js` - class name utility
- `/src/services/storage.js` - uploadLogo() function

---

## STATE MANAGEMENT PATTERN

### Client-Side Form State
```javascript
const { register, handleSubmit, formState: { errors }, reset } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... }
})
```

### Modal State
```javascript
const [open, setOpen] = useState(false)
const [selectedItem, setSelectedItem] = useState(null)
```

### Data Loading
```javascript
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [filtered, setFiltered] = useState([])
```

---

## ERROR HANDLING PATTERN

```javascript
try {
  setLoading(true)
  // async operation
  toast.success('Operation successful')
} catch (error) {
  console.error('Error:', error)
  toast.error(error.message || 'Operation failed')
} finally {
  setLoading(false)
}
```

---

## TESTING SCENARIOS

### Support Ticket Flow
1. Client opens help button → modal appears
2. Client fills form → validation works
3. Client submits → ticket created in Firestore
4. Client sees success message
5. Admin views tickets table
6. Admin searches/filters tickets
7. Admin clicks ticket → detail modal opens
8. Admin reads description + replies
9. Admin adds reply → saved and displayed
10. Admin marks resolved → status updates

### Onboarding Flow
1. Client logs in for first time
2. Dashboard redirects to onboarding (no businessProfile.onboarding_complete)
3. Client fills 5-section form
4. Client uploads logo → preview shows
5. Client validates all fields
6. Client submits → logo uploads to Storage
7. businessProfile saved to Firestore
8. Job created via cloud function
9. Client redirected to citations with message
10. Job runs in background

---

## COMMON MISTAKES TO AVOID

1. **Forgetting onboarding redirect** in Dashboard useEffect
2. **Missing comma** in adminNav array in Sidebar.jsx
3. **Wrong import path** for components (use @/components pattern)
4. **Not setting logoUrl** in businessProfile object
5. **Validating file size** client-side before upload
6. **Not using serverTimestamp()** for Firestore dates
7. **Forgetting to close modal** after success
8. **Not resetting form** after submission
9. **Missing error handling** in try/catch blocks
10. **Not using react-hook-form register** for form inputs

---

## DEBUGGING CHECKLIST

- [ ] Check browser console for errors
- [ ] Check Firestore for document creation
- [ ] Verify form validation schema matches inputs
- [ ] Check modal open/close state
- [ ] Verify Firestore rules allow reads/writes
- [ ] Test with real email addresses in settings
- [ ] Check Firebase Storage for uploaded logos
- [ ] Verify cloud function is deployed
- [ ] Check function logs in Firebase Console
- [ ] Test Firestore query constraints

---

## MIGRATION PATH (If Updating Existing System)

1. Backup Firestore data
2. Add new fields to existing settings document
3. Create new collection: supportTickets
4. Test all new features in staging
5. Deploy updated Cloud Function
6. Deploy updated frontend
7. Monitor logs for errors

---

## PERFORMANCE NOTES

- Support Tickets ordered by createdAt desc (good for pagination)
- Directories query limited to 300 (reasonable for onboarding)
- Search/filter happens client-side for tickets (OK for typical admin use)
- Logo preview created with FileReader (no server round trip)
- Replies stored as array (fine for typical ticket volume)

---

## FUTURE ENHANCEMENTS

1. Email notifications when ticket is created
2. Pagination for large ticket lists
3. Ticket assignment to admins
4. Auto-close resolved tickets after 30 days
5. Email replies directly from support@ email
6. Ticket priority escalation
7. SLA tracking
8. Support team analytics

---

## DEPLOYMENT CHECKLIST

- [ ] All 5 new files created and tested
- [ ] All 6 files modified and tested
- [ ] Cloud function deployed
- [ ] Firestore rules updated if needed
- [ ] Settings email field populated
- [ ] Firebase Storage permissions correct
- [ ] All components imported correctly
- [ ] All routes added to App.jsx
- [ ] Sidebar navigation updated
- [ ] Test onboarding flow end-to-end
- [ ] Test support ticket flow end-to-end
- [ ] Monitor logs after deployment

---

This quick reference should answer most "where does X go?" questions during implementation.
