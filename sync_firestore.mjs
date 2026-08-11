import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

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

// Read app.js and parse DEFAULT_TASKS
const appJsContent = fs.readFileSync('app.js', 'utf-8');
const startMarker = 'const DEFAULT_TASKS = ';
const endMarker = ';\n\n// Default mock content posts';

const startPos = appJsContent.indexOf(startMarker) + startMarker.length;
const endPos = appJsContent.indexOf(endMarker, startPos);
const jsonStr = appJsContent.substring(startPos, endPos);
const tasks = JSON.parse(jsonStr);

console.log(`Starting Firestore sync for ${tasks.length} tasks...`);

let successCount = 0;
for (const task of tasks) {
  try {
    await setDoc(doc(db, 'tasks', task.id), task);
    successCount++;
  } catch (err) {
    console.error(`Error writing task ${task.id}:`, err);
  }
}

console.log(`Successfully synced ${successCount}/${tasks.length} tasks to Firebase Firestore!`);
process.exit(0);
