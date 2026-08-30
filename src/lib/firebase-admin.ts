import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function initializeAdmin() {
  if (!getApps().length) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error("FIREBASE_PRIVATE_KEY is missing from environment variables.");
      }

      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Firebase admin initialization error:', error);
      throw error;
    }
  }
}

export function getAdminAuth() {
  initializeAdmin();
  return getAuth();
}

export function getAdminFirestore() {
  initializeAdmin();
  return getFirestore();
}
