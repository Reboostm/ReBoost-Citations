# ReBoost Citations: Deployment & Setup Guide

## Phase 2: Complete Onboarding & Support System

This guide covers the new onboarding system, support tickets, and GHL integration that was just implemented.

---

## 🚀 Quick Summary of What's New

### For Clients:
1. **Onboarding Form**: Required on first login
   - Step 1: Business basics (name, address, phone, website, category)
   - Step 2: Details & social media (descriptions, Facebook, Instagram, TikTok, YouTube, LinkedIn, Twitter)
   - Auto-saves to client profile
   - If package purchased (from GHL), auto-deploys citations immediately

2. **Support Help Button**: Blue floating circle in bottom-right
   - Click to submit support ticket
   - Goes directly to admin dashboard
   - Track conversation history

### For Admins:
1. **Support Dashboard** (`/admin/support`)
   - View all support tickets
   - Filter by: Open, In Progress, Resolved
   - Reply to customers directly
   - Change ticket status

2. **Settings Configuration** (`/admin/settings`)
   - Add support email recipients (comma-separated)
   - Configure 2Captcha API key
   - Configure Gmail for email verification

3. **Admin Client Management**
   - Can edit client info in Client Detail page
   - When client profile is saved with `businessProfile=true`, auto-deployment triggers if packageId exists

---

## 📋 GHL Integration Setup

### Step 1: Get Your Webhook URL

After deployment to Firebase, your webhook URL will be:

```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/ghlCreateAccount
```

Replace `YOUR_PROJECT_ID` with your Firebase project ID.

### Step 2: Configure GHL Workflow

In GHL, create a webhook trigger when payment is completed:

**Webhook Details:**
- **Method**: POST
- **URL**: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/ghlCreateAccount`
- **Content Type**: JSON

**Payload Format:**
```json
{
  "email": "customer@example.com",
  "packageId": "PACKAGE_ID_FROM_FIRESTORE",
  "businessName": "Customer Business Name"
}

