let db = null;
let collection = () => ({});
let doc = () => ({});
let setDoc = async () => {};
let deleteDoc = async () => {};
let onSnapshot = () => {};

const firebaseConfig = {
  apiKey: "AIzaSyAFhMBHmaUzJm14MPgY6oQscuFblPJZ-rE",
  authDomain: "honeycomb-content-hub.firebaseapp.com",
  projectId: "honeycomb-content-hub",
  storageBucket: "honeycomb-content-hub.firebasestorage.app",
  messagingSenderId: "900897411326",
  appId: "1:900897411326:web:80b7a46d0f0848f1955af",
  measurementId: "G-SLZMBC7307"
};

// Resilient Firebase initialization with offline fallback
async function initFirebase() {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
    const fbFS = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const app = initializeApp(firebaseConfig);
    db = fbFS.getFirestore(app);
    collection = fbFS.collection;
    doc = fbFS.doc;
    setDoc = fbFS.setDoc;
    deleteDoc = fbFS.deleteDoc;
    onSnapshot = fbFS.onSnapshot;
  } catch (err) {
    console.warn("Firebase CDN unreachable or blocked, running in offline fallback mode:", err);
  }
}

// Default brands config
const DEFAULT_BRANDS = [
  {
    id: 'sammtech',
    name: 'SammTech',
    type: 'Agency & Marketing',
    sub: false,
    frequencyGoal: 2,
    logo: 'assets/logos/sammtech.png',
    grad: 'var(--grad-sammtech)',
    color: '#ffffff',
    glow: 'transparent',
    lastPostDate: '2026-07-03'
  },
  {
    id: 'lovelife',
    name: 'Lovelife Memories',
    type: 'Photography & Cinematography',
    sub: false,
    frequencyGoal: 0,
    logo: 'assets/logos/lovelife.png',
    grad: 'var(--grad-lovelife)',
    color: '#cccccc',
    glow: 'transparent',
    lastPostDate: '2026-07-04'
  },
  {
    id: 'tahams',
    name: 'Tahams',
    type: 'Customized Clothing POD',
    sub: false,
    frequencyGoal: 14,
    logo: 'assets/logos/tahams.png',
    grad: 'var(--grad-tahams)',
    color: '#aaaaaa',
    glow: 'transparent',
    lastPostDate: '2026-07-05'
  },
  {
    id: 'perfume-tahams',
    name: 'Perfume de Tahams',
    type: 'Tahams Subsection',
    sub: true,
    frequencyGoal: 2,
    logo: 'assets/logos/perfume-tahams.png',
    grad: 'var(--grad-perfume)',
    color: '#888888',
    glow: 'transparent',
    lastPostDate: '2026-07-02'
  },
  {
    id: 'lumina-tahams',
    name: 'Lumina by Tahams',
    type: 'Tahams Subsection',
    sub: true,
    frequencyGoal: 1,
    logo: 'assets/logos/lumina-tahams.png',
    grad: 'var(--grad-lumina)',
    color: '#dddddd',
    glow: 'transparent',
    lastPostDate: '2026-07-04'
  },
  {
    id: 'star-tahams',
    name: 'Tahams Little Star',
    type: 'Tahams Subsection',
    sub: true,
    frequencyGoal: 1,
    logo: 'assets/logos/star-tahams.png',
    grad: 'var(--grad-star)',
    color: '#bbbbbb',
    glow: 'transparent',
    lastPostDate: '2026-07-01'
  },
  {
    id: 'merchtile',
    name: 'Merchtile',
    type: 'Wholesale POD Platform',
    sub: false,
    frequencyGoal: 2,
    logo: 'assets/logos/merchtile.png',
    grad: 'var(--grad-merchtile)',
    color: '#999999',
    glow: 'transparent',
    lastPostDate: '2026-07-03'
  },
  {
    id: 'evoka-experiences',
    name: 'Evoka Experiences',
    type: 'Event Decor & Management',
    sub: false,
    frequencyGoal: 2,
    logo: 'assets/logos/evoka-experiences.png',
    grad: 'linear-gradient(135deg, #d4af37 0%, #0d1b2a 100%)',
    color: '#d4af37',
    glow: 'rgba(212, 175, 55, 0.2)',
    lastPostDate: '2026-07-26'
  }
];

// Default Team members (Only active team members with verified profile photos)
const DEFAULT_TEAM = [
  { id: 'p-1', name: 'Rifat Newaj Razin', role: 'Head of Multimedia and Creative Department', initial: 'RR', photo: 'assets/rifat-profile.jpg', password: 'rifat123', access: 'admin', isDesigner: true, isAssigner: true, canLogin: true, canMarkPosted: true, aliases: ['Razin', 'Razin Bhaia', 'Rifat', 'Rifat Razin'] },
  { id: 'p-2', name: 'Md. Mahim', role: 'Cinematographer and Video Editor', initial: 'MM', photo: 'assets/avatars/Md.-Mahim.png', password: 'mahim123', access: 'limited', isDesigner: true, isAssigner: false, canLogin: false, aliases: ['Mahim'] },
  { id: 'p-3', name: 'Md. Yasin Arafat', role: 'Creative Design Associate', initial: 'YA', photo: 'assets/avatars/Md.-Yasin-Arafat-Rabby.png', password: 'rabby123', access: 'limited', isDesigner: true, isAssigner: false, canLogin: true, aliases: ['Rabby', 'Yasin Arafat Rabby', 'Yasin Arafat', 'Md. Yasin Arafat Rabby'] },
  { id: 'p-4', name: 'Niaz Uddin', role: 'Junior Designer', initial: 'NU', photo: 'assets/avatars/Niaz-Uddin.png', password: 'niaz123', access: 'limited', isDesigner: true, isAssigner: false, canLogin: true, aliases: ['Niaz'] },
  { id: 'p-5', name: 'Social Media Manager', role: 'Social Media Manager', initial: 'SM', photo: null, password: 'smm123', access: 'limited', isDesigner: false, isAssigner: true, canLogin: false, aliases: ['Jubayer Hossain', 'Jubayer', 'Jubaer Bhai', 'Jubaer', 'Social Media Manager', 'SMM'] },
  { id: 'p-6', name: 'Mohammad Zahidul Islam', role: 'Marketing, Sales & Communications Manager', initial: 'ZI', photo: 'assets/avatars/Md.-Zahidul-Islam.png', password: 'zahid123', access: 'limited', isDesigner: false, isAssigner: false, canLogin: true, canMarkPosted: true, aliases: ['Zahid', 'Zahidul Islam'] },
  { id: 'person-1', name: 'Ashiq Ahmed', role: 'Chief Finance Officer', initial: 'AA', photo: 'assets/avatars/Ashiq-Ahmed.png', password: 'ashiq123', access: 'limited', isDesigner: false, isAssigner: true, canLogin: false, aliases: ['Ashiq Bhaia', 'Ashiq'] },
  { id: 'person-2', name: 'Israt Sultana Tohfa', role: 'Chief Operations Officer', initial: 'IT', photo: 'assets/avatars/Israt-Sultana-Tohfa.png', password: 'tohfa123', access: 'limited', isDesigner: false, isAssigner: true, canLogin: false, aliases: ['Tohfa Apu', 'Tohfa'] },
  { id: 'person-3', name: 'Saddam Hossain', role: 'Office Manager', initial: 'SH', photo: 'assets/avatars/Saddam-Hossain.png', password: 'saddam123', access: 'limited', isDesigner: false, isAssigner: true, canLogin: false, aliases: ['Saddam'] },
  { id: 'person-4', name: 'Mostaque Ahammed Naim', role: 'Head of IT', initial: 'MN', photo: 'assets/avatars/Mostaque-Ahammed-Naim.png', password: 'naim123', access: 'admin', isDesigner: false, isAssigner: true, canLogin: true, aliases: ['Naim', 'Mostaque', 'Mostaque Ahmed Naim'] },
  { id: 'person-5', name: 'Oisarjo Tarafder', role: 'Head of HR', initial: 'OT', photo: 'assets/avatars/Oisarjo-Tarafder.png', password: 'oisarjo123', access: 'limited', isDesigner: false, isAssigner: true, canLogin: false, aliases: ['Oisarjo', 'Oishi Apu', 'Oishi'] },
  { id: 'person-6', name: 'Sharmin Mahmud Khan Orthee', role: 'Sales & Customer Support Executive', initial: 'SO', photo: 'assets/avatars/Sharmin-Mahmud-Khan-Orthee.png', password: 'orthee123', access: 'limited', isDesigner: false, isAssigner: false, canLogin: false, aliases: ['Orthee'] },
  { id: 'person-7', name: 'Md. Abdur Rafi Islam', role: 'Client Relationship Executive', initial: 'RI', photo: 'assets/avatars/Abdur-Rafi-Islam.png', password: 'rafi123', access: 'limited', isDesigner: false, isAssigner: false, canLogin: false, aliases: ['Rafi'] },
  { id: 'person-9', name: 'Md. Milon Hossain Anik', role: 'Inventory & Quality Assurance Officer', initial: 'MA', photo: 'assets/avatars/Milon-Hossain-Anik.png', password: 'anik123', access: 'limited', isDesigner: false, isAssigner: false, canLogin: false, aliases: ['Anik', 'Milon'] },
  { id: 'person-15', name: 'Labiba Laisa Esha', role: 'Executive, Growth and Strategic Planning', initial: 'LE', photo: 'assets/avatars/Labiba-Laisa-Esha.png', password: 'esha123', access: 'limited', isDesigner: false, isAssigner: false, canLogin: false, aliases: ['Esha'] },
  { id: 'person-16', name: 'Rafiunoor Rahman Rajjo', role: 'Event Decor & Management', initial: 'RR', photo: 'assets/avatars/Rafiunoor-Rahman-Rajjo.png', password: 'rajjo123', access: 'limited', isDesigner: false, isAssigner: true, canLogin: false, aliases: ['Rajjo', 'Rafiunoor Rahman Rajjo', 'Rafiunoor'] },
  { id: 'person-17', name: 'Nazmul Hoseen Emon', role: 'Manager, Display Center', initial: 'NE', photo: 'assets/avatars/Nazmul-Hoseen-Emon.png', password: 'emon123', access: 'limited', isDesigner: false, isAssigner: true, canLogin: false, aliases: ['Emon', 'Emon Bhai', 'Nazmul Hoseen Emon', 'Nazmul'] }
];

function findTeamMember(name) {
  if (!name) return null;
  const teamList = (state.team && state.team.length > 0) ? state.team : DEFAULT_TEAM;
  const clean = name.trim().toLowerCase();
  return teamList.find(p => {
    if ((p.name || '').trim().toLowerCase() === clean) return true;
    if (p.aliases && Array.isArray(p.aliases) && p.aliases.some(a => a.trim().toLowerCase() === clean)) return true;
    if (p.name && (p.name.toLowerCase().includes(clean) || clean.includes(p.name.toLowerCase()))) return true;
    return false;
  });
}

// Returns the full team-roster record for whoever is currently signed in, or null if signed out.
function getCurrentUserPerson() {
  const currentUser = localStorage.getItem('hc_logged_in_user');
  if (!currentUser) return null;
  return findTeamMember(currentUser);
}

// Gate for the "mark social media posts as posted" feature — only people with
// canMarkPosted: true on their team-roster record (set in Firestore/DEFAULT_TEAM)
// may see or use the bulk "Mark as Posted" controls.
function canCurrentUserMarkPosted() {
  const person = getCurrentUserPerson();
  return !!(person && person.canMarkPosted);
}

function isItemArchived(item) {
  return false;
}

function isAssignedToUser(item, user) {
  if (!user) return false;
  const namesToMatch = [user.name, ...(user.aliases || [])];
  if (item.assignee) {
    return namesToMatch.some(n => n.toLowerCase() === item.assignee.toLowerCase() || item.assignee.toLowerCase().includes(n.toLowerCase()));
  }
  if (item.designer) {
    return namesToMatch.some(n => n.toLowerCase() === item.designer.toLowerCase() || item.designer.toLowerCase().includes(n.toLowerCase()));
  }
  return false;
}


