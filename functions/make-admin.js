import admin from 'firebase-admin';

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './firebase-key.json';
admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();
const auth = admin.auth();

async function makeAdmin(email) {
  try {
    // Find user by email
    const user = await auth.getUserByEmail(email);
    console.log(`Found user: ${user.uid} (${email})`);

    // Update Firestore
    await db.collection('users').doc(user.uid).update({ role: 'admin' });
    console.log(`✓ ${email} is now an admin`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

makeAdmin('marketingreboost@gmail.com');
