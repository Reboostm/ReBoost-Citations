/**
 * ReBoost Citations - Bulk Directory Import Script
 *
 * Usage:
 * 1. Open your admin panel and login
 * 2. Open browser console (F12 → Console tab)
 * 3. Copy-paste the entire contents of this file
 * 4. Script will authenticate and import all 16 citation directories
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js'
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js'
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-functions.js'

// Initialize Firebase (using your config)
const firebaseConfig = {
  apiKey: "AIzaSyDEKfKJ...", // Your Firebase config
  authDomain: "reboost-citations.firebaseapp.com",
  projectId: "reboost-citations",
  storageBucket: "reboost-citations.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
}

const app = initializeApp(firebaseConfig)
const functions = getFunctions(app)

// 16 Citation Directories
const directories = [
  { name: "Google My Business", url: "https://www.google.com/business", submissionUrl: "https://business.google.com/create", category: "General Business", da: "98", tier: "high", type: "web_form", useCustomerEmail: "true" },
  { name: "Apple Business Connect", url: "https://www.apple.com/business", submissionUrl: "https://businessconnect.apple.com/", category: "General Business", da: "100", tier: "high", type: "web_form", useCustomerEmail: "true" },
  { name: "Yelp", url: "https://www.yelp.com", submissionUrl: "https://biz.yelp.com/signup_business/new", category: "Review & Local Search", da: "93", tier: "high", type: "web_form", useCustomerEmail: "true" },
  { name: "Bing Places", url: "https://www.bingplaces.com", submissionUrl: "https://www.bingplaces.com/", category: "General Business", da: "94", tier: "high", type: "web_form", useCustomerEmail: "false" },
  { name: "Foursquare", url: "https://foursquare.com", submissionUrl: "https://foursquare.com/venue/claim", category: "Local Search", da: "91", tier: "high", type: "web_form", useCustomerEmail: "false" },
  { name: "Better Business Bureau", url: "https://www.bbb.org", submissionUrl: "https://www.bbb.org/get-listed", category: "Trust & Credibility", da: "86", tier: "high", type: "web_form", useCustomerEmail: "true" },
  { name: "Yellow Pages", url: "https://www.yellowpages.com", submissionUrl: "https://adsolutions.yp.com/listings/basic", category: "General Business", da: "82", tier: "high", type: "web_form", useCustomerEmail: "false" },
  { name: "LinkedIn Company Page", url: "https://www.linkedin.com", submissionUrl: "https://www.linkedin.com/company/setup/new/", category: "Professional Business", da: "95", tier: "high", type: "web_form", useCustomerEmail: "false" },
  { name: "Manta", url: "https://www.manta.com", submissionUrl: "https://www.manta.com/business-listings/add-your-company", category: "Local Business", da: "74", tier: "medium", type: "web_form", useCustomerEmail: "false" },
  { name: "Angi", url: "https://www.angi.com", submissionUrl: "https://www.angi.com", category: "Service Directory", da: "78", tier: "medium", type: "web_form", useCustomerEmail: "true" },
  { name: "ChamberofCommerce.com", url: "https://www.chamberofcommerce.com", submissionUrl: "https://www.chamberofcommerce.com/members/add-business", category: "Local Business", da: "65", tier: "medium", type: "web_form", useCustomerEmail: "false" },
  { name: "TripAdvisor", url: "https://www.tripadvisor.com", submissionUrl: "https://www.tripadvisor.com/Owners", category: "Hospitality & Travel", da: "78", tier: "medium", type: "web_form", useCustomerEmail: "false" },
  { name: "Trustpilot", url: "https://www.trustpilot.com", submissionUrl: "https://business.trustpilot.com/signup", category: "Review Platform", da: "75", tier: "medium", type: "web_form", useCustomerEmail: "false" },
  { name: "Thumbtack", url: "https://www.thumbtack.com", submissionUrl: "https://www.thumbtack.com/register", category: "Service Directory", da: "70", tier: "medium", type: "web_form", useCustomerEmail: "false" },
  { name: "Facebook Business", url: "https://www.facebook.com", submissionUrl: "https://business.facebook.com/", category: "Social Media", da: "72", tier: "medium", type: "web_form", useCustomerEmail: "false" },
  { name: "Instagram Business", url: "https://www.instagram.com", submissionUrl: "https://www.instagram.com/", category: "Social Media", da: "80", tier: "medium", type: "web_form", useCustomerEmail: "false" }
]

// Call bulk import function
async function importDirectories() {
  try {
    console.log('🚀 Starting bulk import of 16 citation directories...')

    const bulkImportDirectories = httpsCallable(functions, 'bulkImportDirectories')
    const result = await bulkImportDirectories({ directories })

    console.log('✅ Import complete!')
    console.log(`📊 Imported: ${result.data.imported} directories`)

    if (result.data.errors) {
      console.log('⚠️ Errors:', result.data.errors)
    }

    console.log(result.data.message)
    return result.data
  } catch (error) {
    console.error('❌ Import failed:', error.message)
    throw error
  }
}

// Run the import
importDirectories()