// Default spreadsheet tasks (DESIGNER TASK TRACKER & WORKFLOW)
const DEFAULT_TASKS = [
  {
    "id": "T-01",
    "name": "Evoka Visiting Card Design",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-06-29",
    "time": "3:00 PM",
    "urgency": "24 hours",
    "status": "Delayed",
    "deliveryLink": "Evoka Visiting Card Design",
    "notes": "Will start and finish on 4th.",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-02",
    "name": "Tahams DC2 Visiting Card Order Update",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-06-29",
    "time": "11:15 AM",
    "urgency": "24 hours",
    "status": "Finished",
    "deliveryLink": "Tahams DC2 Visiting Card",
    "notes": "Monday Delivery.",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-03",
    "name": "Lovelife Memories 10 Years",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-06-29",
    "time": "9:00 PM",
    "urgency": "16 hours",
    "status": "Finished",
    "deliveryLink": "10 Years of Tahams",
    "notes": "Will finish on 30th.",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-04",
    "name": "Brand Identity Design",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-06-30",
    "time": "3:45 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Brand Identity Tahams",
    "notes": "Font done, working on the color section.",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-05",
    "name": "Asad Rasel Investment Post Tahams",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-06-30",
    "time": "3:00 PM",
    "urgency": "Today",
    "status": "Finished",
    "deliveryLink": "Tahams Investment Post AR",
    "notes": "On correction.",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-06",
    "name": "Perfume Box Resize + Roll on Box",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-06-30",
    "time": "6:00 PM",
    "urgency": "24 hours",
    "status": "Finished",
    "deliveryLink": "Perfume Box Redesign",
    "notes": "Handed over to Saddam Bhai",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-07",
    "name": "Emon Bhai DC2 Cameo Machine Troubleshoot",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Nazmul Hoseen Emon",
    "date": "2026-07-01",
    "time": "4:00 PM",
    "urgency": "24 hours",
    "status": "Finished",
    "deliveryLink": "Cameo Troubleshoot",
    "notes": "Talked and Fixed.",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-08",
    "name": "Font Guideline for Tahams",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-02",
    "time": "1:00 PM",
    "urgency": "ASAP",
    "status": "Finished",
    "deliveryLink": "https://rifatnewajrazin.github.io/tahams-font-guidelines/",
    "notes": "Finished finally.",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-09",
    "name": "Asad Rasel Investment Post Tahams (More Correction)",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-03",
    "time": "11:00 AM",
    "urgency": "ASAP",
    "status": "Finished",
    "deliveryLink": "Tahams Investment Post AR",
    "notes": "Confirmed.",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-10",
    "name": "Cuban Collar Shirt 4 color",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-04",
    "time": "10:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Cuban Collar Hawai Shirt",
    "notes": "4 color diye diyechi",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-11",
    "name": "Evoka Experiences Logo Format Delivery",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-04",
    "time": "10:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Evoka Experiences Logo and Cover",
    "notes": "Done and dusted.",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-12",
    "name": "Investor Post Delivery - Asad Rasel",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-04",
    "time": "10:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Tahams Investment Post New",
    "notes": "Updated",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-13",
    "name": "New Billboard Design",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-05",
    "time": "4:00 PM",
    "urgency": "ASAP",
    "status": "Finished",
    "deliveryLink": "New Billboard Design",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-14",
    "name": "DC4 Opening Soon Post + Cover",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-05",
    "time": "4:00 PM",
    "urgency": "ASAP",
    "status": "Finished",
    "deliveryLink": "Tahams DC4 Post and Cover",
    "notes": "Notepad for Details",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-17",
    "name": "750 Ml Water Bottle (Straw) Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-05",
    "time": "3:00 PM",
    "urgency": "ASAP",
    "status": "Finished",
    "deliveryLink": "Strow Water Bottle design PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-18",
    "name": "Big Boss Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-05",
    "time": "3:00 PM",
    "urgency": "Week",
    "status": "Finished",
    "deliveryLink": "Big Boss New Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-20",
    "name": "Fantasy Inner Beauty Perfume Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-07",
    "time": "10:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Fantasy Inner Beauty PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-21",
    "name": "Vampire Blood Dark Elegance Perfume Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-07",
    "time": "10:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Vampire Blood Dark Elegance PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-22",
    "name": "Together in Comfort Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-07",
    "time": "10:00 AM",
    "urgency": "1 Hour",
    "status": "Finished",
    "deliveryLink": "Together in Comfort PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-23",
    "name": "Argentina Content Design",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-08",
    "time": "11.59 PM",
    "urgency": "1 Hour",
    "status": "Finished",
    "deliveryLink": "Committee'r Lok Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-24",
    "name": "Fifa Content Design",
    "designer": "Niaz Uddin",
    "assignedBy": "Rifat Newaj Razin",
    "date": "2026-07-09",
    "time": "11.59 PM",
    "urgency": "1 Day",
    "status": "Finished",
    "deliveryLink": "Fifa Content Design",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-25",
    "name": "Mafia Messi Mockup Design",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Rifat Newaj Razin",
    "date": "2026-07-09",
    "time": "11.59 PM",
    "urgency": "1 Day",
    "status": "Finished",
    "deliveryLink": "Mafia Messi",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-26",
    "name": "Evoka Carousel Post Design",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Rifat Newaj Razin",
    "date": "2026-07-09",
    "time": "3:30 AM",
    "urgency": "1 Day",
    "status": "Finished",
    "deliveryLink": "Evoka Carousel",
    "notes": "Sunday",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-27",
    "name": "Metro Drop Shoulder",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-08",
    "time": "10:00 AM",
    "urgency": "1 Day",
    "status": "Finished",
    "deliveryLink": "Metro Drop Shoulder Post design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-28",
    "name": "Outdoor Kids tshirt with Psnt Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-07",
    "time": "4:00 PM",
    "urgency": "2",
    "status": "Finished",
    "deliveryLink": "Outdor Kids Tshirt With Pant Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-29",
    "name": "Merchtile Service Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-09",
    "time": "11:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "MT-ServicesPost Design PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-30",
    "name": "SamTech Services Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-09",
    "time": "11:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Our Services Post Design PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-31",
    "name": "Lumina Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-09",
    "time": "11:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "https://www.facebook.com/share/p/19RE2WbxLh/",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-32",
    "name": "Spider Man Adult Series Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-09",
    "time": "1:10 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Spider Man Tshirt Post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-33",
    "name": "Tahams DC4 In Mirpur Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-09",
    "time": "1:10 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "https://www.facebook.com/share/p/19EGr3jGMM/",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-35",
    "name": "Best Trio Perfume For Men & Women Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-11",
    "time": "12:30 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Trio Best Perfume for Men & Women Post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-36",
    "name": "Kids Spiderman Cut & Sew Tshirt Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-11",
    "time": "1:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Kids Spider Man Cut & Sew Tshirt Post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-38",
    "name": "Lokman Measurement",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-11",
    "time": "1:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Lokman Measurements",
    "notes": "Sunday",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-39",
    "name": "Fotua post design needed",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Social Media Manager",
    "date": "2026-07-12",
    "time": "15:35",
    "urgency": "ASAP",
    "status": "Finished",
    "deliveryLink": "Fotua Post Design PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-40",
    "name": "July Revolution Tshirt Designs",
    "designer": "Niaz Uddin",
    "assignedBy": "Rifat Newaj Razin",
    "date": "2026-07-13",
    "time": "6:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "BANGLAdesh-Niaz",
    "notes": "Posted",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-41",
    "name": "Water bottle Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-14",
    "time": "10:30 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "750 Ml Water Bottle",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-42",
    "name": "DC1 Layout",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-14",
    "time": "1:30 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "https://www.facebook.com/share/p/19AhyB1TLh/",
    "notes": "Yet to handover",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-43",
    "name": "Female CO-ORD Set Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-14",
    "time": "4:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Co-ord Post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-44",
    "name": "Trademark Certification Post Research and Create Tahams",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-14",
    "time": "4:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Trademark Post",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-45",
    "name": "Ultra male perfume post design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-15",
    "time": "1:10 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Ultra Male",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-46",
    "name": "Evoka Invoice",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Rafiunoor Rahman Rajjo",
    "date": "2026-07-16",
    "time": "1:10 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Evoka Documents",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-47",
    "name": "DC 4 Opening Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-15",
    "time": "3:20 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "DC4 Printables",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-48",
    "name": "Coming Soon Banner - DC4 (Only Banner, no cover/post)",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-15",
    "time": "3:20 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "DC4 Printables",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-49",
    "name": "DC1 Shifting Banner (2nd Floor) - We are shifting from 2nd Floor 4:5 Cover",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-15",
    "time": "3:20 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "DC1 Printables",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-50",
    "name": "DC1 Shifting Banner (1st Floor) - We are coming",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-15",
    "time": "3:20 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "DC1 Printables",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-51",
    "name": "Customize Kids Tshirt Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-16",
    "time": "11:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Kids Tshirt Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-52",
    "name": "Freshness That Defines You Cool Water Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-16",
    "time": "3:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Freshness That Defines You Cool Water PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-54",
    "name": "DC1 Layout",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-18",
    "time": "6:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "DC1 Layout",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-55",
    "name": "Tahams Own The City Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-09",
    "time": "12:10 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Tahams Own The City PNG",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-56",
    "name": "Evoka post: What is Evoka Experiences?",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Rafiunoor Rahman Rajjo",
    "date": "2026-07-19",
    "time": "12:10 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Evoka Documents",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-57",
    "name": "Evoka Moodboard for Client",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Rafiunoor Rahman Rajjo",
    "date": "2026-07-19",
    "time": "12:10 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Evoka Documents",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-58",
    "name": "Evoka Pad Page Doc",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Rafiunoor Rahman Rajjo",
    "date": "2026-07-19",
    "time": "12:10 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Evoka Documents",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-59",
    "name": "Spain Tshirt Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Niaz Uddin",
    "date": "2026-07-19",
    "time": "3:40 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "https://www.facebook.com/share/p/1HndvJUULq/",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-60",
    "name": "Friendship Day Wish Post",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Mohammad Zahidul Islam",
    "date": "2026-07-19",
    "time": "7:30 PM",
    "urgency": "29/07/26",
    "status": "Finished",
    "deliveryLink": "Friendship Day Post Design 26",
    "notes": "Post it on 30th July",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-61",
    "name": "Friendship Day Product Design Post",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Mohammad Zahidul Islam",
    "date": "2026-07-19",
    "time": "7:30 PM",
    "urgency": "21/07/26",
    "status": "Finished",
    "deliveryLink": "Friendship Day Post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-62",
    "name": "Kids Stripe Tshirt Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-20",
    "time": "15:00",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Kids Stripe tshirt Design PNG",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-63",
    "name": "Mug Post Design For Friendship Day",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-20",
    "time": "5:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "https://www.facebook.com/share/p/1EkpV5RsgL/",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-64",
    "name": "Uncommon Looks Begin here",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-21",
    "time": "10:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Uncommn Looks Begin Here PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-65",
    "name": "Neck Printed Tshirt Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-21",
    "time": "2: PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Neck Printed Tshirt Design PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-66",
    "name": "Spain Fan made tshirt design",
    "designer": "Niaz Uddin",
    "assignedBy": "Niaz Uddin",
    "date": "2026-07-21",
    "time": "1:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Spain Niaz",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-67",
    "name": "Tshirt Post Design For Friendship Day",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Mohammad Zahidul Islam",
    "date": "2026-07-21",
    "time": "1:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Friendship Day post design PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-68",
    "name": "Water Bottle Post Design For Friendship Day",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Mohammad Zahidul Islam",
    "date": "2026-07-21",
    "time": "1:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Start Prepared Water Bottle post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-69",
    "name": "Perfume Post Design For Friendship Day",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Mohammad Zahidul Islam",
    "date": "2026-07-21",
    "time": "1:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "3mm Board PVC Prints",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-70",
    "name": "Printing Charge \u098f\u09b0 \u09a4\u09be\u09b2\u09bf\u0995\u09be",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-21",
    "time": "1:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Printing Charge \u098f\u09b0 \u09a4\u09be\u09b2\u09bf\u0995\u09be =PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-71",
    "name": "Male Female Washroom, DTF Pricing PVC Print",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-21",
    "time": "1:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "3mm Board PVC Prints",
    "notes": "Handed over to Lokman.",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-72",
    "name": "The Solid Series Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-23",
    "time": "9:45 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "The Solid Series Post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-73",
    "name": "Boylar murgi & cockroach funny tshirt post design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-25",
    "time": "9:45 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Funny Tshirt Post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-74",
    "name": "Cuban Collar Shirt & Denim Pants Combo Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-25",
    "time": "1:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Cuban Collar & Denim Pants Combo Offer Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-75",
    "name": "Tahams DC Reallocation Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-25",
    "time": "6:30 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Tahams DC1 Reallocation Post PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-76",
    "name": "Evoka Introduction Post Design",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Rafiunoor Rahman Rajjo",
    "date": "2026-07-26",
    "time": "3:50 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Evoka First Post Carousel",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-77",
    "name": "Start Prepared Water Bottle post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-26",
    "time": "1:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Start Prepared Water Bottle post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-78",
    "name": "Signboard Design DC4",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-26",
    "time": "6:24 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "DC4 Signboard",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-79",
    "name": "\u0995\u09cd\u09af\u09be\u09ae\u09cd\u09aa\u09be\u09b8\u09c7\u09b0 \u09b8\u09cd\u09ae\u09c3\u09a4\u09bf Tahams \u098f\u09b0 \u09b8\u09be\u09a5\u09c7 Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-06",
    "time": "5:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "\u0995\u09cd\u09af\u09be\u09ae\u09cd\u09aa\u09be\u09b8\u09c7\u09b0 \u09b8\u09cd\u09ae\u09c3\u09a4\u09bf Tahams \u098f\u09b0 \u09b8\u09be\u09a5\u09c7",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-80",
    "name": "Make Memories with Tahams",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-28",
    "time": "10:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Make Memories with Tahams PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-81",
    "name": "Enviroment friendly Water Bottle",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-07-28",
    "time": "10:40 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-82",
    "name": "Executive Polo Female Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-28",
    "time": "3:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Executive Polo Female Post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-83",
    "name": "Raj Bhai LLM ID Card",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Mohammad Zahidul Islam",
    "date": "2026-07-29",
    "time": "11:50 AM",
    "urgency": "ASAP",
    "status": "Finished",
    "deliveryLink": "Naim Bhai LLM ID Card for Banking",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-84",
    "name": "Mirpur Edition Tshirt Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-07-29",
    "time": "10:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Mirpur Edition Tshirt Post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-108",
    "name": "Own The Heat Tank Top post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Social Media Manager",
    "date": "2026-08-03",
    "time": "4:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Tank Top Post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-86",
    "name": "Sister's Day Post",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Mohammad Zahidul Islam",
    "date": "2026-07-31",
    "time": "4:30 PM",
    "urgency": "01/08/26",
    "status": "Finished",
    "deliveryLink": "Tahams Sister day post Design PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-87",
    "name": "DC4 Grand Opening Poster Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-08-01",
    "time": "11:00 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "DC4 Grand Opening Poster Design PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-88",
    "name": "Discover your perfect scent Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-08-01",
    "time": "4:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Discover your perfect scent Post Design PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-94",
    "name": "\u099c\u09c1\u09b2\u09be\u0987 \u0997\u09a3-\u0985\u09ad\u09cd\u09af\u09c1\u09a4\u09cd\u09a5\u09be\u09a8 \u09a6\u09bf\u09ac\u09b8 \u09eb \u0986\u0997\u09b8\u09cd\u099f Wish Poster",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Social Media Manager",
    "date": "2026-08-02",
    "time": "10:52",
    "urgency": "2 Days",
    "status": "Not Started",
    "deliveryLink": "",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-97",
    "name": "Full Sleeve t shirt solid Poster Design",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Social Media Manager",
    "date": "2026-08-02",
    "time": "11:07",
    "urgency": "Week",
    "status": "Not Started",
    "deliveryLink": "",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-102",
    "name": "Tahams- Wear You Lifestyle 4 Type Posters Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-08-02",
    "time": "9:45 AM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Tahams- Ware your Lifestyle",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-103",
    "name": "Crop Basic, Stripe, Lettuce Poster Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Social Media Manager",
    "date": "2026-08-03",
    "time": "10:20",
    "urgency": "N/A",
    "status": "Not Started",
    "deliveryLink": "",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-104",
    "name": "Basic Tshirt & Pants Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Social Media Manager",
    "date": "2026-08-03",
    "time": "10:21",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Basic Tshirt & Pants Post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-105",
    "name": "V Neck Drop Shoulder Solid Poster Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Social Media Manager",
    "date": "2026-08-03",
    "time": "10:22",
    "urgency": "N/A",
    "status": "Not Started",
    "deliveryLink": "",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-106",
    "name": "Polo Half Sleeve Big Boss Poster",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Social Media Manager",
    "date": "2026-08-03",
    "time": "10;23",
    "urgency": "N/A",
    "status": "Not Started",
    "deliveryLink": "",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-16",
    "name": "Merchandiser Formalities : ID Card , Mug, Database",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Oisarjo Tarafder",
    "date": "2026-07-05",
    "time": "12:00 PM",
    "urgency": "ASAP",
    "status": "On Progress",
    "deliveryLink": "Merchandiser Formalities",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-15",
    "name": "All Brands Social Media Refinement",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Rifat Newaj Razin",
    "date": "2026-07-05",
    "time": "12:00 PM",
    "urgency": "ASAP",
    "status": "On Progress",
    "deliveryLink": "Social Media Refinement",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-19",
    "name": "DC4 Post and Cover",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Social Media Manager",
    "date": "2026-07-05",
    "time": "6:11 PM",
    "urgency": "Week",
    "status": "Finished",
    "deliveryLink": "Tahams DC4 Post and Cover",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-85",
    "name": "MerchTile Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Md. Yasin Arafat",
    "date": "2026-07-30",
    "time": "10:30 AM",
    "urgency": "N/A",
    "status": "Delayed",
    "deliveryLink": "",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-115",
    "name": "Investment Post Correction",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-03-08",
    "time": "6:53 PM",
    "urgency": "1 Day",
    "status": "Finished",
    "deliveryLink": "Investment Post AR",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-116",
    "name": "HoneyComb Employee, Designation and Details Sorting",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Rifat Newaj Razin",
    "date": "2026-03-08",
    "time": "7.50 PM",
    "urgency": "1 Day",
    "status": "On Progress",
    "deliveryLink": "",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-117",
    "name": "5th August Notice Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-08-04",
    "time": "12:30 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "5th august Notice PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-118",
    "name": "Game of Thrones",
    "designer": "Niaz Uddin",
    "assignedBy": "Rifat Newaj Razin",
    "date": "2026-08-09",
    "time": "",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "GOT_NIAZ",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-119",
    "name": "Snoopy Series",
    "designer": "Niaz Uddin",
    "assignedBy": "Rifat Newaj Razin",
    "date": "2026-08-09",
    "time": "",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "Snoopy Design File",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-120",
    "name": "Woodpecker Signs Price Quotation",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-08-09",
    "time": "",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "",
    "notes": ".",
    "taskType": "general",
    "associatedPostId": ""
  },
  {
    "id": "T-121",
    "name": "SSM hiring Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Oisarjo Tarafder",
    "date": "2026-08-09",
    "time": "9:00 PM",
    "urgency": "N/A",
    "status": "Finished",
    "deliveryLink": "SMM Hiring Post Design PNG.png",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-122",
    "name": "Female CO-ORD Set KOROBI Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-08-09",
    "time": "-",
    "urgency": "-",
    "status": "Finished",
    "deliveryLink": "KOROBI",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-123",
    "name": "Female CO-ORD Set ORCHID Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-08-09",
    "time": "-",
    "urgency": "-",
    "status": "Finished",
    "deliveryLink": "ORCHID",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-124",
    "name": "Female CO-ORD Set ROJONI Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Israt Sultana Tohfa",
    "date": "2026-08-09",
    "time": "-",
    "urgency": "-",
    "status": "Finished",
    "deliveryLink": "ROJONI",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-125",
    "name": "Niaz Snoopy Post Design",
    "designer": "Niaz Uddin",
    "assignedBy": "Rifat Newaj Razin",
    "date": "2026-08-09",
    "time": "-",
    "urgency": "-",
    "status": "Finished",
    "deliveryLink": "Niaz Snoopy Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-126",
    "name": "4 Investment Post Design",
    "designer": "Rifat Newaj Razin",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-08-09",
    "time": "7:37 PM",
    "urgency": "-",
    "status": "Finished",
    "deliveryLink": "Investment Post",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-127",
    "name": "Ai Investment Post Design",
    "designer": "Md. Yasin Arafat",
    "assignedBy": "Ashiq Ahmed",
    "date": "2026-08-09",
    "time": "-",
    "urgency": "-",
    "status": "Finished",
    "deliveryLink": "Ai Invest Post Design",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  },
  {
    "id": "T-128",
    "name": "Cat T shirt Design",
    "designer": "Niaz Uddin",
    "assignedBy": "Rifat Newaj Razin",
    "date": "2026-08-11",
    "time": "",
    "urgency": "N/A",
    "status": "On Progress",
    "deliveryLink": "",
    "notes": ".",
    "taskType": "post",
    "associatedPostId": ""
  }
];

// Default mock content posts matching date around 2026-07-05
const DEFAULT_POSTS = [
  {
    id: 'post-1',
    title: 'Showcasing Premium Custom T-shirt Mockup Design Flow',
    brandId: 'tahams',
    platforms: ['instagram', 'facebook'],
    status: 'published',
    type: 'video',
    assignee: 'Yasin Arafat Rabby',
    date: '2026-07-05',
    time: '11:00',
    caption: 'Ever wondered how we craft your customized designs? Here is a sneak peek into our design room! #Tahams #POD #CustomClothing'
  },
  {
    id: 'post-2',
    title: 'Aesthetic Monsoon Wedding Cinematic Reel teaser',
    brandId: 'lovelife',
    platforms: ['facebook', 'instagram'],
    status: 'published',
    type: 'video',
    assignee: 'Rifat Newaj Razin',
    date: '2026-07-04',
    time: '18:00',
    caption: 'Rainy days make the most romantic weddings. Teaser from Nabeel & Sarah wedding. #LovelifeMemories #WeddingTeaser'
  },
  {
    id: 'post-3',
    title: 'SammTech Agency Services Pitch & Social Ads Info',
    brandId: 'sammtech',
    platforms: ['facebook'],
    status: 'published',
    type: 'post',
    assignee: 'Rifat Newaj Razin',
    date: '2026-07-03',
    time: '10:30',
    caption: 'How social media post boosting can double your business conversions in 30 days. Read our latest agency overview.'
  },
  {
    id: 'post-4',
    title: 'Perfume de Tahams - Summer Oud Launch Post',
    brandId: 'perfume-tahams',
    platforms: ['instagram'],
    status: 'published',
    type: 'post',
    assignee: 'Niaz Uddin',
    date: '2026-07-02',
    time: '15:00',
    caption: 'Refreshing, warm, and luxurious. Summer Oud is now live on our website. Order yours today!'
  },
  {
    id: 'post-5',
    title: 'Merchtile Bulk Clothings Wholesale Promo Graphic',
    brandId: 'merchtile',
    platforms: ['facebook'],
    status: 'published',
    type: 'post',
    assignee: 'Niaz Uddin',
    date: '2026-07-03',
    time: '12:00',
    caption: 'Ready to launch your own POD brand? Buy premium blank hoodies and t-shirts in bulk from Merchtile at manufacturing prices!'
  },
  {
    id: 'post-6',
    title: 'Lumina Premium Cotton Women Collection Showcase',
    brandId: 'lumina-tahams',
    platforms: ['facebook', 'instagram'],
    status: 'published',
    type: 'post',
    assignee: 'Yasin Arafat Rabby',
    date: '2026-07-04',
    time: '17:30',
    caption: 'Elegance meets comfort. Explore Lumina\'s summer wear catalog.'
  },
  {
    id: 'post-7',
    title: 'Tahams Little Star Kids Pastel Rompers Release Carousel',
    brandId: 'star-tahams',
    platforms: ['instagram', 'facebook'],
    status: 'published',
    type: 'post',
    assignee: 'Yasin Arafat Rabby',
    date: '2026-07-01',
    time: '14:00',
    caption: 'Softest organic cotton for your little stars. 5 pastel colors available!'
  },
  // Upcoming / active cards
  {
    id: 'post-8',
    title: 'SammTech - Creative Portfolio Case Study (Client X)',
    brandId: 'sammtech',
    platforms: ['facebook'],
    status: 'scheduled',
    type: 'post',
    assignee: 'Rifat Newaj Razin',
    date: '2026-07-06',
    time: '14:00',
    caption: 'Case study: How we helped an e-commerce brand scale to $50k monthly revenue with strategic post boosting. #SammTech'
  },
  {
    id: 'post-9',
    title: 'Lovelife Memories - Wedding Photography Packages 2026',
    brandId: 'lovelife',
    platforms: ['instagram', 'facebook'],
    status: 'scheduled',
    type: 'post',
    assignee: 'Rifat Newaj Razin',
    date: '2026-07-07',
    time: '19:00',
    caption: 'Bookings for Autumn & Winter 2026 are now open. Swipe to see our updated packages and team profiles.'
  },
  {
    id: 'post-10',
    title: 'Tahams - Behind the Scenes POD Printing Setup',
    brandId: 'tahams',
    platforms: ['instagram'],
    status: 'ready',
    type: 'video',
    assignee: 'Niaz Uddin',
    date: '2026-07-06',
    time: '16:00',
    caption: 'DtG printing process in full action! Smooth colors and high longevity blanks. #DTG #POD #Printing'
  },
  {
    id: 'post-11',
    title: 'Perfume de Tahams - Floral Mist Story Series',
    brandId: 'perfume-tahams',
    platforms: ['instagram'],
    status: 'development',
    type: 'story',
    assignee: 'Niaz Uddin',
    date: '2026-07-08',
    time: '10:00',
    caption: 'Story series detailing top notes, heart notes, and base notes of Floral Mist.'
  },
  {
    id: 'post-12',
    title: 'Merchtile Platform Feature Walkthrough Video',
    brandId: 'merchtile',
    platforms: ['facebook'],
    status: 'development',
    type: 'video',
    assignee: 'Yasin Arafat Rabby',
    date: '2026-07-09',
    time: '11:00',
    caption: 'Complete dashboard walkthrough: How to upload bulk orders, integrate with Shopify/WooCommerce, and track shipping.'
  },
  {
    id: 'post-13',
    title: 'Lumina - Neon Vibes Graphic Tshirts Launch',
    brandId: 'lumina-tahams',
    platforms: ['instagram', 'facebook'],
    status: 'ideation',
    type: 'post',
    assignee: 'Niaz Uddin',
    date: '2026-07-10',
    time: '12:00',
    caption: 'Neon design system graphics concept draft.'
  },
  {
    id: 'post-14',
    title: 'Tahams Little Star - Organic Baby Blankets Promo',
    brandId: 'star-tahams',
    platforms: ['facebook'],
    status: 'ideation',
    type: 'post',
    assignee: 'Yasin Arafat Rabby',
    date: '2026-07-12',
    time: '14:30',
    caption: 'Drafting text about winter blankets pre-order.'
  }
];

// App State
let state = {
  brands: [],
  posts: [],
  tasks: [],
  team: [],
  currentView: 'dashboard',
  selectedBrandFilter: 'all',
  currentDate: new Date('2026-07-05T12:00:00'), // Setting active app date based on user local time
  calendarDate: new Date('2026-07-05T12:00:00'),
  editingPost: null,
  editingTask: null,
  taskSearchFilter: '',
  taskDesignerFilter: 'all',
  taskAssignerFilter: 'all',
  taskStatusFilter: 'all',
  taskSortCol: 'id',
  taskSortDir: 'desc',
  contentLinksSortCol: 'date',
  contentLinksSortDir: 'desc',
  teamSortCol: 'name',
  teamSortDir: 'asc'
};

// Initialize Application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAuth();
  });
} else {
  initAuth();
}

function initAuth() {
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const usernameEl = document.getElementById('login-user');
        const passwordEl = document.getElementById('login-password');
        const username = (usernameEl ? usernameEl.value : '').trim();
        // Trim to guard against browsers/password managers that append
        // trailing whitespace or newlines on autofill.
        const passwordInput = (passwordEl ? passwordEl.value : '').trim();

        if (!username) {
          showToast('Please select your profile from the list.', 'error');
          console.warn('Login blocked: no profile selected (login-user select had no value).');
          return;
        }

        const account = findTeamMember(username);
        if (!account) {
          showToast('Profile not found. Please refresh the page and try again.', 'error');
          console.error('Login failed: no team member matched username =', JSON.stringify(username), 'state.team length =', (state.team || []).length);
          return;
        }
        if (!account.canLogin) {
          showToast('This account is not enabled for login. Contact an admin.', 'error');
          console.error('Login blocked: account.canLogin is falsy for', account.name, account);
          return;
        }
        if (String(account.password || '') !== passwordInput) {
          showToast('Invalid password. Please try again.', 'error');
          return;
        }

        localStorage.setItem('hc_logged_in_user', account.name);
        showToast(`Welcome back, ${account.name.split(' ')[0]}!`, 'success');
        if (loginOverlay) loginOverlay.style.display = 'none';

        renderUserProfile();
        refreshViews();
      } catch (err) {
        // Never let an unexpected error silently kill the Sign In button —
        // surface it so it's diagnosable instead of looking like a dead click.
        console.error('Unexpected error during login:', err);
        showToast('Something went wrong signing in. Please refresh and try again.', 'error');
      }
    });
  }

  // Hide login overlay if clicked outside the card
  if (loginOverlay) {
    loginOverlay.addEventListener('click', (e) => {
      if (e.target === loginOverlay) {
        loginOverlay.style.display = 'none';
      }
    });
  }

  // Always load application immediately (Guest View enabled)
  runAppInit();
}

function showLoginOverlay() {
  const loginOverlay = document.getElementById('login-overlay');
  if (loginOverlay) {
    loginOverlay.style.display = 'flex';
  }
}

