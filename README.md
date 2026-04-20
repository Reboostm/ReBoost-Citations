# ReBoost Citations

A full-stack local SEO citation management SaaS platform. Manage, submit, and track business citations across 2,000+ directories with automation powered by Playwright.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Storage, Cloud Functions)
- **Deployment**: Vercel (frontend) + Firebase (backend)
- **Automation**: Playwright + Puppeteer for form submission
- **Charts**: Recharts for analytics dashboards

## Features

### Admin Dashboard
- **Client Manager**: Add/edit/delete clients with logo uploads, business info, and social media links
- **Directory Database**: 2000+ pre-configured citation directories organized by category and authority tier
- **Citation Packages**: Create pricing tiers for citation campaigns (Starter, Growth, Pro, Agency)
- **Submission Engine**: Automated form filling & submission via Playwright with live job tracking
- **Reports**: Charts, PDF export, and shareable report links for client delivery
- **Citation Audit**: Find existing citations before submission to prevent duplicates

### Client Dashboard (Read-Only)
- View their business profile and active package
- Track citations in real-time with progress bars
- Export citation data as CSV
- View detailed reports with charts

## Setup

### Prerequisites
- Node.js 18+
- Firebase project (free tier supported)
- Google Custom Search API key (optional, for citation auditing)
- 2Captcha API key (optional, for CAPTCHA handling in submissions)

### 1. Clone & Install

```bash
git clone <repo-url>
cd ReBoost\ Citations
npm install
cd functions && npm install && cd ..
```

### 2. Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable these services:
   - **Authentication** → Enable Email/Password
   - **Firestore Database** → Create in production mode (US region recommended)
   - **Storage** → Create storage bucket for logo uploads
   - **Cloud Functions** → Enable

3. Download your service account key:
   - Project Settings → Service Accounts → Generate new private key
   - Save as `serviceAccountKey.json` in project root (for seeding)

4. Get your Firebase config:
   - Project Settings → Your apps → Web → Copy Firebase config

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx

VITE_GOOGLE_CSE_API_KEY=xxx          # Optional: for citation auditing
VITE_GOOGLE_CSE_ENGINE_ID=xxx        # Optional: for citation auditing

VITE_ADMIN_EMAILS=admin@yourco.com   # Bootstrap admin users
```

### 4. Seed Directory Database

Populate 2,000+ directories into Firestore:

```bash
node scripts/seedDirectories.js
```

This creates a comprehensive library of citation directories across 25+ business categories.

### 5. Deploy Cloud Functions

```bash
# Set up Firebase CLI
npm install -g firebase-tools
firebase login
firebase init functions

# Deploy
firebase deploy --only functions
```

Or deploy to Vercel with GitHub integration and set these env vars in Vercel dashboard:
- All `VITE_*` vars (Firebase config)
- `CAPTCHA_API_KEY` (if using CAPTCHA automation)

### 6. Run Locally

```bash
npm run dev
```

Open [localhost:5173](http://localhost:5173) and sign in with an admin email from `VITE_ADMIN_EMAILS`.

## Project Structure

```
ReBoost Citations/
├── src/
│   ├── components/
│   │   ├── layout/          # Admin/Client layouts & sidebar
│   │   ├── clients/         # Client CRUD forms
│   │   ├── directories/     # Directory browser
│   │   ├── packages/        # Package cards
│   │   ├── jobs/            # Job manager
│   │   ├── audit/           # Citation audit
│   │   ├── reports/         # Report components
│   │   └── ui/              # Shared UI (Button, Modal, Card, etc.)
│   ├── pages/
│   │   ├── admin/           # Admin pages (Dashboard, Clients, etc.)
│   │   ├── client/          # Client pages (Dashboard, Citations)
│   │   ├── Login.jsx        # Auth pages
│   │   └── PublicReport.jsx # Shareable report (no login)
│   ├── contexts/            # AuthContext for user state
│   ├── services/            # Firebase operations (Firestore, Storage, Functions)
│   ├── utils/               # Helpers, constants, date formatting
│   ├── App.jsx              # Router & main app
│   └── main.jsx             # Entry point
├── functions/src/
│   └── index.js             # Cloud Functions (Playwright automation)
├── scripts/
│   └── seedDirectories.js   # Seed 2000+ directories
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Firestore indexes
├── storage.rules            # Cloud Storage security rules
├── firebase.json            # Firebase config
├── vercel.json              # Vercel deployment config
└── .env.example             # Environment template
```

## Firebase Firestore Schema

### Collections

```
clients/{clientId}
  businessName, address, city, state, zip, phone, website
  category, hours, shortDesc, longDesc
  accountEmail, publicEmail
  logoUrl, socials {facebook, instagram, twitter, linkedin, yelp}
  createdAt, updatedAt

