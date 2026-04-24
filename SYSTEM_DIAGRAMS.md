# System Architecture Diagrams

Visual representations of the four components and their interactions.

---

## 1. SUPPORT TICKET SYSTEM

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT SIDE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Dashboard                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [Help Button 📞]  ← Click to open                               │   │
│  └────────────────────────┬────────────────────────────────────────┘   │
│                           │                                              │
│                           ▼                                              │
│  Support Ticket Modal                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Subject:      [____________]                                    │   │
│  │ Description:  [______________]                                  │   │
│  │ Priority:     [Low ▼]                                            │   │
│  │               [Cancel] [Send Request]                           │   │
│  └────────────────────────┬────────────────────────────────────────┘   │
│                           │ Submit                                       │
│                           ▼                                              │
└─────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        FIRESTORE                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ Collection: supportTickets                                              │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │ Document: abc123                                                 │   │
│ │ {                                                                │   │
│ │   clientId: "client_xyz",                                        │   │
│ │   clientName: "John Doe",                                        │   │
│ │   clientEmail: "john@example.com",                               │   │
│ │   subject: "Can't submit citations",                             │   │
│ │   description: "Getting 503 error when clicking submit",         │   │
│ │   priority: "high",                                              │   │
│ │   status: "open",                                                │   │
│ │   replies: [                                                     │   │
│ │     { adminEmail: "admin@reboost.com",                           │   │
│ │       message: "We're investigating...",                         │   │
│ │       timestamp: "2026-04-24T10:30:00Z" }                        │   │
│ │   ],                                                             │   │
│ │   createdAt: 2026-04-24T10:00:00Z,                               │   │
│ │   updatedAt: 2026-04-24T10:30:00Z                                │   │
│ │ }                                                                │   │
│ └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADMIN SIDE                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Admin Support Tickets Page                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [Search: _______] [Status: All ▼]                              │   │
│  │                                                                 │   │
│  │ ┌──────────────────────────────────────────────────────────┐   │   │
│  │ │ Client      │ Subject          │ Priority │ Status │ Date│   │   │
│  │ │─────────────┼──────────────────┼──────────┼────────┼─────│   │   │
│  │ │ John Doe    │ Can't submit...  │ High     │ Open   │ 4/24│   │   │
│  │ │ Jane Smith  │ Logo rejected    │ Medium   │ Resolved │ 4/23│  │   │
│  │ └──────────────────────────────────────────────────────────┘   │   │
│  │         ▲                                                       │   │
│  │         │ Click to open detail modal                           │   │
│  │         │                                                       │   │
│  │  Support Ticket Detail Modal                                   │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │ John Doe (john@example.com)     [High] [Open]            │  │   │
│  │  │                                                           │  │   │
│  │  │ Original Message:                                         │  │   │
│  │  │ "Getting 503 error when clicking submit"                  │  │   │
│  │  │                                                           │  │   │
│  │  │ Replies:                                                  │  │   │
│  │  │ ┌─────────────────────────────────────────────────────┐  │  │   │
│  │  │ │ admin@reboost.com (04/24, 10:30)                    │  │  │   │
│  │  │ │ "We're investigating this. Will update soon."       │  │  │   │
│  │  │ └─────────────────────────────────────────────────────┘  │  │   │
│  │  │                                                           │  │   │
│  │  │ New Reply:                                                │  │   │
│  │  │ [___________________________________]                    │  │   │
│  │  │ [Send Reply] [Mark as Resolved]                          │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Tree

```
SupportTickets (Admin Page)
├── PageHeader
├── Search Input
├── Status Filter Select
├── Tickets Table
│   └── Row (clickable)
│       └── onClick → setSelectedTicket(ticket)
└── SupportTicketDetailModal (if open)
    ├── Ticket Header
    ├── Original Description
    ├── Replies List
    │   └── For each reply
    │       ├── Admin Email
    │       ├── Message
    │       └── Timestamp
    ├── Reply Form
    │   ├── Textarea
    │   └── Submit Button
    └── Status Actions
        └── Mark Resolved / Reopen Button
```