async function runAppInit() {
  await initFirebase();
  initData();
  setupEventListeners();
  renderUserProfile();
  initFilterDropdowns();
  updateModalDropdowns();
  refreshViews();
  let lastView = localStorage.getItem('hc_last_view') || 'dashboard';
  if (lastView === 'kanban' || lastView === 'analytics' || lastView === 'ideas') lastView = 'dashboard';
  switchView(lastView);
}

function renderUserProfile() {
  const userSection = document.querySelector('.user-profile-section');
  if (!userSection) return;
  const currentUser = localStorage.getItem('hc_logged_in_user');
  const person = findTeamMember(currentUser);
  
  // Toggle admin log link in sidebar
  const logsLink = document.getElementById('nav-logs-link');
  if (logsLink) {
    if (currentUser && person && person.access === 'admin') {
      logsLink.style.display = 'flex';
    } else {
      logsLink.style.display = 'none';
      if (state.currentView === 'logs') {
        switchView('dashboard');
      }
    }
  }

  // Toggle Publishing Queue (Kanban) link in sidebar (Restricted to Admins & Social Media Manager)
  const kanbanLink = document.getElementById('nav-kanban-link');
  if (kanbanLink) {
    const isQueueAuthorized = currentUser && person && (person.access === 'admin' || (person.role && person.role.toLowerCase().includes('social media manager')));
    if (isQueueAuthorized) {
      kanbanLink.style.display = 'flex';
    } else {
      kanbanLink.style.display = 'none';
      if (state.currentView === 'kanban') {
        switchView('dashboard');
      }
    }
  }

  if (currentUser && person) {
    const account = person;
    const avatarHtml = account.photo 
      ? `<img src="${account.photo}" class="user-avatar-img" alt="${currentUser}">`
      : `<div class="user-avatar" style="background: var(--honey-gold); color: #000; font-weight: 700; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; font-size: 1.1rem; border: 2px solid rgba(255, 255, 255, 0.1); box-shadow: var(--shadow-sm);">${currentUser.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}</div>`;
       
    userSection.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
        ${avatarHtml}
        <div class="user-info" style="min-width: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden;">
          <span class="user-name" style="font-size: 0.85rem; font-weight: 700; color: #fff; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; display: block;">${currentUser}</span>
          <span class="user-role" style="font-size: 0.7rem; color: #94a3b8; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; display: block;" title="${account.role}">${account.role}</span>
        </div>
      </div>
      <button id="btn-logout" class="logout-btn" title="Logout" style="flex-shrink: 0; margin-left: 8px;">
        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
      </button>
    `;
    
    document.getElementById('btn-logout').addEventListener('click', () => {
      localStorage.removeItem('hc_logged_in_user');
      showToast('Logged out successfully', 'info');
      renderUserProfile();
      refreshViews();
    });
  } else {
    // Guest Profile view
    userSection.innerHTML = `
      <button id="btn-login-sidebar" class="login-btn-sidebar">
        <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
        <span>Sign In to Edit</span>
      </button>
    `;
    
    document.getElementById('btn-login-sidebar').addEventListener('click', () => {
      showLoginOverlay();
    });
  }
}

// Load from LocalStorage or Load Defaults
function initData() {
  const localBrands = localStorage.getItem('hc_brands');
  const localTeam = localStorage.getItem('hc_team');

  if (localBrands) {
    state.brands = JSON.parse(localBrands);

    // Merge any missing DEFAULT_BRANDS into state.brands
    DEFAULT_BRANDS.forEach(def => {
      let b = state.brands.find(x => x.id === def.id || (x.name && x.name.toLowerCase() === def.name.toLowerCase()));
      if (!b) {
        state.brands.push({ ...def });
      } else {
        if (!b.logo || b.id === 'evoka-experiences' || b.name.toLowerCase().includes('evoka')) {
          b.logo = def.logo || 'assets/logos/evoka-experiences.png';
        }
      }
    });
    
    // Forcefully align brand colors and glows to monochrome
    const monochromeMap = {
      'sammtech': { color: '#ffffff', glow: 'transparent' },
      'lovelife': { color: '#cccccc', glow: 'transparent' },
      'tahams': { color: '#aaaaaa', glow: 'transparent' },
      'perfume-tahams': { color: '#888888', glow: 'transparent' },
      'lumina-tahams': { color: '#dddddd', glow: 'transparent' },
      'star-tahams': { color: '#bbbbbb', glow: 'transparent' },
      'merchtile': { color: '#999999', glow: 'transparent' },
      'evoka-experiences': { color: '#d4af37', glow: 'rgba(212, 175, 55, 0.2)' }
    };
    let colorsUpdated = false;
    state.brands.forEach(b => {
      if (monochromeMap[b.id] !== undefined) {
        if (b.color !== monochromeMap[b.id].color || b.glow !== monochromeMap[b.id].glow) {
          b.color = monochromeMap[b.id].color;
          b.glow = monochromeMap[b.id].glow;
          colorsUpdated = true;
        }
      }
    });

    const logoMap = {
      'sammtech': 'assets/logos/sammtech.png',
      'lovelife': 'assets/logos/lovelife.png',
      'tahams': 'assets/logos/tahams.png',
      'perfume-tahams': 'assets/logos/perfume-tahams.png',
      'lumina-tahams': 'assets/logos/lumina-tahams.png',
      'star-tahams': 'assets/logos/star-tahams.png',
      'merchtile': 'assets/logos/merchtile.png',
      'evoka-experiences': 'assets/logos/evoka-experiences.png'
    };
    state.brands.forEach(b => {
      if (logoMap[b.id]) {
        b.logo = logoMap[b.id];
      }
    });
    saveToStorage();
  } else {
    state.brands = [...DEFAULT_BRANDS];
    saveToStorage();
  }

  // Pre-fill state with default local datasets so UI is never empty
  state.tasks = [...DEFAULT_TASKS];
  state.posts = [...DEFAULT_POSTS];
  state.team = [...DEFAULT_TEAM];

  if (!db) return;

  // Sync posts from Firestore in real-time
  try {
    onSnapshot(collection(db, "posts"), (querySnapshot) => {
      if (querySnapshot.empty) {
        DEFAULT_POSTS.forEach(async (p) => {
          try { await setDoc(doc(db, "posts", p.id), p); } catch(e){}
        });
        state.posts = [...DEFAULT_POSTS];
      } else {
        const loadedPosts = [];
        querySnapshot.forEach((doc) => {
          loadedPosts.push(doc.data());
        });

        // Note: DEFAULT_POSTS are only seeded once, when the collection is first
        // empty (see the `if (querySnapshot.empty)` branch above). Re-adding
        // missing defaults here would resurrect posts a user had deleted, the
        // same bug fixed for DEFAULT_TASKS above.
        state.posts = loadedPosts;
      }
      updateModalDropdowns();
      refreshViews();
      healPostTaskSync();
    }, (error) => {
      console.error("Firestore sync error:", error);
      state.posts = [...DEFAULT_POSTS];
      updateModalDropdowns();
      refreshViews();
    });
  } catch(err) {
    console.warn("Firestore posts listener skipped:", err);
  }

  // Sync tasks from Firestore in real-time
  try {
    onSnapshot(collection(db, "tasks"), (querySnapshot) => {
      if (querySnapshot.empty) {
        DEFAULT_TASKS.forEach(async (t) => {
          try { await setDoc(doc(db, "tasks", t.id), t); } catch(e){}
        });
        state.tasks = [...DEFAULT_TASKS];
      } else {
        const loadedTasks = [];
        querySnapshot.forEach((docSnap) => {
          const t = docSnap.data();
          if (!t.taskType) {
            t.taskType = t.associatedPostId ? 'post' : 'general';
            try { setDoc(doc(db, "tasks", docSnap.id), t); } catch(e){}
          }

          const designerPerson = findTeamMember(t.designer);
          if (designerPerson) t.designer = designerPerson.name;

          const assignerPerson = findTeamMember(t.assignedBy);
          if (assignerPerson) t.assignedBy = assignerPerson.name;

          loadedTasks.push(t);
        });

        // Note: DEFAULT_TASKS are only seeded once, when the collection is first
        // empty (see the `if (querySnapshot.empty)` branch above). We deliberately
        // do NOT re-add missing defaults here — doing so on every snapshot caused
        // deleted default tasks (e.g. T-85) to be silently resurrected the moment
        // this listener re-fired after a delete.
        state.tasks = loadedTasks.sort((a, b) => a.id.localeCompare(b.id));
      }
      updateModalDropdowns();
      refreshViews();
      healPostTaskSync();
      updatePublishingQueueBadge();
    }, (error) => {
      console.error("Firestore tasks sync error:", error);
      state.tasks = [...DEFAULT_TASKS];
      updateModalDropdowns();
      refreshViews();
    });
  } catch(err) {
    console.warn("Firestore tasks listener skipped:", err);
  }

  // Sync team members from Firestore in real-time
  try {
    onSnapshot(collection(db, "team"), (querySnapshot) => {
      if (querySnapshot.empty) {
        DEFAULT_TEAM.forEach(async (t) => {
          try { await setDoc(doc(db, "team", t.id), t); } catch(e){}
        });
        state.team = [...DEFAULT_TEAM];
      } else {
        const loadedTeam = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const dataName = data.name || '';
          const defaultMatch = DEFAULT_TEAM.find(t => t.name === dataName || (t.aliases && t.aliases.includes(dataName)));
          if (defaultMatch && defaultMatch.photo) {
            data.photo = defaultMatch.photo;
          }
          loadedTeam.push(data);
        });

        DEFAULT_TEAM.forEach(def => {
          const exists = loadedTeam.some(t => t.name === def.name || t.id === def.id || (t.aliases && t.aliases.includes(def.name)));
          if (!exists) {
            loadedTeam.push(def);
          }
        });

        state.team = loadedTeam.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
      updateModalDropdowns();
      renderUserProfile();
      refreshViews();
    }, (error) => {
      console.error("Firestore team sync error:", error);
      state.team = [...DEFAULT_TEAM];
      updateModalDropdowns();
      renderUserProfile();
      refreshViews();
    });
  } catch(err) {
    console.warn("Firestore team listener skipped:", err);
  }

  // Sync activity logs from Firestore in real-time
  try {
    onSnapshot(collection(db, "activity_log"), (querySnapshot) => {
      const loadedLogs = [];
      querySnapshot.forEach((docSnap) => {
        loadedLogs.push(docSnap.data());
      });
      state.activityLog = loadedLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      if (state.activityLog.length > 100) {
        state.activityLog = state.activityLog.slice(0, 100);
      }
      renderActivityLog();
      updateActivityBadge();
    }, (error) => {
      console.error("Firestore activity_log sync error:", error);
    });
  } catch(err) {
    console.warn("Firestore activity_log listener skipped:", err);
  }
}

function saveToStorage() {
  localStorage.setItem('hc_brands', JSON.stringify(state.brands));
  localStorage.setItem('hc_team', JSON.stringify(state.team));
}

async function logActivity(actionText, dbInstance) {
  const currentUser = localStorage.getItem('hc_logged_in_user') || 'System';
  const logEntry = {
    id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user: currentUser,
    actionText: actionText,
    timestamp: new Date().toISOString()
  };
  try {
    const targetDb = dbInstance || db;
    await setDoc(doc(targetDb, "activity_log", logEntry.id), logEntry);
  } catch (err) {
    console.error("Failed to write to activity log:", err);
  }
}

function renderPostComments(post) {
  const feed = document.getElementById('post-comments-feed');
  if (!feed) return;
  if (!post || !post.commentsList || post.commentsList.length === 0) {
    feed.innerHTML = '<div style="color: #64748b; font-style: italic; font-size: 0.8rem; text-align: center; padding: 10px;">No comments yet. Start the discussion!</div>';
    return;
  }

  feed.innerHTML = post.commentsList.map(c => {
    const initials = c.user.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const dateStr = new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="comment-bubble-card">
        <div class="comment-avatar">${initials}</div>
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-user">${c.user}</span>
            <span class="comment-time">${dateStr}</span>
          </div>
          <div class="comment-text">${c.text}</div>
        </div>
      </div>
    `;
  }).join('');
  feed.scrollTop = feed.scrollHeight;
}

function renderTaskComments(task) {
  const feed = document.getElementById('task-comments-feed');
  if (!feed) return;
  if (!task || !task.commentsList || task.commentsList.length === 0) {
    if (task && task.comments) {
      const parts = task.comments.split(' | ');
      const parsed = parts.map(p => {
        const match = p.match(/^\[(.*?)\]: (.*)$/);
        return {
          user: match ? match[1] : 'System',
          text: match ? match[2] : p,
          timestamp: task.date ? `${task.date}T12:00:00.000Z` : new Date().toISOString()
        };
      });
      task.commentsList = parsed;
    } else {
      feed.innerHTML = '<div style="color: #64748b; font-style: italic; font-size: 0.8rem; text-align: center; padding: 10px;">No comments yet. Start the discussion!</div>';
      return;
    }
  }

  feed.innerHTML = task.commentsList.map(c => {
    const initials = c.user.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const dateStr = new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="comment-bubble-card">
        <div class="comment-avatar">${initials}</div>
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-user">${c.user}</span>
            <span class="comment-time">${dateStr}</span>
          </div>
          <div class="comment-text">${c.text}</div>
        </div>
      </div>
    `;
  }).join('');
  feed.scrollTop = feed.scrollHeight;
}

async function addCommentToPost(postId, text, dbInstance) {
  const currentUser = localStorage.getItem('hc_logged_in_user') || 'System';
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;

  const commentsList = post.commentsList || [];
  commentsList.push({
    user: currentUser,
    text: text,
    timestamp: new Date().toISOString()
  });

  post.commentsList = commentsList;
  post.comments = commentsList.map(c => `[${c.user.split(' ')[0]}]: ${c.text}`).join(' | ');

  try {
    const targetDb = dbInstance || db;
    await setDoc(doc(targetDb, "posts", post.id), post);
    await syncPostToTask(post, targetDb);
    await logActivity(`commented on post "${post.title}": "${text}"`, targetDb);
  } catch (err) {
    console.error("Failed to add comment:", err);
  }
}

async function addCommentToTask(taskId, text, dbInstance) {
  const currentUser = localStorage.getItem('hc_logged_in_user') || 'System';
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const commentsList = task.commentsList || [];
  commentsList.push({
    user: currentUser,
    text: text,
    timestamp: new Date().toISOString()
  });

  task.commentsList = commentsList;
  task.comments = commentsList.map(c => `[${c.user.split(' ')[0]}]: ${c.text}`).join(' | ');

  try {
    const targetDb = dbInstance || db;
    await setDoc(doc(targetDb, "tasks", task.id), task);
    await syncTaskToPost(task, targetDb);
    await logActivity(`commented on task "${task.name}": "${text}"`, targetDb);
  } catch (err) {
    console.error("Failed to add task comment:", err);
  }
}

function renderActivityLog() {
  const container = document.getElementById('activity-log-list');
  if (!container) return;

  const pendingPublishing = (state.tasks || []).filter(t => (t.taskType === 'post' || t.associatedPostId) && t.status === 'Finished' && !t.isPosted);

  let publishingHtml = '';
  if (pendingPublishing.length > 0) {
    publishingHtml = `
      <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px;">
        <div style="font-weight: 700; color: var(--honey-gold); margin-bottom: 12px; font-size: 0.9rem;">
          🚀 Pending Posts to Publish (${pendingPublishing.length})
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${pendingPublishing.map(task => {
            const post = task.associatedPostId ? state.posts.find(p => p.id === task.associatedPostId) : null;
            const postInfo = post ? `<div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">Platform: ${(post.platforms || []).join(', ')} | Page: ${post.brandId}</div>` : '';
            return `
              <div style="background: rgba(245, 158, 11, 0.06); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px; padding: 12px;">
                <div style="font-weight: 600; color: #f8fafc; font-size: 0.88rem;">${task.name}</div>
                <div style="font-size: 0.78rem; color: #cbd5e1; margin-top: 4px;">Delivery Link: <a href="${task.deliveryLink || '#'}" target="_blank" style="color: var(--honey-gold); text-decoration: underline;">${task.deliveryLink ? 'Open Asset' : 'None'}</a></div>
                ${postInfo}
                <button class="mark-posted-btn" data-task-id="${task.id}" style="margin-top: 10px; width: 100%; background: var(--honey-gold); color: #000; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.2s;">Mark as Posted</button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  let activityHtml = '';
  if (!state.activityLog || state.activityLog.length === 0) {
    activityHtml = '<div style="color: #64748b; font-style: italic; text-align: center; margin-top: 20px;">No recent activity</div>';
  } else {
    activityHtml = `
      <div style="font-weight: 700; color: #cbd5e1; margin-bottom: 10px; font-size: 0.85rem;">System Activity History</div>
      ` + state.activityLog.map(log => {
      const date = new Date(log.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      return `
        <div class="activity-log-item">
          <div>
            <span class="activity-log-user">${log.user}</span>
            <span class="activity-log-text">${log.actionText}</span>
          </div>
          <div class="activity-log-time">${dateStr} at ${timeStr}</div>
        </div>
      `;
    }).join('');
  }

  container.innerHTML = publishingHtml + activityHtml;

  container.querySelectorAll('.mark-posted-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const taskId = e.currentTarget.getAttribute('data-task-id');
      if (taskId) {
        window.markTaskPosted(taskId);
      }
    });
  });
}

let lastViewedLogTime = localStorage.getItem('hc_last_viewed_log_time') || new Date(0).toISOString();

function updateActivityBadge() {
  const badge = document.getElementById('activity-badge');
  if (!badge) return;
  
  const pendingPublishing = (state.tasks || []).filter(t => (t.taskType === 'post' || t.associatedPostId) && t.status === 'Finished' && !t.isPosted);
  const pendingCount = pendingPublishing.length;
  
  if (pendingCount > 0) {
    badge.textContent = pendingCount;
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.fontSize = '0.65rem';
    badge.style.fontWeight = '800';
    badge.style.color = '#000';
    badge.style.background = '#f59e0b';
    badge.style.borderRadius = '50%';
    badge.style.minWidth = '16px';
    badge.style.height = '16px';
    badge.style.top = '-3px';
    badge.style.right = '-3px';
    return;
  }
  
  if (state.activityLog && state.activityLog.length > 0) {
    const newestLog = state.activityLog[0];
    if (newestLog.timestamp > lastViewedLogTime) {
      badge.textContent = '';
      badge.style.display = 'block';
      badge.style.background = '#ef4444';
      badge.style.width = '8px';
      badge.style.height = '8px';
      badge.style.top = '10px';
      badge.style.right = '10px';
      return;
    }
  }
  badge.style.display = 'none';
}

function triggerCelebration() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const particles = [];
  const colors = ['#fbbf24', '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#a855f7'];
  
  // Left side burst
  for (let i = 0; i < 75; i++) {
    particles.push({
      x: 0,
      y: canvas.height * 0.8,
      vx: Math.random() * 15 + 5,
      vy: -Math.random() * 20 - 10,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: Math.random() * 0.015 + 0.005
    });
  }

  // Right side burst
  for (let i = 0; i < 75; i++) {
    particles.push({
      x: canvas.width,
      y: canvas.height * 0.8,
      vx: -Math.random() * 15 - 5,
      vy: -Math.random() * 20 - 10,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: Math.random() * 0.015 + 0.005
    });
  }
  
  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      if (p.alpha > 0) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // gravity
        p.alpha -= p.decay;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
        alive = true;
      }
    });
    if (alive) {
      requestAnimationFrame(update);
    } else {
      canvas.remove();
    }
  }
  update();
}

function exportTasksToCSV() {
  const headers = ['ID', 'Task Name', 'Creative', 'Assigned By', 'Date', 'Time', 'Urgency', 'Status', 'Delivery Link', 'Comments', 'Job Type'];
  const rows = state.tasks.map(t => [
    t.id,
    t.name,
    t.designer,
    t.assignedBy || '',
    t.date,
    t.time || '',
    t.urgency || '',
    t.status,
    t.deliveryLink || '',
    t.comments || '',
    t.taskType || 'general'
  ]);
  
  const csvRows = [headers.join(',')];
  rows.forEach(r => {
    const formatted = r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    csvRows.push(formatted);
  });
  
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `honeycomb_tasks_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handleCSVImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const text = evt.target.result;
      const lines = text.split('\n');
      let importedCount = 0;
      
      let maxId = 0;
      state.tasks.forEach(t => {
        const num = parseInt(t.id.replace('T-', ''));
        if (!isNaN(num) && num > maxId) maxId = num;
      });

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cells = [];
        let insideQuote = false;
        let currentCell = '';
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            cells.push(currentCell.trim());
            currentCell = '';
          } else {
            currentCell += char;
          }
        }
        cells.push(currentCell.trim());

        if (cells.length < 2) continue;
        
        const name = cells[1] || 'Imported Task';
        const designer = cells[2] || 'Unassigned';
        const assignedBy = cells[3] || 'System';
        const date = cells[4] || new Date().toISOString().slice(0, 10);
        const time = cells[5] || '12:00';
        const urgency = cells[6] || 'ASAP';
        const status = cells[7] || 'Not Started';
        const deliveryLink = cells[8] || '';
        const comments = cells[9] || '';
        const jobType = cells[10] || 'general';
        
        maxId++;
        const newId = `T-${String(maxId).padStart(2, '0')}`;
        
        const newTask = {
          id: newId,
          name,
          designer,
          assignedBy,
          date,
          time,
          urgency,
          status,
          deliveryLink,
          comments,
          taskType: jobType,
          associatedPostId: ''
        };
        
        await setDoc(doc(db, "tasks", newId), newTask);
        importedCount++;
      }
      
      showToast(`Successfully imported ${importedCount} tasks from CSV!`, 'success');
      await logActivity(`imported ${importedCount} tasks from CSV`, db);
    } catch (err) {
      console.error(err);
      showToast('Failed to parse CSV file', 'error');
    }
  };
  reader.readAsText(file);
}

