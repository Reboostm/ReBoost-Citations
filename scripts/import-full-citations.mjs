#!/usr/bin/env node

/**
 * ReBoost Citations - Full Database Import Script (143 Directories)
 *
 * Usage:
 * node scripts/import-full-citations.mjs
 *
 * This script imports all 143 citation directories from CSV into Firestore
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

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

// Read CSV file
const csvPath = path.join(__dirname, '../comprehensive_citations_150+.csv');

if (!fs.existsSync(csvPath)) {
  console.error('❌ Error: comprehensive_citations_150+.csv not found');
  console.log('Please ensure the CSV file is in the project root');
  process.exit(1);
}

async function importDirectories() {
  console.log('🚀 Starting bulk import of citation directories from CSV...\n');

  const directories = [];
  let imported = 0;
  let failed = 0;

  // Parse CSV
  return new Promise((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row) => {
        if (row.name && row.url) {
          directories.push({
            name: row.name.trim(),
            url: row.url.trim(),
            submissionUrl: (row.submissionUrl || '').trim(),
            category: (row.category || 'General Business').trim(),
            da: parseInt(row.da) || 0,
            tier: (row.tier || 'medium').trim(),
            type: (row.type || 'web_form').trim(),
            useCustomerEmail: row.useCustomerEmail === 'true' || row.useCustomerEmail === true,
          });
        }
      })
      .on('end', async () => {
        console.log(`📋 Found ${directories.length} directories to import\n`);

        try {
          // Import in batches of 500 (Firestore batch limit)
          for (let i = 0; i < directories.length; i += 500) {
            const batch = db.batch();
            const batchDirs = directories.slice(i, i + 500);

            for (const dir of batchDirs) {
              try {
                const docRef = db.collection('directories').doc();
                batch.set(docRef, {
                  ...dir,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                imported++;
              } catch (error) {
                failed++;
                console.log(`❌ ${dir.name}: ${error.message}`);
              }
            }

            await batch.commit();
            console.log(`✅ Batch complete: ${imported} imported, ${failed} failed`);
          }

          console.log(`\n${'='.repeat(60)}`);
          console.log(`📊 Import Summary:`);
          console.log(`   Total: ${directories.length}`);
          console.log(`   Imported: ${imported}`);
          console.log(`   Failed: ${failed}`);
          console.log(`${'='.repeat(60)}\n`);

          if (failed === 0) {
            console.log(`🎉 All ${imported} citation directories imported successfully!`);
          } else {
            console.log(`⚠️  ${failed} directories failed to import.`);
          }

          process.exit(0);
        } catch (error) {
          console.error('❌ Fatal error during import:', error.message);
          process.exit(1);
        }
      })
      .on('error', (error) => {
        console.error('❌ Error reading CSV:', error.message);
        process.exit(1);
      });
  });
}

importDirectories().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
