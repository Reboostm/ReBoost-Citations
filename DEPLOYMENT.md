# Deployment Guide

Your ReBoost Citations app has been pushed to GitHub and is ready for deployment. Follow these steps to get it live.

## Prerequisites

- GitHub account (already set up: https://github.com/Reboostm/ReBoost-Citations)
- Firebase project (already created: https://console.firebase.google.com/u/1/project/reboost-citations)
- Vercel account (already set up: https://vercel.com/reboostms-projects/re-boost-citations)
- Firebase CLI installed: `npm install -g firebase-tools`

## Step 1: Set Up Firebase Environment Variables

Your Firebase project ID is: `reboost-citations`

### Option A: Using Firebase CLI (Recommended for Cloud Functions)

```bash
firebase login
firebase use reboost-citations
```

Then set environment variables for Cloud Functions:

```bash
# Set 2Captcha API key (for CAPTCHA solving - optional)
firebase functions:config:set captcha.key="YOUR_2CAPTCHA_API_KEY"

# Set Google Custom Search API credentials (optional, for citation audit)
firebase functions:config:set google.cse_key="YOUR_CSE_API_KEY"
firebase functions:config:set google.cse_id="YOUR_CSE_ENGINE_ID"
```

Verify config was set:
```bash
firebase functions:config:get
```

## Step 2: Create `serviceAccountKey.json` for Seeding

1. Go to [Firebase Console](https://console.firebase.google.com/u/1/project/reboost-citations/settings/serviceaccounts/adminsdk)
2. Click "Generate New Private Key"
3. Save as `serviceAccountKey.json` in project root
4. **IMPORTANT**: Add to `.gitignore` (already done)

## Step 3: Seed the Directory Database (One-Time)

Run this once to populate 2,000+ citation directories:

```bash
node scripts/seedDirectories.js
```

Expected output:
```
🌱 Starting to seed 2000+ directories...
✅ Seeded 500 directories...
✅ Seeded 1000 directories...
✅ Seeded 1500 directories...
✅ Seeded 2000 directories...
✅ Successfully seeded 2000+ directories!
```

## Step 4: Deploy Cloud Functions

```bash
cd functions
npm install
cd ..

firebase deploy --only functions
```

This deploys:
- `startSubmissionJob` — Automated citation submission
- `pauseSubmissionJob` — Pause jobs
- `resumeSubmissionJob` — Resume jobs
- `runCitationAudit` — Citation auditing
- `generatePdfReport` — PDF report generation

Expected output:
```
⚠  functions: preparing functions directory for upload...
✔  functions: functions directory uploaded successfully
...
✔ Deploy complete!
```

## Step 5: Deploy Firestore Rules & Indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

This ensures:
- Row-level security by user role
- Client ownership validation
- Optimized query indexes

## Step 6: Set Up Vercel Deployment

Vercel will auto-deploy when you push to GitHub. Just add environment variables:

### In Vercel Dashboard:

1. Go to [Vercel Settings](https://vercel.com/reboostms-projects/re-boost-citations/settings/environment-variables)
2. Add these environment variables:

```
VITE_FIREBASE_API_KEY=<from Firebase Console>
VITE_FIREBASE_AUTH_DOMAIN=reboost-citations.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=reboost-citations
VITE_FIREBASE_STORAGE_BUCKET=reboost-citations.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<from Firebase Console>
VITE_FIREBASE_APP_ID=<from Firebase Console>

VITE_GOOGLE_CSE_API_KEY=<optional, for citation audit>
VITE_GOOGLE_CSE_ENGINE_ID=<optional, for citation audit>

VITE_ADMIN_EMAILS=your-email@example.com
```

Find Firebase config at: https://console.firebase.google.com/u/1/project/reboost-citations/settings/general

## Step 7: Configure Firebase Hosting (Optional)

If you want Firebase to also host the frontend:

```bash
firebase deploy --only hosting
```

But Vercel is recommended for better performance.

## Step 8: Create Your First Admin User

1. Go to [Firebase Authentication](https://console.firebase.google.com/u/1/project/reboost-citations/authentication/users)
2. Click "Add User"
3. Email: `your-email@example.com` (must match `VITE_ADMIN_EMAILS`)
4. Password: Generate a temporary one
5. User will be promoted to admin on first login

## Step 9: Bootstrap the App

1. Visit your Vercel deployment URL (e.g., `https://re-boost-citations.vercel.app`)
2. Click "Sign in" and use the admin email
3. You'll be promoted to admin role automatically
4. Go to Clients and add your first test client
5. Seed directories if not done yet: `node scripts/seedDirectories.js`
6. Create a citation package (Packages → New Package)
7. Start a submission job (Jobs → New Job)

## Monitoring & Logging

### Cloud Functions Logs
```bash
firebase functions:log
```

### Firestore Usage
https://console.firebase.google.com/u/1/project/reboost-citations/firestore/usage

### Vercel Deployment Logs
https://vercel.com/reboostms-projects/re-boost-citations/deployments

## Updating & Redeploying

### Deploy Frontend Changes
```bash
git add .
git commit -m "Update feature"
git push origin main
# Vercel auto-deploys
```

### Deploy Backend Changes
```bash
git add .
git commit -m "Update functions"
git push origin main
firebase deploy --only functions
```

### Deploy All
```bash
git push origin main
firebase deploy
```

## Troubleshooting Deployment

### "Functions failed to deploy"
- Check you're logged in: `firebase login`
- Verify project: `firebase use reboost-citations`
- Check package.json in `/functions` has dependencies

### "Vercel build fails"
- Check environment variables are set in Vercel dashboard
- Ensure `.env.example` was copied (should have all `VITE_*` vars)

### "Firestore rules rejected my request"
- Ensure you're logged in with Firebase Auth
- Check your user role is set in Firestore
- Verify client ownership rules

### "Cannot seed directories"
- Ensure `serviceAccountKey.json` is in project root
- File should NOT be committed (in .gitignore)
- Run `node scripts/seedDirectories.js` from project root

## URLs

- **Frontend (Vercel)**: https://re-boost-citations.vercel.app
- **Firebase Console**: https://console.firebase.google.com/u/1/project/reboost-citations
- **GitHub Repo**: https://github.com/Reboostm/ReBoost-Citations
- **Vercel Project**: https://vercel.com/reboostms-projects/re-boost-citations

## Next Steps

1. ✅ Set environment variables in Vercel
2. ✅ Deploy Cloud Functions: `firebase deploy --only functions`
3. ✅ Seed directories: `node scripts/seedDirectories.js`
4. ✅ Create admin user in Firebase Auth
5. ✅ Test the app end-to-end
6. ✅ Configure billing alerts in Firebase Console

**That's it! Your ReBoost Citations SaaS is live and ready for clients.**
