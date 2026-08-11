// Grant login access to Mostaque Ahammed Naim (Head of IT, team/person-4)
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

await updateDoc(doc(db, 'team', 'person-4'), { canLogin: true });
console.log('OK person-4 canLogin: true (Mostaque Ahammed Naim)');
process.exit(0);
