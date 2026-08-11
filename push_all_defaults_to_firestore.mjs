import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs } from 'firebase/firestore';
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

// Read app.js
const appJs = fs.readFileSync('app.js', 'utf-8');

function extractConst(constName) {
  const marker = `const ${constName} = `;
  const start = appJs.indexOf(marker);
  if (start === -1) return [];
  const startPos = start + marker.length;
  // find matching semicolon or bracket end
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let endPos = startPos;
  for (let i = startPos; i < appJs.length; i++) {
    const ch = appJs[i];
    if (inString) {
      if (ch === stringChar && appJs[i-1] !== '\\') inString = false;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') {
        inString = true;
        stringChar = ch;
      } else if (ch === '[' || ch === '{') {
        depth++;
      } else if (ch === ']' || ch === '}') {
        depth--;
        if (depth === 0) {
          endPos = i + 1;
          break;
        }
      }
    }
  }
  const jsonStr = appJs.substring(startPos, endPos);
  try {
    return eval(`(${jsonStr})`);
  } catch (e) {
    console.error(`Failed to eval ${constName}:`, e);
    return [];
  }
}

const tasks = extractConst('DEFAULT_TASKS');
const posts = extractConst('DEFAULT_POSTS');
const team = extractConst('DEFAULT_TEAM');
const brands = extractConst('DEFAULT_BRANDS');

console.log(`Parsed: ${tasks.length} tasks, ${posts.length} posts, ${team.length} team members, ${brands.length} brands.`);

// Sync tasks
console.log('Syncing tasks...');
for (const t of tasks) {
  try {
    await setDoc(doc(db, 'tasks', t.id), t);
  } catch (e) {
    console.error(`Task ${t.id} error:`, e.message);
  }
}

// Sync posts
console.log('Syncing posts...');
for (const p of posts) {
  try {
    await setDoc(doc(db, 'posts', p.id), p);
  } catch (e) {
    console.error(`Post ${p.id} error:`, e.message);
  }
}

// Sync team
console.log('Syncing team...');
for (const tm of team) {
  try {
    await setDoc(doc(db, 'team', tm.id), tm);
  } catch (e) {
    console.error(`Team ${tm.id} error:`, e.message);
  }
}

// Sync brands
console.log('Syncing brands...');
for (const b of brands) {
  try {
    await setDoc(doc(db, 'brands', b.id), b);
  } catch (e) {
    console.error(`Brand ${b.id} error:`, e.message);
  }
}

console.log('ALL DATA SUCCESSFULLY SYNCED TO FIRESTORE!');
process.exit(0);
