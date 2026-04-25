#!/usr/bin/env node

/**
 * ReBoost Citations - Bulk Directory Import Script
 *
 * Usage:
 * node scripts/import-directories.mjs
 *
 * This script imports all 16 citation directories directly into Firestore
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../firebase-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: firebase-key.json not found');
  console.log('To get your service account key:');
  console.log('1. Go to Firebase Console');
  console.log('2. Project Settings → Service Accounts');
  console.log('3. Click "Generate New Private Key"');
  console.log('4. Save as firebase-key.json in project root');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

// 16 Citation Directories
const directories = [
  { name: "Google My Business", url: "https://www.google.com/business", submissionUrl: "https://business.google.com/create", category: "General Business", da: 98, tier: "high", type: "web_form", useCustomerEmail: true },
  { name: "Apple Business Connect", url: "https://www.apple.com/business", submissionUrl: "https://businessconnect.apple.com/", category: "General Business", da: 100, tier: "high", type: "web_form", useCustomerEmail: true },
  { name: "Yelp", url: "https://www.yelp.com", submissionUrl: "https://biz.yelp.com/signup_business/new", category: "Review & Local Search", da: 93, tier: "high", type: "web_form", useCustomerEmail: true },
  { name: "Bing Places", url: "https://www.bingplaces.com", submissionUrl: "https://www.bingplaces.com/", category: "General Business", da: 94, tier: "high", type: "web_form", useCustomerEmail: false },
  { name: "Foursquare", url: "https://foursquare.com", submissionUrl: "https://foursquare.com/venue/claim", category: "Local Search", da: 91, tier: "high", type: "web_form", useCustomerEmail: false },
  { name: "Better Business Bureau", url: "https://www.bbb.org", submissionUrl: "https://www.bbb.org/get-listed", category: "Trust & Credibility", da: 86, tier: "high", type: "web_form", useCustomerEmail: true },
  { name: "Yellow Pages", url: "https://www.yellowpages.com", submissionUrl: "https://adsolutions.yp.com/listings/basic", category: "General Business", da: 82, tier: "high", type: "web_form", useCustomerEmail: false },
  { name: "LinkedIn Company Page", url: "https://www.linkedin.com", submissionUrl: "https://www.linkedin.com/company/setup/new/", category: "Professional Business", da: 95, tier: "high", type: "web_form", useCustomerEmail: false },
  { name: "Manta", url: "https://www.manta.com", submissionUrl: "https://www.manta.com/business-listings/add-your-company", category: "Local Business", da: 74, tier: "medium", type: "web_form", useCustomerEmail: false },
  { name: "Angi", url: "https://www.angi.com", submissionUrl: "https://www.angi.com", category: "Service Directory", da: 78, tier: "medium", type: "web_form", useCustomerEmail: true },
  { name: "ChamberofCommerce.com", url: "https://www.chamberofcommerce.com", submissionUrl: "https://www.chamberofcommerce.com/members/add-business", category: "Local Business", da: 65, tier: "medium", type: "web_form", useCustomerEmail: false },
  { name: "TripAdvisor", url: "https://www.tripadvisor.com", submissionUrl: "https://www.tripadvisor.com/Owners", category: "Hospitality & Travel", da: 78, tier: "medium", type: "web_form", useCustomerEmail: false },
  { name: "Trustpilot", url: "https://www.trustpilot.com", submissionUrl: "https://business.trustpilot.com/signup", category: "Review Platform", da: 75, tier: "medium", type: "web_form", useCustomerEmail: false },
  { name: "Thumbtack", url: "https://www.thumbtack.com", submissionUrl: "https://www.thumbtack.com/register", category: "Service Directory", da: 70, tier: "medium", type: "web_form", useCustomerEmail: false },
  { name: "Facebook Business", url: "https://www.facebook.com", submissionUrl: "https://business.facebook.com/", category: "Social Media", da: 72, tier: "medium", type: "web_form", useCustomerEmail: false },
  { name: "Instagram Business", url: "https://www.instagram.com", submissionUrl: "https://www.instagram.com/", category: "Social Media", da: 80, tier: "medium", type: "web_form", useCustomerEmail: false }
];

async function importDirectories() {
  console.log('🚀 Starting bulk import of 16 citation directories...\n');

  try {
    let imported = 0;
    let failed = 0;

    for (const dir of directories) {
      try {
        await db.collection('directories').add({
          name: dir.name,
          url: dir.url,
          submissionUrl: dir.submissionUrl,
          category: dir.category,
          da: dir.da,
          tier: dir.tier,
          type: dir.type,
          useCustomerEmail: dir.useCustomerEmail,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        imported++;
        console.log(`✅ ${dir.name} (DA: ${dir.da}, Tier: ${dir.tier})`);
      } catch (error) {
        failed++;
        console.log(`❌ ${dir.name}: ${error.message}`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Import Summary:`);
    console.log(`   Imported: ${imported}/16`);
    console.log(`   Failed: ${failed}/16`);
    console.log(`${'='.repeat(60)}\n`);

    if (imported === 16) {
      console.log('🎉 All 16 citation directories imported successfully!');
    } else {
      console.log(`⚠️  ${failed} directories failed to import.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

importDirectories();
