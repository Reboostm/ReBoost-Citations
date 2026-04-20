@echo off
REM ReBoost Citations Complete Deployment Script (Windows)
REM Run this after upgrading Firebase to Blaze plan

echo.
echo 🚀 ReBoost Citations Deployment Script
echo =======================================
echo.

REM Step 1: Deploy Cloud Functions
echo 📦 Step 1: Deploying Cloud Functions...
call firebase deploy --only functions

if errorlevel 1 (
  echo ❌ Cloud Functions deployment failed. Ensure Firebase is on Blaze plan.
  exit /b 1
)

echo ✅ Cloud Functions deployed!
echo.

REM Step 2: Deploy Firestore Rules
echo 🔒 Step 2: Deploying Firestore Rules...
call firebase deploy --only firestore:rules

echo ✅ Firestore rules deployed!
echo.

REM Step 3: Seed directories
if exist "serviceAccountKey.json" (
  echo 🌱 Step 3: Seeding 2,000+ directories...
  call node scripts/seedDirectories.js

  if errorlevel 1 (
    echo ⚠️  Directory seeding failed. You can retry later.
  ) else (
    echo ✅ Directories seeded!
    del serviceAccountKey.json
    echo 🔐 Deleted serviceAccountKey.json for security
  )
) else (
  echo ⏭️  Step 3 SKIPPED: serviceAccountKey.json not found
  echo     To seed directories later:
  echo     1. Download serviceAccountKey.json from Firebase Console
  echo     2. Place in project root
  echo     3. Run: node scripts/seedDirectories.js
)

echo.
echo =======================================
echo ✅ DEPLOYMENT COMPLETE!
echo.
echo Next steps:
echo 1. Set environment variables in Vercel:
echo    https://vercel.com/reboostms-projects/re-boost-citations/settings/environment-variables
echo.
echo    Add these variables (find values in Firebase Console Settings):
echo    - VITE_FIREBASE_API_KEY
echo    - VITE_FIREBASE_AUTH_DOMAIN
echo    - VITE_FIREBASE_PROJECT_ID
echo    - VITE_FIREBASE_STORAGE_BUCKET
echo    - VITE_FIREBASE_MESSAGING_SENDER_ID
echo    - VITE_FIREBASE_APP_ID
echo    - VITE_ADMIN_EMAILS=your-email@example.com
echo.
echo 2. Create admin user in Firebase Auth:
echo    https://console.firebase.google.com/u/1/project/reboost-citations/authentication/users
echo.
echo 3. Visit your app:
echo    https://re-boost-citations.vercel.app
echo.
echo 🎉 Your ReBoost Citations SaaS is ready!
echo.
pause