function renderUnscheduledIdeas() {
  const container = document.getElementById('unscheduled-ideas-list');
  if (!container) return;
  container.innerHTML = '<div style="color: #a89297; font-style: italic; text-align: center; margin-top: 40px;">No unscheduled items.</div>';
}

async function convertIdeaToPost(ideaId, kanbanStatus) {
  return;
}

// Navigation & Event Listeners
function setupEventListeners() {
  // Brand modal event listeners
  const brandClose = document.getElementById('brand-modal-close-btn');
  const brandCancel = document.getElementById('brand-modal-cancel-btn');
  if (brandClose) brandClose.addEventListener('click', closeBrandModal);
  if (brandCancel) brandCancel.addEventListener('click', closeBrandModal);

  const brandForm = document.getElementById('brand-form');
  if (brandForm) {
    brandForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const idInput = document.getElementById('brand-edit-id').value;
      const name = document.getElementById('brand-name').value.trim();
      const type = document.getElementById('brand-type').value.trim();
      const goal = parseInt(document.getElementById('brand-goal').value, 10) || 0;
      const logo = document.getElementById('brand-logo').value.trim() || null;

      if (!name || !type) return;

      if (idInput) {
        // Edit existing brand
        const brand = state.brands.find(b => b.id === idInput);
        if (brand) {
          brand.name = name;
          brand.type = type;
          brand.frequencyGoal = goal;
          brand.logo = logo;
          showToast('Brand details updated successfully!', 'success');
          logActivity(`updated brand "${name}"`, db);
        }
      } else {
        // Create new brand
        const newId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const existing = state.brands.find(b => b.id === newId);
        const finalId = existing ? `${newId}-${Date.now().toString().slice(-4)}` : newId;
        
        const grays = ['#ffffff', '#cccccc', '#aaaaaa', '#888888', '#dddddd', '#bbbbbb', '#999999'];
        const randomColor = grays[Math.floor(Math.random() * grays.length)];
        const randomGrad = `linear-gradient(135deg, ${randomColor}, #334155)`;

        const newBrand = {
          id: finalId,
          name,
          type,
          frequencyGoal: goal,
          logo,
          grad: randomGrad,
          color: randomColor,
          glow: 'transparent',
          lastPostDate: 'Never'
        };
        state.brands.push(newBrand);
        showToast('New brand added successfully!', 'success');
        logActivity(`added brand "${name}"`, db);
      }

      saveToStorage();
      updateModalDropdowns();
      refreshViews();
      closeBrandModal();
    });
  }





  // Comments submit listeners
  const postAddCommentBtn = document.getElementById('post-add-comment-btn');
  if (postAddCommentBtn) {
    postAddCommentBtn.addEventListener('click', async () => {
      const input = document.getElementById('post-new-comment');
      if (!input || !input.value.trim() || !state.editingPost) return;
      const text = input.value.trim();
      input.value = '';
      await addCommentToPost(state.editingPost.id, text, db);
      setTimeout(() => {
        const post = state.posts.find(p => p.id === state.editingPost.id);
        renderPostComments(post);
      }, 300);
    });
  }

  const taskAddCommentBtn = document.getElementById('task-add-comment-btn');
  if (taskAddCommentBtn) {
    taskAddCommentBtn.addEventListener('click', async () => {
      const input = document.getElementById('task-new-comment');
      if (!input || !input.value.trim() || !state.editingTask) return;
      const text = input.value.trim();
      input.value = '';
      await addCommentToTask(state.editingTask.id, text, db);
      setTimeout(() => {
        const task = state.tasks.find(t => t.id === state.editingTask.id);
        renderTaskComments(task);
      }, 300);
    });
  }

  // Task Tracker Filters & Search
  const taskSearchInput = document.getElementById('task-search-input');
  if (taskSearchInput) {
    taskSearchInput.addEventListener('input', (e) => {
      state.taskSearchFilter = e.target.value;
      renderTasks();
    });
  }

  const taskDesignerFilter = document.getElementById('task-designer-filter');
  if (taskDesignerFilter) {
    taskDesignerFilter.addEventListener('change', (e) => {
      state.taskDesignerFilter = e.target.value;
      renderTasks();
    });
  }

  const taskAssignerFilter = document.getElementById('task-assigner-filter');
  if (taskAssignerFilter) {
    taskAssignerFilter.addEventListener('change', (e) => {
      state.taskAssignerFilter = e.target.value;
      renderTasks();
    });
  }

  const taskStatusFilter = document.getElementById('task-status-filter');
  if (taskStatusFilter) {
    taskStatusFilter.addEventListener('change', (e) => {
      state.taskStatusFilter = e.target.value;
      renderTasks();
    });
  }

  // Create Task button
  const createTaskBtn = document.getElementById('create-task-btn');
  if (createTaskBtn) {
    createTaskBtn.addEventListener('click', () => {
      openTaskModal();
    });
  }

  // Task Modal Form & Delete
  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskFormSubmit);
  }

  const deleteTaskBtn = document.getElementById('task-modal-delete-btn');
  if (deleteTaskBtn) {
    deleteTaskBtn.addEventListener('click', deleteTask);
  }

  const taskCloseBtn = document.getElementById('task-modal-close-btn');
  const taskCancelBtn = document.getElementById('task-modal-cancel-btn');
  if (taskCloseBtn) taskCloseBtn.addEventListener('click', closeTaskModal);
  if (taskCancelBtn) taskCancelBtn.addEventListener('click', closeTaskModal);

  // CSV Import / Export
  const csvExportBtn = document.getElementById('csv-export-btn');
  if (csvExportBtn) {
    csvExportBtn.addEventListener('click', exportTasksToCSV);
  }

  const csvImportBtn = document.getElementById('csv-import-btn');
  const csvImportInput = document.getElementById('csv-import-input');
  if (csvImportBtn && csvImportInput) {
    csvImportBtn.addEventListener('click', () => csvImportInput.click());
    csvImportInput.addEventListener('change', handleCSVImport);
  }

  // Sidebar Nav clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchView(view);
    });
  });

  // Top bar brand filters
  const globalFilter = document.getElementById('global-brand-filter');
  if (globalFilter) {
    globalFilter.addEventListener('change', (e) => {
      state.selectedBrandFilter = e.target.value;
      refreshViews();
    });
  }

  // Logs filters
  const logsSearchInput = document.getElementById('logs-search-input');
  if (logsSearchInput) {
    logsSearchInput.addEventListener('input', (e) => {
      state.logsSearchQuery = e.target.value;
      renderLogs();
    });
  }

  const logsUserFilter = document.getElementById('logs-user-filter');
  if (logsUserFilter) {
    logsUserFilter.addEventListener('change', (e) => {
      state.logsUserFilter = e.target.value;
      renderLogs();
    });
  }

  // Content Links filters
  const clSearchInput = document.getElementById('content-links-search-input');
  if (clSearchInput) {
    clSearchInput.addEventListener('input', () => {
      renderContentLinks();
    });
  }

  const clCreativeFilter = document.getElementById('content-links-creative-filter');
  if (clCreativeFilter) {
    clCreativeFilter.addEventListener('change', () => {
      renderContentLinks();
    });
  }

  // Task Tracker table column header click to sort (Ascending / Descending)
  document.querySelectorAll('.tasks-table th.sortable-th').forEach(th => {
    th.addEventListener('click', () => {
      const sortCol = th.getAttribute('data-sort');
      if (!sortCol) return;
      if (state.taskSortCol === sortCol) {
        state.taskSortDir = state.taskSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.taskSortCol = sortCol;
        state.taskSortDir = (sortCol === 'id' || sortCol === 'date') ? 'desc' : 'asc';
      }
      renderTasks();
    });
  });

  // Content Links table column header click to sort (Ascending / Descending)
  document.querySelectorAll('#content-links-view th.sortable-th').forEach(th => {
    th.addEventListener('click', () => {
      const sortCol = th.getAttribute('data-sort');
      if (!sortCol) return;
      if (state.contentLinksSortCol === sortCol) {
        state.contentLinksSortDir = state.contentLinksSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.contentLinksSortCol = sortCol;
        state.contentLinksSortDir = (sortCol === 'id' || sortCol === 'date') ? 'desc' : 'asc';
      }
      renderContentLinks();
    });
  });

  // Calendar month navigation buttons
  const calPrevBtn = document.getElementById('cal-prev');
  if (calPrevBtn) {
    calPrevBtn.addEventListener('click', () => {
      state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
      renderCalendar();
    });
  }

  const calNextBtn = document.getElementById('cal-next');
  if (calNextBtn) {
    calNextBtn.addEventListener('click', () => {
      state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
      renderCalendar();
    });
  }

  // People & Roles table column header click to sort
  document.querySelectorAll('#people-view th.sortable-th').forEach(th => {
    th.addEventListener('click', () => {
      const sortCol = th.getAttribute('data-sort');
      if (!sortCol) return;
      if (state.teamSortCol === sortCol) {
        state.teamSortDir = state.teamSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.teamSortCol = sortCol;
        state.teamSortDir = 'asc';
      }
      renderTeam();
    });
  });

  // Create post button
  const createBtn = document.getElementById('create-post-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      openPostModal();
    });
  }

  // Close modal clicks (post, task, brand, and person modals)
  document.querySelectorAll('.close-btn, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      closePostModal();
      closeTaskModal();
      closeBrandModal();
      closePersonModal();
    });
  });

  // Delete post button click
  const deleteBtn = document.getElementById('modal-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deletePost);
  }

  // Visual toggling for platform checkbox labels
  document.querySelectorAll('input[name="post-platforms"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const label = cb.closest('.platform-checkbox-label');
      if (cb.checked) {
        label.classList.add('checked');
      } else {
        label.classList.remove('checked');
      }
    });
  });

  // Form Submit
  const postForm = document.getElementById('post-form');
  if (postForm) {
    postForm.addEventListener('submit', handleFormSubmit);
  }

  // --- TEAM EVENTS ---
  const teamSearch = document.getElementById('team-search-input');
  if (teamSearch) {
    teamSearch.addEventListener('input', (e) => {
      state.teamSearchFilter = e.target.value;
      renderTeam();
    });
  }

  const teamDesigFilter = document.getElementById('team-designation-filter');
  if (teamDesigFilter) {
    teamDesigFilter.addEventListener('change', (e) => {
      state.teamDesignationFilter = e.target.value;
      renderTeam();
    });
  }

  const teamSortSelect = document.getElementById('team-sort-select');
  if (teamSortSelect) {
    teamSortSelect.addEventListener('change', (e) => {
      state.teamSortOrder = e.target.value;
      renderTeam();
    });
  }

  const createPersonBtn = document.getElementById('create-person-btn');
  if (createPersonBtn) {
    createPersonBtn.addEventListener('click', () => {
      openPersonModal();
    });
  }

  const personForm = document.getElementById('person-form');
  if (personForm) {
    personForm.addEventListener('submit', handlePersonFormSubmit);
  }

  const deletePersonBtn = document.getElementById('person-modal-delete-btn');
  if (deletePersonBtn) {
    deletePersonBtn.addEventListener('click', deletePerson);
  }

  const closePersonBtn = document.getElementById('person-modal-close-btn');
  if (closePersonBtn) {
    closePersonBtn.addEventListener('click', closePersonModal);
  }

  const cancelPersonBtn = document.getElementById('person-modal-cancel-btn');
  if (cancelPersonBtn) {
    cancelPersonBtn.addEventListener('click', closePersonModal);
  }
}

