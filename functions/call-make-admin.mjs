import admin from 'firebase-admin';

const db = admin.initializeApp().firestore();

const userId = 'bE1mHUmjjPdBgH3CKkS6Hx48CTp1';

async function run() {
  try {
    // Update user to admin
    await db.collection('users').doc(userId).update({ role: 'admin' });
    console.log(`✓ User ${userId} is now an admin`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
