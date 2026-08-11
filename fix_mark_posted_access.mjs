// Grants the new "Mark as Posted" feature to Rifat (already has login) and
// Zahid (Marketing, Sales & Communications Manager) — the person chosen to
// share this access with. Zahid didn't have canLogin before, so that's
// enabled too, otherwise he can't sign in to use the feature at all.
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAFhMBHmaUzJm14MPgY6oQscuFblPJZ-rE",
  authDomain: "honeycomb-content-hub.firebaseapp.com",
  projectId: "honeycomb-content-hub",
  storageBucket: "honeycomb-content-hub.firebasestorage.app",
  messagingSenderId: "900897411326",
  appId: "1:900897411326:web:80b7a46d0f0848f1955af",
  measurementId: "G-SLZMBC7307"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

await updateDoc(doc(db, 'team', 'p-1'), { canMarkPosted: true });
console.log('OK p-1 canMarkPosted: true (Rifat Newaj Razin)');

await updateDoc(doc(db, 'team', 'p-6'), { canMarkPosted: true, canLogin: true });
console.log('OK p-6 canMarkPosted: true, canLogin: true (Mohammad Zahidul Islam)');

process.exit(0);