function switchView(viewName) {
  if (viewName === 'kanban' || viewName === 'analytics' || viewName === 'ideas') {
    viewName = 'dashboard';
  }

  state.currentView = viewName;
  localStorage.setItem('hc_last_view', viewName);
  
  // Update sidebar active status
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Toggle active views
  document.querySelectorAll('.view-panel').forEach(panel => {
    if (panel.id === `${viewName}-view`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // Customize layout elements depending on view
  const headerActions = document.querySelector('.header-actions');
  if (viewName === 'analytics' || viewName === 'tasks' || viewName === 'ideas' || viewName === 'team' || viewName === 'logs' || viewName === 'content-links') {
    headerActions.style.display = 'none';
  } else {
    headerActions.style.display = 'flex';
  }

  const toggleIdeasBtn = document.getElementById('toggle-ideas-btn');
  if (toggleIdeasBtn) {
    toggleIdeasBtn.style.display = viewName === 'kanban' ? 'flex' : 'none';
  }

  // Trigger view renderers
  if (viewName === 'tasks') renderTasks();
  else if (viewName === 'team') renderTeam();
  else if (viewName === 'content-links') renderContentLinks();
  else if (viewName === 'dashboard') renderDashboard();
  else if (viewName === 'calendar') renderCalendar();
  else if (viewName === 'logs') renderLogs();

  // Scroll main back to top
  document.querySelector('.main-content').scrollTop = 0;
}

function initFilterDropdowns() {
  const globalFilter = document.getElementById('global-brand-filter');
  const postBrandSelect = document.getElementById('post-brand');
  const postAssigneeSelect = document.getElementById('post-assignee');

  if (globalFilter) {
    globalFilter.innerHTML = '<option value="all">All Brands & Pages</option>';
    state.brands.forEach(b => {
      globalFilter.innerHTML += `<option value="${b.id}">${b.name}</option>`;
    });
  }

  if (postBrandSelect) {
    postBrandSelect.innerHTML = '';
    state.brands.forEach(b => {
      postBrandSelect.innerHTML += `<option value="${b.id}">${b.name} (${b.type})</option>`;
    });
  }

  if (postAssigneeSelect) {
    postAssigneeSelect.innerHTML = '';
    state.team.forEach(t => {
      postAssigneeSelect.innerHTML += `<option value="${t.name}">${t.name} (${t.role})</option>`;
    });
  }
}

function refreshViews() {
  try { renderDashboard(); } catch(e) { console.error("renderDashboard error:", e); }
  try { renderKanban(); } catch(e) { console.error("renderKanban error:", e); }
  try { renderCalendar(); } catch(e) { console.error("renderCalendar error:", e); }
  try { renderAnalytics(); } catch(e) { console.error("renderAnalytics error:", e); }
  try { renderTasks(); } catch(e) { console.error("renderTasks error:", e); }
  try { renderTeam(); } catch(e) { console.error("renderTeam error:", e); }
  try { renderLogs(); } catch(e) { console.error("renderLogs error:", e); }
  try { renderContentLinks(); } catch(e) { console.error("renderContentLinks error:", e); }
  try { updatePublishingQueueBadge(); } catch(e) { console.error("updatePublishingQueueBadge error:", e); }
}

function renderLogs() {
  const tableBody = document.getElementById('logs-table-body');
  if (!tableBody) return;

  const currentUser = localStorage.getItem('hc_logged_in_user');
  const account = findTeamMember(currentUser);
  const isAdmin = currentUser && account && account.access === 'admin';

  if (!isAdmin) {
    tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ef4444; padding: 32px 16px; font-weight: 600;">Access Denied: Admin privileges required.</td></tr>`;
    return;
  }

  const logsSearch = (state.logsSearchQuery || '').toLowerCase();
  const logsUser = state.logsUserFilter || 'all';

  // Filter activityLog
  const filteredLogs = (state.activityLog || []).filter(log => {
    const matchesSearch = log.actionText.toLowerCase().includes(logsSearch) || log.user.toLowerCase().includes(logsSearch);
    const matchesUser = logsUser === 'all' || log.user === logsUser;
    return matchesSearch && matchesUser;
  });

  tableBody.innerHTML = '';
  if (filteredLogs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 32px 16px; font-style: italic;">No logs found.</td></tr>`;
    return;
  }

  filteredLogs.forEach(log => {
    const date = new Date(log.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color: #94a3b8; font-family: monospace; font-size: 0.8rem;">${dateStr} ${timeStr}</td>
      <td style="color: var(--honey-gold); font-weight: 600;">${log.user}</td>
      <td style="color: #e2e8f0;">${log.actionText}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function populateLogsUserFilter() {
  const userFilterSelect = document.getElementById('logs-user-filter');
  if (!userFilterSelect) return;
  const currentVal = userFilterSelect.value;
  userFilterSelect.innerHTML = '<option value="all">All Users</option>';
  
  // Get all unique users in activityLog
  const activeLogUsers = Array.from(new Set((state.activityLog || []).map(l => l.user))).sort();
  activeLogUsers.forEach(username => {
    userFilterSelect.innerHTML += `<option value="${username}">${username}</option>`;
  });
  
  if (activeLogUsers.includes(currentVal)) {
    userFilterSelect.value = currentVal;
  }
}

/* ==========================================================================
   CONTENT LINKS DIRECTORY CONTROLLER
   ========================================================================== */

function renderContentLinks() {
  const tableBody = document.getElementById('content-links-list-body');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  // Get all tasks with delivery links
  let linkedItems = state.tasks.filter(t => t.deliveryLink && t.deliveryLink.trim() !== '');

  // Also include posts if any have delivery/drive links
  state.posts.forEach(p => {
    if (p.deliveryLink && p.deliveryLink.trim() !== '') {
      linkedItems.push({
        id: p.id,
        name: p.title,
        designer: p.assignee,
        assignedBy: 'Social Media Desk',
        date: p.date,
        deliveryLink: p.deliveryLink
      });
    }
  });

  // Filter by search
  const searchInput = document.getElementById('content-links-search-input');
  if (searchInput && searchInput.value) {
    const q = searchInput.value.toLowerCase().trim();
    linkedItems = linkedItems.filter(item => {
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const idMatch = (item.id || '').toLowerCase().includes(q);
      const designerMatch = (item.designer || '').toLowerCase().includes(q);
      const assignerMatch = (item.assignedBy || '').toLowerCase().includes(q);
      return nameMatch || idMatch || designerMatch || assignerMatch;
    });
  }

  // Filter by creative
  const creativeSelect = document.getElementById('content-links-creative-filter');
  if (creativeSelect && creativeSelect.value !== 'all') {
    linkedItems = linkedItems.filter(item => {
      const person = findTeamMember(item.designer);
      const resolvedName = person ? person.name : item.designer;
      return resolvedName === creativeSelect.value || item.designer === creativeSelect.value;
    });
  }

  // Dynamic column sorting
  const linkCol = state.contentLinksSortCol || 'date';
  const linkDir = state.contentLinksSortDir === 'asc' ? 1 : -1;

  linkedItems.sort((a, b) => {
    let valA = a[linkCol] || '';
    let valB = b[linkCol] || '';

    if (linkCol === 'id') {
      const numA = parseInt((valA || '').replace('T-', '')) || 0;
      const numB = parseInt((valB || '').replace('T-', '')) || 0;
      return (numA - numB) * linkDir;
    }

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return -1 * linkDir;
    if (valA > valB) return 1 * linkDir;
    return 0;
  });

  // Update Content Links header sort UI indicators
  document.querySelectorAll('#content-links-view th.sortable-th').forEach(th => {
    const sCol = th.getAttribute('data-sort');
    const icon = th.querySelector('.sort-icon');
    if (sCol === state.contentLinksSortCol) {
      th.classList.add('active-sort');
      if (icon) icon.textContent = state.contentLinksSortDir === 'asc' ? '▲' : '▼';
    } else {
      th.classList.remove('active-sort');
      if (icon) icon.textContent = '↕';
    }
  });

  // Update total count badge
  const totalCountEl = document.getElementById('content-links-total-count');
  if (totalCountEl) totalCountEl.textContent = linkedItems.length;

  if (linkedItems.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: #64748b; font-style: italic; padding: 40px;">
          No content delivery links found. Upload a drive link in tasks/posts to display here.
        </td>
      </tr>
    `;
    return;
  }

  linkedItems.forEach(item => {
    const creativePerson = findTeamMember(item.designer);
    const creativeName = creativePerson ? creativePerson.name : (item.designer || 'Unassigned');
    const creativePhoto = creativePerson && creativePerson.photo
      ? `<img src="${creativePerson.photo}" class="team-avatar-img" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" alt="${creativeName}" title="${creativeName}">`
      : `<div class="card-assignee-avatar" style="width: 28px; height: 28px; font-size: 0.75rem">${getAssigneeInitials(creativeName)}</div>`;

    const assignerPerson = findTeamMember(item.assignedBy);
    const assignerName = assignerPerson ? assignerPerson.name : (item.assignedBy || 'Unassigned');
    const assignerPhoto = assignerPerson && assignerPerson.photo
      ? `<img src="${assignerPerson.photo}" class="team-avatar-img" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" alt="${assignerName}" title="${assignerName}">`
      : '';

    const dateFormatted = formatCardDate(item.date);
    let rawLink = (item.deliveryLink || '').trim();
    let finalUrl = rawLink;
    let displayLinkLabel = 'Google Drive';

    if (rawLink) {
      if (rawLink.startsWith('http://') || rawLink.startsWith('https://')) {
        finalUrl = rawLink;
        if (rawLink.includes('facebook.com')) {
          displayLinkLabel = 'Facebook Post';
        } else {
          displayLinkLabel = 'Open Link';
        }
      } else {
        finalUrl = `https://drive.google.com/drive/search?q=${encodeURIComponent(rawLink)}`;
        displayLinkLabel = rawLink.length > 24 ? rawLink.substring(0, 21) + '...' : rawLink;
      }
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="white-space: nowrap;"><strong>${item.id}</strong></td>
      <td>
        <div style="font-weight: 600; color: #fff; font-size: 0.95rem;">${item.name}</div>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px">
          ${creativePhoto}
          <span style="font-weight: 500; color: #fff">${creativeName}</span>
        </div>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px">
          ${assignerPhoto}
          <span>${assignerName}</span>
        </div>
      </td>
      <td>${dateFormatted}</td>
      <td style="text-align: center;">
        <a href="${finalUrl}" target="_blank" rel="noopener noreferrer" class="drive-link-btn" title="Open: ${rawLink}">
          <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; margin-right: 6px;"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
          ${displayLinkLabel} ↗
        </a>
      </td>
    `;
    tableBody.appendChild(row);
  });
}



// Render Dashboard View
function renderDashboard() {
  const grid = document.getElementById('dashboard-cards-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const filteredBrands = state.selectedBrandFilter === 'all' 
    ? state.brands 
    : state.brands.filter(b => b.id === state.selectedBrandFilter);

  filteredBrands.forEach(brand => {
    // Calculate progress for current week (let's define posts created/scheduled in current week)
    const brandPosts = state.posts.filter(p => p.brandId === brand.id);
    
    // Let's filter posts for this week (using the week of 2026-07-05, Sunday to Saturday)
    // 2026-07-05 is Sunday. So current week is 2026-07-05 to 2026-07-11
    const weekStart = new Date('2026-07-05T00:00:00');
    const weekEnd = new Date('2026-07-11T23:59:59');
    
    const weeklyPosts = brandPosts.filter(p => {
      const pDate = new Date(p.date + 'T00:00:00');
      return pDate >= weekStart && pDate <= weekEnd;
    });

    const publishedCount = weeklyPosts.filter(p => p.status === 'published').length;
    const goal = brand.frequencyGoal;
    const progressPct = goal > 0 ? Math.min(Math.round((publishedCount / goal) * 100), 100) : 100;

    // Determine health status
    let healthStatus = 'Healthy';
    let healthClass = 'status-healthy-badge';
    
    // Check overdue posts: Status scheduled/ready/development but date before 2026-07-05
    const overduePosts = brandPosts.filter(p => {
      const pDate = new Date(p.date + 'T00:00:00');
      return p.status !== 'published' && pDate < new Date('2026-07-05T00:00:00');
    });

    if (overduePosts.length > 0) {
      healthStatus = 'Critical';
      healthClass = 'status-critical-badge';
    } else if (publishedCount < Math.ceil(goal / 2) && new Date().getDay() > 3) {
      // It's past mid-week and less than half of goals published
      healthStatus = 'Warning';
      healthClass = 'status-warning-badge';
    }

    const isTargetAchieved = publishedCount >= goal && goal > 0;
    if (isTargetAchieved) {
      const key = `hc_achieved_${brand.id}_${weekStart.toISOString().slice(0,10)}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, 'true');
        setTimeout(() => triggerCelebration(), 500);
      }
    }

    const card = document.createElement('div');
    card.className = 'brand-card';
    card.style.setProperty('--brand-grad', brand.grad);
    card.innerHTML = `
      <div class="brand-header">
        <div class="brand-info-wrap">
          ${brand.logo 
            ? `<img src="${brand.logo}" class="brand-badge-img" alt="${brand.name} logo">`
            : `<div class="brand-badge-icon" style="background: ${brand.grad}">${brand.name.substring(0,2).toUpperCase()}</div>`}
          <div class="brand-title-wrap">
            <h3 style="display: flex; align-items: center; gap: 8px;">
              ${brand.name}
              <button class="edit-brand-btn" data-id="${brand.id}" style="background: none; border: none; cursor: pointer; color: #a3a3c2; padding: 0; display: inline-flex; align-items: center;" title="Edit Page/Brand">
                <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
            </h3>
            <div class="brand-subtitle">${brand.type}</div>
            ${isTargetAchieved ? `<div class="target-achieved-badge" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #000; font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; margin-top: 4px; box-shadow: 0 0 10px rgba(251,191,36,0.3); display: inline-block; width: fit-content;">Goal Met! 🏆</div>` : ''}
          </div>
        </div>
        ${healthStatus !== 'Healthy' ? `<div class="status-indicator ${healthClass}">${healthStatus}</div>` : ''}
      </div>

      <div class="metric-row">
        <div class="metric-box">
          <div class="metric-val">${publishedCount}</div>
          <div class="metric-label">Published</div>
        </div>
        <div class="metric-box">
          <div class="metric-val">${goal}</div>
          <div class="metric-label">Goal / Wk</div>
        </div>
      </div>

      <div class="progress-section">
        <div class="progress-label-wrap">
          <span>Weekly Goal Progress</span>
          <span class="progress-pct">${progressPct}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${progressPct}%; background: ${brand.grad}"></div>
        </div>
      </div>

      <div class="brand-footer">
        <span>Last post: <strong>${brand.lastPostDate || 'Never'}</strong></span>
        <span>Total: <strong>${brandPosts.length} posts</strong></span>
      </div>
    `;

    const editBtn = card.querySelector('.edit-brand-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openBrandModal(brand.id);
      });
    }

    grid.appendChild(card);
  });

  // Append "+ Add Page / Brand" button card
  if (state.selectedBrandFilter === 'all') {
    const addCard = document.createElement('div');
    addCard.className = 'brand-card';
    addCard.style.display = 'flex';
    addCard.style.flexDirection = 'column';
    addCard.style.alignItems = 'center';
    addCard.style.justifyContent = 'center';
    addCard.style.border = '1px dashed rgba(255, 255, 255, 0.15)';
    addCard.style.background = 'transparent';
    addCard.style.cursor = 'pointer';
    addCard.style.minHeight = '200px';
    addCard.style.borderRadius = '16px';
    addCard.innerHTML = `
      <div style="text-align: center; color: #94a3b8;">
        <svg viewBox="0 0 24 24" style="width: 32px; height: 32px; margin-bottom: 8px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <div style="font-weight: 500; font-size: 0.9rem;">Add Page / Brand</div>
      </div>
    `;
    addCard.addEventListener('click', () => {
      openBrandModal();
    });
    grid.appendChild(addCard);
  }
}

// Render Kanban Board View
function renderKanban() {
  const columns = ['ideation', 'development', 'ready', 'scheduled', 'published'];
  
  columns.forEach(col => {
    const colArea = document.querySelector(`.column-cards-area[data-status="${col}"]`);
    if (!colArea) return;
    colArea.innerHTML = '';

    let colPosts = state.posts.filter(p => p.status === col && !isItemArchived(p));
    if (state.selectedBrandFilter !== 'all') {
      colPosts = colPosts.filter(p => p.brandId === state.selectedBrandFilter);
    }

    let colTasks = state.tasks.filter(t => {
      let colStatus = '';
      if (t.status === 'Not Started') colStatus = 'ideation';
      else if (t.status === 'On Progress') colStatus = 'development';
      else if (t.status === 'Delayed') colStatus = 'ready';
      else if (t.status === 'Finished') colStatus = 'published';
      return colStatus === col && t.taskType !== 'post' && !isItemArchived(t); // Hide duplicate social media post tasks from kanban to avoid redundancy
    });

    if (state.selectedBrandFilter !== 'all') {
      const selectedBrand = state.brands.find(b => b.id === state.selectedBrandFilter);
      if (selectedBrand) {
        const brandNameLower = selectedBrand.name.toLowerCase();
        colTasks = colTasks.filter(t => 
          t.name.toLowerCase().includes(brandNameLower) || 
          (t.comments || '').toLowerCase().includes(brandNameLower)
        );
      }
    }

    // Update count indicator
    const kanbanCol = (colArea && colArea.closest) ? colArea.closest('.kanban-column') : null;
    const countBadge = kanbanCol ? kanbanCol.querySelector('.column-count') : null;
    if (countBadge) {
      countBadge.textContent = colPosts.length + colTasks.length;
    }

    // Render Posts
    colPosts.forEach(post => {
      const brand = state.brands.find(b => b.id === post.brandId);
      if (!brand) return;

      const card = document.createElement('div');
      card.className = post.status === 'correction' ? 'post-card correction' : 'post-card';
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-id', post.id);
      card.style.setProperty('--brand-grad', brand.grad);
      card.style.setProperty('--brand-color', brand.color);
      card.style.setProperty('--brand-glow', brand.glow);

      const platformBadgesHtml = (post.platforms || []).map(p => {
        const platformIcon = getPlatformIcon(p);
        return `
          <span class="card-platform-badge" title="${p.toUpperCase()}">
            ${platformIcon}
          </span>
        `;
      }).join('');
      
      const isOverdue = post.status !== 'published' && new Date(post.date + 'T00:00:00') < new Date('2026-07-05T00:00:00');
      const dateClass = isOverdue ? 'card-due-date overdue' : 'card-due-date';
      const assigneeInitials = getAssigneeInitials(post.assignee);

      let taskLinkBadgeHtml = '';
      if (post.associatedTaskId) {
        taskLinkBadgeHtml = `
          <div class="card-task-link-badge" data-task-id="${post.associatedTaskId}">
            <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            <span>Task ${post.associatedTaskId}</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="card-top">
          <span class="card-brand-tag">
            ${brand.logo ? `<img src="${brand.logo}" class="card-brand-logo" alt="">` : ''}
            <span>${brand.name}</span>
          </span>
          <div style="display: flex; gap: 6px; align-items: center">
            ${platformBadgesHtml}
          </div>
        </div>
        <div class="card-title">${post.title}</div>
        <div class="card-meta">
          <div class="card-assignee">
            ${(findTeamMember(post.assignee) || {}).photo 
              ? `<img src="${(findTeamMember(post.assignee) || {}).photo}" class="card-assignee-avatar-img" title="${post.assignee}">`
              : `<div class="card-assignee-avatar" title="${post.assignee}">${assigneeInitials}</div>`}
            <span>${post.assignee.split(' ')[0]}</span>
          </div>
          <div class="${dateClass}">
            <svg viewBox="0 0 24 24"><path d="M19 4H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/></svg>
            <span>${formatCardDate(post.date)}</span>
          </div>
        </div>
        ${taskLinkBadgeHtml}
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-assignee-avatar') || e.target.closest('.card-task-link-badge')) return;
        openPostModal(post);
      });

      const taskBadge = card.querySelector('.card-task-link-badge');
      if (taskBadge) {
        taskBadge.addEventListener('click', (e) => {
          e.stopPropagation();
          const taskId = taskBadge.getAttribute('data-task-id');
          navigateToTask(taskId);
        });
      }

      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', post.id);
        card.style.opacity = '0.5';
      });

      card.addEventListener('dragend', () => {
        card.style.opacity = '1';
      });

      colArea.appendChild(card);
    });

    // Render Tasks
    colTasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'post-card task-card';
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-id', task.id);
      card.style.borderLeft = '4px solid #8b5cf6';
      
      const designerPerson = findTeamMember(task.designer);
      const designerName = designerPerson ? designerPerson.name : (task.designer || '');
      const designerAvatar = designerPerson && designerPerson.photo 
        ? `<img src="${designerPerson.photo}" class="card-assignee-avatar-img" title="${designerName}">`
        : (task.designer
            ? `<div class="card-assignee-avatar" style="background: #8b5cf6; color: #fff">${getAssigneeInitials(task.designer)}</div>`
            : `<div class="card-assignee-avatar" style="background: rgba(255,255,255,0.05); color: #64748b">?</div>`);

      card.innerHTML = `
        <div class="card-top">
          <span class="card-brand-tag" style="background: rgba(139, 92, 246, 0.1); color: #c084fc">
            <svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:none; stroke:currentColor; stroke-width:2.5; margin-right:4px;"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            <span>Design Task (${task.id})</span>
          </span>
        </div>
        <div class="card-title">${task.name}</div>
        <div class="card-meta">
          <div class="card-assignee">
            ${designerAvatar}
            <span>${(designerName || '').split(' ')[0]}</span>
          </div>
          <div class="card-due-date">
            <svg viewBox="0 0 24 24"><path d="M19 4H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/></svg>
            <span>${formatCardDate(task.date)}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        openTaskModal(task);
      });

      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', task.id);
        card.style.opacity = '0.5';
      });

      card.addEventListener('dragend', () => {
        card.style.opacity = '1';
      });

      colArea.appendChild(card);
    });
  });
}

function normalizeDateString(dStr) {
  if (!dStr) return '';
  dStr = dStr.trim();
  let match = dStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
  }
  match = dStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (match) {
    let year = match[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  }
  return dStr;
}

// Render Calendar View
function renderCalendar() {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const calTitle = document.getElementById('calendar-title');
  const calDaysArea = document.getElementById('calendar-days-grid');
  if (!calTitle || !calDaysArea) return;

  const currentYear = state.calendarDate.getFullYear();
  const currentMonth = state.calendarDate.getMonth();

  calTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  calDaysArea.innerHTML = '';

  // Get first day of the month
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  // Get number of days in current month
  const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Get number of days in previous month
  const prevNumDays = new Date(currentYear, currentMonth, 0).getDate();

  // Draw previous month's trailing days
  for (let i = firstDayIndex; i > 0; i--) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day-cell other-month';
    dayCell.innerHTML = `<span class="calendar-day-num">${prevNumDays - i + 1}</span>`;
    calDaysArea.appendChild(dayCell);
  }

  // Today formatted string
  const todayStr = new Date().toISOString().split('T')[0];

  // Draw current month's days
  for (let day = 1; day <= numDays; day++) {
    const dayCell = document.createElement('div');
    
    // Format cell date string: YYYY-MM-DD
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const isToday = dateStr === todayStr || dateStr === '2026-07-05';
    dayCell.className = `calendar-day-cell${isToday ? ' today' : ''}`;
    
    dayCell.innerHTML = `
      <span class="calendar-day-num">${day}</span>
      <div class="calendar-events"></div>
    `;

    // Filter posts and tasks for this date
    let dayPosts = state.posts.filter(p => normalizeDateString(p.date) === dateStr);
    if (state.selectedBrandFilter !== 'all') {
      dayPosts = dayPosts.filter(p => p.brandId === state.selectedBrandFilter);
    }

    let dayTasks = state.tasks.filter(t => normalizeDateString(t.date) === dateStr && t.taskType !== 'post' && !isItemArchived(t));

    if (state.selectedBrandFilter !== 'all') {
      const selectedBrand = state.brands.find(b => b.id === state.selectedBrandFilter);
      if (selectedBrand) {
        const brandNameLower = selectedBrand.name.toLowerCase();
        dayTasks = dayTasks.filter(t => 
          t.name.toLowerCase().includes(brandNameLower) || 
          (t.comments || '').toLowerCase().includes(brandNameLower)
        );
      }
    }

    const eventsArea = dayCell.querySelector('.calendar-events');
    
    // Render posts
    dayPosts.forEach(post => {
      const brand = state.brands.find(b => b.id === post.brandId);
      if (!brand) return;

      const eventItem = document.createElement('div');
      eventItem.className = 'calendar-event-item';
      eventItem.style.setProperty('--brand-glow', brand.glow || 'rgba(255,69,58,0.2)');
      eventItem.style.setProperty('--brand-color', brand.color || '#ff453a');
      
      const taskIndicator = post.associatedTaskId ? ` [Task ${post.associatedTaskId}]` : '';
      eventItem.textContent = `[${brand.name.substring(0,3)}] ${post.title}${taskIndicator}`;
      eventItem.title = `${brand.name}: ${post.title} (${(post.platforms || []).join(', ').toUpperCase()})${post.associatedTaskId ? ' (Linked to Task ' + post.associatedTaskId + ')' : ''}`;
      
      eventItem.addEventListener('click', (e) => {
        e.stopPropagation();
        openPostModal(post);
      });

      eventsArea.appendChild(eventItem);
    });

    // Render design tasks
    dayTasks.forEach(task => {
      const eventItem = document.createElement('div');
      eventItem.className = 'calendar-event-item';
      eventItem.style.setProperty('--brand-glow', 'rgba(255, 69, 58, 0.2)');
      eventItem.style.setProperty('--brand-color', '#ff5e3a');
      eventItem.textContent = `[Task] ${task.name}`;
      eventItem.title = `Task ${task.id}: ${task.name} (${task.designer})`;
      
      eventItem.addEventListener('click', (e) => {
        e.stopPropagation();
        openTaskModal(task);
      });

      eventsArea.appendChild(eventItem);
    });

    // Quick add task click event on cell
    dayCell.addEventListener('click', () => {
      openTaskModal(null, dateStr);
    });

    calDaysArea.appendChild(dayCell);
  }

  // Draw next month's leading days to complete the calendar grid
  const totalCells = firstDayIndex + numDays;
  const nextMonthDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= nextMonthDays; i++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day-cell other-month';
    dayCell.innerHTML = `<span class="calendar-day-num">${i}</span>`;
    calDaysArea.appendChild(dayCell);
  }
}

// Render Analytics View
function renderAnalytics() {
  const totalPostsEl = document.getElementById('stat-total-posts');
  const publishedPostsEl = document.getElementById('stat-published-posts');
  const completionRateEl = document.getElementById('stat-completion-rate');
  
  if (!totalPostsEl) return;

  // Filter calculations based on global filter
  let analyticsPosts = state.posts;
  if (state.selectedBrandFilter !== 'all') {
    analyticsPosts = analyticsPosts.filter(p => p.brandId === state.selectedBrandFilter);
  }

  const totalCount = analyticsPosts.length;
  const publishedCount = analyticsPosts.filter(p => p.status === 'published').length;
  const completionRate = totalCount > 0 ? Math.round((publishedCount / totalCount) * 100) : 0;

  // Update top metrics
  totalPostsEl.textContent = totalCount;
  publishedPostsEl.textContent = publishedCount;
  completionRateEl.textContent = `${completionRate}%`;

  // Render Chart (Bar chart by Brand/Subsection)
  const chartContainer = document.getElementById('analytics-chart');
  const legendList = document.getElementById('analytics-legend');
  if (!chartContainer || !legendList) return;

  chartContainer.innerHTML = '';
  legendList.innerHTML = '';

  state.brands.forEach(brand => {
    const brandPosts = state.posts.filter(p => p.brandId === brand.id);
    const publishedBrandCount = brandPosts.filter(p => p.status === 'published').length;
    
    // Scale height based on posts (assume max 10 posts for layout scale)
    const maxScale = Math.max(...state.brands.map(b => state.posts.filter(p => p.brandId === b.id && p.status === 'published').length), 1);
    const pctHeight = Math.round((publishedBrandCount / maxScale) * 80); // scale up to 80% of area

    // Create Bar
    const barWrap = document.createElement('div');
    barWrap.className = 'chart-bar-wrap';
    barWrap.innerHTML = `
      <div class="chart-bar-fill" data-value="${publishedBrandCount}" style="height: ${pctHeight}%; background: ${brand.grad}"></div>
      <div class="chart-bar-label">${brand.name}</div>
    `;
    chartContainer.appendChild(barWrap);

    // Create Legend Item
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <div class="legend-info">
        <div class="legend-color" style="background: ${brand.grad}"></div>
        <span class="legend-name">${brand.name}</span>
      </div>
      <span class="legend-value">${publishedBrandCount} / ${brandPosts.length} published</span>
    `;
    legendList.appendChild(legendItem);
  });

  // 1. Creative Workload Stacked Chart
  const workloadChart = document.getElementById('creative-workload-chart');
  if (workloadChart) {
    workloadChart.innerHTML = '';
    const creatives = state.team.filter(p => p.isDesigner);
    
    let maxTasks = 1;
    const creativeStats = creatives.map(c => {
      const tasks = state.tasks.filter(t => t.designer === c.name || (c.aliases && c.aliases.includes(t.designer)));
      const notStarted = tasks.filter(t => t.status === 'Not Started').length;
      const onProgress = tasks.filter(t => t.status === 'On Progress').length;
      const finished = tasks.filter(t => t.status === 'Finished').length;
      const delayed = tasks.filter(t => t.status === 'Delayed').length;
      const total = tasks.length;
      if (total > maxTasks) maxTasks = total;
      
      return { c, notStarted, onProgress, finished, delayed, total };
    });

    creativeStats.forEach(stat => {
      const nsPct = Math.round((stat.notStarted / maxTasks) * 100);
      const opPct = Math.round((stat.onProgress / maxTasks) * 100);
      const fPct = Math.round((stat.finished / maxTasks) * 100);
      const dPct = Math.round((stat.delayed / maxTasks) * 100);
      
      const col = document.createElement('div');
      col.className = 'workload-column';
      col.innerHTML = `
        <div class="workload-stack" title="${stat.c.name}: ${stat.total} Tasks (${stat.finished} Finished, ${stat.onProgress} In Progress, ${stat.notStarted} Not Started, ${stat.delayed} Delayed)">
          <div class="workload-segment" style="height: ${nsPct}%; background: #64748b;"></div>
          <div class="workload-segment" style="height: ${opPct}%; background: #f59e0b;"></div>
          <div class="workload-segment" style="height: ${fPct}%; background: #10b981;"></div>
          <div class="workload-segment" style="height: ${dPct}%; background: #ef4444;"></div>
        </div>
        <div class="workload-label" title="${stat.c.name}">${stat.c.name.split(' ')[0]}</div>
      `;
      workloadChart.appendChild(col);
    });
  }

  // 2. Platform Breakdown Legend list
  const platformList = document.getElementById('platform-breakdown-list');
  if (platformList) {
    platformList.innerHTML = '';
    const counts = { facebook: 0, instagram: 0, youtube: 0, tiktok: 0 };
    state.posts.forEach(p => {
      if (p.platforms) {
        p.platforms.forEach(plat => {
          const lPlat = plat.toLowerCase();
          if (counts[lPlat] !== undefined) counts[lPlat]++;
        });
      }
    });

    const platformsData = [
      { id: 'facebook', name: 'Facebook', color: '#1877f2', count: counts.facebook },
      { id: 'instagram', name: 'Instagram', color: '#e1306c', count: counts.instagram },
      { id: 'youtube', name: 'YouTube', color: '#ff0000', count: counts.youtube },
      { id: 'tiktok', name: 'TikTok', color: '#00f2fe', count: counts.tiktok }
    ];

    platformsData.forEach(p => {
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.innerHTML = `
        <div class="legend-info">
          <div class="legend-color" style="background: ${p.color}; border-radius: 4px;"></div>
          <span class="legend-name">${p.name}</span>
        </div>
        <span class="legend-value">${p.count} posts scheduled</span>
      `;
      platformList.appendChild(legendItem);
    });
  }
}