directories/{directoryId}
  name, url, submissionUrl
  category, da (domain authority), type (web_form|api|manual)
  tier (high|medium|low)
  createdAt

citations/{citationId}
  clientId, directoryId, directoryName
  status (pending|submitted|live|failed|needs_manual_review|duplicate)
  dateSubmitted, liveUrl
  logs[] (for failed submissions)

jobs/{jobId}
  clientId, clientName
  packageId, packageName
  status (pending|running|paused|completed|failed)
  progress, total
  tier (high|medium|low|all)
  logs[] {type, message, timestamp}
  createdAt, updatedAt

packages/{packageId}
  name, citationCount, price, description
  features[] (bullet points)
  highlighted (boolean)
  createdAt, updatedAt

users/{userId}
  email, role (admin|client)
  clientId (if role=client)

shareTokens/{token}
  clientId, clientName
  citationCount, generatedAt
```

## Cloud Functions

### Submission Engine (`startSubmissionJob`)
- Launches Playwright browser
- Fills forms with client business data
- Detects and flags CAPTCHA submissions
- Creates citations in Firestore with status tracking
- Logs all activity for transparency
- **Timeout**: 9 minutes (up to 540 seconds)

### Citation Audit (`runCitationAudit`)
- Uses Google Custom Search API
- Finds existing citations before submission
- Classifies as verified (known directories) or unverified
- Helps prevent duplicate submissions

### Other Functions
- `pauseSubmissionJob` — Pause an active job
- `resumeSubmissionJob` — Resume paused job
- `generatePdfReport` — Create PDF for export

## Deployment

### Vercel (Frontend)

1. Push code to GitHub
2. Connect repo in [vercel.com](https://vercel.com)
3. Add environment variables (all `VITE_*` from `.env`)
4. Deploy automatically on push

### Firebase (Backend)

Deploy Cloud Functions:
```bash
firebase deploy --only functions
```

Or use GitHub Actions for CI/CD:
```yaml
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install && cd functions && npm install
      - run: firebase deploy --token ${{ secrets.FIREBASE_TOKEN }}
```

## Security

- **Firestore Rules**: Row-level security by user role and client ownership
- **Cloud Storage**: Logo uploads validated by file type and size
- **Environment Variables**: Sensitive keys never committed
- **Email Verification**: Citations require account email verification from directories

## Performance

- **Batch Submission**: Process multiple directories in parallel (with rate limiting)
- **Indexed Queries**: Citations and jobs indexed by clientId & date for fast retrieval
- **Lazy Loading**: Report components load on demand
- **Code Splitting**: Vite automatically splits routes into chunks

## Testing Locally

### Add a test client:
1. Log in as admin
2. Go to Clients → Add Client
3. Fill in sample business data

### Create a citation package:
1. Go to Packages → New Package
2. Set citation count (e.g., 50) and price
3. Save

### Start a submission job:
1. Go to Jobs → New Job
2. Select client and package
3. Click "Start Job"
4. Watch live logs as citations submit

### View client dashboard:
1. Create a user account linked to the client
2. Sign in and view their citations and progress

## Troubleshooting

### "Cloud Function not deployed"
Functions need to be deployed before jobs can run. See Deployment section above.

### "No directories found"
Run `node scripts/seedDirectories.js` to populate the database.

### "Google CSE not configured"
Add `VITE_GOOGLE_CSE_API_KEY` and `VITE_GOOGLE_CSE_ENGINE_ID` to `.env` for citation auditing.

### "CAPTCHA blocking submissions"
Add `CAPTCHA_API_KEY` to functions environment for automated solving (requires 2Captcha account).

## Future Enhancements

- Email verification workflow tracking
- Bulk client import (CSV)
- White-label dashboard themes
- API for third-party integrations
- Advanced analytics (citation quality scoring, DA trends)
- Multi-language support
- Team collaboration features
- Custom form field mapping per directory

## License

Built with ❤️ for local business growth.

## Support

For issues, questions, or feature requests: [contact support]

---

**ReBoost Citations** — Automate your local SEO, multiply your citations.
