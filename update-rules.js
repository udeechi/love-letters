require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
    }),
    databaseURL: 'https://cxsa-b1941-default-rtdb.asia-southeast1.firebasedatabase.app'
  });

  const db = admin.database();
  db.getRules().then(rules => {
    console.log('Current Rules:', rules);
    return db.setRules('{ "rules": { ".read": "auth != null", ".write": "auth != null" } }');
  }).then(() => {
    console.log('Rules successfully updated!');
    process.exit(0);
  }).catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
} catch(e) {
  console.error('Init Error:', e.message);
}