// Drag & Drop / Status Update
async function updatePostStatus(postId, newStatus) {
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;

  let currentUser = localStorage.getItem('hc_logged_in_user');
  if (!currentUser) {
    currentUser = 'Rifat Newaj Razin';
    localStorage.setItem('hc_logged_in_user', currentUser);
  }

  const oldStatus = post.status;
  post.status = newStatus;

  // If status changed to published, update brand last post date
  if (newStatus === 'published' && oldStatus !== 'published') {
    const brand = state.brands.find(b => b.id === post.brandId);
    if (brand) {
      brand.lastPostDate = post.date;
    }
  }

  // Instantly refresh UI for smooth card movement
  refreshViews();
  updatePublishingQueueBadge();
  showToast(`Successfully moved to "${newStatus.toUpperCase()}"`, 'success');

  // Sync to Firestore in background
  try {
    await setDoc(doc(db, "posts", post.id), post);
    await syncPostToTask(post, db);
    await logActivity(`moved post "${post.title}" to ${newStatus.toUpperCase()}`, db);
  } catch (err) {
    console.error("Firestore post status update error:", err);
  }
}

// Brand Manager Modal Controls
function openBrandModal(brandId = null) {
  const overlay = document.getElementById('brand-modal');
  const modalTitle = document.getElementById('brand-modal-title');
  const form = document.getElementById('brand-form');
  if (!overlay || !form) return;

  // Clear fields
  form.reset();
  document.getElementById('brand-edit-id').value = '';

  if (brandId) {
    modalTitle.innerText = 'Edit Page / Brand';
    const brand = state.brands.find(b => b.id === brandId);
    if (brand) {
      document.getElementById('brand-edit-id').value = brand.id;
      document.getElementById('brand-name').value = brand.name;
      document.getElementById('brand-type').value = brand.type;
      document.getElementById('brand-goal').value = brand.frequencyGoal;
      document.getElementById('brand-logo').value = brand.logo || '';
    }
  } else {
    modalTitle.innerText = 'Add Page / Brand';
  }

  overlay.classList.add('active');
}

function closeBrandModal() {
  const overlay = document.getElementById('brand-modal');
  if (overlay) overlay.classList.remove('active');
}

// Post Creation & Editing Modal
function openPostModal(post = null, targetDate = null) {
  const currentUser = localStorage.getItem('hc_logged_in_user');

  // Accessibility: Guests cannot create new posts at all
  if (!post && !currentUser) {
    showToast('Access Denied: Please sign in to schedule content', 'error');
    showLoginOverlay();
    return;
  }

  state.editingPost = post;
  const overlay = document.getElementById('post-modal');
  const modalTitle = document.getElementById('modal-title');
  const deleteBtn = document.getElementById('modal-delete-btn');
  const form = document.getElementById('post-form');
  
  // Populate Associated Design Task dropdown
  const taskLinkSelect = document.getElementById('post-link-task');
  if (taskLinkSelect) {
    taskLinkSelect.innerHTML = '<option value="">-- None --</option>';
    const sortedTasks = [...state.tasks].sort((a, b) => a.id.localeCompare(b.id));
    sortedTasks.forEach(t => {
      taskLinkSelect.innerHTML += `<option value="${t.id}">${t.id}: ${t.name} [${t.designer}]</option>`;
    });
    taskLinkSelect.value = (post && post.associatedTaskId) ? post.associatedTaskId : '';
  }
  
  if (!overlay || !form) return;

  // Reset Form Checkboxes and accessibility states
  form.reset();
  form.querySelectorAll('.form-control, input[type="checkbox"]').forEach(el => el.removeAttribute('disabled'));
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.style.display = 'block';
  
  const existingBanner = document.getElementById('modal-view-only-banner');
  if (existingBanner) existingBanner.remove();

  document.querySelectorAll('input[name="post-platforms"]').forEach(cb => {
    cb.checked = false;
    cb.closest('.platform-checkbox-label').classList.remove('checked');
  });

  const teamList = (state.team && state.team.length > 0) ? state.team : DEFAULT_TEAM;
  const account = teamList.find(p => p.name === currentUser);
  const isLimited = account && account.access === 'limited';

  if (post) {
    // Edit Mode
    modalTitle.textContent = 'Edit Content Post';
    renderPostComments(post);
    
    // Accessibility: Guests and Limited users cannot delete posts at all
    if (deleteBtn) {
      deleteBtn.style.display = (!currentUser || isLimited) ? 'none' : 'block';
    }

    document.getElementById('post-title').value = post.title;
    document.getElementById('post-brand').value = post.brandId;
    document.getElementById('post-status').value = post.status;
    document.getElementById('post-type').value = post.type;
    document.getElementById('post-assignee').value = post.assignee;
    document.getElementById('post-date').value = post.date;
    document.getElementById('post-time').value = post.time;
    document.getElementById('post-caption').value = post.caption;

    if (post.platforms) {
      post.platforms.forEach(p => {
        const cb = document.querySelector(`input[name="post-platforms"][value="${p}"]`);
        if (cb) {
          cb.checked = true;
          cb.closest('.platform-checkbox-label').classList.add('checked');
        }
      });
    }

    // Accessibility: Guests get complete Read-Only view
    if (!currentUser) {
      form.querySelectorAll('.form-control, input[type="checkbox"]').forEach(el => el.setAttribute('disabled', 'true'));
      if (submitBtn) submitBtn.style.display = 'none';
      
      const formBody = form.querySelector('.modal-body') || form;
      const warningHtml = `
        <div id="modal-view-only-banner" class="view-only-banner">
          <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01"/></svg>
          <span>Guest Mode: Sign in to reschedule or edit this item.</span>
        </div>
      `;
      formBody.insertAdjacentHTML('afterbegin', warningHtml);
    }
    // Accessibility: Limited users can only edit posts assigned to them
    else if (isLimited) {
      const isOwner = (post.assignee === currentUser) || (account && account.aliases && account.aliases.includes(post.assignee));
      if (!isOwner) {
        form.querySelectorAll('.form-control, input[type="checkbox"]').forEach(el => el.setAttribute('disabled', 'true'));
        if (submitBtn) submitBtn.style.display = 'none';
        
        const formBody = form.querySelector('.modal-body') || form;
        const warningHtml = `
          <div id="modal-view-only-banner" class="view-only-banner">
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01"/></svg>
            <span>View Only: This post is assigned to ${post.assignee}. You can only edit posts assigned to you.</span>
          </div>
        `;
        formBody.insertAdjacentHTML('afterbegin', warningHtml);
      }
    }
  } else {
    // Add Mode
    modalTitle.textContent = 'Create New Content Post';
    renderPostComments(null);
    if (deleteBtn) deleteBtn.style.display = 'none';

    // Autofill date if clicked from calendar
    if (targetDate) {
      document.getElementById('post-date').value = targetDate;
    } else {
      document.getElementById('post-date').value = '2026-07-05';
    }
    document.getElementById('post-time').value = '12:00';
    document.getElementById('post-status').value = 'ideation';

    // Check Facebook by default
    const fb = document.querySelector('input[name="post-platforms"][value="facebook"]');
    if (fb) {
      fb.checked = true;
      fb.closest('.platform-checkbox-label').classList.add('checked');
    }

    // Default assignee to creator for limited users to avoid mistakes
    if (isLimited) {
      document.getElementById('post-assignee').value = 'Social Media Manager';
    }
  }

  overlay.classList.add('active');
}

function closePostModal() {
  const overlay = document.getElementById('post-modal');
  if (overlay) {
    overlay.classList.remove('active');
  }
  state.editingPost = null;

  // Reset form fields back to enabled state
  const form = document.getElementById('post-form');
  if (form) {
    form.querySelectorAll('.form-control, input[type="checkbox"]').forEach(el => el.removeAttribute('disabled'));
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.style.display = 'block';
  }
  const existingBanner = document.getElementById('modal-view-only-banner');
  if (existingBanner) existingBanner.remove();
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('post-title').value.trim();
  const brandId = document.getElementById('post-brand').value;
  const status = document.getElementById('post-status').value;
  const type = document.getElementById('post-type').value;
  const assignee = document.getElementById('post-assignee').value;
  const checkedPlatforms = Array.from(document.querySelectorAll('input[name="post-platforms"]:checked')).map(cb => cb.value);
  const date = document.getElementById('post-date').value;
  const time = document.getElementById('post-time').value;
  const caption = document.getElementById('post-caption').value.trim();
  const associatedTaskId = document.getElementById('post-link-task') ? document.getElementById('post-link-task').value : '';

  if (!title) {
    showToast('Please enter a content title', 'error');
    return;
  }

  if (checkedPlatforms.length === 0) {
    showToast('Please select at least one target platform', 'error');
    return;
  }

  if (state.editingPost) {
    // Edit existing post
    const post = state.posts.find(p => p.id === state.editingPost.id);
    if (post) {
      const oldStatus = post.status;
      const oldTaskId = post.associatedTaskId;
      post.title = title;
      post.brandId = brandId;
      post.platforms = checkedPlatforms;
      post.status = status;
      post.type = type;
      post.assignee = assignee;
      post.date = date;
      post.time = time;
      post.caption = caption;
      post.associatedTaskId = associatedTaskId;

      // Update brand last active date if just published
      if (status === 'published' && oldStatus !== 'published') {
        const brand = state.brands.find(b => b.id === brandId);
        if (brand) {
          brand.lastPostDate = date;
        }
      }
      
      // Save changes to Firestore
      try {
        await setDoc(doc(db, "posts", post.id), post);
        await syncPostToTask(post, db);
        showToast('Post updated successfully', 'success');
        await logActivity(`updated content post "${post.title}"`, db);
      } catch (err) {
        console.error(err);
        showToast('Failed to save changes to cloud', 'error');
      }
    }
  } else {
    // Create new post
    const newId = 'post-' + Date.now();
    const newPost = {
      id: newId,
      title,
      brandId,
      platforms: checkedPlatforms,
      status,
      type,
      assignee,
      date,
      time,
      caption,
      associatedTaskId
    };
    
    // Save to Firestore
    try {
      await setDoc(doc(db, "posts", newId), newPost);
      await syncPostToTask(newPost, db);
      showToast('New post scheduled successfully', 'success');
      await logActivity(`created content post "${newPost.title}"`, db);
    } catch (err) {
      console.error(err);
      showToast('Failed to save new post to cloud', 'error');
    }
  }

  saveToStorage();
  closePostModal();
  refreshViews();
}

// Delete post from edit modal
async function deletePost() {
  if (!state.editingPost) return;
  
  if (confirm('Are you sure you want to delete this content item?')) {
    const postId = state.editingPost.id;
    const associatedTaskId = state.editingPost.associatedTaskId;
    try {
      await deleteDoc(doc(db, "posts", postId));
      if (associatedTaskId) {
        await deleteDoc(doc(db, "tasks", associatedTaskId));
      }
      showToast('Content item removed', 'info');
      await logActivity(`deleted content post "${state.editingPost.title}"`, db);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete from cloud', 'error');
    }
    closePostModal();
  }
}

// Delete click listener setup has been moved to setupEventListeners()

// Helper Utilities
function getPlatformIcon(platform) {
  // Returns SVG string for platform logo
  switch(platform) {
    case 'facebook':
      return `<svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>`;
    case 'instagram':
      return `<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`;
    case 'linkedin':
      return `<svg viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`;
    case 'youtube':
      return `<svg viewBox="0 0 24 24"><path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.871.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
    case 'tiktok':
      return `<svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.2-.42-.43-.61-.67-.02 3.76-.01 7.52-.02 11.28-.03 1.2-.24 2.44-.82 3.5-1.45 2.65-4.5 4.15-7.5 3.79-3.23-.39-5.94-2.88-6.39-6.11-.64-4.54 2.87-8.77 7.4-8.89.14 0 .28.01.42.02v4.07a4.78 4.78 0 00-3.69 4.14c-.45 2.61 1.48 5.13 4.11 5.37 2.37.22 4.67-1.34 5.06-3.7.1-.6.12-1.21.11-1.81-.01-5.71 0-11.43-.01-17.15-.46-.01-.93-.04-1.39-.1-.73-.1-1.46-.3-2.13-.6-.35-.16-.68-.37-.98-.62.01-.8.01-1.61.02-2.42z"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/></svg>`;
  }
}

function getAssigneeInitials(name) {
  if (name === 'Self') return 'ME';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function formatCardDate(dateStr) {
  // e.g. 2026-07-05 -> Jul 5
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const m = months[parseInt(parts[1]) - 1];
    const d = parseInt(parts[2]);
    return `${m} ${d}`;
  }
  return dateStr;
}

// Success Notification Toast Helper
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-wrapper');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-msg">${msg}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 3s
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ==========================================================================
   TASK TRACKER CORE LOGIC & CONTROLLERS
   ========================================================================== */

function renderTasks() {
  const tableBodyPosts = document.getElementById('tasks-list-body-posts');
  const tableBodyGeneral = document.getElementById('tasks-list-body-general');
  if (!tableBodyPosts || !tableBodyGeneral) return;
  tableBodyPosts.innerHTML = '';
  tableBodyGeneral.innerHTML = '';

  // Filter tasks
  let filteredTasks = state.tasks.filter(t => !isItemArchived(t));

  // Search by name
  if (state.taskSearchFilter) {
    const q = state.taskSearchFilter.toLowerCase();
    filteredTasks = filteredTasks.filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  }

  // Filter by designer
  if (state.taskDesignerFilter !== 'all') {
    filteredTasks = filteredTasks.filter(t => {
      const person = findTeamMember(t.designer);
      const name = person ? person.name : t.designer;
      return name === state.taskDesignerFilter || t.designer === state.taskDesignerFilter;
    });
  }

  // Filter by assigner
  if (state.taskAssignerFilter !== 'all') {
    filteredTasks = filteredTasks.filter(t => {
      const person = findTeamMember(t.assignedBy);
      const name = person ? person.name : t.assignedBy;
      return name === state.taskAssignerFilter || t.assignedBy === state.taskAssignerFilter;
    });
  }

  // Filter by status
  if (state.taskStatusFilter !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.status === state.taskStatusFilter);
  }

  // Dynamic column sorting
  const taskCol = state.taskSortCol || 'id';
  const taskDir = state.taskSortDir === 'asc' ? 1 : -1;

  filteredTasks.sort((a, b) => {
    let valA = a[taskCol] || '';
    let valB = b[taskCol] || '';

    if (taskCol === 'id') {
      const numA = parseInt((valA || '').replace('T-', '')) || 0;
      const numB = parseInt((valB || '').replace('T-', '')) || 0;
      return (numA - numB) * taskDir;
    }

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return -1 * taskDir;
    if (valA > valB) return 1 * taskDir;
    return 0;
  });

  // Update header sort UI indicators across Task Tracker tables
  document.querySelectorAll('.tasks-table th.sortable-th').forEach(th => {
    const sCol = th.getAttribute('data-sort');
    const icon = th.querySelector('.sort-icon');
    if (sCol === state.taskSortCol) {
      th.classList.add('active-sort');
      if (icon) icon.textContent = state.taskSortDir === 'asc' ? '▲' : '▼';
    } else {
      th.classList.remove('active-sort');
      if (icon) icon.textContent = '↕';
    }
  });

  // Calculate statistics (always on all tasks, not filtered)
  const totalCount = state.tasks.length;
  const progressCount = state.tasks.filter(t => t.status === 'On Progress').length;
  const finishedCount = state.tasks.filter(t => t.status === 'Finished').length;
  const delayedCount = state.tasks.filter(t => t.status === 'Delayed').length;

  document.getElementById('task-stat-total').textContent = totalCount;
  document.getElementById('task-stat-progress').textContent = progressCount;
  document.getElementById('task-stat-finished').textContent = finishedCount;
  document.getElementById('task-stat-delayed').textContent = delayedCount;

  // Calculate active workload split dynamically across active designers
  const activeTasks = state.tasks.filter(t => t.status !== 'Finished');
  const teamList = (state.team && state.team.length > 0) ? state.team : DEFAULT_TEAM;
  const designersList = teamList.filter(p => p.isDesigner);
  
  const workloadCounts = {};
  designersList.forEach(c => { workloadCounts[c.name] = 0; });

  activeTasks.forEach(t => {
    const person = findTeamMember(t.designer);
    const name = person ? person.name : t.designer;
    if (workloadCounts[name] !== undefined) {
      workloadCounts[name]++;
    } else if (name) {
      workloadCounts[name] = (workloadCounts[name] || 0) + 1;
    }
  });
  
  const workloadEl = document.getElementById('task-stat-workload');
  if (workloadEl) {
    const splitHtml = Object.entries(workloadCounts).map(([name, count]) => {
      const person = findTeamMember(name);
      const fullName = person ? person.name : name;
      return `${fullName}: <strong>${count}</strong>`;
    }).join(' &nbsp;|&nbsp; ');
    workloadEl.innerHTML = splitHtml;
  }

  // Split filtered tasks into Social Media Posts and General Design Tasks
  const socialTasks = filteredTasks.filter(t => t.associatedPostId || t.taskType === 'post');
  const generalTasks = filteredTasks.filter(t => !t.associatedPostId && t.taskType !== 'post');

  document.getElementById('social-tasks-count').textContent = socialTasks.length;
  document.getElementById('general-tasks-count').textContent = generalTasks.length;

  const renderRow = (task, targetBody, isSocialRow, postedCellHtml) => {
    const statusClass = task.status.toLowerCase().replace(' ', '-');
    let rawDeliveryLink = (task.deliveryLink || '').trim();
    let finalDeliveryUrl = rawDeliveryLink;
    if (rawDeliveryLink && !rawDeliveryLink.startsWith('http://') && !rawDeliveryLink.startsWith('https://')) {
      finalDeliveryUrl = `https://drive.google.com/drive/search?q=${encodeURIComponent(rawDeliveryLink)}`;
    }

    const driveLinkHtml = rawDeliveryLink 
      ? `<a href="${finalDeliveryUrl}" target="_blank" rel="noopener noreferrer" class="task-link-btn" title="Open: ${rawDeliveryLink}">
          <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
         </a>`
      : '';

    let linkedPostHtml = '';
    if (task.associatedPostId) {
      const linkedPost = state.posts.find(p => p.id === task.associatedPostId);
      if (linkedPost) {
        linkedPostHtml = `
          <div class="linked-post-badge" title="Linked to content post: ${linkedPost.title}">
            <svg viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7zm10 3a3 3 0 100-6 3 3 0 000 6z"/></svg>
            <span>Post: ${linkedPost.title.substring(0, 18)}...</span>
          </div>
        `;
      }
    }

    const commentsText = task.comments ? `<div class="task-comments-text">${task.comments}</div>` : '';
    const dateFormatted = formatCardDate(task.date);

    const creativePerson = findTeamMember(task.designer);
    const creativeName = creativePerson ? creativePerson.name : (task.designer || 'Unassigned');
    const creativePhoto = creativePerson && creativePerson.photo 
      ? `<img src="${creativePerson.photo}" class="team-avatar-img" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" alt="${creativeName}" title="${creativeName}">`
      : `<div class="card-assignee-avatar" style="width: 28px; height: 28px; font-size: 0.75rem">${getAssigneeInitials(creativeName)}</div>`;

    const assignerPerson = findTeamMember(task.assignedBy);
    const assignerName = assignerPerson ? assignerPerson.name : (task.assignedBy || 'Unassigned');
    const assignerPhoto = assignerPerson && assignerPerson.photo 
      ? `<img src="${assignerPerson.photo}" class="team-avatar-img" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" alt="${assignerName}" title="${assignerName}">`
      : '';

    const row = document.createElement('tr');
    row.id = `task-row-${task.id}`;
    if (task.status === 'Correction') {
      row.className = 'highlighted-correction';
    }
    row.innerHTML = `
      <td style="white-space: nowrap;"><strong>${task.id}</strong></td>
      <td>
        <div style="font-weight: 600; color: #fff">${task.name}</div>
        ${commentsText}
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px">
          ${creativePhoto}
          <span style="font-weight: 500; color: #fff">${creativeName}</span>
        </div>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px">
          ${assignerPhoto}
          <span>${assignerName}</span>
        </div>
      </td>
      <td>${dateFormatted} ${task.time || ''}</td>
      <td>${task.urgency || 'N/A'}</td>
      <td>
        <span class="task-status-badge ${statusClass}">${task.status}</span>
      </td>
      <td>
        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px">
          ${driveLinkHtml}
          ${linkedPostHtml}
        </div>
      </td>
      ${isSocialRow ? `<td class="posted-cell" style="text-align: center;">${postedCellHtml}</td>` : ''}
      <td>
        <button class="btn-icon task-edit-btn" data-id="${task.id}" style="width: 32px; height: 32px" title="Edit Task">
          <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
      </td>
    `;

    // Hook edit button click
    row.querySelector('.task-edit-btn').addEventListener('click', () => {
      openTaskModal(task);
    });

    // Hook task link button click
    const taskLinkBtn = row.querySelector('.task-link-btn');
    if (taskLinkBtn) {
      taskLinkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // Hook linked item click
    const linkedPostBadge = row.querySelector('.linked-post-badge');
    if (linkedPostBadge) {
      linkedPostBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        const post = state.posts.find(p => p.id === task.associatedPostId);
        if (post) {
          openPostModal(post);
        } else {
          const linkedTask = state.tasks.find(t => t.id === task.associatedPostId);
          if (linkedTask) openTaskModal(linkedTask);
        }
      });
    }

    // Hook "Posted" checkbox — only present for social rows the current user is allowed to mark
    const postedCheckbox = row.querySelector('.post-select-checkbox');
    if (postedCheckbox) {
      postedCheckbox.addEventListener('change', updateMarkSelectedPostedButtonState);
    }

    targetBody.appendChild(row);
  };

  const canMarkPosted = canCurrentUserMarkPosted();

  const buildPostedCellHtml = (task) => {
    if (task.isPosted) {
      return `<span class="posted-badge" title="Already marked posted" style="display:inline-flex;align-items:center;gap:4px;color:#22c55e;font-weight:700;font-size:0.78rem;">
        <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:3;"><path d="M20 6L9 17l-5-5"/></svg>Posted
      </span>`;
    }
    if (canMarkPosted) {
      return `<input type="checkbox" class="post-select-checkbox" data-task-id="${task.id}" title="Select to mark as posted">`;
    }
    return `<span style="color:#64748b;font-size:0.78rem;">Pending</span>`;
  };

  socialTasks.forEach(t => {
    const isSocialRow = true;
    const postedCellHtml = buildPostedCellHtml(t);
    renderRow(t, tableBodyPosts, isSocialRow, postedCellHtml);
  });
  generalTasks.forEach(t => renderRow(t, tableBodyGeneral, false, ''));

  setupMarkAsPostedControls(canMarkPosted, socialTasks);
}

