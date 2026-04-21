const admin = require('firebase-admin');

// This will use GOOGLE_APPLICATION_CREDENTIALS or Firebase emulator
const config = {
  projectId: 'reboost-citations',
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyABC...', // Will be from .env
  authDomain: 'reboost-citations.firebaseapp.com',
  storageBucket: 'reboost-citations.appspot.com',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abc',
};

console.log('Firebase Config for Vercel:');
console.log('VITE_FIREBASE_API_KEY=' + config.apiKey);
console.log('VITE_FIREBASE_AUTH_DOMAIN=' + config.authDomain);
console.log('VITE_FIREBASE_PROJECT_ID=' + config.projectId);
console.log('VITE_FIREBASE_STORAGE_BUCKET=' + config.storageBucket);
console.log('VITE_FIREBASE_MESSAGING_SENDER_ID=' + config.messagingSenderId);
console.log('VITE_FIREBASE_APP_ID=' + config.appId);
console.log('VITE_ADMIN_EMAILS=marketingreboost@gmail.com');
