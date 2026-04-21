import admin from 'firebase-admin';

// Initialize with default credentials (uses FIREBASE_CONFIG or local emulator)
const db = admin.initializeApp().firestore();

const userId = 'bE1mHUmjjPdBgH3CKkS6Hx48CTp1';

async function setupAdmin() {
  try {
    await db.collection('users').doc(userId).update({ role: 'admin' });
    console.log(`✓ User ${userId} is now an admin`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

setupAdmin();