// Wires up the "Posted" column header select-all checkbox and the bulk
// "Mark Selected as Posted" button. Controls are only shown to team members
// with canMarkPosted: true (see findTeamMember/DEFAULT_TEAM); everyone else
// just sees a read-only "Posted"/"Pending" label per row.
function setupMarkAsPostedControls(canMarkPosted, socialTasks) {
  const selectAllWrap = document.getElementById('posted-select-all-wrap');
  const readonlyLabel = document.getElementById('posted-col-label-readonly');
  const bulkBtn = document.getElementById('mark-selected-posted-btn');
  const selectAllCheckbox = document.getElementById('posted-select-all');

  const anyUnposted = socialTasks.some(t => !t.isPosted);

  if (selectAllWrap) selectAllWrap.style.display = (canMarkPosted && anyUnposted) ? 'flex' : 'none';
  if (readonlyLabel) readonlyLabel.style.display = (canMarkPosted && anyUnposted) ? 'none' : 'inline';
  if (bulkBtn) bulkBtn.style.display = (canMarkPosted && anyUnposted) ? 'inline-flex' : 'none';

  if (selectAllCheckbox) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.onchange = () => {
      document.querySelectorAll('.post-select-checkbox').forEach(cb => { cb.checked = selectAllCheckbox.checked; });
      updateMarkSelectedPostedButtonState();
    };
  }

  if (bulkBtn) {
    bulkBtn.onclick = async () => {
      const checked = Array.from(document.querySelectorAll('.post-select-checkbox:checked'));
      const taskIds = checked.map(cb => cb.getAttribute('data-task-id'));
      if (taskIds.length === 0) return;
      await markTasksPostedBulk(taskIds);
    };
  }

  updateMarkSelectedPostedButtonState();
}

function updateMarkSelectedPostedButtonState() {
  const bulkBtn = document.getElementById('mark-selected-posted-btn');
  if (!bulkBtn) return;
  const checkedCount = document.querySelectorAll('.post-select-checkbox:checked').length;
  bulkBtn.disabled = checkedCount === 0;
  const label = checkedCount > 0 ? `Mark ${checkedCount} Selected as Posted` : 'Mark Selected as Posted';
  const svgHtml = bulkBtn.querySelector('svg') ? bulkBtn.querySelector('svg').outerHTML : '';
  bulkBtn.innerHTML = `${svgHtml} ${label}`;
}

// Marks a batch of tasks (and their linked posts) as posted in one action.
// Reuses the same per-task logic as the original single-item markTaskPosted,
// but writes everything and logs one summarized activity entry.
async function markTasksPostedBulk(taskIds) {
  if (!canCurrentUserMarkPosted()) {
    showToast('You do not have permission to mark posts as posted', 'error');
    return;
  }

  let successCount = 0;
  for (const taskId of taskIds) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || task.isPosted) continue;

    task.isPosted = true;

    if (task.associatedPostId) {
      const post = state.posts.find(p => p.id === task.associatedPostId);
      if (post) {
        post.status = 'published';
        try { await setDoc(doc(db, "posts", post.id), post); } catch (e) {}
      }
    }

    try {
      await setDoc(doc(db, "tasks", taskId), task);
      successCount++;
    } catch (err) {
      console.error(`Failed to mark task ${taskId} as posted:`, err);
    }
  }

  if (successCount > 0) {
    logActivity(`Marked ${successCount} post${successCount === 1 ? '' : 's'} as posted`, db);
    showToast(`Marked ${successCount} post${successCount === 1 ? '' : 's'} as posted`, 'success');
  }

  renderActivityLog();
  updateActivityBadge();
  refreshViews();
}

function openTaskModal(task = null) {
  const currentUser = localStorage.getItem('hc_logged_in_user');

  // Accessibility: Guests cannot create new tasks
  if (!task && !currentUser) {
    showToast('Access Denied: Please sign in to create tasks', 'error');
    showLoginOverlay();
    return;
  }

  state.editingTask = task;
  const overlay = document.getElementById('task-modal');
  const modalTitle = document.getElementById('task-modal-title');
  const deleteBtn = document.getElementById('task-modal-delete-btn');
  const form = document.getElementById('task-form');
  
  if (!overlay || !form) return;

  form.reset();
  form.querySelectorAll('.form-control').forEach(el => el.removeAttribute('disabled'));
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.style.display = 'block';

  const existingBanner = document.getElementById('task-view-only-banner');
  if (existingBanner) existingBanner.remove();

  // Populate link post dropdown
  const linkPostSelect = document.getElementById('task-form-link-post');
  if (linkPostSelect) {
    linkPostSelect.innerHTML = '<option value="">-- None --</option>';
    state.posts.forEach(p => {
      linkPostSelect.innerHTML += `<option value="${p.id}">${p.title}</option>`;
    });
    linkPostSelect.value = (task && task.associatedPostId) ? task.associatedPostId : '';
  }

  const teamList = (state.team && state.team.length > 0) ? state.team : DEFAULT_TEAM;
  const account = teamList.find(p => p.name === currentUser);
  const isLimited = account && account.access === 'limited';

  if (task) {
    // Edit mode
    modalTitle.textContent = `Edit Task ${task.id}`;
    if (deleteBtn) {
      deleteBtn.style.display = (!currentUser || isLimited) ? 'none' : 'block';
    }

    document.getElementById('task-form-name').value = task.name;
    document.getElementById('task-form-designer').value = task.designer;
    document.getElementById('task-form-assigner').value = task.assignedBy;
    document.getElementById('task-form-date').value = task.date;
    document.getElementById('task-form-time').value = task.time || '12:00';
    document.getElementById('task-form-urgency').value = task.urgency || '';
    document.getElementById('task-form-status').value = task.status;
    document.getElementById('task-form-delivery').value = task.deliveryLink || '';
    document.getElementById('task-form-comments').value = task.comments || '';
    renderTaskComments(task);

    // Access control: Guest gets Read-Only
    if (!currentUser) {
      form.querySelectorAll('.form-control').forEach(el => el.setAttribute('disabled', 'true'));
      if (submitBtn) submitBtn.style.display = 'none';
      
      const formBody = form.querySelector('.modal-body') || form;
      formBody.insertAdjacentHTML('afterbegin', `
        <div id="task-view-only-banner" class="view-only-banner">
          <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01"/></svg>
          <span>Guest Mode: Sign in to edit tasks.</span>
        </div>
      `);
    } else if (isLimited) {
      const isOwner = (task.designer === currentUser) || (account && account.aliases && account.aliases.includes(task.designer));
      if (!isOwner) {
        form.querySelectorAll('.form-control').forEach(el => el.setAttribute('disabled', 'true'));
        if (submitBtn) submitBtn.style.display = 'none';
        
        const formBody = form.querySelector('.modal-body') || form;
        formBody.insertAdjacentHTML('afterbegin', `
          <div id="task-view-only-banner" class="view-only-banner">
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01"/></svg>
            <span>View Only: This task is assigned to ${task.designer}. You can only edit tasks assigned to you.</span>
          </div>
        `);
      }
    }
  } else {
    // Add mode
    modalTitle.textContent = 'Create New Task';
    if (deleteBtn) deleteBtn.style.display = 'none';

    // Autofill defaults
    document.getElementById('task-form-date').value = '2026-07-05';
    document.getElementById('task-form-time').value = '12:00';
    document.getElementById('task-form-status').value = 'Not Started';
    document.getElementById('task-form-assigner').value = currentUser || 'Razin';
    renderTaskComments(null);
  }

  // Populate job type select
  const jobTypeSelect = document.getElementById('task-form-job-type');
  const linkGroup = document.getElementById('task-form-link-post-group');
  if (jobTypeSelect) {
    jobTypeSelect.value = (task && task.associatedPostId) ? 'post' : (task && task.taskType ? task.taskType : 'general');
    if (linkGroup) {
      linkGroup.style.display = jobTypeSelect.value === 'post' ? 'block' : 'none';
    }
  }

  overlay.classList.add('active');
}

function closeTaskModal() {
  const overlay = document.getElementById('task-modal');
  if (overlay) overlay.classList.remove('active');
  state.editingTask = null;
  
  const form = document.getElementById('task-form');
  if (form) {
    form.querySelectorAll('.form-control').forEach(el => el.removeAttribute('disabled'));
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.style.display = 'block';
  }
  const existingBanner = document.getElementById('task-view-only-banner');
  if (existingBanner) existingBanner.remove();
}

async function handleTaskFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('task-form-name').value.trim();
  const designer = document.getElementById('task-form-designer').value;
  const assignedBy = document.getElementById('task-form-assigner').value;
  const date = document.getElementById('task-form-date').value;
  const time = document.getElementById('task-form-time').value;
  const urgency = document.getElementById('task-form-urgency').value.trim();
  const status = document.getElementById('task-form-status').value;
  const deliveryLink = document.getElementById('task-form-delivery').value.trim();
  const comments = document.getElementById('task-form-comments').value.trim();
  const associatedPostId = document.getElementById('task-form-link-post') ? document.getElementById('task-form-link-post').value : '';
  const jobType = document.getElementById('task-form-job-type').value;

  if (!name) {
    showToast('Please enter a task name', 'error');
    return;
  }

  if (state.editingTask) {
    const task = state.tasks.find(t => t.id === state.editingTask.id);
    if (task) {
      const oldPostId = task.associatedPostId;
      task.name = name;
      task.designer = designer;
      task.assignedBy = assignedBy;
      task.date = date;
      task.time = time;
      task.urgency = urgency;
      task.status = status;
      task.deliveryLink = deliveryLink;
      task.comments = comments;
      task.taskType = jobType;

      if (jobType === 'general') {
        task.associatedPostId = '';
      } else {
        task.associatedPostId = associatedPostId;
      }

      showToast('Task updated successfully', 'success');
      logActivity(`updated Task ${task.id}: "${task.name}"`, db);
      refreshViews();

      try {
        await setDoc(doc(db, "tasks", task.id), task);
        if (jobType === 'general' && oldPostId) {
          try { await deleteDoc(doc(db, "posts", oldPostId)); } catch(e){}
        } else if (jobType === 'post') {
          await syncTaskToPost(task, db);
        }
      } catch (err) {
        console.warn("Firestore task update warning (saved locally):", err);
      }
    }
  } else {
    // Generate new task ID like T-20, T-21...
    let maxId = 0;
    state.tasks.forEach(t => {
      const num = parseInt(t.id.replace('T-', ''));
      if (!isNaN(num) && num > maxId) maxId = num;
    });
    const newNum = maxId + 1;
    const newId = `T-${String(newNum).padStart(2, '0')}`;

    const newTask = {
      id: newId,
      name,
      designer,
      assignedBy,
      date,
      time,
      urgency,
      status,
      deliveryLink,
      comments,
      taskType: jobType,
      associatedPostId: jobType === 'post' ? associatedPostId : ''
    };

    state.tasks.push(newTask);
    showToast(`Task ${newId} created successfully`, 'success');
    logActivity(`created task ${newId}: "${newTask.name}"`, db);
    refreshViews();

    try {
      await setDoc(doc(db, "tasks", newId), newTask);
      if (jobType === 'post') {
        await syncTaskToPost(newTask, db);
      }
    } catch (err) {
      console.warn("Firestore new task save warning (saved locally):", err);
    }
  }

  closeTaskModal();
}

async function deleteTask() {
  if (!state.editingTask) return;
  
  if (confirm(`Are you sure you want to delete Task ${state.editingTask.id}?`)) {
    const taskId = state.editingTask.id;
    const associatedPostId = state.editingTask.associatedPostId;
    const taskName = state.editingTask.name;

    // Remove locally
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    if (associatedPostId) {
      state.posts = state.posts.filter(p => p.id !== associatedPostId);
    }

    showToast(`Task ${taskId} removed`, 'info');
    logActivity(`deleted task ${taskId}: "${taskName}"`, db);
    refreshViews();
    closeTaskModal();

    try {
      await deleteDoc(doc(db, "tasks", taskId));
      if (associatedPostId) {
        try { await deleteDoc(doc(db, "posts", associatedPostId)); } catch(e){}
      }
    } catch (err) {
      console.warn("Firestore delete warning (removed locally):", err);
    }
  }
}


function updateModalDropdowns() {
  // Populate dynamic creative filters
  const designers = state.team.filter(p => p.isDesigner);
  
  const taskDesignerFilter = document.getElementById('task-designer-filter');
  if (taskDesignerFilter) {
    const currentVal = state.taskDesignerFilter;
    taskDesignerFilter.innerHTML = '<option value="all">All Creatives</option>' + 
      designers.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    if (designers.some(p => p.name === currentVal) || currentVal === 'all') {
      taskDesignerFilter.value = currentVal;
    } else {
      taskDesignerFilter.value = 'all';
      state.taskDesignerFilter = 'all';
    }
  }

  // Populate task assigner filters dynamically from all work assigners + existing task assigners
  const taskAssignerFilter = document.getElementById('task-assigner-filter');
  if (taskAssignerFilter) {
    const currentVal = state.taskAssignerFilter;
    const assignersSet = new Set();
    const activeTeamList = (state.team && state.team.length > 0) ? state.team : DEFAULT_TEAM;
    activeTeamList.filter(p => p.isAssigner).forEach(p => assignersSet.add(p.name));
    
    state.tasks.forEach(t => {
      if (t.assignedBy) {
        const p = findTeamMember(t.assignedBy);
        assignersSet.add(p ? p.name : t.assignedBy);
      }
    });

    taskAssignerFilter.innerHTML = '<option value="all">All Assigned By</option>';
    Array.from(assignersSet).sort().forEach(a => {
      taskAssignerFilter.innerHTML += `<option value="${a}">${a}</option>`;
    });

    if (Array.from(assignersSet).includes(currentVal) || currentVal === 'all') {
      taskAssignerFilter.value = currentVal;
    } else {
      taskAssignerFilter.value = 'all';
      state.taskAssignerFilter = 'all';
    }
  }

  // Populate content links creative filter
  const contentLinksCreativeFilter = document.getElementById('content-links-creative-filter');
  if (contentLinksCreativeFilter) {
    const currentVal = contentLinksCreativeFilter.value;
    contentLinksCreativeFilter.innerHTML = '<option value="all">All Creatives</option>' + 
      designers.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    if (designers.some(p => p.name === currentVal) || currentVal === 'all') {
      contentLinksCreativeFilter.value = currentVal;
    } else {
      contentLinksCreativeFilter.value = 'all';
    }
  }

  // Populate link task dropdowns inside post form
  const postTaskSelect = document.getElementById('post-link-task');
  if (postTaskSelect) {
    const currentVal = postTaskSelect.value;
    postTaskSelect.innerHTML = '<option value="">-- None --</option>';
    const sortedTasks = [...state.tasks].sort((a, b) => a.id.localeCompare(b.id));
    sortedTasks.forEach(t => {
      postTaskSelect.innerHTML += `<option value="${t.id}">${t.id}: ${t.name} [${t.designer}]</option>`;
    });
    postTaskSelect.value = currentVal || (state.editingPost && state.editingPost.associatedTaskId) || '';
  }

  // Populate link post dropdown inside task form
  const taskPostSelect = document.getElementById('task-form-link-post');
  if (taskPostSelect) {
    const currentVal = taskPostSelect.value;
    taskPostSelect.innerHTML = '<option value="">-- None --</option>';
    state.posts.forEach(p => {
      taskPostSelect.innerHTML += `<option value="${p.id}">${p.title}</option>`;
    });
    taskPostSelect.value = currentVal || (state.editingTask && state.editingTask.associatedPostId) || '';
  }

  // Populate dynamic people-based dropdowns from active team list
  const activeTeam = (state.team && state.team.length > 0) ? state.team : DEFAULT_TEAM;
  const assigners = activeTeam.filter(p => p.isAssigner);
  const loginUsers = activeTeam.filter(p => p.canLogin);

  // Populate designers in Post Form Assignee select box
  const postAssignee = document.getElementById('post-assignee');
  if (postAssignee) {
    const curVal = postAssignee.value;
    postAssignee.innerHTML = designers.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    if (curVal && designers.some(p => p.name === curVal)) postAssignee.value = curVal;
  }

  // Populate designers in Task Form Designer select box
  const taskFormDesigner = document.getElementById('task-form-designer');
  if (taskFormDesigner) {
    const curVal = taskFormDesigner.value;
    taskFormDesigner.innerHTML = designers.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    if (curVal && designers.some(p => p.name === curVal)) taskFormDesigner.value = curVal;
  }

  // Populate work assigners in Task Form Assigner select box
  const taskFormAssigner = document.getElementById('task-form-assigner');
  if (taskFormAssigner) {
    const curVal = taskFormAssigner.value;
    taskFormAssigner.innerHTML = assigners.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    if (curVal && assigners.some(p => p.name === curVal)) taskFormAssigner.value = curVal;
  }

  // Populate users in Login Select box
  const loginUser = document.getElementById('login-user');
  if (loginUser) {
    const curVal = loginUser.value;
    loginUser.innerHTML = loginUsers.map(p => `<option value="${p.name}">${p.name} (${p.role})</option>`).join('');
    if (curVal && loginUsers.some(p => p.name === curVal)) loginUser.value = curVal;
  }
}