---

## 2. ADMIN EMAIL CONFIGURATION

### Simple Setting Storage

```
┌──────────────────────────────────────────────────────────┐
│             Settings Page (/admin/settings)              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Configuration Settings                                   │
│                                                          │
│ Captcha API Key:  [***hidden***] [👁 Show/Hide]        │
│ Gmail Address:    [support@example.com]                 │
│ Gmail Password:   [***hidden***] [👁 Show/Hide]        │
│                                                          │
│ Support Ticket Email Recipients:                         │
│ [admin1@company.com, admin2@company.com, admin3@...]   │
│ Help text: "Tickets will be sent to these addresses"    │
│                                                          │
│                                           [Save Settings]│
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         │ Form submission
         ▼
┌──────────────────────────────────────────────────────────┐
│               Firestore (settings/global)                │
├──────────────────────────────────────────────────────────┤
│ {                                                        │
│   captchaApiKey: "...",                                 │
│   gmailAddress: "support@example.com",                  │
│   gmailAppPassword: "...",                              │
│   supportTicketEmails: "admin1@company.com,             │
│                         admin2@company.com,              │
│                         admin3@company.com",             │
│   updatedAt: 2026-04-24T10:30:00Z                        │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
```

---

## 3. ONBOARDING FORM & AUTO-DEPLOY

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FIRST TIME LOGIN                               │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────┐
                    │  Check Profile      │
                    │ (onboarding_        │
                    │  complete = false?) │
                    └──────────┬──────────┘
                               │ NO
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      CLIENT ONBOARDING PAGE                             │
│                    (/dashboard/onboarding)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌─ Section 1: Basic Information ──────────────────────────────────────┐ │
│ │ Business Name: [Acme Corp____________]                             │ │
│ │ Phone:         [(555) 123-4567______]                              │ │
│ │ Email Account: [john@acme.com______]                              │ │
│ │ Email Public:  [support@acme.com__]                                │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Section 2: Business Details ───────────────────────────────────────┐ │
│ │ Logo: [Choose File] → [Logo Preview 📷]                            │ │
│ │ Category: [Restaurant ▼]                                            │ │
│ │ Website: [https://acme.com__________]                              │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Section 3: Location ────────────────────────────────────────────────┐ │
│ │ Address:    [123 Main St________]                                   │ │
│ │ City:       [New York_________]  State: [NY] ZIP: [10001___]       │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Section 4: Description ────────────────────────────────────────────┐ │
│ │ Short:  [Best pizza in NYC__________]                             │ │
│ │ Long:   [Family-owned restaurant serving authentic Italian...]    │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Section 5: Social Media ───────────────────────────────────────────┐ │
│ │ Facebook:  [https://facebook.com/acmecorp___]                     │ │
│ │ Instagram: [https://instagram.com/acmecorp__]                     │ │
│ │ Twitter:   [https://twitter.com/acmecorp____]                     │ │
│ │ ... etc ...                                                        │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                           [Start My]    │
│                                                           [Citations]   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Submit
                                 ▼
                    ┌──────────────────────┐
                    │ 1. Validate All      │
                    │    Fields            │
                    │ 2. Upload Logo to    │
                    │    Storage           │
                    │ 3. Save Profile      │
                    │    to Firestore      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Call Cloud Function  │
                    │ createOnboardingJob  │
                    │ (clientId)           │
                    └──────────┬───────────┘
                               │
┌──────────────────────────────────────────────────────────────────────────┐
│                       CLOUD FUNCTION                                     │
│  createOnboardingJob (HTTPS Callable)                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ 1. Fetch client doc → get packageId                                     │
│ 2. Fetch package doc → get tier                                         │
│ 3. Query directories:                                                   │
│    WHERE tier == package.tier                                           │
│    ORDER BY da DESC                                                     │
│    LIMIT 300                                                            │
│ 4. Create job doc:                                                      │
│    {                                                                    │
│      clientId, packageId,                                               │
│      status: "pending",                                                 │
│      directories: [...300 directories...],                              │
│      total: 300, progress: 0,                                           │
│      logs: [{type, message, timestamp}]                                 │
│    }                                                                    │
│ 5. Return {success, jobId, directoryCount}                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Show Success Toast   │
                    │ "Submissions being   │
                    │  created!"           │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Redirect to:         │
                    │ /dashboard/citations │
                    │ With message:        │
                    │ "Submissions queued" │
                    └──────────┬───────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    CITATIONS PAGE                                        │
│              (shows real-time job progress)                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ "Your citations are being submitted!"                                    │
│                                                                          │
│ Job Progress                                                             │
│ ┌──────────────────────────────────────────────────────┐                │
│ │████████████████░░░░░░░░░░░░░░░░░░░░░░░ 142 / 300   │                │
│ └──────────────────────────────────────────────────────┘                │
│                                                                          │
│ Recent Activity:                                                         │
│ ├─ ✓ Google My Business (High DA)                                       │
│ ├─ ✓ Yelp (High DA)                                                     │
│ ├─ ⏳ TripAdvisor (Medium DA)                                            │
│ └─ ⏳ OpenTable (Medium DA)                                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Database Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FIRESTORE UPDATES                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ 1. CLIENT DOCUMENT UPDATED                                              │
│    clients/{clientId}                                                   │
│    {                                                                    │
│      businessName: "Acme Corp",                                         │
│      packageId: "premium_plan",                                         │
│      businessProfile: {                        ← NEW                    │
│        businessName: "Acme Corp",                                        │
│        phone: "(555) 123-4567",                                         │
│        emailAccount: "john@acme.com",                                   │
│        emailPublic: "support@acme.com",                                 │
│        logoUrl: "gs://bucket/logos/...",                                │
│        category: "restaurant",                                          │
│        website: "https://acme.com",                                     │
│        address: "123 Main St",                                          │
│        city: "New York",                                                │
│        state: "NY",                                                     │
│        zip: "10001",                                                    │
│        shortDescription: "Best pizza in NYC",                           │
│        longDescription: "Family-owned...",                              │
│        socialMedia: {                                                   │
│          facebook: "https://facebook.com/...",                          │
│          instagram: "...",                                              │
│          // etc                                                         │
│        }                                                                │
│      },                                                                 │
│      onboarding_complete: true,                 ← NEW                  │
│      updatedAt: 2026-04-24T10:30:00Z                                    │
│    }                                                                    │
│                                                                          │
│ 2. JOB DOCUMENT CREATED                                                 │
│    jobs/{jobId}                                                         │
│    {                                                                    │
│      clientId: "client_xyz",                                            │
│      packageId: "premium_plan",                                         │
│      status: "pending",                                                 │
│      progress: 0,                                                       │
│      total: 300,                                                        │
│      directories: [                                                     │
│        { id: "gmb_001", name: "Google My Business", url: "..." },      │
│        { id: "yelp_001", name: "Yelp", url: "..." },                   │
│        // ... 298 more ...                                              │
│      ],                                                                 │
│      logs: [                                                            │
│        {                                                                │
│          type: "info",                                                  │
│          message: "Job created. 300 directories queued.",               │
│          timestamp: "2026-04-24T10:30:00Z"                              │
│        }                                                                │
│      ],                                                                 │
│      createdAt: 2026-04-24T10:30:00Z,                                   │
│      updatedAt: 2026-04-24T10:30:00Z                                    │
│    }                                                                    │
│                                                                          │
│ 3. STORAGE (Logo Upload)                                                │
│    gs://bucket/logos/client_xyz/logo.jpg                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. INTEGRATION OVERVIEW

### Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REBOOST CITATIONS                               │
│                       COMPLETE SYSTEM DIAGRAM                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      CLIENT SIDE                                │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  Client Dashboard                                                │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │ [Help Button 📞]      Sidebar Navigation                  │ │   │
│  │  │                       - Overview                            │ │   │
│  │  │ Statistics:           - Citations                           │ │   │
│  │  │ - Live Citations      - My Listings                         │ │   │
│  │  │ - Pending Subs        - Reports                             │ │   │
│  │  │ - Active Job Progress                                      │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  │                                                                  │   │
│  │  ┌─ On First Login ──────────────────────────────────────────┐  │   │
│  │  │ Force Redirect:                                           │  │   │
│  │  │ /dashboard/onboarding                                     │  │   │
│  │  │                                                            │  │   │
│  │  │ 5-Section Form:                                           │  │   │
│  │  │ 1. Basic Info (name, email, phone)                        │  │   │
│  │  │ 2. Business (logo, category, website)                     │  │   │
│  │  │ 3. Location (address, city, state, zip)                   │  │   │
│  │  │ 4. Description (short + long)                             │  │   │
│  │  │ 5. Social Media (6 platforms)                             │  │   │
│  │  │                                                            │  │   │
│  │  │ [Start My Citations] Button                               │  │   │
│  │  │   → Cloud Function Creates Job                            │  │   │
│  │  │   → Auto-redirect to Citations                            │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  │                                                                  │   │
│  │  Support Ticket Modal (Help Button)                             │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │ Subject: [___________________________]                     │ │   │
│  │  │ Description: [_____________________________]               │ │   │
│  │  │ Priority: [Medium ▼]                                       │ │   │
│  │  │ [Cancel] [Send Request]                                   │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                           │                                              │
└───────────────────────────┼──────────────────────────────────────────────┘
                            │
                            │ Create Ticket / Job
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FIRESTORE                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Collections:                                                            │
│  ├── clients/{id}                                                       │
│  │   └── businessProfile (NEW)                                          │
│  │       └── onboarding_complete (NEW)                                  │
│  │                                                                      │
│  ├── jobs/{id}                                                          │
│  │   ├── directories                                                    │
│  │   └── logs                                                           │
│  │                                                                      │
│  ├── supportTickets/{id}  (NEW)                                         │
│  │   ├── replies                                                        │
│  │   └── status                                                         │
│  │                                                                      │
│  ├── citations/{id}                                                     │
│  │                                                                      │
│  ├── directories/{id}                                                   │
│  │                                                                      │
│  ├── users/{id}                                                         │
│  │                                                                      │
│  ├── packages/{id}                                                      │
│  │                                                                      │
│  └── settings/global                                                    │
│      └── supportTicketEmails (NEW)                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                            │
                            │ Query / Update
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADMIN SIDE                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Admin Dashboard (/admin)                                               │
│  Sidebar Navigation:                                                    │
│  - Dashboard                                                            │
│  - Clients                                                              │
│  - Users                                                                │
│  - Directories                                                          │
│  - Packages                                                             │
│  - Jobs                                                                 │
│  - Reports                                                              │
│  - Analytics                                                            │
│  - Support Tickets (NEW) ← Link added                                  │
│  - Settings                                                             │
│                                                                          │
│  Support Tickets Page (/admin/support-tickets) (NEW)                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ [Search: __________] [Status: All ▼]                            │  │
│  │                                                                  │  │
│  │ Tickets Table:                                                   │  │
│  │ Client | Subject | Priority | Status | Date                     │  │
│  │ ─────────────────────────────────────────────────────            │  │
│  │ John   | Problem | High     | Open   | 4/24 ← Click           │  │
│  │                                                                  │  │
│  │ Detail Modal (opens on click):                                   │  │
│  │ ┌────────────────────────────────────────────────────────────┐  │  │
│  │ │ "Problem with submissions"  [High] [Open]                │  │  │
│  │ │                                                           │  │  │
│  │ │ Original: "Error when submitting..."                     │  │  │
│  │ │                                                           │  │  │
│  │ │ Replies:                                                 │  │  │
│  │ │ └─ Admin (04/24, 10:30): "We're looking into this..."  │  │  │
│  │ │                                                           │  │  │
│  │ │ New Reply: [_______________]  [Send] [Mark Resolved]    │  │  │
│  │ └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Settings Page (/admin/settings)                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Captcha API Key: [***] [👁]                                    │  │
│  │ Gmail Address: [support@reboost.com]                           │  │
│  │ Gmail Password: [***] [👁]                                     │  │
│  │ Support Email Recipients:                                       │  │
│  │ [admin1@company.com, admin2@company.com] (NEW)                 │  │
│  │                                                     [Save]      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. DATA FLOW DIAGRAM

### Request Journey

```
User Action
    │
    ├─ CLIENT FORM SUBMISSION
    │  └─ Support Ticket Modal
    │     └─ createSupportTicket(data)
    │        └─ Firestore: supportTickets collection
    │           └─ Admin page queries collection
    │              └─ Admin clicks ticket
    │                 └─ Replies, status updates
    │
    └─ CLIENT ONBOARDING
       └─ Onboarding Form (5 sections)
          ├─ uploadLogo(file)
          │  └─ Firebase Storage: logos/{clientId}/...
          ├─ updateClientProfile(businessProfile)
          │  └─ Firestore: clients/{clientId}
          │     ├─ businessProfile field
          │     └─ onboarding_complete = true
          │
          └─ createOnboardingJob()
             └─ Cloud Function
                ├─ Fetch client → packageId
                ├─ Fetch package → tier
                ├─ Query directories (top 300, matching tier)
                ├─ Create job document
                │  └─ Firestore: jobs/{jobId}
                └─ Return jobId to client
                   └─ Redirect to Citations
                      └─ Subscribe to job progress
```

---

## 6. COMPONENT DEPENDENCY GRAPH

```
App (Router)
│
├─ ClientLayout
│  └─ Dashboard
│     ├─ HelpButton (NEW)
│     │  └─ onClick → SupportTicketModal
│     │
│     ├─ SupportTicketModal (NEW)
│     │  ├── Input, Textarea, Select components
│     │  ├── react-hook-form + zod
│     │  └── createSupportTicket() firestore call
│     │
│     ├─ Check onboarding_complete
│     │  └─ If false → Redirect to /dashboard/onboarding
│     │
│     └─ Onboarding (NEW)
│        ├── Form with 5 sections
│        ├── Input, Textarea, Select components
│        ├── File upload (logo)
│        ├── react-hook-form + zod
│        ├── uploadLogo() storage call
│        ├── updateClientProfile() firestore call
│        └── createOnboardingJob() cloud function call
│
└─ AdminLayout
   ├─ Sidebar (MODIFIED)
   │  └─ Add Support Tickets link
   │
   └─ SupportTickets (NEW)
      ├── PageHeader, Input, Select components
      ├── getSupportTickets() / getSupportTicketsByStatus()
      ├── Search/filter logic
      │
      └─ SupportTicketDetailModal (NEW)
         ├── Modal, Textarea, Button components
         ├── Display replies
         ├── addTicketReply()
         ├── markTicketAsResolved()
         └── updateSupportTicket()

   └─ Settings (MODIFIED)
      └── Add supportTicketEmails input field
```

---

## 7. State Management Pattern

```
Component State
│
├─ UI State
│  ├─ open (boolean) ← Modal visibility
│  ├─ isSubmitting (boolean) ← Form submission
│  ├─ search (string) ← Search query
│  └─ filter (enum) ← Filter selection
│
├─ Data State
│  ├─ data (array) ← Loaded from Firestore
│  ├─ filtered (array) ← Filtered/searched data
│  ├─ selected (object) ← Selected item
│  └─ loading (boolean) ← Loading state
│
└─ Form State (react-hook-form)
   ├─ register() ← Field registration
   ├─ handleSubmit() ← Form submission
   ├─ formState.errors ← Validation errors
   └─ reset() ← Reset form
```

---

These diagrams provide visual understanding of how all four components fit together in the system.
