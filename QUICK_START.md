# Quick Start — Complete Setup in 15 Minutes

Your ReBoost Citations app is deployed to GitHub and ready to go live. Follow these steps:

## ⚠️ STEP 1: Upgrade Firebase to Blaze Plan (2 min)

**Required for Cloud Functions to work**

👉 **Go here NOW:** https://console.firebase.google.com/project/reboost-citations/usage/details

Click "Upgrade to Blaze" → Add billing → Confirm

*(Don't worry, it's pay-as-you-go and costs ~$0.40/month for citations)*

---

## ✅ STEP 2: Get Your Firebase Config (2 min)

Once Blaze is upgraded:

1. Go to [Firebase Console Settings](https://console.firebase.google.com/u/1/project/reboost-citations/settings/general)
2. Scroll to "Your apps" → Click the Web app (or create one if missing)
3. Copy the config object that looks like:

```javascript
{
  apiKey: "AIzaSy...",
  authDomain: "reboost-citations.firebaseapp.com",
  projectId: "reboost-citations",
  storageBucket: "reboost-citations.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
}
```

---

## ⚡ STEP 3: Run Automatic Deployment (5 min)

Run this command (Windows):

```bash
deploy.bat
```

Or on Mac/Linux:

```bash
bash deploy.sh
```

This will:
- ✅ Deploy Cloud Functions
- ✅ Deploy Firestore Rules
- ✅ Seed 2,000+ directories (if you have serviceAccountKey.json)
- ✅ Show next steps

---

## 🔐 STEP 4: Set Vercel Environment Variables (3 min)

**Go to:** https://vercel.com/reboostms-projects/re-boost-citations/settings/environment-variables

**Add these 7 variables** (copy from Firebase config above):

| Key | Value | Example |
|-----|-------|---------|
| `VITE_FIREBASE_API_KEY` | From Firebase config | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | From Firebase config | `reboost-citations.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | From Firebase config | `reboost-citations` |
| `VITE_FIREBASE_STORAGE_BUCKET` | From Firebase config | `reboost-citations.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase config | `123456789` |
| `VITE_FIREBASE_APP_ID` | From Firebase config | `1:123456789:web:abc...` |
| `VITE_ADMIN_EMAILS` | Your email | `your-email@example.com` |

After adding, click "Save" — Vercel auto-redeploys!

---

## 👤 STEP 5: Create Admin User (2 min)

**Go to:** https://console.firebase.google.com/u/1/project/reboost-citations/authentication/users

Click "Add User":
- **Email:** `your-email@example.com` (must match VITE_ADMIN_EMAILS)
- **Password:** Generate temporary password
- Click "Create User"

---

## 🎉 STEP 6: Log In & Test (1 min)

1. Go to: https://re-boost-citations.vercel.app
2. Click "Sign In"
3. Email: your-email@example.com
4. Password: (from Firebase Auth)
5. **✅ You're automatically promoted to Admin!**

---

## 🧪 Quick Test (Inside the App)

Once logged in:

1. **Add a client:**
   - Clients → "Add Client"
   - Fill in sample business data
   - Save

2. **Create a package:**
   - Packages → "New Package"
   - Name: "Starter"
   - Citations: 50
   - Price: $299
   - Save

3. **Start a job:**
   - Jobs → "New Job"
   - Select your client
   - Select the package
   - Click "Start Job"
   - Watch the logs in real-time! 📊

---

## 📍 Important URLs

- **Live App:** https://re-boost-citations.vercel.app
- **GitHub:** https://github.com/Reboostm/ReBoost-Citations
- **Firebase Console:** https://console.firebase.google.com/u/1/project/reboost-citations
- **Vercel Project:** https://vercel.com/reboostms-projects/re-boost-citations
- **Firebase Auth:** https://console.firebase.google.com/u/1/project/reboost-citations/authentication/users

---

## ❓ Troubleshooting

### Blank white page after signing in?
- Check Vercel env vars are set
- Hard refresh (Ctrl+Shift+R)
- Check Vercel build logs

### "Cloud Function not deployed"?
- Run `deploy.bat` after Firebase upgrade completes

### Cannot add clients or see data?
- Ensure you're signed in as admin
- Check Firestore rules in Firebase Console

### Need to seed directories?
1. Download `serviceAccountKey.json` from Firebase Console
2. Place in project root
3. Run: `node scripts/seedDirectories.js`

---

## ✨ That's It!

Your full-stack SaaS is now **LIVE** with:
- ✅ Automated citation submissions (Playwright)
- ✅ Real-time job tracking
- ✅ 2,000+ citation directories
- ✅ Admin dashboard
- ✅ Client dashboard
- ✅ Reports & analytics

**Total time: ~15 minutes** ⏱️

Questions? Check `DEPLOYMENT.md` for detailed docs.
