// One-time patch: the `team` collection in Firestore predates the V3.9.0 role
// refactor (isWorkAssigner/isIdeaInitiator -> isAssigner, plus new canLogin flag).
// This merges ONLY those two fields onto the known legacy docs, matching the
// current DEFAULT_TEAM in app.js. It does not touch name/photo/role/password/
// aliases, and does not touch any team docs not in this list (e.g. members
// added live through the app after the original seed).
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

const patches = {
  'p-1': { isAssigner: true, canLogin: true },   // Rifat Newaj Razin
  'p-2': { isAssigner: false, canLogin: false },  // Md. Mahim
  'p-3': { isAssigner: false, canLogin: true },   // Md. Yasin Arafat (Rabby)
  'p-4': { isAssigner: false, canLogin: true },   // Niaz Uddin
  'p-5': { isAssigner: true, canLogin: false },   // Social Media Manager
  'p-6': { isAssigner: false, canLogin: false },  // Mohammad Zahidul Islam
  'person-1': { isAssigner: true, canLogin: false },  // Ashiq Ahmed
  'person-2': { isAssigner: true, canLogin: false },  // Israt Sultana Tohfa
  'person-3': { isAssigner: true, canLogin: false },  // Saddam Hossain
  'person-4': { isAssigner: true, canLogin: false },  // Mostaque Ahammed Naim
  'person-5': { isAssigner: true, canLogin: false },  // Oisarjo Tarafder
  'person-6': { isAssigner: false, canLogin: false }, // Sharmin Mahmud Khan Orthee
  'person-7': { isAssigner: false, canLogin: false }, // Md. Abdur Rafi Islam
  'person-9': { isAssigner: false, canLogin: false }, // Md. Milon Hossain Anik
  'person-15': { isAssigner: false, canLogin: false },// Labiba Laisa Esha
  'person-16': { isAssigner: true, canLogin: false }, // Rafiunoor Rahman Rajjo
  'person-17': { isAssigner: true, canLogin: false }, // Nazmul Hoseen Emon
};

let ok = 0, fail = 0;
for (const [id, fields] of Object.entries(patches)) {
  try {
    await updateDoc(doc(db, 'team', id), fields);
    console.log(`OK   ${id}`, fields);
    ok++;
  } catch (err) {
    console.error(`FAIL ${id}:`, err.message);
    fail++;
  }
}
console.log(`\nDone. ${ok} updated, ${fail} failed.`);
process.exit(0);