Example:
{
  "email": "john@funeral home.com",
  "packageId": "pkg_funeral_540",
  "businessName": "John's Funeral Home"
}
```

### Step 3: Create GHL Workflow

1. Go to GHL Automations
2. Create workflow triggered by payment completion
3. Add webhook action with above URL
4. Map payment data to webhook fields:
   - Customer email → `email` field
   - Product purchased → map to `packageId`
   - Customer name/business → `businessName` field

**What Happens Automatically:**
- Account created with default password: `123456`
- Client record created with packageId link
- User can log in and goes straight to onboarding form
- After completing form, job auto-deploys if package exists

---

## 🔧 Client Onboarding Flow

### User Journey:

1. **GHL Checkout** → Customer purchases package
   - ↓ GHL webhook triggered
   - ↓ Account created in ReBoost

2. **Welcome Email** → Sent from your GHL workflow
   - Login URL
   - Default password: `123456`
   - Instructions to change password

3. **Login** → User enters ReBoost Citations
   - ↓ System checks if `businessProfile` is complete
   - ↓ Not complete? Redirect to `/onboarding`

4. **Onboarding Form** → User fills business info
   - Upload logo
   - Enter business details (name, address, contact)
   - Add social media links
   - Submit

5. **Auto-Deploy** → System automatically:
   - Saves profile (`businessProfile = true`)
   - Detects packageId
   - Creates job with citation distribution:
     - 30% High Authority (DA 70+)
     - 40% Medium Authority (DA 40-69)
     - 30% Low Authority (DA 20-39)
   - Submits citations to all sites
   - User redirected to Dashboard

6. **Dashboard** → User sees:
   - Active job progress
   - Recent citations
   - Job status

---

## 👥 Admin Client Onboarding (Manual)

If you're onboarding a client WITHOUT GHL (phone, in-person, etc.):

1. **Create Client** (`/admin/clients`)
   - Add business info manually
   - Don't set `businessProfile = true` yet

2. **Create User** (`/admin/users`)
   - Email and role (admin will set password)

3. **Link User to Client**
   - In Client Detail, make sure user email is added

4. **Have Client Complete Onboarding**
   - They log in and see `/onboarding` form
   - Complete and submit
   - Auto-deploy triggers if packageId is set

OR if you want to fill it out yourself:

1. Edit Client profile directly in `/admin/clients/:id`
2. Fill in all business info
3. Set `businessProfile = true`
4. If packageId exists, job auto-deploys

---

## 📞 Support Ticket System

### For Clients:

1. Click blue **Help** button (bottom-right)
2. Modal opens
3. Enter subject and message
4. Click **Send**
5. Ticket submitted to admin

### For Admins:

1. Go to **Support** (`/admin/support`)
2. See all open tickets
3. Click ticket to view details
4. Reply directly in the modal
5. Change status: Open → In Progress → Resolved
6. Replies sent to configured support emails

### Configure Support Emails:

1. Go to **Settings** (`/admin/settings`)
2. Scroll to "Support Email Recipients"
3. Enter emails separated by commas:
   ```
   admin@example.com, support@example.com, sales@example.com
   ```
4. Save

When tickets are submitted, notifications sent to all these emails.

---

## 🛠️ Deployment Steps

### 1. Firebase Functions Deployment

```bash
cd functions
npm install
firebase deploy --only functions
```

This deploys:
- `startSubmissionJob()` - Citation submission
- `ghlCreateAccount()` - GHL webhook endpoint
- All other existing functions

### 2. Frontend Deployment (Vercel)

```bash
git push origin main
```

Vercel auto-deploys on push. Check your Vercel dashboard.

### 3. Test GHL Integration

1. In GHL, send test webhook:
   ```
   POST https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/ghlCreateAccount
   
   {
     "email": "test@example.com",
     "packageId": "pkg_test",
     "businessName": "Test Business"
   }
   ```

2. Check Firebase Console:
   - Go to Firestore
   - Check `users` collection for new user
   - Check `clients` collection for new client with packageId

3. Log in as test user (password: `123456`)
   - Should be redirected to `/onboarding`
   - Complete form and submit
   - Should see job running on dashboard

---

## 📚 Key Files Modified/Created

### New Files:
- `src/pages/client/Onboarding.jsx` - Onboarding form with auto-deploy
- `src/pages/admin/SupportTickets.jsx` - Support ticket dashboard
- `src/components/support/HelpButton.jsx` - Floating help button

### Modified Files:
- `functions/src/index.js` - Added `ghlCreateAccount` webhook
- `src/App.jsx` - Added /onboarding and /admin/support routes
- `src/components/layout/ClientLayout.jsx` - Added onboarding check redirect
- `src/components/layout/Sidebar.jsx` - Added Support link
- `src/pages/admin/Settings.jsx` - Added support email config
- `src/services/firestore.js` - Enhanced with support ticket functions

---

## 🔍 Troubleshooting

### "User redirected to onboarding but form won't load"
- Check that client record exists in Firestore
- Verify `businessProfile` is missing or `false`
- Check browser console for errors

### "Job not auto-deploying after form submission"
- Verify packageId is set on client record
- Check Cloud Functions logs for errors
- Check that `startSubmissionJob` Cloud Function is deployed

### "Support tickets not sending notifications"
- Check that support emails are configured in Settings
- Verify email addresses are comma-separated
- Check Cloud Function logs for email sending errors

### "GHL webhook returns 400 error"
- Check payload has both `email` and `packageId` fields
- Verify packageId exists in Firestore
- Check Cloud Function logs for detailed error

---

## 📊 Database Changes

### Firestore Collections Modified:

**users**
- New field: `clientId` (links to clients collection)

**clients**
- New field: `packageId` (links to packages collection)
- New field: `businessProfile` (boolean, true when onboarding complete)

**supportTickets** (existing)
- Stores all support tickets from clients
- Admin can add notes/replies

**settings**
- New field: `supportEmails` (comma-separated list)

---

## 🎯 Next Steps

1. **Test Everything**:
   - [ ] Test GHL webhook (send test payload)
   - [ ] Test client onboarding flow
   - [ ] Test support ticket creation
   - [ ] Test auto-deployment

2. **Configure in GHL**:
   - [ ] Set up payment completion workflow
   - [ ] Configure webhook with correct URL
   - [ ] Test webhook with real payment

3. **Train Support Team**:
   - [ ] Show them /admin/support dashboard
   - [ ] Explain how to reply to tickets
   - [ ] Show how to update support email list

4. **Set Up Emails** (Optional):
   - [ ] Create reboostcitations@gmail.com account
   - [ ] Enable IMAP
   - [ ] Configure in Settings for email verification

5. **Monitor**:
   - [ ] Check /admin/support for tickets regularly
   - [ ] Monitor /admin/jobs for submission progress
   - [ ] Check Vercel and Firebase logs for errors

---

## 💡 Tips

- **Default password `123456`** is intentional - users must change it on first login
- **Auto-deploy distribution** (30/40/30) balances quality with speed - adjust in Onboarding.jsx line ~190 if needed
- **Support emails** can be updated anytime in Settings without code changes
- **GHL webhook** can be tested multiple times - duplicate accounts prevented by Firebase Auth

---

## 📞 Support

If issues arise during deployment:
1. Check Cloud Functions logs: Firebase Console → Functions
2. Check Firestore for data: Firebase Console → Firestore
3. Check Vercel logs: Vercel Dashboard → Deployments

All timestamps are in UTC in Firestore.
