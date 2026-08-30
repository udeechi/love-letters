const { initializeApp, cert } = require('firebase-admin/app');
const { getSecurityRules } = require('firebase-admin/security-rules');
require('dotenv').config({path: '.env.local'});

initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /settings/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

getSecurityRules().releaseFirestoreRulesetFromSource(rules)
  .then(() => console.log('Rules updated successfully!'))
  .catch(console.error);