function navigateToTask(taskId) {
  switchView('tasks');
  setTimeout(() => {
    const row = document.getElementById(`task-row-${taskId}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('highlighted-task');
      setTimeout(() => {
        row.classList.remove('highlighted-task');
      }, 6000);
    }
  }, 300);
}

function navigateToKanbanCard(itemId) {
  const currentUser = localStorage.getItem('hc_logged_in_user');
  const person = findTeamMember(currentUser);
  const canAccessQueue = currentUser && person && (person.access === 'admin' || (person.role && person.role.toLowerCase().includes('social media manager')));
  
  if (!canAccessQueue) {
    showToast('Access Denied: Publishing Queue is restricted to Admins and Social Media Manager', 'error');
    return;
  }

  switchView('kanban');
  setTimeout(() => {
    const cardEl = document.querySelector(`.post-card[data-id="${itemId}"]`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardEl.classList.add('flash-outline-kanban');
      setTimeout(() => {
        cardEl.classList.remove('flash-outline-kanban');
      }, 5000);
    }
  }, 350);
}

/* ==========================================================================
   CONTENT PLANNER (IDEAS) CORE LOGIC & CONTROLLERS
   ========================================================================== */

function renderTeam() {
  const tbody = document.getElementById('team-list-body');
  if (!tbody) return;

  const currentUser = localStorage.getItem('hc_logged_in_user');
  const userPerson = findTeamMember(currentUser);
  const isAdmin = userPerson && userPerson.access === 'admin';

  // Populate Designation Filter Dropdown (preserve active selection)
  const desigSelect = document.getElementById('team-designation-filter');
  if (desigSelect) {
    const currentVal = state.teamDesignationFilter || 'all';
    const designations = Array.from(new Set(state.team.map(p => p.role).filter(Boolean))).sort();
    const existingOptions = (desigSelect.options ? Array.from(desigSelect.options) : []).map(o => o.value).slice(1).join(',');
    const newOptions = designations.join(',');
    if (existingOptions !== newOptions) {
      desigSelect.innerHTML = `<option value="all">All Designations</option>` +
        designations.map(d => `<option value="${d}" ${d === currentVal ? 'selected' : ''}>${d}</option>`).join('');
    } else {
      desigSelect.value = currentVal;
    }
  }

  // Filter team
  const searchFilter = (state.teamSearchFilter || '').toLowerCase();
  const desigFilter = state.teamDesignationFilter || 'all';
  
  let filteredTeam = state.team.filter(p => {
    const name = (p.name || '').toLowerCase();
    const role = (p.role || '').toLowerCase();
    const matchesText = name.includes(searchFilter) || role.includes(searchFilter);
    const matchesDesig = desigFilter === 'all' || p.role === desigFilter;
    return matchesText && matchesDesig;
  });

  // Sort sequence
  const tCol = state.teamSortCol || 'name';
  const tDir = state.teamSortDir === 'asc' ? 1 : -1;

  filteredTeam.sort((a, b) => {
    let valA = (a[tCol] || '').toLowerCase();
    let valB = (b[tCol] || '').toLowerCase();
    if (valA < valB) return -1 * tDir;
    if (valA > valB) return 1 * tDir;
    return 0;
  });

  // Update People & Roles header sort UI indicators
  document.querySelectorAll('#people-view th.sortable-th').forEach(th => {
    const sCol = th.getAttribute('data-sort');
    const icon = th.querySelector('.sort-icon');
    if (sCol === state.teamSortCol) {
      th.classList.add('active-sort');
      if (icon) icon.textContent = state.teamSortDir === 'asc' ? '▲' : '▼';
    } else {
      th.classList.remove('active-sort');
      if (icon) icon.textContent = '↕';
    }
  });

  // Calculate statistics
  const total = state.team.length;
  const designersCount = state.team.filter(p => p.isDesigner).length;
  const assignersCount = state.team.filter(p => p.isAssigner).length;

  const totalStat = document.getElementById('team-stat-total');
  const desigStat = document.getElementById('team-stat-designers');
  const assignStat = document.getElementById('team-stat-assigners');
  if (totalStat) totalStat.textContent = total;
  if (desigStat) desigStat.textContent = designersCount;
  if (assignStat) assignStat.textContent = assignersCount;

  tbody.innerHTML = '';
  if (filteredTeam.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 32px 16px;">No team members found matching your search.</td></tr>`;
    return;
  }

  filteredTeam.forEach(p => {
    // Generate initials avatar
    const safeName = p.name || 'Unknown';
    const initials = safeName.split(' ').map(n => (n[0] || '')).join('').toUpperCase().substring(0, 2);
    const avatar = p.photo 
      ? `<img src="${p.photo}" class="team-avatar-img" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" alt="${safeName}">`
      : `<div class="team-avatar-initials" style="background: rgba(245, 158, 11, 0.1); color: var(--honey-gold); border: 1px solid rgba(245, 158, 11, 0.2); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">${initials}</div>`;

    // Roles tags
    let roleTagsHtml = '';
    if (p.isDesigner) roleTagsHtml += `<span class="badge" style="background: rgba(139, 92, 246, 0.1); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.15); margin-right: 4px;">Creative</span>`;
    if (p.isAssigner) roleTagsHtml += `<span class="badge" style="background: rgba(99, 102, 241, 0.1); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.15); margin-right: 4px;">Assigner</span>`;
    if (!roleTagsHtml) roleTagsHtml = '<span style="color: #64748b; font-style: italic;">No Roles</span>';

    // Access tags
    let accessTag = '';
    if (p.access === 'admin') {
      accessTag = `<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.15);">Admin</span>`;
    } else if (p.access === 'limited') {
      accessTag = `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.15);">Limited</span>`;
    } else {
      accessTag = `<span class="badge" style="background: rgba(100, 116, 139, 0.1); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.15);">None / Guest</span>`;
    }

    const editBtn = isAdmin 
      ? `<button class="action-btn edit-btn" aria-label="Edit member" style="background: none; border: none; cursor: pointer; color: var(--honey-gold);">
          <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2;"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
         </button>`
      : `<span style="color: #64748b; font-size: 0.75rem;">View Only</span>`;

    const isSelf = currentUser && (p.name === currentUser || (p.aliases && p.aliases.includes(currentUser)));
    const canSeePassword = isAdmin || isSelf;
    const passwordHtml = canSeePassword 
      ? `<code style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; color: #fbbf24;">${p.password || 'none'}</code>`
      : `<span style="color: #64748b; letter-spacing: 2px;">••••••••</span>`;

    const tr = document.createElement('tr');
    tr.id = `team-row-${p.id}`;
    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 12px;">
          ${avatar}
          <div>
            <div style="font-weight: 700; color: #fff;">${safeName}</div>
          </div>
        </div>
      </td>
      <td><span style="color: #cbd5e1; font-weight: 500;">${p.role || 'No Role Assigned'}</span></td>
      <td><div style="display: flex; flex-wrap: wrap; gap: 4px;">${roleTagsHtml}</div></td>
      <td>${accessTag}</td>
      <td>${passwordHtml}</td>
      <td style="text-align: right;">${editBtn}</td>
    `;
    tbody.appendChild(tr);

    // Bind edit action programmatically
    const editBtnEl = tr.querySelector('.edit-btn');
    if (editBtnEl) {
      editBtnEl.addEventListener('click', () => {
        openPersonModal(p.id);
      });
    }
  });
}

function openPersonModal(personId = null) {
  const currentUser = localStorage.getItem('hc_logged_in_user');
  const teamList = (state.team && state.team.length > 0) ? state.team : DEFAULT_TEAM;
  const userPerson = findTeamMember(currentUser);
  if (!currentUser || (userPerson && userPerson.access !== 'admin')) {
    showToast('Access Denied: Only admins can manage team members', 'error');
    return;
  }

  state.editingPersonId = personId;
  const modal = document.getElementById('person-modal');
  const modalTitle = document.getElementById('person-modal-title');
  const deleteBtn = document.getElementById('person-modal-delete-btn');
  const form = document.getElementById('person-form');
  
  form.reset();
  
  if (personId) {
    modalTitle.textContent = 'Edit Person';
    if (deleteBtn) deleteBtn.style.display = 'block';
    
    const person = state.team.find(p => p.id === personId);
    if (person) {
      document.getElementById('person-form-name').value = person.name;
      document.getElementById('person-form-name').disabled = true; // Don't allow changing name to avoid breaking reference links
      document.getElementById('person-form-title').value = person.role;
      document.getElementById('person-form-password').value = person.password || '';
      document.getElementById('person-form-access').value = person.access || 'none';
      document.getElementById('person-form-photo').value = person.photo || '';
      
      document.getElementById('person-role-designer').checked = !!person.isDesigner;
      document.getElementById('person-role-assigner').checked = !!person.isAssigner;
    }
  } else {
    modalTitle.textContent = 'Add New Person';
    document.getElementById('person-form-name').disabled = false;
    if (deleteBtn) deleteBtn.style.display = 'none';
  }
  
  if (modal) modal.classList.add('active');
}

function closePersonModal() {
  const modal = document.getElementById('person-modal');
  if (modal) modal.classList.remove('active');
  state.editingPersonId = null;
}

async function handlePersonFormSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('person-form-name').value.trim();
  const role = document.getElementById('person-form-title').value.trim();
  const password = document.getElementById('person-form-password').value.trim();
  const access = document.getElementById('person-form-access').value;
  const photo = document.getElementById('person-form-photo').value.trim();
  
  const isDesigner = document.getElementById('person-role-designer').checked;
  const isAssigner = document.getElementById('person-role-assigner').checked;

  if (!name || !role || !password) {
    showToast('Please fill out all required fields', 'error');
    return;
  }

  const initial = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  
  const personId = state.editingPersonId || `person-${Date.now()}`;
  const personData = {
    id: personId,
    name,
    role,
    initial,
    password,
    access,
    photo: photo || null,
    isDesigner,
    isAssigner
  };

  try {
    await setDoc(doc(db, "team", personId), personData);
    showToast(state.editingPersonId ? 'Person updated successfully' : 'Person added successfully', 'success');
    await logActivity(state.editingPersonId ? `updated team member "${name}"` : `added team member "${name}"`, db);
    closePersonModal();
  } catch (err) {
    console.error(err);
    showToast('Failed to save person to database', 'error');
  }
}

async function deletePerson() {
  const personId = state.editingPersonId;
  if (!personId) return;

  const person = state.team.find(p => p.id === personId);
  if (!person) return;

  if (!confirm(`Are you sure you want to remove ${person.name} from the team?`)) return;

  try {
    await deleteDoc(doc(db, "team", personId));
    showToast('Person removed from team', 'info');
    await logActivity(`removed team member "${person.name}"`, db);
    closePersonModal();
  } catch (err) {
    console.error(err);
    showToast('Failed to delete person', 'error');
  }
}

function mapPostStatusToTaskStatus(postStatus) {
  if (postStatus === 'ideation') return 'Not Started';
  if (postStatus === 'development') return 'On Progress';
  if (postStatus === 'ready') return 'Delayed';
  if (postStatus === 'scheduled') return 'On Progress';
  if (postStatus === 'published') return 'Finished';
  if (postStatus === 'correction') return 'Correction';
  return 'Not Started';
}

function mapTaskStatusToPostStatus(taskStatus) {
  if (taskStatus === 'Not Started') return 'ideation';
  if (taskStatus === 'On Progress') return 'development';
  if (taskStatus === 'Delayed') return 'ready';
  if (taskStatus === 'Finished') return 'published';
  if (taskStatus === 'Correction') return 'correction';
  return 'ideation';
}

async function syncPostToTask(post, db) {
  if (!post) return;
  
  // Find if a task is already associated
  let task = null;
  if (post.associatedTaskId) {
    task = state.tasks.find(t => t.id === post.associatedTaskId);
  } else {
    // Try to find a task that has this associatedPostId
    task = state.tasks.find(t => t.associatedPostId === post.id);
  }
  
  const taskStatus = mapPostStatusToTaskStatus(post.status);
  
  if (task) {
    // Update existing task
    let changed = false;
    if (task.name !== post.title) { task.name = post.title; changed = true; }
    if (task.designer !== post.assignee) { task.designer = post.assignee; changed = true; }
    if (task.date !== post.date) { task.date = post.date; changed = true; }
    if (task.time !== post.time) { task.time = post.time; changed = true; }
    if (task.status !== taskStatus) { task.status = taskStatus; changed = true; }
    if (task.associatedPostId !== post.id) { task.associatedPostId = post.id; changed = true; }
    
    if (changed) {
      await setDoc(doc(db, "tasks", task.id), task);
    }
    if (post.associatedTaskId !== task.id) {
      post.associatedTaskId = task.id;
      await setDoc(doc(db, "posts", post.id), post);
    }
  } else {
    // Create new task
    let maxId = 0;
    state.tasks.forEach(t => {
      const num = parseInt(t.id.replace('T-', ''));
      if (!isNaN(num) && num > maxId) maxId = num;
    });
    const newNum = maxId + 1;
    const newTaskId = `T-${String(newNum).padStart(2, '0')}`;
    
    const newTask = {
      id: newTaskId,
      name: post.title,
      designer: post.assignee,
      assignedBy: localStorage.getItem('hc_logged_in_user') || 'Razin',
      date: post.date,
      time: post.time || '12:00',
      urgency: 'Medium',
      status: taskStatus,
      deliveryLink: '',
      comments: '',
      associatedPostId: post.id
    };
    
    await setDoc(doc(db, "tasks", newTaskId), newTask);
    
    post.associatedTaskId = newTaskId;
    await setDoc(doc(db, "posts", post.id), post);
  }
}

function detectBrandFromTask(task) {
  if (!task) return 'tahams';
  const text = ((task.name || '') + ' ' + (task.notes || '') + ' ' + (task.deliveryLink || '')).toLowerCase();
  if (text.includes('evoka')) return 'evoka-experiences';
  if (text.includes('lovelife')) return 'lovelife';
  if (text.includes('samtech') || text.includes('sammtech')) return 'sammtech';
  if (text.includes('merchtile')) return 'merchtile';
  if (text.includes('perfume')) return 'perfume-tahams';
  if (text.includes('lumina')) return 'lumina-tahams';
  if (text.includes('star') || text.includes('spiderman') || text.includes('kids')) return 'star-tahams';
  return 'tahams';
}

async function syncTaskToPost(task, db) {
  if (!task) return;
  
  // Find if a post is already associated
  let post = null;
  if (task.associatedPostId) {
    post = state.posts.find(p => p.id === task.associatedPostId);
  } else {
    // Try to find a post that has this associatedTaskId
    post = state.posts.find(p => p.associatedTaskId === task.id);
  }
  
  const postStatus = mapTaskStatusToPostStatus(task.status);
  const brandId = detectBrandFromTask(task);
  
  if (post) {
    // Update existing post
    let changed = false;
    if (post.title !== task.name) { post.title = task.name; changed = true; }
    if (post.assignee !== task.designer) { post.assignee = task.designer; changed = true; }
    if (post.date !== task.date) { post.date = task.date; changed = true; }
    if (post.time !== task.time) { post.time = task.time; changed = true; }
    if (post.status !== postStatus) { post.status = postStatus; changed = true; }
    if (!post.brandId || post.brandId === 'tahams') { post.brandId = brandId; changed = true; }
    if (post.associatedTaskId !== task.id) { post.associatedTaskId = task.id; changed = true; }
    
    if (changed) {
      try { await setDoc(doc(db, "posts", post.id), post); } catch(e){}
    }
    if (task.associatedPostId !== post.id) {
      task.associatedPostId = post.id;
      try { await setDoc(doc(db, "tasks", task.id), task); } catch(e){}
    }
  } else {
    // Create new post
    const newPostId = 'post-' + (task.id || Date.now());
    const newPost = {
      id: newPostId,
      title: task.name,
      brandId: brandId,
      platforms: ['facebook', 'instagram'],
      status: postStatus,
      type: 'image',
      assignee: task.designer,
      date: task.date || '2026-08-09',
      time: task.time || '12:00',
      caption: '',
      associatedTaskId: task.id
    };
    
    state.posts.push(newPost);
    try { await setDoc(doc(db, "posts", newPostId), newPost); } catch(e){}
    
    task.associatedPostId = newPostId;
    try { await setDoc(doc(db, "tasks", task.id), task); } catch(e){}
  }
}

async function healPostTaskSync() {
  if (!state.posts || !state.tasks) return;
  
  // For each task, make sure it has taskType set
  for (const task of state.tasks) {
    if (!task.taskType) {
      task.taskType = task.associatedPostId ? 'post' : 'general';
      try { await setDoc(doc(db, "tasks", task.id), task); } catch(e){}
    }
  }

  // For each post, make sure it has an associated task
  for (const post of state.posts) {
    let task = null;
    if (post.associatedTaskId) {
      task = state.tasks.find(t => t.id === post.associatedTaskId);
    } else {
      task = state.tasks.find(t => t.associatedPostId === post.id);
    }
    if (!task) {
      await syncPostToTask(post, db);
    }
  }

  // For each task of type post, make sure it has an associated post
  for (const task of state.tasks) {
    if (task.taskType === 'post' || task.associatedPostId) {
      let post = null;
      if (task.associatedPostId) {
        post = state.posts.find(p => p.id === task.associatedPostId);
      } else {
        post = state.posts.find(p => p.associatedTaskId === task.id);
      }
      if (!post) {
        await syncTaskToPost(task, db);
      } else {
        const postStatus = mapTaskStatusToPostStatus(task.status);
        if (post.status !== postStatus || post.title !== task.name || post.assignee !== task.designer) {
          post.status = postStatus;
          post.title = task.name;
          post.assignee = task.designer;
          try { await setDoc(doc(db, "posts", post.id), post); } catch(e){}
        }
      }
    }
  }
}

// --- Publishing Queue Logic ---
function updatePublishingQueueBadge() {
  const badge = document.getElementById('publishing-queue-badge');
  if (!badge) return;
  
  const pendingPublishing = state.tasks.filter(t => (t.taskType === 'post' || t.associatedPostId) && t.status === 'Finished' && !t.isPosted);
  const count = pendingPublishing.length;
  
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function renderPublishingQueue() {
  const list = document.getElementById('publishing-queue-list');
  if (!list) return;

  const pendingPublishing = state.tasks.filter(t => (t.taskType === 'post' || t.associatedPostId) && t.status === 'Finished' && !t.isPosted);
  
  if (pendingPublishing.length === 0) {
    list.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748b;">No pending posts to publish.</div>`;
    return;
  }

  list.innerHTML = pendingPublishing.map(task => {
    const post = task.associatedPostId ? state.posts.find(p => p.id === task.associatedPostId) : null;
    const postInfo = post ? `<div style="font-size: 0.8rem; color: #94a3b8; margin-top: 4px;">Platform: ${(post.platforms || []).join(', ')} | Brand: ${post.brandId}</div>` : '';
    
    return `
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
        <div style="font-weight: 600; color: #f8fafc; margin-bottom: 4px;">${task.name}</div>
        <div style="font-size: 0.8rem; color: #cbd5e1; margin-bottom: 8px;">Delivery Link: <a href="${task.deliveryLink || '#'}" target="_blank" style="color: var(--honey-gold); text-decoration: none;">${task.deliveryLink ? 'Open Asset' : 'None'}</a></div>
        ${postInfo}
        <button class="mark-posted-btn" data-task-id="${task.id}" style="margin-top: 10px; width: 100%; background: var(--honey-gold); color: #000; border: none; padding: 6px 12px; border-radius: 4px; font-weight: 600; cursor: pointer;">Mark as Posted</button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.mark-posted-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const taskId = e.currentTarget.getAttribute('data-task-id');
      if (taskId) {
        window.markTaskPosted(taskId);
      }
    });
  });
}

window.markTaskPosted = async function(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  
  task.isPosted = true;

  if (task.associatedPostId) {
    const post = state.posts.find(p => p.id === task.associatedPostId);
    if (post) {
      post.status = 'published';
      try { setDoc(doc(db, "posts", post.id), post); } catch(e){}
    }
  }
  
  logActivity(`Marked task "${task.name}" as posted`, db);
  showToast(`Marked "${task.name}" as posted`, 'success');
  
  renderActivityLog();
  updateActivityBadge();
  refreshViews();

  try {
    await setDoc(doc(db, "tasks", taskId), task);
  } catch(err) {
    console.warn("Firestore task update error (saved locally):", err);
  }
};
