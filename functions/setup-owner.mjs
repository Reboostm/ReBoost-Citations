import admin from 'firebase-admin';

const db = admin.initializeApp().firestore();

const newUserId = 'GOMrqfDyfUNzYsx10siuns9ympg2';
const email = 'marketingreboost@gmail.com';

async function setup() {
  try {
    // Create user document as admin
    await db.collection('users').doc(newUserId).set({
      email,
      role: 'admin',
      clientId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✓ Created admin user: ${email} (${newUserId})`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

setup();
