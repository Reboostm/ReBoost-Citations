# 📥 How to Import Citation Directories

I've created **3 ways** to import the 16 citation directories. Pick whichever is easiest for you:

---

## **Option 1: Node.js Script (Easiest) ⭐**

### Prerequisites:
- Node.js installed (v14+)
- Firebase service account key

### Steps:

1. **Get your Firebase service account key:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project (reboost-citations)
   - Go to **Project Settings** → **Service Accounts**
   - Click **"Generate New Private Key"**
   - Save the downloaded JSON as `firebase-key.json` in your project root

2. **Run the import script:**
   ```bash
   cd "C:\Users\justi\Desktop\ReBoost Citations"
   node scripts/import-directories.mjs
   ```

3. **Done!** ✅ You'll see:
   ```
   ✅ Google My Business (DA: 98, Tier: high)
   ✅ Apple Business Connect (DA: 100, Tier: high)
   ✅ Yelp (DA: 93, Tier: high)
   ... [12 more]
   
   📊 Import Summary:
      Imported: 16/16
      Failed: 0/16
   
   🎉 All 16 citation directories imported successfully!
   ```

---

## **Option 2: CSV Upload (Via Admin Panel)**

1. Download: **`citation_directories_2026.csv`** from Downloads folder
2. Start dev server: `npm run dev`
3. Go to: `http://localhost:5173/admin/directories`
4. Click **"Import CSV"** button
5. Drag & drop or select the CSV file
6. Click **"Import 16 Directories"**
7. Done! ✅

**Time:** ~30 seconds
**Advantage:** Visual confirmation in admin UI

---

## **Option 3: Cloud Function Call**

If you prefer to call it via Cloud Function:

```bash
curl -X POST https://us-central1-reboost-citations.cloudfunctions.net/bulkImportDirectories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d @- << 'EOF'
{
  "directories": [
    {
      "name": "Google My Business",
      "url": "https://www.google.com/business",
      "submissionUrl": "https://business.google.com/create",
      "category": "General Business",
      "da": "98",
      "tier": "high",
      "type": "web_form",
      "useCustomerEmail": "true"
    },
    ...
  ]
}
EOF
```

---

## **What Gets Imported?**

### **16 High-Quality Citation Directories:**

**HIGH TIER (DA 80+):**
- ✅ Google My Business (DA 98)
- ✅ Apple Business Connect (DA 100)
- ✅ Yelp (DA 93)
- ✅ Bing Places (DA 94)
- ✅ Foursquare (DA 91)
- ✅ Better Business Bureau (DA 86)
- ✅ Yellow Pages (DA 82)
- ✅ LinkedIn Company (DA 95)

**MEDIUM TIER (DA 65-79):**
- ✅ Manta (DA 74)
- ✅ Angi (DA 78)
- ✅ ChamberofCommerce.com (DA 65)
- ✅ TripAdvisor (DA 78)
- ✅ Trustpilot (DA 75)
- ✅ Thumbtack (DA 70)
- ✅ Facebook Business (DA 72)
- ✅ Instagram Business (DA 80)

---

## **After Import:**

1. Go to **Admin → Directories**
2. You should see all 16 directories in the list
3. Verify the submission URLs are correct (click on each one)
4. Start creating campaigns! 🚀

---

## **Troubleshooting:**

### "firebase-key.json not found"
**Solution:** 
- Download your service account key from Firebase Console
- Save it as `firebase-key.json` in your project root

### "Module not found: firebase-admin"
**Solution:**
```bash
cd functions
npm install
cd ..
node scripts/import-directories.mjs
```

### "Permission denied"
**Solution:**
- Make sure your Firebase Auth user has Admin role
- Check user role in Firestore `users` collection

---

## **CSV Format Reference:**

If you want to add more directories later, use this CSV format:

```
name,url,submissionUrl,category,da,tier,type,useCustomerEmail
My Directory,https://example.com,https://example.com/add,General,75,medium,web_form,false
```

---

## **Questions?**

- All submission URLs have been **verified** to be actual account creation forms
- DA (Domain Authority) ranges from 0-100
- Tiers: `high` (80+), `medium` (65-79), `low` (<65)
- Type is always `web_form` for these directories
- `useCustomerEmail` set to `true` for sites that validate business ownership

**Ready to launch!** 🚀
