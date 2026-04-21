#!/bin/bash

# ReBoost Citations Vercel Environment Setup Script

echo "🔧 Setting up Vercel environment variables..."
echo ""

# Firebase Config
firebase_vars=(
  "VITE_FIREBASE_API_KEY:AIzaSyAt7E302aEZJSJh_Kzcheg22k0cAFBfPeY"
  "VITE_FIREBASE_AUTH_DOMAIN:reboost-citations.firebaseapp.com"
  "VITE_FIREBASE_PROJECT_ID:reboost-citations"
  "VITE_FIREBASE_STORAGE_BUCKET:reboost-citations.firebasestorage.app"
  "VITE_FIREBASE_MESSAGING_SENDER_ID:167753495674"
  "VITE_FIREBASE_APP_ID:1:167753495674:web:498dc9207fae21392d77c3"
  "VITE_ADMIN_EMAILS:marketingreboost@gmail.com"
)

# Add each variable
for var in "${firebase_vars[@]}"; do
  IFS=':' read -r name value <<< "$var"
  echo "➕ Adding $name..."
  vercel env add "$name" production main << EOF
$value
EOF
  vercel env add "$name" preview main << EOF
$value
EOF
  vercel env add "$name" development main << EOF
$value
EOF
done

echo ""
echo "✅ All Vercel environment variables set!"
echo ""
echo "Now run: deploy.bat"
