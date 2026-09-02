// Supabase backs both auth (real, server-side hashed password verification)
// and data storage (replacing Firestore, which had no access control tied
// to this app's login — see supabase_migration.sql for the schema/RLS).
// The publishable key below is meant to be public (like a site key); it
// only grants what Row Level Security policies on the Supabase project
// allow, and carries no ability to read or guess anyone's password.
const SUPABASE_URL = "https://vmompbhqmselujfqpmvj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fwM2XHB2dNJHn6gwnD7-IA_GmBIxCBN";
let supabase = null;

// `db` mirrors the old Firestore handle: truthy once ready, and passed
// opaquely through collection()/doc() so every call site elsewhere in this
// file is unchanged. collection()/doc() just remember a {table, id}; the
// row's entire JS object lives in one jsonb `data` column per table, so no
// per-collection schema is needed to match Firestore's schemaless documents.
let db = null;

async function initSupabase() {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    db = supabase;
  } catch (err) {
    console.warn("Supabase CDN unreachable or blocked, running in offline fallback mode:", err);
  }
}

function collection(dbHandle, table) {
  return { table };
}

function doc(dbHandle, table, id) {
  return { table, id };
}

async function setDoc(ref, data) {
  const payload = { id: ref.id, data, updated_at: new Date().toISOString() };
  const { error } = await supabase.from(ref.table).upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

async function deleteDoc(ref) {
  const { error } = await supabase.from(ref.table).delete().eq('id', ref.id);
  if (error) throw error;
}

// Like setDoc, but a plain INSERT — it FAILS (Postgres 23505) if a row with
// this id already exists instead of silently overwriting it. Used for every
// "create new record" path so a mis-generated id can never clobber someone
// else's row. Updates still use setDoc (upsert).
async function insertDoc(ref, data) {
  const payload = { id: ref.id, data, updated_at: new Date().toISOString() };
  const { error } = await supabase.from(ref.table).insert(payload);
  if (error) throw error;
}

// Authoritative set of ids currently in a table, read straight from the
// server. Throws when the backend is unreachable — callers must NOT fall
// back to guessing an id from the in-memory cache, because that cache can be
// the bundled DEFAULT_* seed data after a realtime blip (its max id is far
// behind the live data, so every "next" id collides with a real row).
async function fetchExistingIds(table) {
  if (!supabase) throw new Error('Backend not ready');
  const { data, error } = await supabase.from(table).select('id');
  if (error) throw error;
  return new Set((data || []).map(r => r.id));
}

// Allocate the next free `${prefix}<n>` id from the SERVER's current ids and
// INSERT the record under it, retrying on the rare race where two creates
// pick the same number at once. Returns the id actually used.
//   table   - Supabase table name
//   prefix  - id prefix, e.g. 'T-' / 'I-' / 'PN-'
//   pad     - zero-pad width for the number (0 = no padding)
//   build   - (id) => record object to store
//   idSet   - optional pre-fetched id Set (for bulk loops like CSV import);
//             mutated in place as ids are consumed
async function createSequentialDoc(table, prefix, pad, build, idSet) {
  const ids = idSet || await fetchExistingIds(table);
  let n = 0;
  ids.forEach(id => {
    if (typeof id === 'string' && id.startsWith(prefix)) {
      const num = parseInt(id.slice(prefix.length), 10);
      if (!isNaN(num) && num > n) n = num;
    }
  });
  n += 1;
  for (let attempt = 0; attempt < 25; attempt++) {
    const id = `${prefix}${pad ? String(n).padStart(pad, '0') : n}`;
    if (!ids.has(id)) {
      try {
        await insertDoc({ table, id }, build(id));
        ids.add(id);
        return id;
      } catch (err) {
        if (err && err.code === '23505') { ids.add(id); n += 1; continue; }
        throw err;
      }
    }
    n += 1;
  }
  throw new Error(`Could not allocate a free id for ${prefix} in ${table}`);
}

// Mimics Firestore's onSnapshot(collectionRef, onNext, onError): fires
// immediately with the current rows, then again on every insert/update/
// delete via Supabase Realtime. Requires the table to be added to the
// `supabase_realtime` publication (done by supabase_migration.sql).
function onSnapshot(ref, onNext, onError) {
  const cache = new Map();

  function emit() {
    const rows = Array.from(cache.values());
    onNext({
      empty: rows.length === 0,
      forEach: (fn) => rows.forEach((row) => fn({ id: row.id, data: () => row.data }))
    });
  }

  supabase.from(ref.table).select('id,data').then(({ data, error }) => {
    if (error) { if (onError) onError(error); return; }
    data.forEach((row) => cache.set(row.id, row));
    emit();
  });

  supabase
    .channel(`realtime:${ref.table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: ref.table }, (payload) => {
      if (payload.eventType === 'DELETE') {
        cache.delete(payload.old.id);
      } else {
        cache.set(payload.new.id, payload.new);
      }
      emit();
    })
    .subscribe();
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
  { id: 'p-1', name: 'Rifat Newaj Razin', role: 'Head of Multimedia and Creative Department', initial: 'RR', photo: 'assets/rifat-profile.jpg', authEmail: 'rifat@honeycomb-hub.app', access: 'admin', isDesigner: true, isAssigner: true, canLogin: true, canMarkPosted: true, canPlanContent: true, canAccessPriorityBoard: true, aliases: ['Razin', 'Razin Bhaia', 'Rifat', 'Rifat Razin'] },
  { id: 'p-2', name: 'Md. Mahim', role: 'Cinematographer and Video Editor', initial: 'MM', photo: 'assets/avatars/Md.-Mahim.png', access: 'limited', isDesigner: true, isAssigner: false, canLogin: false, aliases: ['Mahim'] },
  { id: 'p-3', name: 'Md. Yasin Arafat', role: 'Creative Design Associate', initial: 'YA', photo: 'assets/avatars/Md.-Yasin-Arafat-Rabby.png', authEmail: 'rabby@honeycomb-hub.app', access: 'limited', isDesigner: true, isAssigner: false, canLogin: true, canAccessPriorityBoard: true, aliases: ['Rabby', 'Yasin Arafat Rabby', 'Yasin Arafat', 'Md. Yasin Arafat Rabby'] },
  { id: 'p-4', name: 'Niaz Uddin', role: 'Junior Designer', initial: 'NU', photo: 'assets/avatars/Niaz-Uddin.png', authEmail: 'niaz@honeycomb-hub.app', access: 'limited', isDesigner: true, isAssigner: false, canLogin: true, canAccessPriorityBoard: true, aliases: ['Niaz'] },
  { id: 'p-5', name: 'Social Media Manager', role: 'Social Media Manager', initial: 'SM', photo: null, access: 'limited', isDesigner: false, isAssigner: true, canLogin: false, aliases: ['Jubayer Hossain', 'Jubayer', 'Jubaer Bhai', 'Jubaer', 'Social Media Manager', 'SMM'] },
  { id: 'p-6', name: 'Mohammad Zahidul Islam', role: 'Marketing, Sales & Communications Manager', initial: 'ZI', photo: 'assets/avatars/Md.-Zahidul-Islam.png', authEmail: 'zahid@honeycomb-hub.app', access: 'limited', isDesigner: false, isAssigner: false, canLogin: true, canMarkPosted: true, aliases: ['Zahid', 'Zahidul Islam'] },
  { id: 'person-1', name: 'Ashiq Ahmed', role: 'Chief Finance Officer', initial: 'AA', photo: 'assets/avatars/Ashiq-Ahmed.png', access: 'limited', isDesigner: false, isAssigner: true, canLogin: false, aliases: ['Ashiq Bhaia', 'Ashiq'] },
  { id: 'person-2', name: 'Israt Sultana Tohfa', role: 'Chief Operations Officer', initial: 'IT', photo: 'assets/avatars/Israt-Sultana-Tohfa.png', authEmail: 'tohfa@honeycomb-hub.app', access: 'limited', isDesigner: false, isAssigner: true, canLogin: true, canAccessPriorityBoard: true, aliases: ['Tohfa Apu', 'Tohfa'] },
  { id: 'person-3', name: 'Saddam Hossain', role: 'Office Manager', initial: 'SH', photo: 'assets/avatars/Saddam-Hossain.png', access: 'limited', isDesigner: false, isAssigner: true, canLogin: false, aliases: ['Saddam'] },
  { id: 'person-4', name: 'Mostaque Ahammed Naim', role: 'Head of IT', initial: 'MN', photo: 'assets/avatars/Mostaque-Ahammed-Naim.png', authEmail: 'naim@honeycomb-hub.app', access: 'admin', isDesigner: false, isAssigner: true, canLogin: true, aliases: ['Naim', 'Mostaque', 'Mostaque Ahmed Naim'] },
  { id: 'person-5', name: 'Oisarjo Tarafder', role: 'Head of HR', initial: 'OT', photo: 'assets/avatars/Oisarjo-Tarafder.png', access: 'limited', isDesigner: false, isAssigner: true, canLogin: false, aliases: ['Oisarjo', 'Oishi Apu', 'Oishi'] },
  { id: 'person-6', name: 'Sharmin Mahmud Khan Orthee', role: 'Sales & Customer Support Executive', initial: 'SO', photo: 'assets/avatars/Sharmin-Mahmud-Khan-Orthee.png', authEmail: 'orthee@honeycomb-hub.app', access: 'limited', isDesigner: false, isAssigner: false, canLogin: true, canAccessPriorityBoard: true, canManagePriorityNotes: true, aliases: ['Orthee'] },
  { id: 'person-7', name: 'Md. Abdur Rafi Islam', role: 'Client Relationship Executive', initial: 'RI', photo: 'assets/avatars/Abdur-Rafi-Islam.png', access: 'limited', isDesigner: false, isAssigner: false, canLogin: false, aliases: ['Rafi'] },
  { id: 'person-9', name: 'Md. Milon Hossain Anik', role: 'Inventory & Quality Assurance Officer', initial: 'MA', photo: 'assets/avatars/Milon-Hossain-Anik.png', access: 'limited', isDesigner: false, isAssigner: false, canLogin: false, aliases: ['Anik', 'Milon'] },
  { id: 'person-15', name: 'Labiba Laisa Esha', role: 'Executive, Growth and Strategic Planning', initial: 'LE', photo: 'assets/avatars/Labiba-Laisa-Esha.png', access: 'limited', isDesigner: false, isAssigner: false, canLogin: false, aliases: ['Esha'] },
  { id: 'person-16', name: 'Rafiunoor Rahman Rajjo', role: 'Event Decor & Management', initial: 'RR', photo: 'assets/avatars/Rafiunoor-Rahman-Rajjo.png', access: 'limited', isDesigner: false, isAssigner: true, canLogin: false, aliases: ['Rajjo', 'Rafiunoor Rahman Rajjo', 'Rafiunoor'] },
  { id: 'person-17', name: 'Nazmul Hoseen Emon', role: 'Manager, Display Center', initial: 'NE', photo: 'assets/avatars/Nazmul-Hoseen-Emon.png', access: 'limited', isDesigner: false, isAssigner: true, canLogin: false, aliases: ['Emon', 'Emon Bhai', 'Nazmul Hoseen Emon', 'Nazmul'] }
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

// Gate for every Task Tracker write action (create / edit / delete / CSV
// import). The board is a production tool for the people who actually do the
// work or hand it out — Creatives (isDesigner) and Assigners (isAssigner),
// plus admins. Everyone else (HR, finance, sales) keeps full read access to
// the board but cannot change it. Signed-out guests are already covered by
// the separate !currentUser checks. Note this is a UI gate, not a security
// boundary: Supabase RLS grants writes to any authenticated session.
function canCurrentUserManageTasks() {
  const person = getCurrentUserPerson();
  if (!person) return false;
  return !!(person.access === 'admin' || person.isDesigner || person.isAssigner);
}

// Short codes for the Posted column, so checkbox/badge labels stay compact
// instead of wrapping brand names across lines.
const BRAND_SHORT_CODES = {
  'SammTech': 'SMT',
  'Lovelife Memories': 'LLM',
  'Tahams': 'TMS',
  'Perfume de Tahams': 'PDT',
  'Lumina by Tahams': 'LBT',
  'Tahams Little Star': 'TLS',
  'Merchtile': 'MER',
  'Evoka Experiences': 'EE'
};

function brandShortCode(brandName) {
  return (brandName && BRAND_SHORT_CODES[brandName]) || brandName || '';
}

// Tahams sub-brand → parent mapping. A task whose effective brand name is a
// key here needs to be posted on TWO separate pages (the sub-brand's own
// page and the Tahams mother page) to count as fully posted — everything
// else keeps the single-page behavior. Extend this map if more sub-brands
// are added later; nothing else about the posted-tracking code needs to
// change to support that.
const BRAND_HIERARCHY = {
  "Perfume de Tahams": "Tahams",
  "Lumina by Tahams": "Tahams",
  "Tahams Little Star": "Tahams"
};

// Which posted-status page keys apply to a task: two ('sub'/'parent') for
// Tahams sub-brand tasks, one ('main') for everything else.
function taskIsSubBrandBucket(task) {
  const brandId = taskEffectiveBrandId(task);
  const brand = ((state.brands && state.brands.length > 0) ? state.brands : DEFAULT_BRANDS).find(b => b.id === brandId);
  return !!(brand && BRAND_HIERARCHY[brand.name]);
}

function pageKeysForTask(task) {
  return taskIsSubBrandBucket(task) ? ['sub', 'parent'] : ['main'];
}

// A task counts as fully posted only once every page it needs to be posted
// on (see pageKeysForTask) has been marked true — a Tahams sub-brand task
// posted only on its own page but not yet on the Tahams parent page is NOT
// fully posted. Replaces the old flat `task.isPosted === true` check.
function isTaskFullyPosted(task) {
  const posted = task && task.posted;
  if (!posted || typeof posted !== 'object') return false;
  const keys = Object.keys(posted);
  if (keys.length === 0) return false;
  return keys.every(k => posted[k] === true);
}

// 'posted' (every page done), 'partial' (some but not all — the case that
// should catch a moderator's eye, e.g. posted on the sub-brand page but not
// yet the Tahams parent page), or 'not_posted' (nothing done yet).
function getTaskPostedState(task) {
  const posted = task && task.posted;
  if (!posted || typeof posted !== 'object') return 'not_posted';
  const vals = Object.values(posted);
  if (vals.length === 0) return 'not_posted';
  const allTrue = vals.every(v => v === true);
  if (allTrue) return 'posted';
  const anyTrue = vals.some(v => v === true);
  return anyTrue ? 'partial' : 'not_posted';
}

// Gate for creating/editing/deleting Idea Board entries — only people with
// canPlanContent: true on their team-roster record. Everyone logged in can
// still view the board, and any logged-in user can claim an idea (set the
// assigned designer) or toggle the "Handled" checkbox — see renderIdeaBoard.
function canCurrentUserPlanContent() {
  const person = getCurrentUserPerson();
  return !!(person && person.canPlanContent);
}

// Gate for the Priority Board — only people with canAccessPriorityBoard: true
// on their team-roster record may see the nav item or open the view.
function canCurrentUserAccessPriorityBoard() {
  const person = getCurrentUserPerson();
  return !!(person && person.canAccessPriorityBoard);
}

// Gate for creating/editing/deleting Priority Board notes — only Orthee
// (canManagePriorityNotes: true). Everyone with board access can still view,
// comment, and (if isDesigner) toggle Handled — see renderPriorityBoard.
function canCurrentUserManagePriorityNotes() {
  const person = getCurrentUserPerson();
  return !!(person && person.canManagePriorityNotes);
}

// Gate for toggling a Priority Board note to Handled — restricted to the
// creative team (isDesigner: true), per the agreed permission model.
function canCurrentUserHandlePriorityNotes() {
  const person = getCurrentUserPerson();
  return !!(person && person.isDesigner);
}

// A "board-only" account (Orthee) has canAccessPriorityBoard but is not part
// of the creative team — their sidebar/view access is restricted to just the
// Priority Board. Designers, assigners, and admins who also have
// canAccessPriorityBoard (e.g. Tohfa Apu, COO) keep their normal full
// navigation and just gain the Priority Board on top.
function isCurrentUserBoardOnly() {
  const person = getCurrentUserPerson();
  return !!(person && person.canAccessPriorityBoard && !person.isDesigner
    && !person.isAssigner && person.access !== 'admin');
}

// Gate for the Employee Database (HR directory) — only people with
// canAccessEmployeeDb: true on their roster record, or any admin, may see
// the nav item or open the view. This permission is completely independent
// of the roster data itself: the employee records live in their own
// Supabase table (employee_records) and never touch state.team.
function canCurrentUserAccessEmployeeDb() {
  const person = getCurrentUserPerson();
  return !!(person && (person.canAccessEmployeeDb || person.access === 'admin'));
}

// Gate for the Onboarding Deliverables view. Anyone with Employee Database
// (HR) access has it automatically; the canAccessOnboarding flag grants it
// to people who don't need the full HR directory. Admins always have it.
function canCurrentUserAccessOnboarding() {
  const person = getCurrentUserPerson();
  return !!(person && (person.canAccessOnboarding || person.canAccessEmployeeDb || person.access === 'admin'));
}

// Gate for the Leave view. Deliberately NOT inherited from
// canAccessEmployeeDb the way Onboarding is: maintaining the employee
// directory and handling people's leave records are different duties, and
// leave history is the more sensitive of the two. Explicit flag, or admin.
function canCurrentUserAccessLeave() {
  const person = getCurrentUserPerson();
  return !!(person && (person.canAccessLeave || person.access === 'admin'));
}

// The three physical office spaces employees can be seated in. Rename here
// in one place if the offices ever change.
const DEFAULT_OFFICE_SPACES = ['HQ', 'DC1', 'DC2', 'DC3', 'DC4', 'Not Specific'];

// Blood group options for the Employee Database dropdown.
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Employee record status options.
const EMPLOYEE_STATUSES = ['Active', 'Inactive'];

// Field keys required when adding/editing an employee. Everything else is
// optional for now (per HR — only the essentials are enforced).
const EMPLOYEE_REQUIRED_FIELDS = [
  'employeeId', 'fullName', 'designation', 'phone', 'personalEmail', 'dob', 'bloodGroup'
];

// Human-readable labels + CSV header names for every employee record field,
// in display order. Used by the table, the detail modal, and CSV import/export.
const EMPLOYEE_FIELD_DEFS = [
  { key: 'employeeId',            label: 'Employee ID' },
  { key: 'fullName',              label: 'Full Name' },
  { key: 'designation',           label: 'Designation' },
  { key: 'department',            label: 'Department' },
  { key: 'officeSpace',           label: 'Office Space' },
  { key: 'phone',                 label: 'Phone Number' },
  { key: 'workEmail',             label: 'Work Email' },
  { key: 'personalEmail',         label: 'Email' },
  { key: 'dob',                   label: 'Date of Birth' },
  { key: 'bloodGroup',            label: 'Blood Group' },
  { key: 'status',                label: 'Status' },
  { key: 'joinDate',              label: 'Join Date' },
  { key: 'emergencyContactName',  label: 'Emergency Contact Name' },
  { key: 'emergencyContactPhone', label: 'Emergency Contact Phone' },
  { key: 'address',               label: 'Address' },
  { key: 'nationalId',            label: 'National ID' },
  { key: 'bankAccountNumber',     label: 'Bank Account Number' },
  { key: 'cvLink',                label: 'CV / Resume Link' },
  { key: 'notes',                 label: 'Notes' }
];

// ---- Onboarding Deliverables ----------------------------------------------
// Formal deliverables every new employee should receive. Stored on the same
// employee_records row under `deliverables` (no separate table). Each step is
// either auto-derived from an existing record field or a manual checkbox;
// some steps also carry an optional Google Drive link.
const DELIVERABLE_DEFS = [
  {
    key: 'idCard', label: 'ID Card',
    steps: [
      { key: 'name',       label: 'Name',                 auto: r => !!empVal(r.fullName) },
      { key: 'phone',      label: 'Phone Number',         auto: r => !!empVal(r.phone) },
      { key: 'email',      label: 'Email Address',        auto: r => !!empVal(r.personalEmail) },
      { key: 'dob',        label: 'Date of Birth',        auto: r => !!empVal(r.dob) },
      { key: 'bloodGroup', label: 'Blood Group',          auto: r => !!empVal(r.bloodGroup) },
      { key: 'photo',      label: 'Formal/Casual Photo',   link: true }
    ]
  },
  {
    key: 'mug', label: 'Mug',
    steps: [
      { key: 'nameCollection', label: 'Name Collection' },
      { key: 'designFile',     label: 'Design File Preparation', link: true }
    ]
  },
  {
    key: 'bankAccount', label: 'Bank Account',
    steps: [
      { key: 'basicInfo',     label: 'Basic Information' },
      { key: 'specialIdCard', label: 'Special Submittable ID Card Preparation', link: true }
    ]
  },
  {
    key: 'royaltyCard', label: 'Royalty Card',
    steps: [
      { key: 'nameCollection', label: 'Name Collection' },
      { key: 'designFile',     label: 'Design File Preparation', link: true }
    ]
  }
];

// Days after Join Date before an incomplete deliverable is flagged overdue.
const ONBOARDING_OVERDUE_DAYS = 14;

// A manual step can be marked "Not required" (N/A) for a given employee.
// Auto steps (from the record) can't be N/A.
function isDeliverableStepNA(rec, dKey, step) {
  if (step.auto) return false;
  return !!(rec && rec.deliverables && rec.deliverables[dKey] &&
           rec.deliverables[dKey].na && rec.deliverables[dKey].na[step.key]);
}

// Whether a single step is satisfied for a record (auto steps read the record;
// manual steps read the stored deliverables object). An N/A step doesn't count
// as "done" but it's excluded from the progress total.
function isDeliverableStepDone(rec, dKey, step) {
  if (step.auto) return !!step.auto(rec);
  return !!(rec && rec.deliverables && rec.deliverables[dKey] &&
           rec.deliverables[dKey].steps && rec.deliverables[dKey].steps[step.key]);
}

function deliverableProgress(rec, def) {
  const required = def.steps.filter(s => !isDeliverableStepNA(rec, def.key, s));
  const done = required.filter(s => isDeliverableStepDone(rec, def.key, s)).length;
  const total = required.length;
  return { done, total, complete: done === total, allNA: total === 0 };
}

function isEmployeeFullyOnboarded(rec) {
  return DELIVERABLE_DEFS.every(def => deliverableProgress(rec, def).complete);
}

function deliverableLink(rec, dKey, stepKey) {
  return empVal(rec && rec.deliverables && rec.deliverables[dKey] &&
    rec.deliverables[dKey].links && rec.deliverables[dKey].links[stepKey]);
}

function deliverableDeliveredOn(rec, dKey) {
  return empVal(rec && rec.deliverables && rec.deliverables[dKey] &&
    rec.deliverables[dKey].deliveredOn);
}

// True when the employee still has an incomplete deliverable AND is more than
// ONBOARDING_OVERDUE_DAYS past their Join Date. No Join Date => never overdue.
function isEmployeeOnboardingOverdue(rec) {
  if (isEmployeeFullyOnboarded(rec)) return false;
  const jd = toIsoDate(rec.joinDate);
  if (!jd || !/^\d{4}-\d{2}-\d{2}$/.test(jd)) return false;
  const due = new Date(jd + 'T00:00:00');
  due.setDate(due.getDate() + ONBOARDING_OVERDUE_DAYS);
  return new Date() > due;
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "general"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
    "taskType": "post"
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
  contentIdeas: [],
  editingIdeaId: null,
  ideaSearchFilter: '',
  ideaStatusFilter: 'all',
  priorityNotes: [],
  priorityBoardLog: [],
  editingPriorityNoteId: null,
  viewingPriorityNoteId: null,
  recentlyHandledNoteIds: {},
  priorityBoardDateFilter: '',
  currentView: 'dashboard',
  selectedBrandFilter: 'all',
  currentDate: new Date('2026-07-05T12:00:00'), // Setting active app date based on user local time
  calendarDate: new Date(),
  editingPost: null,
  editingTask: null,
  taskSearchFilter: '',
  taskDesignerFilter: 'all',
  taskAssignerFilter: 'all',
  taskBrandFilter: 'all',
  taskStatusFilter: 'all',
  taskSortCol: 'id',
  taskSortDir: 'desc',
  contentLinksSortCol: 'date',
  contentLinksSortDir: 'desc',
  teamSortCol: 'name',
  teamSortDir: 'asc',
  // Employee Database (HR directory) — fully isolated from `team`.
  employeeRecords: [],
  employeeDbLog: [],
  editingEmployeeId: null,
  viewingEmployeeId: null,
  employeeSearchFilter: '',
  employeeDesignationFilter: 'all',
  employeeDepartmentFilter: 'all',
  employeeOfficeFilter: 'all',
  employeeBloodGroupFilter: 'all',
  employeeStatusFilter: 'all',
  employeeSortCol: 'fullName',
  employeeSortDir: 'asc',
  // Onboarding Deliverables view
  onboardingSearchFilter: '',
  onboardingOfficeFilter: 'all',
  onboardingStatusFilter: 'all',
  onboardingSortCol: 'fullName',
  onboardingSortDir: 'asc',
  viewingOnboardingId: null,
  // Leave (HR) — its own tables, its own slice, never touches `team`.
  leaveRecords: [],
  leaveHolidays: [],
  leavePolicies: [],
  leaveLog: [],
  leaveTab: 'grid',
  leaveYear: new Date().getFullYear(),
  leaveMonth: new Date().getMonth() + 1,
  leaveBalYear: new Date().getFullYear(),
  leavePersonYear: new Date().getFullYear(),
  leaveCalYear: new Date().getFullYear(),
  leavePersonId: null,
  leaveSearchFilter: '',
  leaveTypeFilter: 'all',
  leaveOfficeFilter: 'all',
  leaveStatusFilter: 'all',
  leaveActiveFilter: 'active',
  leaveBalSearch: '',
  leaveBalOfficeFilter: 'all',
  leaveBalStatusFilter: 'all',
  leaveBalSortCol: 'fullName',
  leaveBalSortDir: 'asc'
};

// Initialize Application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAuth();
  });
} else {
  initAuth();
}

// Vibrates the login card and highlights the password field red when the
// entered password doesn't match. Re-triggerable on repeated wrong attempts
// (removing the class and forcing a reflow before re-adding it, since
// re-adding the same class name to an element that already has it won't
// restart a CSS animation on its own).
function shakeWrongPassword() {
  const card = document.querySelector('.login-card');
  const passwordEl = document.getElementById('login-password');
  if (!card) return;

  card.classList.remove('shake-wrong-password');
  void card.offsetWidth; // force reflow so the animation can restart
  card.classList.add('shake-wrong-password');

  if (passwordEl) {
    passwordEl.value = '';
    passwordEl.focus();
  }

  card.addEventListener('animationend', () => {
    card.classList.remove('shake-wrong-password');
  }, { once: true });
}

function initAuth() {
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
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
        if (!account.authEmail) {
          showToast('This account has no Supabase login configured. Contact an admin.', 'error');
          console.error('Login blocked: account.authEmail missing for', account.name, account);
          return;
        }
        if (!supabase) {
          showToast('Login service unavailable. Check your connection and try again.', 'error');
          console.error('Login blocked: Supabase client failed to initialize.');
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: account.authEmail,
          password: passwordInput
        });
        if (error) {
          showToast('Invalid password. Please try again.', 'error');
          shakeWrongPassword();
          return;
        }

        localStorage.setItem('hc_logged_in_user', account.name);
        if (loginOverlay) loginOverlay.style.display = 'none';

        // The realtime data subscriptions (employee_records, leave_records,
        // etc.) are wired once at page load — see initData(). Each one does a
        // single initial SELECT, then only receives *changes*. When that load
        // happened there was no Supabase session, so RLS returned nothing for
        // the HR tables and those views came up empty; signing in now doesn't
        // re-run the SELECT, so they stayed empty until a manual refresh.
        // Reload so initData() runs again with the session active. The welcome
        // toast is handed across the reload via sessionStorage.
        try { sessionStorage.setItem('hc_post_login_welcome', account.name.split(' ')[0]); } catch (e) {}
        location.reload();
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

// The sign-in dropdown used to be a hardcoded list of five names in
// index.html. Anyone granted a login afterwards — Oisarjo Tarafder and
// Sharmin Mahmud Khan Orthee both had canLogin and an authEmail — simply
// had no option to pick, so they could never sign in. Without a session no
// permission flag applies and RLS returns nothing, which looked exactly like
// "I don't have access to the Employee Database". Build it from the roster
// so granting a login is enough on its own.
function populateLoginOptions() {
  const sel = document.getElementById('login-user');
  if (!sel) return;
  const eligible = (state.team || [])
    .filter(p => p.canLogin && p.authEmail)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  if (!eligible.length) return;   // roster not loaded yet — keep the markup fallback
  const previous = sel.value;
  sel.innerHTML = eligible.map(p =>
    `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}${p.role ? ` — ${escapeHtml(p.role)}` : ''}</option>`
  ).join('');
  if (eligible.some(p => p.name === previous)) sel.value = previous;
}

function showLoginOverlay() {
  const loginOverlay = document.getElementById('login-overlay');
  if (loginOverlay) {
    populateLoginOptions();
    loginOverlay.style.display = 'flex';
  }
}

// Being "signed in" is two separate things here: a name in localStorage,
// which drives the sidebar and every permission gate, and a Supabase session,
// which is what actually satisfies RLS on the HR tables. Sign-in sets both,
// but only the name is permanent — the session expires. When they diverged
// the app looked signed in (name in the sidebar, HR nav visible) while every
// read came back empty and every write failed, so the Employee Database
// reported "No employees yet" to someone whose permissions were perfectly
// correct. Reconcile the two on boot, and again whenever auth state changes.
async function reconcileAuthSession() {
  if (!supabase) return;
  const uiUser = localStorage.getItem('hc_logged_in_user');
  if (!uiUser) return;
  try {
    const { data } = await supabase.auth.getSession();
    if (data && data.session) return;
    localStorage.removeItem('hc_logged_in_user');
    // A toast here fires during page load and is gone in 3s — easy to miss,
    // and it leaves the person staring at an app that looks signed in but
    // shows no data. Put the remedy in front of them instead.
    showLoginOverlay();
    showToast('Your session expired — please sign in again to see HR data', 'error');
  } catch (err) {
    console.warn('Session check failed:', err);
  }
}

function watchAuthSession() {
  if (!supabase || !supabase.auth || !supabase.auth.onAuthStateChange) return;
  try {
    supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT') return;
      if (!localStorage.getItem('hc_logged_in_user')) return;   // our own sign-out
      localStorage.removeItem('hc_logged_in_user');
      showToast('Your session expired — please sign in again to see HR data', 'error');
      try { renderUserProfile(); refreshViews(); } catch (e) { console.warn(e); }
    });
  } catch (err) {
    console.warn('Auth state listener skipped:', err);
  }
}

async function runAppInit() {
  await initSupabase();
  await reconcileAuthSession();
  watchAuthSession();
  initData();
  setupEventListeners();
  renderUserProfile();
  initFilterDropdowns();
  updateModalDropdowns();
  refreshViews();
  let lastView = localStorage.getItem('hc_last_view') || 'dashboard';
  if (lastView === 'kanban' || lastView === 'analytics' || lastView === 'ideas') lastView = 'dashboard';
  if (isCurrentUserBoardOnly() && lastView !== 'team') lastView = 'priority-board';
  switchView(lastView);

  // Show the "Welcome back" toast that was deferred across the post-login
  // reload (see the login handler).
  try {
    const welcomeName = sessionStorage.getItem('hc_post_login_welcome');
    if (welcomeName) {
      sessionStorage.removeItem('hc_post_login_welcome');
      showToast(`Welcome back, ${welcomeName}!`, 'success');
    }
  } catch (e) {}

  // Safety net: don't let the loading overlay get stuck forever if the
  // Firestore listener errors out silently for some reason.
  setTimeout(hideAppLoadingOverlay, 6000);

  // Re-render the Priority Board periodically while it's open so the
  // deadline-warning state (approaching the 5-5:30pm end-of-day cutoff)
  // updates live even with no new Firestore writes.
  setInterval(() => {
    if (state.currentView === 'priority-board') renderPriorityBoard();
  }, 30000);

  const dashboardPriorityBadge = document.getElementById('dashboard-priority-board-badge');
  if (dashboardPriorityBadge) {
    dashboardPriorityBadge.addEventListener('click', () => {
      if (canCurrentUserAccessPriorityBoard()) switchView('priority-board');
    });
  }
}

// Hides the initial-load overlay once real data is in. Guarded so it only
// ever runs once (repeated onSnapshot events shouldn't re-trigger it).
let appLoadingOverlayHidden = false;
function hideAppLoadingOverlay() {
  if (appLoadingOverlayHidden) return;
  appLoadingOverlayHidden = true;
  const overlay = document.getElementById('app-loading-overlay');
  if (overlay) overlay.classList.add('is-hidden');
}

// Swaps a button's contents for the small "loading boxes" animation and
// disables it, for actions with a real perceivable delay (CSV import,
// sign-in) where nothing else on screen changes until the work finishes.
// Call setButtonLoading(btn, false) in a finally block to restore it.
function setButtonLoading(btn, isLoading, loadingLabel = 'Working…') {
  if (!btn) return;
  if (isLoading) {
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="loading-boxes loading-boxes-sm"><span></span><span></span><span></span></span> ${loadingLabel}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalHtml) {
      btn.innerHTML = btn.dataset.originalHtml;
      delete btn.dataset.originalHtml;
    }
  }
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

  // Toggle Priority Board link in sidebar (Restricted to canAccessPriorityBoard accounts)
  const priorityBoardLink = document.getElementById('nav-priority-board-link');
  if (priorityBoardLink) {
    const canSeeBoard = currentUser && person && person.canAccessPriorityBoard;
    if (canSeeBoard) {
      priorityBoardLink.style.display = 'flex';
    } else {
      priorityBoardLink.style.display = 'none';
      if (state.currentView === 'priority-board') {
        switchView('dashboard');
      }
    }
  }

  // Toggle Employee Database link in sidebar (HR / admins only)
  const employeeDbLink = document.getElementById('nav-employee-db-link');
  if (employeeDbLink) {
    if (currentUser && canCurrentUserAccessEmployeeDb()) {
      employeeDbLink.style.display = 'flex';
    } else {
      employeeDbLink.style.display = 'none';
      if (state.currentView === 'employee-database') {
        switchView('dashboard');
      }
    }
  }

  // Toggle Onboarding link in sidebar (HR access, the Onboarding flag, or admin)
  const onboardingLink = document.getElementById('nav-onboarding-link');
  if (onboardingLink) {
    if (currentUser && canCurrentUserAccessOnboarding()) {
      onboardingLink.style.display = 'flex';
    } else {
      onboardingLink.style.display = 'none';
      if (state.currentView === 'onboarding') {
        switchView('dashboard');
      }
    }
  }

  // Toggle Leave link in sidebar (explicit Leave flag, or admin)
  const leaveLink = document.getElementById('nav-leave-link');
  if (leaveLink) {
    if (currentUser && canCurrentUserAccessLeave()) {
      leaveLink.style.display = 'flex';
    } else {
      leaveLink.style.display = 'none';
      if (state.currentView === 'leave') {
        switchView('dashboard');
      }
    }
  }

  // Board-only accounts (Orthee): restrict the sidebar (and any current view)
  // to just the Priority Board plus People & Roles — they don't get Task
  // Tracker, Idea Board, Analytics, Calendar, Content Links, etc.
  const boardOnly = currentUser && isCurrentUserBoardOnly();
  // Items already gated individually above (logs/kanban) keep whatever those
  // gates decided; People & Roles stays visible for board-only accounts too.
  const individuallyGatedIds = ['nav-logs-link', 'nav-kanban-link', 'nav-priority-board-link', 'nav-employee-db-link', 'nav-onboarding-link', 'nav-leave-link'];
  document.querySelectorAll('.nav-item').forEach(item => {
    if (individuallyGatedIds.includes(item.id)) return;
    if (boardOnly && item.getAttribute('data-view') === 'team') {
      item.style.display = 'flex';
      return;
    }
    // Board-only accounts still get the Idea Board if they've been marked
    // an Ideator (canPlanContent) — that permission should always come with
    // visibility into the view it grants editing access to.
    if (boardOnly && item.getAttribute('data-view') === 'idea-board' && person && person.canPlanContent) {
      item.style.display = 'flex';
      return;
    }
    item.style.display = boardOnly ? 'none' : 'flex';
  });
  const boardOnlyCanViewIdeaBoard = person && person.canPlanContent;
  if (boardOnly && state.currentView !== 'priority-board' && state.currentView !== 'team' && !(boardOnlyCanViewIdeaBoard && state.currentView === 'idea-board')) {
    switchView('priority-board');
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
    
    document.getElementById('btn-logout').addEventListener('click', async () => {
      localStorage.removeItem('hc_logged_in_user');
      try { if (supabase) await supabase.auth.signOut(); } catch (err) { console.warn('Supabase signOut failed:', err); }
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
            t.taskType = 'general';
            setDoc(doc(db, "tasks", docSnap.id), t).catch(() => {});
          }

          // One-time migration: the old flat `isPosted: boolean` field can't
          // represent "posted on the sub-brand page but not yet the Tahams
          // parent page", so it's replaced with a per-page `posted` object.
          // Sub-brand tasks that were already isPosted: true are assumed to
          // have been posted on both pages (nothing before this migration
          // could distinguish the two); everything else just carries its old
          // true/false forward under the page key(s) it actually needs.
          if (!t.posted || typeof t.posted !== 'object') {
            const wasPosted = !!t.isPosted;
            t.posted = taskIsSubBrandBucket(t)
              ? { sub: wasPosted, parent: wasPosted }
              : { main: wasPosted };
            delete t.isPosted;
            setDoc(doc(db, "tasks", docSnap.id), t).catch(() => {});
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
      updatePublishingQueueBadge();
      hideAppLoadingOverlay();
    }, (error) => {
      console.error("Firestore tasks sync error:", error);
      state.tasks = [...DEFAULT_TASKS];
      updateModalDropdowns();
      refreshViews();
      hideAppLoadingOverlay();
    });
  } catch(err) {
    console.warn("Firestore tasks listener skipped:", err);
    hideAppLoadingOverlay();
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

          // One-time rollout of the Priority Board permission fields onto
          // already-seeded Firestore docs (mirrors the `taskType` backfill
          // above). Only ever fills in fields the stored doc doesn't have an
          // explicit value for yet — never clobbers an admin's later edits —
          // except the canLogin flips this feature deliberately makes from
          // false to true: Orthee (person-6) and Tohfa Apu (person-2), so
          // they can sign in to the board.
          if (defaultMatch) {
            const patch = {};
            if (data.canAccessPriorityBoard === undefined && defaultMatch.canAccessPriorityBoard) patch.canAccessPriorityBoard = true;
            if (data.canManagePriorityNotes === undefined && defaultMatch.canManagePriorityNotes) patch.canManagePriorityNotes = true;
            if ((defaultMatch.id === 'person-6' || defaultMatch.id === 'person-2') && !data.canLogin && defaultMatch.canLogin) patch.canLogin = true;
            if (data.authEmail === undefined && defaultMatch.authEmail) patch.authEmail = defaultMatch.authEmail;
            // Recover flags/aliases that older person-edits (pre-merge-fix) could
            // have wiped. Only fills values the stored doc has no opinion on —
            // never overrides an explicit true/false an admin set.
            if (data.canMarkPosted === undefined && defaultMatch.canMarkPosted) patch.canMarkPosted = true;
            if (data.isDesigner === undefined && defaultMatch.isDesigner) patch.isDesigner = true;
            if (data.isAssigner === undefined && defaultMatch.isAssigner) patch.isAssigner = true;
            if (data.canPlanContent === undefined && defaultMatch.canPlanContent) patch.canPlanContent = true;
            if ((!Array.isArray(data.aliases) || data.aliases.length === 0) && Array.isArray(defaultMatch.aliases) && defaultMatch.aliases.length) patch.aliases = defaultMatch.aliases.slice();
            if (Object.keys(patch).length > 0) {
              Object.assign(data, patch);
              setDoc(doc(db, "team", docSnap.id), data).catch(() => {});
            }
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
      populateLoginOptions();
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

  // Sync Idea Board (Content Planning) entries from Firestore in real-time.
  // No DEFAULT seed here — an empty board is a perfectly normal state, unlike
  // tasks/team/posts which ship with starter data.
  try {
    onSnapshot(collection(db, "content_ideas"), (querySnapshot) => {
      const loadedIdeas = [];
      querySnapshot.forEach((docSnap) => {
        loadedIdeas.push(docSnap.data());
      });
      state.contentIdeas = loadedIdeas.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      renderIdeaBoard();
    }, (error) => {
      console.error("Firestore content_ideas sync error:", error);
      state.contentIdeas = state.contentIdeas || [];
      renderIdeaBoard();
    });
  } catch(err) {
    console.warn("Firestore content_ideas listener skipped:", err);
  }

  // Sync Priority Board notes from Firestore in real-time.
  // No DEFAULT seed here — an empty board is a normal state.
  try {
    onSnapshot(collection(db, "priority_notes"), (querySnapshot) => {
      const loadedNotes = [];
      querySnapshot.forEach((docSnap) => {
        loadedNotes.push(docSnap.data());
      });
      state.priorityNotes = loadedNotes.sort((a, b) => (a.postedAt || '').localeCompare(b.postedAt || ''));
      updatePriorityBoardBadge();
      if (state.currentView === 'priority-board') renderPriorityBoard();
      if (state.viewingPriorityNoteId) {
        const viewedNote = state.priorityNotes.find(n => n.id === state.viewingPriorityNoteId);
        if (viewedNote) renderPriorityNoteComments(viewedNote);
      }
    }, (error) => {
      console.error("Firestore priority_notes sync error:", error);
      state.priorityNotes = state.priorityNotes || [];
      if (state.currentView === 'priority-board') renderPriorityBoard();
    });
  } catch(err) {
    console.warn("Firestore priority_notes listener skipped:", err);
  }

  // Sync the Priority Board's own scoped activity log (separate from the
  // global Activity Log — see logPriorityBoardActivity()).
  try {
    onSnapshot(collection(db, "priority_board_log"), (querySnapshot) => {
      const loadedLogs = [];
      querySnapshot.forEach((docSnap) => {
        loadedLogs.push(docSnap.data());
      });
      state.priorityBoardLog = loadedLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      if (state.priorityBoardLog.length > 200) {
        state.priorityBoardLog = state.priorityBoardLog.slice(0, 200);
      }
      if (state.currentView === 'priority-board') renderPriorityBoard();
    }, (error) => {
      console.error("Firestore priority_board_log sync error:", error);
    });
  } catch(err) {
    console.warn("Firestore priority_board_log listener skipped:", err);
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
      // Bug fix: the System Log Report table only rendered once, at the moment
      // switchView('logs') ran. If that happened before this Firestore snapshot
      // arrived (e.g. right after a page refresh), it showed "No logs found"
      // forever until you navigated away and back. Re-render it here too so it
      // updates live once real data comes in.
      if (state.currentView === 'logs') renderLogs();
    }, (error) => {
      console.error("Firestore activity_log sync error:", error);
    });
  } catch(err) {
    console.warn("Firestore activity_log listener skipped:", err);
  }

  // Sync the Employee Database (HR directory) in real-time. Completely
  // separate table from `team` — no seed data, an empty directory is normal.
  try {
    onSnapshot(collection(db, "employee_records"), (querySnapshot) => {
      const loaded = [];
      querySnapshot.forEach((docSnap) => { loaded.push(docSnap.data()); });
      // Guard against a stale realtime frame reverting onboarding checkboxes
      // that were just toggled locally but whose write hasn't round-tripped.
      loaded.forEach(r => {
        if (_onbDirtyIds.has(r.id)) {
          const local = (state.employeeRecords || []).find(x => x.id === r.id);
          if (local && local.deliverables) r.deliverables = local.deliverables;
        }
      });
      state.employeeRecords = loaded;
      if (state.currentView === 'employee-database') renderEmployeeDatabase();
      if (state.currentView === 'onboarding') renderOnboarding();
      if (state.currentView === 'leave') renderLeave();
      updateOnboardingBadge();
      updateLeaveBadge();
      if (state.viewingEmployeeId) {
        const rec = state.employeeRecords.find(r => r.id === state.viewingEmployeeId);
        if (rec) renderEmployeeDetail(rec);
      }
      if (state.viewingOnboardingId) {
        const rec = state.employeeRecords.find(r => r.id === state.viewingOnboardingId);
        if (rec) renderOnboardingDetail(rec);
      }
    }, (error) => {
      console.error("Supabase employee_records sync error:", error);
      state.employeeRecords = state.employeeRecords || [];
      if (state.currentView === 'employee-database') renderEmployeeDatabase();
      if (state.currentView === 'onboarding') renderOnboarding();
    });
  } catch(err) {
    console.warn("Supabase employee_records listener skipped:", err);
  }

  // Employee Database's own scoped change log (separate from the global
  // Activity Log so PII edits stay inside the HR view).
  try {
    onSnapshot(collection(db, "employee_db_log"), (querySnapshot) => {
      const loaded = [];
      querySnapshot.forEach((docSnap) => { loaded.push(docSnap.data()); });
      state.employeeDbLog = loaded.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      if (state.employeeDbLog.length > 200) state.employeeDbLog = state.employeeDbLog.slice(0, 200);
      if (state.currentView === 'employee-database') renderEmployeeDatabase();
    }, (error) => {
      console.error("Supabase employee_db_log sync error:", error);
    });
  } catch(err) {
    console.warn("Supabase employee_db_log listener skipped:", err);
  }

  // Leave Management. Four small collections, all authenticated-read only.
  // An empty set is the normal starting state — there is no seed data.
  try {
    onSnapshot(collection(db, "leave_records"), (querySnapshot) => {
      const loaded = [];
      querySnapshot.forEach((docSnap) => { loaded.push(docSnap.data()); });
      state.leaveRecords = lvApplyLocalOverlay(loaded.map(lvNormalizeRecord));
      state.leaveStorageMissing = false;
      if (state.currentView === 'leave') renderLeave();
      updateLeaveBadge();
    }, (error) => {
      console.error("Supabase leave_records sync error:", error);
      noteLeaveStorageError(error);
      state.leaveRecords = state.leaveRecords || [];
      if (state.currentView === 'leave') renderLeave();
    });
  } catch(err) {
    console.warn("Supabase leave_records listener skipped:", err);
  }

  try {
    onSnapshot(collection(db, "leave_holidays"), (querySnapshot) => {
      const loaded = [];
      querySnapshot.forEach((docSnap) => { loaded.push(docSnap.data()); });
      state.leaveHolidays = loaded;
      if (state.currentView === 'leave') renderLeave();
      updateLeaveBadge();
    }, (error) => {
      console.error("Supabase leave_holidays sync error:", error);
      noteLeaveStorageError(error);
    });
  } catch(err) {
    console.warn("Supabase leave_holidays listener skipped:", err);
  }

  try {
    onSnapshot(collection(db, "leave_policy"), (querySnapshot) => {
      const loaded = [];
      querySnapshot.forEach((docSnap) => { loaded.push(docSnap.data()); });
      state.leavePolicies = loaded;
      if (state.currentView === 'leave') renderLeave();
    }, (error) => {
      console.error("Supabase leave_policy sync error:", error);
      noteLeaveStorageError(error);
    });
  } catch(err) {
    console.warn("Supabase leave_policy listener skipped:", err);
  }

  try {
    onSnapshot(collection(db, "leave_log"), (querySnapshot) => {
      const loaded = [];
      querySnapshot.forEach((docSnap) => { loaded.push(docSnap.data()); });
      const byId = new Map(loaded.map(l => [l.id, l]));
      (state.leaveLog || []).forEach(l => { if (!byId.has(l.id)) byId.set(l.id, l); });
      state.leaveLog = Array.from(byId.values())
        .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
      if (state.leaveLog.length > 200) state.leaveLog = state.leaveLog.slice(0, 200);
      if (state.currentView === 'leave') renderLeaveLog();
    }, (error) => {
      console.error("Supabase leave_log sync error:", error);
      noteLeaveStorageError(error);
    });
  } catch(err) {
    console.warn("Supabase leave_log listener skipped:", err);
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

// Scoped history log for the Priority Board only — a separate collection
// from the global Activity Log so the creative team can review Priority
// Board history (notes created/edited/deleted/handled, comments) without
// wading through unrelated app activity. Mirrors logActivity()'s shape.
async function logPriorityBoardActivity(actionText, dbInstance) {
  const currentUser = localStorage.getItem('hc_logged_in_user') || 'System';
  const logEntry = {
    id: `pb-log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user: currentUser,
    actionText: actionText,
    timestamp: new Date().toISOString()
  };
  try {
    const targetDb = dbInstance || db;
    await setDoc(doc(targetDb, "priority_board_log", logEntry.id), logEntry);
  } catch (err) {
    console.error("Failed to write to priority board log:", err);
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
    await logActivity(`commented on task "${task.name}": "${text}"`, targetDb);
  } catch (err) {
    console.error("Failed to add task comment:", err);
  }
}

function renderActivityLog() {
  const container = document.getElementById('activity-log-list');
  if (!container) return;

  const pendingPublishing = (state.tasks || []).filter(t => t.taskType === 'post' && t.status === 'Finished' && !isTaskFullyPosted(t));

  let publishingHtml = '';
  if (pendingPublishing.length > 0) {
    publishingHtml = `
      <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px;">
        <div style="font-weight: 700; color: var(--honey-gold); margin-bottom: 12px; font-size: 0.9rem;">
          🚀 Pending Posts to Publish (${pendingPublishing.length})
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${pendingPublishing.map(task => {
            const postInfo = '';
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
  
  const pendingPublishing = (state.tasks || []).filter(t => t.taskType === 'post' && t.status === 'Finished' && !isTaskFullyPosted(t));
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

  // CSV import is a bulk task write, so it sits behind the same gate as the
  // New Task button (which is hidden alongside the Import button anyway).
  if (!canCurrentUserManageTasks()) {
    showToast('Access Denied: Only Creatives and Assigners can import tasks', 'error');
    e.target.value = '';
    return;
  }
  const importBtn = document.getElementById('csv-import-btn');
  setButtonLoading(importBtn, true, 'Importing…');
  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const text = evt.target.result;
      const lines = text.split('\n');
      let importedCount = 0;

      // One authoritative read of the live ids; createSequentialDoc consumes
      // and extends this set per row (INSERT, so a collision can't overwrite
      // an existing task).
      const existingIds = await fetchExistingIds('tasks');

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

        await createSequentialDoc('tasks', 'T-', 2, (id) => ({
          id, name, designer, assignedBy, date, time, urgency,
          status, deliveryLink, comments, taskType: jobType
        }), existingIds);
        importedCount++;
      }
      
      showToast(`Successfully imported ${importedCount} tasks from CSV!`, 'success');
      await logActivity(`imported ${importedCount} tasks from CSV`, db);
    } catch (err) {
      console.error(err);
      showToast('Failed to parse CSV file', 'error');
    } finally {
      setButtonLoading(importBtn, false);
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

  const taskBrandFilter = document.getElementById('task-brand-filter');
  if (taskBrandFilter) {
    taskBrandFilter.addEventListener('change', (e) => {
      state.taskBrandFilter = e.target.value;
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
      closeMobileSidebar();
    });
  });

  // Mobile sidebar toggle (hamburger + backdrop + close button)
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeMobileSidebar);

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

  // --- Idea Board (Content Planning) wiring ---
  const ideaNewBtn = document.getElementById('idea-new-btn');
  if (ideaNewBtn) {
    ideaNewBtn.addEventListener('click', () => openIdeaModal());
  }

  const ideaForm = document.getElementById('idea-form');
  if (ideaForm) {
    ideaForm.addEventListener('submit', handleIdeaFormSubmit);
  }

  const deleteIdeaBtn = document.getElementById('idea-modal-delete-btn');
  if (deleteIdeaBtn) {
    deleteIdeaBtn.addEventListener('click', deleteIdea);
  }

  const closeIdeaBtn = document.getElementById('idea-modal-close-btn');
  if (closeIdeaBtn) {
    closeIdeaBtn.addEventListener('click', closeIdeaModal);
  }

  const cancelIdeaBtn = document.getElementById('idea-modal-cancel-btn');
  if (cancelIdeaBtn) {
    cancelIdeaBtn.addEventListener('click', closeIdeaModal);
  }

  const addIdeaLinkBtn = document.getElementById('idea-form-add-link-btn');
  if (addIdeaLinkBtn) {
    addIdeaLinkBtn.addEventListener('click', () => addIdeaLinkRow(''));
  }

  const ideaSearchInput = document.getElementById('idea-search-input');
  if (ideaSearchInput) {
    ideaSearchInput.addEventListener('input', (e) => {
      state.ideaSearchFilter = e.target.value;
      renderIdeaBoard();
    });
  }

  const ideaStatusFilter = document.getElementById('idea-status-filter');
  if (ideaStatusFilter) {
    ideaStatusFilter.addEventListener('change', (e) => {
      state.ideaStatusFilter = e.target.value;
      renderIdeaBoard();
    });
  }

  // --- Priority Board wiring ---
  const priorityNoteNewBtn = document.getElementById('priority-note-new-btn');
  if (priorityNoteNewBtn) {
    priorityNoteNewBtn.addEventListener('click', () => openPriorityNoteModal());
  }

  const priorityNoteForm = document.getElementById('priority-note-form');
  if (priorityNoteForm) {
    priorityNoteForm.addEventListener('submit', handlePriorityNoteFormSubmit);
  }

  const deletePriorityNoteBtn = document.getElementById('priority-note-modal-delete-btn');
  if (deletePriorityNoteBtn) {
    deletePriorityNoteBtn.addEventListener('click', deletePriorityNote);
  }

  const closePriorityNoteBtn = document.getElementById('priority-note-modal-close-btn');
  if (closePriorityNoteBtn) {
    closePriorityNoteBtn.addEventListener('click', closePriorityNoteModal);
  }

  const cancelPriorityNoteBtn = document.getElementById('priority-note-modal-cancel-btn');
  if (cancelPriorityNoteBtn) {
    cancelPriorityNoteBtn.addEventListener('click', closePriorityNoteModal);
  }

  const closePriorityNoteDetailBtn = document.getElementById('priority-note-detail-close-btn');
  if (closePriorityNoteDetailBtn) {
    closePriorityNoteDetailBtn.addEventListener('click', closePriorityNoteDetailModal);
  }

  const priorityNoteCommentSubmitBtn = document.getElementById('priority-note-comment-submit-btn');
  if (priorityNoteCommentSubmitBtn) {
    priorityNoteCommentSubmitBtn.addEventListener('click', submitPriorityNoteComment);
  }

  const priorityNoteCommentInput = document.getElementById('priority-note-comment-input');
  if (priorityNoteCommentInput) {
    priorityNoteCommentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitPriorityNoteComment();
      }
    });
  }

  const priorityBoardDateFilter = document.getElementById('priority-board-date-filter');
  if (priorityBoardDateFilter) {
    priorityBoardDateFilter.addEventListener('change', (e) => {
      state.priorityBoardDateFilter = e.target.value;
      renderPriorityBoard();
    });
  }

  const priorityBoardTodayBtn = document.getElementById('priority-board-today-btn');
  if (priorityBoardTodayBtn) {
    priorityBoardTodayBtn.addEventListener('click', () => {
      state.priorityBoardDateFilter = '';
      const filterInput = document.getElementById('priority-board-date-filter');
      if (filterInput) filterInput.value = '';
      renderPriorityBoard();
    });
  }

  const priorityBoardLogToggleBtn = document.getElementById('priority-board-log-toggle-btn');
  if (priorityBoardLogToggleBtn) {
    priorityBoardLogToggleBtn.addEventListener('click', () => {
      const panel = document.getElementById('priority-board-log-panel');
      if (!panel) return;
      const showing = panel.style.display !== 'none';
      panel.style.display = showing ? 'none' : 'block';
      priorityBoardLogToggleBtn.textContent = showing ? 'View History Log' : 'Hide History Log';
      if (!showing) renderPriorityBoardLog();
    });
  }

  setupEmployeeDatabaseControls();
  setupOnboardingControls();
  setupLeaveControls();
}

// ==========================================================================
// Employee Database (HR directory)
//
// Completely self-contained: its own Supabase tables (employee_records,
// employee_db_log), its own state keys, its own modals. It never reads from
// or writes to state.team / the roster. Visibility is gated by the
// canAccessEmployeeDb flag (or admin) — see canCurrentUserAccessEmployeeDb().
// ==========================================================================

function empVal(v) { return (v == null ? '' : String(v)).trim(); }

// Employee record fields that hold a date. Stored internally as ISO
// (yyyy-mm-dd) so the table sorts chronologically, but shown and entered
// as dd-mm-yyyy everywhere in the UI.
const EMPLOYEE_DATE_FIELDS = ['dob', 'joinDate'];

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LOOKUP = (() => {
  const map = {};
  ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
    .forEach((name, i) => { map[name] = i + 1; map[name.slice(0, 3)] = i + 1; });
  return map;
})();

// Any stored date form -> "07 Apr 1995" for read-only display. Legacy
// records hold assorted strings ("2/9/2007", "15-05-2001", …) so coerce
// through toIsoDate first (day-first). Passes through anything unparseable.
function toDisplayDate(v) {
  const s = empVal(v);
  if (!s) return s;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : toIsoDate(s);
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const p = iso.split('-');
    return `${p[2]} ${MONTH_ABBR[+p[1] - 1] || p[1]} ${p[0]}`;
  }
  return s;
}

// ISO -> dd-mm-yyyy for pre-filling the numeric form field.
function toInputDate(v) {
  const s = empVal(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

// Any of: dd-mm-yyyy, dd/mm/yyyy, "07 Apr 1995", "7 April 1995", or ISO
// -> ISO yyyy-mm-dd for storage. Returns '' for blank; null if it looks
// like a date but day/month are out of range or unparseable.
function toIsoDate(v) {
  const s = empVal(v);
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  let d, mo, y;
  let m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else {
    m = s.match(/^(\d{1,2})[-/\s]+([A-Za-z]+)[-/\s]+(\d{4})$/);
    if (!m) return null;
    d = +m[1]; mo = MONTH_LOOKUP[m[2].toLowerCase()]; y = +m[3];
  }
  if (!mo || d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Draft parsed from an import, awaiting the user pressing "Import".
let employeeImportDraft = null;

// One-time self-heal: legacy imported records stored dates as raw strings
// ("2/9/2007", "15-05-2001", …). Rewrite any non-ISO dob/joinDate to ISO
// (day-first) so display and column sorting are consistent. Runs once per
// session, only writing rows that actually change.
let _employeeDatesNormalized = false;
async function normalizeEmployeeDates() {
  if (_employeeDatesNormalized || !db) return;
  _employeeDatesNormalized = true;
  for (const rec of (state.employeeRecords || [])) {
    let changed = false;
    const patch = { ...rec };
    for (const key of EMPLOYEE_DATE_FIELDS) {
      const cur = empVal(rec[key]);
      if (!cur || /^\d{4}-\d{2}-\d{2}$/.test(cur)) continue;
      const iso = toIsoDate(cur);
      if (iso && iso !== cur) { patch[key] = iso; changed = true; }
    }
    if (changed) {
      try { await setDoc(doc(db, "employee_records", rec.id), patch); }
      catch (e) { console.warn('employee date normalize failed for', rec.id, e); }
    }
  }
}

function setupEmployeeDatabaseControls() {
  const q = (id) => document.getElementById(id);

  q('employee-db-new-btn')?.addEventListener('click', () => openEmployeeModal());
  q('employee-form')?.addEventListener('submit', handleEmployeeFormSubmit);

  // Date fields: a read-only text box shows "07 Apr 1995"; the transparent
  // native <input type=date> layered over it provides the calendar popup.
  EMPLOYEE_DATE_FIELDS.forEach(key => {
    const native = q('emp-form-' + key);
    const display = q('emp-form-' + key + '-display');
    if (!native || !display) return;
    native.addEventListener('change', () => {
      display.value = native.value ? toDisplayDate(native.value) : '';
    });
    const openPicker = () => { try { native.showPicker(); } catch (e) { native.focus(); } };
    const wrapper = native.closest('.date-field') || display;
    wrapper.addEventListener('click', openPicker);
    display.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
    });
  });

  q('employee-modal-close-btn')?.addEventListener('click', closeEmployeeModal);
  q('employee-modal-cancel-btn')?.addEventListener('click', closeEmployeeModal);
  q('employee-modal-delete-btn')?.addEventListener('click', deleteEmployeeRecord);

  q('employee-detail-modal-close-btn')?.addEventListener('click', closeEmployeeDetailModal);
  q('employee-detail-modal-cancel-btn')?.addEventListener('click', closeEmployeeDetailModal);
  q('employee-detail-edit-btn')?.addEventListener('click', () => {
    const id = state.viewingEmployeeId;
    closeEmployeeDetailModal();
    if (id) openEmployeeModal(id);
  });

  q('employee-db-export-btn')?.addEventListener('click', exportEmployeeCsv);
  q('employee-db-import-btn')?.addEventListener('click', openEmployeeImportModal);
  q('employee-import-modal-close-btn')?.addEventListener('click', closeEmployeeImportModal);
  q('employee-import-modal-cancel-btn')?.addEventListener('click', closeEmployeeImportModal);
  q('emp-import-url-btn')?.addEventListener('click', () => {
    const url = empVal(q('emp-import-url').value);
    if (!url) { showToast('Paste a published Google Sheet CSV URL first', 'error'); return; }
    fetch(url).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(text => prepareEmployeeImport(text)).catch(err => {
      console.error(err);
      showToast('Could not fetch that URL — make sure the sheet is published to the web as CSV', 'error');
    });
  });
  q('emp-import-file')?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => prepareEmployeeImport(String(reader.result));
    reader.readAsText(file);
  });
  q('emp-import-text')?.addEventListener('input', (e) => prepareEmployeeImport(e.target.value, true));
  q('emp-import-commit-btn')?.addEventListener('click', commitEmployeeImport);

  q('employee-db-log-toggle-btn')?.addEventListener('click', () => {
    const panel = q('employee-db-log-panel');
    if (!panel) return;
    const showing = panel.style.display !== 'none';
    panel.style.display = showing ? 'none' : 'block';
    q('employee-db-log-toggle-btn').textContent = showing ? 'View Change Log' : 'Hide Change Log';
    if (!showing) renderEmployeeDbLog();
  });

  const searchInput = q('employee-db-search-input');
  if (searchInput) searchInput.addEventListener('input', (e) => {
    state.employeeSearchFilter = e.target.value.toLowerCase();
    renderEmployeeDatabase();
  });
  const filterMap = {
    'employee-db-designation-filter': 'employeeDesignationFilter',
    'employee-db-department-filter': 'employeeDepartmentFilter',
    'employee-db-office-filter': 'employeeOfficeFilter',
    'employee-db-blood-filter': 'employeeBloodGroupFilter',
    'employee-db-status-filter': 'employeeStatusFilter'
  };
  Object.entries(filterMap).forEach(([elId, stateKey]) => {
    q(elId)?.addEventListener('change', (e) => {
      state[stateKey] = e.target.value;
      renderEmployeeDatabase();
    });
  });

  document.querySelectorAll('#employee-database-view th.sortable-th').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (state.employeeSortCol === col) {
        state.employeeSortDir = state.employeeSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.employeeSortCol = col;
        state.employeeSortDir = 'asc';
      }
      renderEmployeeDatabase();
    });
  });
}

function getFilteredEmployeeRecords() {
  let rows = [...(state.employeeRecords || [])];
  const s = state.employeeSearchFilter;
  if (s) {
    rows = rows.filter(r =>
      ['employeeId', 'fullName', 'phone', 'workEmail', 'personalEmail', 'nationalId', 'designation', 'department']
        .some(k => empVal(r[k]).toLowerCase().includes(s))
    );
  }
  const eq = (a, b) => empVal(a).toLowerCase() === empVal(b).toLowerCase();
  if (state.employeeDesignationFilter !== 'all') rows = rows.filter(r => eq(r.designation, state.employeeDesignationFilter));
  if (state.employeeDepartmentFilter !== 'all') rows = rows.filter(r => eq(r.department, state.employeeDepartmentFilter));
  if (state.employeeOfficeFilter !== 'all') rows = rows.filter(r => eq(r.officeSpace, state.employeeOfficeFilter));
  if (state.employeeBloodGroupFilter !== 'all') rows = rows.filter(r => eq(r.bloodGroup, state.employeeBloodGroupFilter));
  if (state.employeeStatusFilter !== 'all') rows = rows.filter(r => eq(r.status, state.employeeStatusFilter));

  const col = state.employeeSortCol || 'fullName';
  const dir = state.employeeSortDir === 'desc' ? -1 : 1;
  rows.sort((a, b) => empVal(a[col]).localeCompare(empVal(b[col]), undefined, { numeric: true, sensitivity: 'base' }) * dir);
  return rows;
}

function populateEmployeeFilterDropdowns() {
  const recs = state.employeeRecords || [];
  const fill = (elId, values, current) => {
    const el = document.getElementById(elId);
    if (!el) return;
    const first = el.querySelector('option');
    el.innerHTML = '';
    if (first) el.appendChild(first);
    values.forEach(v => {
      const o = document.createElement('option');
      o.value = v; o.textContent = v;
      if (empVal(current) === v) o.selected = true;
      el.appendChild(o);
    });
  };
  const uniq = (key) => [...new Set(recs.map(r => empVal(r[key])).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  fill('employee-db-designation-filter', uniq('designation'), state.employeeDesignationFilter);
  fill('employee-db-department-filter', uniq('department'), state.employeeDepartmentFilter);
  fill('employee-db-office-filter', DEFAULT_OFFICE_SPACES.slice(), state.employeeOfficeFilter);
  fill('employee-db-blood-filter', BLOOD_GROUPS.slice(), state.employeeBloodGroupFilter);
}

function renderEmployeeDatabase() {
  const tbody = document.getElementById('employee-db-list-body');
  if (!tbody) return;

  const canView = canCurrentUserAccessEmployeeDb();
  const toolbar = ['employee-db-new-btn', 'employee-db-import-btn', 'employee-db-export-btn'];
  toolbar.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = canView ? 'inline-flex' : 'none'; });
  if (!canView) { tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding:32px; color:#64748b;">Access denied.</td></tr>'; return; }

  if ((state.employeeRecords || []).length) normalizeEmployeeDates();

  populateEmployeeFilterDropdowns();
  const rows = getFilteredEmployeeRecords();
  const totalEl = document.getElementById('employee-db-total-count');
  if (totalEl) totalEl.textContent = String((state.employeeRecords || []).length);

  document.querySelectorAll('#employee-database-view th.sortable-th').forEach(th => {
    const icon = th.querySelector('.sort-icon');
    if (!icon) return;
    icon.textContent = th.getAttribute('data-sort') === state.employeeSortCol
      ? (state.employeeSortDir === 'asc' ? '↑' : '↓') : '↕';
  });

  if (!rows.length) {
    const empty = (state.employeeRecords || []).length === 0
      ? 'No employees yet. Use "+ Add Employee" or "Import".'
      : 'No employees match the current filters.';
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:32px; color:#64748b;">${empty}</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const cv = empVal(r.cvLink)
      ? `<a href="${escapeHtml(r.cvLink)}" target="_blank" rel="noopener" style="color:#60a5fa;">Open CV</a>`
      : '<span style="color:#475569;">—</span>';
    const statusColor = empVal(r.status) === 'Inactive' ? '#f87171' : '#4ade80';
    return `<tr data-emp-id="${escapeHtml(r.id)}" style="cursor:pointer;">
      <td>${escapeHtml(r.employeeId)}</td>
      <td style="font-weight:600; color:#fff;">${escapeHtml(r.fullName)}</td>
      <td>${escapeHtml(r.designation)}</td>
      <td>${escapeHtml(r.department)}</td>
      <td>${escapeHtml(r.officeSpace)}</td>
      <td>${escapeHtml(r.phone)}</td>
      <td>${escapeHtml(r.workEmail)}</td>
      <td>${escapeHtml(toDisplayDate(r.dob))}</td>
      <td>${escapeHtml(r.bloodGroup)}</td>
      <td>${escapeHtml(toDisplayDate(r.joinDate))}</td>
      <td style="color:${statusColor}; font-weight:600;">${escapeHtml(r.status)}</td>
      <td>${cv}</td>
      <td class="emp-actions-cell">
        <button class="btn-secondary emp-edit-btn" data-emp-id="${escapeHtml(r.id)}">Edit</button>
        <button class="btn-secondary emp-delete-btn" data-emp-id="${escapeHtml(r.id)}" style="color:var(--status-critical);">Delete</button>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('tr[data-emp-id]').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      openEmployeeDetailModal(tr.getAttribute('data-emp-id'));
    });
  });
  tbody.querySelectorAll('.emp-edit-btn').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation(); openEmployeeModal(b.getAttribute('data-emp-id'));
  }));
  tbody.querySelectorAll('.emp-delete-btn').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation(); deleteEmployeeRecordById(b.getAttribute('data-emp-id'));
  }));

  if (document.getElementById('employee-db-log-panel')?.style.display === 'block') renderEmployeeDbLog();
}

function openEmployeeModal(recordId = null) {
  if (!canCurrentUserAccessEmployeeDb()) { showToast('Access denied', 'error'); return; }
  const modal = document.getElementById('employee-modal');
  const form = document.getElementById('employee-form');
  if (!modal || !form) return;
  form.reset();
  EMPLOYEE_DATE_FIELDS.forEach(key => {
    const disp = document.getElementById('emp-form-' + key + '-display');
    if (disp) disp.value = '';
  });
  state.editingEmployeeId = recordId;

  const officeSel = document.getElementById('emp-form-officeSpace');
  officeSel.innerHTML = '<option value="">Select…</option>' + DEFAULT_OFFICE_SPACES.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
  const bloodSel = document.getElementById('emp-form-bloodGroup');
  bloodSel.innerHTML = '<option value="">Select…</option>' + BLOOD_GROUPS.map(o => `<option value="${o}">${o}</option>`).join('');

  const deleteBtn = document.getElementById('employee-modal-delete-btn');
  const title = document.getElementById('employee-modal-title');

  if (recordId) {
    const rec = (state.employeeRecords || []).find(r => r.id === recordId);
    if (!rec) { showToast('Record not found', 'error'); return; }
    title.textContent = 'Edit Employee';
    if (deleteBtn) deleteBtn.style.display = 'block';
    EMPLOYEE_FIELD_DEFS.forEach(({ key }) => {
      const el = document.getElementById('emp-form-' + key);
      if (!el) return;
      if (EMPLOYEE_DATE_FIELDS.includes(key)) {
        const iso = toIsoDate(rec[key]);
        el.value = (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) ? iso : '';
        const disp = document.getElementById('emp-form-' + key + '-display');
        if (disp) disp.value = el.value ? toDisplayDate(el.value) : '';
      } else {
        el.value = empVal(rec[key]);
      }
    });
  } else {
    title.textContent = 'Add Employee';
    if (deleteBtn) deleteBtn.style.display = 'none';
  }
  modal.classList.add('active');
}

function closeEmployeeModal() {
  document.getElementById('employee-modal')?.classList.remove('active');
  state.editingEmployeeId = null;
}

async function handleEmployeeFormSubmit(e) {
  e.preventDefault();
  if (!canCurrentUserAccessEmployeeDb()) { showToast('Access denied', 'error'); return; }

  const data = {};
  EMPLOYEE_FIELD_DEFS.forEach(({ key }) => {
    const el = document.getElementById('emp-form-' + key);
    data[key] = el ? empVal(el.value) : '';
  });

  // Dates are entered as dd-mm-yyyy; store them as ISO for correct sorting.
  for (const key of EMPLOYEE_DATE_FIELDS) {
    if (!data[key]) continue;
    const iso = toIsoDate(data[key]);
    if (iso === null) {
      const label = (EMPLOYEE_FIELD_DEFS.find(f => f.key === key) || {}).label || key;
      showToast(`${label}: use a date like "07 Apr 1995" or 07-04-1995`, 'error');
      return;
    }
    data[key] = iso;
  }

  const missing = EMPLOYEE_REQUIRED_FIELDS.filter(k => !data[k]);
  if (missing.length) {
    const labels = missing.map(k => (EMPLOYEE_FIELD_DEFS.find(f => f.key === k) || {}).label || k);
    showToast('Required: ' + labels.join(', '), 'error');
    return;
  }

  const editingId = state.editingEmployeeId;
  const dupe = (state.employeeRecords || []).find(r =>
    empVal(r.employeeId).toLowerCase() === data.employeeId.toLowerCase() && r.id !== editingId);
  if (dupe) { showToast(`Employee ID "${data.employeeId}" already exists`, 'error'); return; }

  const currentUser = localStorage.getItem('hc_logged_in_user') || 'System';
  const nowIso = new Date().toISOString();
  const id = editingId || `emp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const existing = (state.employeeRecords || []).find(r => r.id === id);
  const record = {
    ...(existing || {}),
    ...data,
    id,
    createdBy: existing ? existing.createdBy : currentUser,
    createdAt: existing ? existing.createdAt : nowIso,
    updatedBy: currentUser,
    updatedAt: nowIso
  };

  try {
    await setDoc(doc(db, "employee_records", id), record);
    await logEmployeeDbActivity(`${editingId ? 'updated' : 'added'} employee "${record.fullName}" (${record.employeeId})`);
    showToast(editingId ? 'Employee updated' : 'Employee added', 'success');
    closeEmployeeModal();
  } catch (err) {
    console.error(err);
    showToast('Failed to save employee' + errSuffix(err), 'error');
  }
}

function deleteEmployeeRecordById(recordId) {
  const rec = (state.employeeRecords || []).find(r => r.id === recordId);
  if (!rec) return;
  if (!canCurrentUserAccessEmployeeDb()) { showToast('Access denied', 'error'); return; }
  if (!confirm(`Delete employee "${rec.fullName}" (${rec.employeeId})? This cannot be undone.`)) return;
  deleteDoc(doc(db, "employee_records", recordId))
    .then(() => {
      logEmployeeDbActivity(`deleted employee "${rec.fullName}" (${rec.employeeId})`);
      showToast('Employee deleted', 'info');
    })
    .catch(err => { console.error(err); showToast('Failed to delete' + errSuffix(err), 'error'); });
}

function deleteEmployeeRecord() {
  if (state.editingEmployeeId) {
    const id = state.editingEmployeeId;
    closeEmployeeModal();
    deleteEmployeeRecordById(id);
  }
}

function openEmployeeDetailModal(recordId) {
  const rec = (state.employeeRecords || []).find(r => r.id === recordId);
  if (!rec) return;
  state.viewingEmployeeId = recordId;
  renderEmployeeDetail(rec);
  document.getElementById('employee-detail-modal')?.classList.add('active');
}

function renderEmployeeDetail(rec) {
  const body = document.getElementById('employee-detail-body');
  const titleEl = document.getElementById('employee-detail-modal-title');
  if (titleEl) titleEl.textContent = `${empVal(rec.fullName)} — ${empVal(rec.employeeId)}`;
  if (!body) return;
  body.innerHTML = EMPLOYEE_FIELD_DEFS.map(({ key, label }) => {
    let val = (EMPLOYEE_DATE_FIELDS.includes(key) ? toDisplayDate(rec[key]) : empVal(rec[key])) || '—';
    if (key === 'cvLink' && empVal(rec.cvLink)) {
      val = `<a href="${escapeHtml(rec.cvLink)}" target="_blank" rel="noopener" style="color:#60a5fa;">Open CV</a>`;
    } else {
      val = escapeHtml(val);
    }
    return `<div style="display:flex; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="width:210px; color:#94a3b8; font-size:0.82rem;">${label}</div>
      <div style="flex:1; color:#e2e8f0; font-size:0.88rem; word-break:break-word;">${val}</div>
    </div>`;
  }).join('');
}

function closeEmployeeDetailModal() {
  document.getElementById('employee-detail-modal')?.classList.remove('active');
  state.viewingEmployeeId = null;
}

// ---- CSV helpers -------------------------------------------------------------

function csvEscape(v) {
  const s = (v == null ? '' : String(v));
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  text = String(text).replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(x => x !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some(x => x !== '')) rows.push(row); }
  return rows;
}

function exportEmployeeCsv() {
  const rows = getFilteredEmployeeRecords();
  if (!rows.length) { showToast('Nothing to export', 'info'); return; }
  const headers = EMPLOYEE_FIELD_DEFS.map(f => f.label);
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach(r => lines.push(EMPLOYEE_FIELD_DEFS.map(f =>
    csvEscape(EMPLOYEE_DATE_FIELDS.includes(f.key) ? toDisplayDate(r[f.key]) : r[f.key])
  ).join(',')));
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `employee-database-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function openEmployeeImportModal() {
  if (!canCurrentUserAccessEmployeeDb()) { showToast('Access denied', 'error'); return; }
  employeeImportDraft = null;
  ['emp-import-url', 'emp-import-text'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const fileEl = document.getElementById('emp-import-file'); if (fileEl) fileEl.value = '';
  const prev = document.getElementById('emp-import-preview'); if (prev) prev.textContent = '';
  const commit = document.getElementById('emp-import-commit-btn'); if (commit) commit.disabled = true;
  document.getElementById('employee-import-modal')?.classList.add('active');
}

function closeEmployeeImportModal() {
  document.getElementById('employee-import-modal')?.classList.remove('active');
  employeeImportDraft = null;
}

function prepareEmployeeImport(text, silent) {
  const preview = document.getElementById('emp-import-preview');
  const commitBtn = document.getElementById('emp-import-commit-btn');
  const rows = parseCsv(text);
  if (rows.length < 2) {
    employeeImportDraft = null;
    if (commitBtn) commitBtn.disabled = true;
    if (preview) preview.textContent = silent ? '' : 'Could not find any data rows.';
    return;
  }
  const labelToKey = {};
  EMPLOYEE_FIELD_DEFS.forEach(f => { labelToKey[f.label.toLowerCase()] = f.key; labelToKey[f.key.toLowerCase()] = f.key; });
  // Extra header spellings people commonly use in their sheets.
  Object.assign(labelToKey, {
    'id': 'employeeId', 'emp id': 'employeeId', 'employee id': 'employeeId', 'employee no': 'employeeId', 'staff id': 'employeeId',
    'name': 'fullName', 'employee name': 'fullName', 'full name': 'fullName',
    'designation': 'designation', 'title': 'designation', 'job title': 'designation', 'role': 'designation', 'position': 'designation',
    'department': 'department', 'dept': 'department', 'team': 'department',
    'office': 'officeSpace', 'office space': 'officeSpace', 'location': 'officeSpace', 'branch': 'officeSpace',
    'phone': 'phone', 'phone number': 'phone', 'phone no': 'phone', 'mobile': 'phone', 'contact number': 'phone', 'cell': 'phone',
    'email': 'personalEmail', 'personal email': 'personalEmail', 'email address': 'personalEmail', 'e-mail': 'personalEmail',
    'work email': 'workEmail', 'official email': 'workEmail', 'company email': 'workEmail',
    'dob': 'dob', 'date of birth': 'dob', 'birth date': 'dob', 'birthday': 'dob',
    'blood': 'bloodGroup', 'blood group': 'bloodGroup', 'blood type': 'bloodGroup',
    'status': 'status', 'employment status': 'status', 'active': 'status',
    'joined': 'joinDate', 'join date': 'joinDate', 'joining date': 'joinDate', 'date of joining': 'joinDate', 'doj': 'joinDate', 'start date': 'joinDate',
    'nid': 'nationalId', 'national id': 'nationalId', 'passport': 'nationalId', 'nid/passport': 'nationalId', 'national id / passport': 'nationalId',
    'bank account number': 'bankAccountNumber', 'bank account': 'bankAccountNumber', 'account number': 'bankAccountNumber', 'bank a/c': 'bankAccountNumber', 'a/c number': 'bankAccountNumber', 'bank ac no': 'bankAccountNumber',
    'emergency contact': 'emergencyContactName', 'emergency contact name': 'emergencyContactName', 'emergency name': 'emergencyContactName',
    'emergency contact phone': 'emergencyContactPhone', 'emergency phone': 'emergencyContactPhone', 'emergency number': 'emergencyContactPhone',
    'address': 'address', 'home address': 'address', 'present address': 'address',
    'cv': 'cvLink', 'cv link': 'cvLink', 'resume': 'cvLink', 'resume link': 'cvLink', 'cv / resume link': 'cvLink', 'cv/resume': 'cvLink',
    'notes': 'notes', 'note': 'notes', 'remarks': 'notes', 'comment': 'notes'
  });
  const header = rows[0].map(h => labelToKey[empVal(h).toLowerCase()] || null);
  if (!header.includes('employeeId')) {
    employeeImportDraft = null;
    if (commitBtn) commitBtn.disabled = true;
    if (preview) preview.textContent = 'CSV must have an "Employee ID" column.';
    return;
  }

  const parsed = [];
  let skipped = 0;
  for (let i = 1; i < rows.length; i++) {
    const rec = {};
    header.forEach((k, idx) => { if (k) rec[k] = empVal(rows[i][idx]); });
    if (!empVal(rec.employeeId)) { skipped++; continue; }
    parsed.push(rec);
  }

  const existingById = {};
  (state.employeeRecords || []).forEach(r => { existingById[empVal(r.employeeId).toLowerCase()] = r; });
  let willUpdate = 0, willAdd = 0, missingReq = 0;
  parsed.forEach(rec => {
    const match = existingById[empVal(rec.employeeId).toLowerCase()];
    const merged = { ...(match || {}), ...rec };
    if (EMPLOYEE_REQUIRED_FIELDS.some(k => !empVal(merged[k]))) missingReq++;
    if (match) willUpdate++; else willAdd++;
  });

  employeeImportDraft = parsed;
  if (commitBtn) commitBtn.disabled = parsed.length === 0;
  if (preview) {
    preview.innerHTML = `Ready to import <strong>${parsed.length}</strong> row(s): `
      + `${willAdd} new, ${willUpdate} updated`
      + (skipped ? `, ${skipped} skipped (no Employee ID)` : '')
      + (missingReq ? `. <span style="color:#fbbf24;">${missingReq} row(s) will be missing required fields — they still import; fix them via Edit.</span>` : '.');
  }
}

async function commitEmployeeImport() {
  if (!canCurrentUserAccessEmployeeDb()) { showToast('Access denied', 'error'); return; }
  if (!employeeImportDraft || !employeeImportDraft.length) return;
  const currentUser = localStorage.getItem('hc_logged_in_user') || 'System';
  const nowIso = new Date().toISOString();
  const existingById = {};
  (state.employeeRecords || []).forEach(r => { existingById[empVal(r.employeeId).toLowerCase()] = r; });

  let ok = 0, fail = 0;
  for (const rec of employeeImportDraft) {
    // Normalise date columns (dd-mm-yyyy / dd/mm/yyyy / ISO) to ISO storage.
    for (const key of EMPLOYEE_DATE_FIELDS) {
      if (rec[key] == null || rec[key] === '') continue;
      const iso = toIsoDate(rec[key]);
      if (iso) rec[key] = iso;
    }
    const match = existingById[empVal(rec.employeeId).toLowerCase()];
    const id = match ? match.id : `emp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record = {
      ...(match || {}),
      ...rec,
      id,
      createdBy: match ? match.createdBy : currentUser,
      createdAt: match ? match.createdAt : nowIso,
      updatedBy: currentUser,
      updatedAt: nowIso
    };
    try { await setDoc(doc(db, "employee_records", id), record); ok++; }
    catch (err) { console.error('Import row failed', err); fail++; }
  }
  await logEmployeeDbActivity(`imported employee records (${ok} saved${fail ? `, ${fail} failed` : ''})`);
  showToast(`Import complete: ${ok} saved${fail ? `, ${fail} failed` : ''}`, fail ? 'error' : 'success');
  closeEmployeeImportModal();
}

async function logEmployeeDbActivity(actionText) {
  const currentUser = localStorage.getItem('hc_logged_in_user') || 'System';
  const entry = {
    id: `emplog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user: currentUser,
    action: actionText,
    timestamp: new Date().toISOString()
  };
  try { await setDoc(doc(db, "employee_db_log", entry.id), entry); }
  catch (err) { console.warn('employee_db_log write failed:', err); }
}

function renderEmployeeDbLog() {
  const list = document.getElementById('employee-db-log-list');
  if (!list) return;
  const logs = state.employeeDbLog || [];
  if (!logs.length) { list.innerHTML = '<div style="color:#64748b; padding:12px;">No changes logged yet.</div>'; return; }
  list.innerHTML = logs.map(l => `<div style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.83rem;">
    <span style="color:#e2e8f0;">${escapeHtml(l.user)}</span>
    <span style="color:#cbd5e1;"> ${escapeHtml(l.action)}</span>
    <span style="color:#64748b; float:right;">${escapeHtml((l.timestamp || '').replace('T', ' ').slice(0, 16))}</span>
  </div>`).join('');
}

// ==========================================================================
// Onboarding Deliverables Tracker
//
// Per-employee checklist of formal deliverables (ID Card / Mug / Bank
// Account) stored on the employee_records row under `deliverables`. Same
// HR/Admin gate as the Employee Database. Nav badge + dashboard pill work
// like the Priority Board's.
// ==========================================================================

function blankDeliverables() {
  const d = {};
  DELIVERABLE_DEFS.forEach(def => {
    d[def.key] = { steps: {}, links: {}, na: {}, deliveredOn: null };
    def.steps.forEach(s => {
      if (!s.auto) d[def.key].steps[s.key] = false;
      if (s.link) d[def.key].links[s.key] = '';
    });
  });
  return d;
}

// A complete deliverables object for a record: blank scaffold overlaid with
// whatever is already stored, so every expected key exists.
function mergeDeliverables(rec) {
  const base = blankDeliverables();
  const cur = (rec && rec.deliverables) || {};
  DELIVERABLE_DEFS.forEach(def => {
    const c = cur[def.key] || {};
    base[def.key].deliveredOn = c.deliveredOn || null;
    Object.assign(base[def.key].steps, c.steps || {});
    Object.assign(base[def.key].links, c.links || {});
    Object.assign(base[def.key].na, c.na || {});
  });
  return base;
}

// Auto-stamp / clear each deliverable's deliveredOn based on completion.
// A step marked N/A counts as satisfied for the completion check.
function applyDeliveredDates(deliverables, rec) {
  const today = new Date().toISOString().slice(0, 10);
  DELIVERABLE_DEFS.forEach(def => {
    const na = deliverables[def.key].na || {};
    const anyRequired = def.steps.some(s => s.auto || !na[s.key]);
    const complete = anyRequired && def.steps.every(s => {
      if (s.auto) return !!s.auto(rec);
      if (na[s.key]) return true;
      return !!deliverables[def.key].steps[s.key];
    });
    if (complete && !deliverables[def.key].deliveredOn) deliverables[def.key].deliveredOn = today;
    if (!complete) deliverables[def.key].deliveredOn = null;
  });
}

function setupOnboardingControls() {
  const q = (id) => document.getElementById(id);

  const search = q('onboarding-search-input');
  if (search) search.addEventListener('input', (e) => {
    state.onboardingSearchFilter = e.target.value.toLowerCase();
    renderOnboarding();
  });
  q('onboarding-office-filter')?.addEventListener('change', (e) => {
    state.onboardingOfficeFilter = e.target.value; renderOnboarding();
  });
  q('onboarding-status-filter')?.addEventListener('change', (e) => {
    state.onboardingStatusFilter = e.target.value; renderOnboarding();
  });

  document.querySelectorAll('#onboarding-view th.sortable-th').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (state.onboardingSortCol === col) {
        state.onboardingSortDir = state.onboardingSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.onboardingSortCol = col;
        state.onboardingSortDir = 'asc';
      }
      renderOnboarding();
    });
  });

  q('onboarding-detail-modal-close-btn')?.addEventListener('click', closeOnboardingDetail);
  q('onboarding-detail-modal-done-btn')?.addEventListener('click', closeOnboardingDetail);
}

function onboardingStatusOf(rec) {
  if (isEmployeeFullyOnboarded(rec)) return 'complete';
  return isEmployeeOnboardingOverdue(rec) ? 'overdue' : 'pending';
}

function getFilteredOnboardingRecords() {
  let rows = [...(state.employeeRecords || [])];
  const s = state.onboardingSearchFilter;
  if (s) {
    rows = rows.filter(r => ['employeeId', 'fullName', 'designation', 'department']
      .some(k => empVal(r[k]).toLowerCase().includes(s)));
  }
  if (state.onboardingOfficeFilter !== 'all') {
    rows = rows.filter(r => empVal(r.officeSpace).toLowerCase() === state.onboardingOfficeFilter.toLowerCase());
  }
  if (state.onboardingStatusFilter !== 'all') {
    rows = rows.filter(r => onboardingStatusOf(r) === state.onboardingStatusFilter);
  }

  const col = state.onboardingSortCol || 'fullName';
  const dir = state.onboardingSortDir === 'desc' ? -1 : 1;
  rows.sort((a, b) => {
    let av, bv;
    if (col === 'status') { av = onboardingStatusOf(a); bv = onboardingStatusOf(b); }
    else if (col === 'joinDate') { av = toIsoDate(a.joinDate) || ''; bv = toIsoDate(b.joinDate) || ''; }
    else { av = empVal(a[col]); bv = empVal(b[col]); }
    return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir;
  });
  return rows;
}

function populateOnboardingFilters() {
  const el = document.getElementById('onboarding-office-filter');
  if (!el) return;
  const first = el.querySelector('option');
  el.innerHTML = '';
  if (first) el.appendChild(first);
  DEFAULT_OFFICE_SPACES.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = o;
    if (state.onboardingOfficeFilter === o) opt.selected = true;
    el.appendChild(opt);
  });
}

function renderOnboarding() {
  const tbody = document.getElementById('onboarding-list-body');
  if (!tbody) return;
  if (!canCurrentUserAccessOnboarding()) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:32px; color:#64748b;">Access denied.</td></tr>';
    return;
  }

  populateOnboardingFilters();
  const all = state.employeeRecords || [];
  const rows = getFilteredOnboardingRecords();

  const pending = all.filter(r => !isEmployeeFullyOnboarded(r));
  const overdue = pending.filter(isEmployeeOnboardingOverdue);
  const setText = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
  setText('onboarding-count-total', String(all.length));
  setText('onboarding-count-pending', String(pending.length));
  setText('onboarding-count-overdue', String(overdue.length));

  document.querySelectorAll('#onboarding-view th.sortable-th').forEach(th => {
    const icon = th.querySelector('.sort-icon');
    if (!icon) return;
    icon.textContent = th.getAttribute('data-sort') === state.onboardingSortCol
      ? (state.onboardingSortDir === 'asc' ? '↑' : '↓') : '↕';
  });

  if (!rows.length) {
    const msg = all.length === 0 ? 'No employees yet — add them in the Employee Database.' : 'No employees match the current filters.';
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:#64748b;">${msg}</td></tr>`;
    return;
  }

  const cell = (rec, def) => {
    const p = deliverableProgress(rec, def);
    if (p.allNA) return `<span style="color:#64748b; font-weight:600;">N/A</span>`;
    if (p.complete) return `<span style="color:#4ade80; font-weight:700;">✓</span>`;
    const color = p.done === 0 && onboardingStatusOf(rec) === 'overdue' ? '#f87171' : '#fbbf24';
    return `<span style="color:${color}; font-weight:600;">${p.done}/${p.total}</span>`;
  };

  tbody.innerHTML = rows.map(rec => {
    const status = onboardingStatusOf(rec);
    const statusMap = {
      complete: ['#4ade80', 'Complete'],
      overdue: ['#f87171', 'Overdue'],
      pending: ['#fbbf24', 'Pending']
    };
    const [sc, sl] = statusMap[status];
    const rowBg = status === 'overdue' ? 'background: rgba(248,113,113,0.06);' : '';
    return `<tr data-onb-id="${escapeHtml(rec.id)}" style="cursor:pointer; ${rowBg}">
      <td>${escapeHtml(rec.employeeId)}</td>
      <td style="font-weight:600; color:#fff;">${escapeHtml(rec.fullName)}</td>
      <td>${escapeHtml(toDisplayDate(rec.joinDate)) || '<span style="color:#475569;">—</span>'}</td>
      ${DELIVERABLE_DEFS.map(def => `<td style="text-align:center;">${cell(rec, def)}</td>`).join('')}
      <td style="color:${sc}; font-weight:700;">${sl}</td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('tr[data-onb-id]').forEach(tr => {
    tr.addEventListener('click', () => openOnboardingDetail(tr.getAttribute('data-onb-id')));
  });
}

function updateOnboardingBadge() {
  const recs = state.employeeRecords || [];
  const pending = recs.filter(r => !isEmployeeFullyOnboarded(r));
  const overdue = pending.filter(isEmployeeOnboardingOverdue);

  const nav = document.getElementById('onboarding-badge');
  if (nav) {
    if (pending.length) { nav.textContent = pending.length; nav.style.display = 'flex'; }
    else nav.style.display = 'none';
  }
  const dash = document.getElementById('dashboard-onboarding-badge');
  if (dash) {
    if (pending.length) {
      dash.textContent = `${pending.length} employee${pending.length === 1 ? '' : 's'} with pending deliverables`
        + (overdue.length ? ` · ${overdue.length} overdue` : '');
      dash.style.display = 'inline-flex';
      dash.style.background = overdue.length ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)';
      dash.style.color = overdue.length ? '#f87171' : '#fbbf24';
      dash.style.border = `1px solid ${overdue.length ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.3)'}`;
    } else {
      dash.style.display = 'none';
    }
  }
}

function openOnboardingDetail(recId) {
  const rec = (state.employeeRecords || []).find(r => r.id === recId);
  if (!rec) return;
  state.viewingOnboardingId = recId;
  renderOnboardingDetail(rec);
  document.getElementById('onboarding-detail-modal')?.classList.add('active');
}

function closeOnboardingDetail() {
  document.getElementById('onboarding-detail-modal')?.classList.remove('active');
  state.viewingOnboardingId = null;
}

function renderOnboardingDetail(rec) {
  const body = document.getElementById('onboarding-detail-body');
  const titleEl = document.getElementById('onboarding-detail-modal-title');
  if (titleEl) titleEl.textContent = `${empVal(rec.fullName)} — ${empVal(rec.employeeId)}`;
  if (!body) return;

  const canEdit = canCurrentUserAccessOnboarding();
  const status = onboardingStatusOf(rec);
  const statusColor = status === 'complete' ? '#4ade80' : (status === 'overdue' ? '#f87171' : '#fbbf24');
  const jd = toDisplayDate(rec.joinDate);

  let html = `<div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:8px; font-size:0.82rem; color:#94a3b8;">
    <span>Join date: <strong style="color:#e2e8f0;">${escapeHtml(jd) || '—'}</strong></span>
    <span>Status: <strong style="color:${statusColor};">${status.charAt(0).toUpperCase() + status.slice(1)}</strong></span>
    ${status === 'overdue' ? `<span style="color:#f87171;">Overdue (&gt;${ONBOARDING_OVERDUE_DAYS} days past join date)</span>` : ''}
  </div>`;
  if (canEdit) {
    html += `<div style="margin-bottom:16px; font-size:0.78rem; color:#64748b;">Tick to mark a step done, untick to undo it. Use <strong>N/A</strong> to mark a step this person doesn't need — it's then left out of the progress count. "From record" steps follow the employee's data automatically.</div>`;
  }

  DELIVERABLE_DEFS.forEach(def => {
    const p = deliverableProgress(rec, def);
    const deliveredOn = deliverableDeliveredOn(rec, def.key);
    const headRight = p.allNA
      ? `<span style="font-size:0.8rem; color:#64748b; font-weight:700;">Not required</span>`
      : `<span style="font-size:0.8rem; color:${p.complete ? '#4ade80' : '#fbbf24'}; font-weight:700;">${p.complete ? `Delivered${deliveredOn ? ' · ' + escapeHtml(toDisplayDate(deliveredOn)) : ''}` : `${p.done}/${p.total}`}</span>`;
    html += `<div style="border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:14px 16px; margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <strong style="color:#fff; font-size:0.95rem;">${def.label}</strong>
        ${headRight}
      </div>`;

    def.steps.forEach(step => {
      const auto = !!step.auto;
      const na = isDeliverableStepNA(rec, def.key, step);
      const done = !na && isDeliverableStepDone(rec, def.key, step);
      const labelStyle = na ? 'color:#64748b; font-size:0.88rem; text-decoration:line-through;' : 'color:#e2e8f0; font-size:0.88rem;';
      const rowTappable = !auto && canEdit && !na;
      html += `<div style="padding:8px 0; border-top:1px solid rgba(255,255,255,0.04);">
        <div style="display:flex; align-items:center; gap:10px; min-height:36px;">
          <label style="display:flex; align-items:center; gap:12px; flex:1; min-width:0; ${rowTappable ? 'cursor:pointer;' : ''}">
            <input type="checkbox" ${done ? 'checked' : ''} ${(auto || !canEdit || na) ? 'disabled' : ''}
              data-onb-step="${escapeHtml(def.key)}|${escapeHtml(step.key)}"
              style="width:18px; height:18px; accent-color: var(--honey-gold); flex:none;">
            <span style="${labelStyle}">${escapeHtml(step.label)}${auto ? `<span style="color:#64748b; font-size:0.75rem;"> — from record</span>` : ''}${na ? `<span style="color:#64748b; font-size:0.75rem;"> — not required</span>` : ''}</span>
          </label>
          ${(!auto && canEdit) ? `<button type="button" data-onb-na="${escapeHtml(def.key)}|${escapeHtml(step.key)}"
            style="flex:none; height:32px; min-width:52px; padding:0 12px; font-size:0.75rem; font-weight:600; border-radius:6px; cursor:pointer;
            background:${na ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.05)'}; color:${na ? '#38bdf8' : '#94a3b8'};
            border:1px solid ${na ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.12)'};">${na ? 'Required' : 'N/A'}</button>` : ''}
        </div>
        ${(step.link && !na) ? `<div style="margin:8px 0 0 30px; display:flex; gap:8px; align-items:center;">
          <input type="url" placeholder="Paste Google Drive link (optional)"
            data-onb-link="${escapeHtml(def.key)}|${escapeHtml(step.key)}"
            value="${escapeHtml(deliverableLink(rec, def.key, step.key))}"
            ${canEdit ? '' : 'disabled'}
            style="flex:1; min-width:0; height:38px; padding:0 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px; color:#fff; font-size:0.82rem; outline:none;">
          ${deliverableLink(rec, def.key, step.key) ? `<a href="${escapeHtml(deliverableLink(rec, def.key, step.key))}" target="_blank" rel="noopener" style="color:#60a5fa; font-size:0.82rem; white-space:nowrap;">Open</a>` : ''}
        </div>` : ''}
      </div>`;
    });
    html += `</div>`;
  });

  body.innerHTML = html;

  body.querySelectorAll('input[data-onb-step]').forEach(cb => {
    cb.addEventListener('change', () => {
      const [dKey, stepKey] = cb.getAttribute('data-onb-step').split('|');
      setOnboardingStep(rec.id, dKey, stepKey, cb.checked);
    });
  });
  body.querySelectorAll('input[data-onb-link]').forEach(inp => {
    inp.addEventListener('change', () => {
      const [dKey, stepKey] = inp.getAttribute('data-onb-link').split('|');
      setOnboardingLink(rec.id, dKey, stepKey, inp.value);
    });
  });
  body.querySelectorAll('button[data-onb-na]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [dKey, stepKey] = btn.getAttribute('data-onb-na').split('|');
      setOnboardingStepNA(rec.id, dKey, stepKey, !isDeliverableStepNA(rec, dKey, DELIVERABLE_DEFS.find(d => d.key === dKey).steps.find(s => s.key === stepKey)));
    });
  });
}

// --- Onboarding write queue -----------------------------------------------
// Toggling several checkboxes in a row used to race: each handler did a
// read-modify-write of the WHOLE employee record from `state`, so a second
// quick toggle read a stale copy and clobbered the first write (2/2 -> 1/2).
// Now every edit mutates the in-memory record immediately (optimistic) and
// a single debounced writer flushes the current full record, so rapid
// toggles collapse into one correct write.
const _onbDirtyIds = new Set();
const _onbWriteTimers = {};
let _onbWriteInflight = {};

function scheduleOnboardingWrite(empId) {
  clearTimeout(_onbWriteTimers[empId]);
  _onbWriteTimers[empId] = setTimeout(() => flushOnboardingWrite(empId), 350);
}

async function flushOnboardingWrite(empId) {
  if (_onbWriteInflight[empId]) { scheduleOnboardingWrite(empId); return; }
  const rec = (state.employeeRecords || []).find(r => r.id === empId);
  if (!rec) { _onbDirtyIds.delete(empId); return; }
  _onbWriteInflight[empId] = true;
  try {
    await setDoc(doc(db, "employee_records", empId), {
      ...rec,
      updatedBy: localStorage.getItem('hc_logged_in_user') || 'System',
      updatedAt: new Date().toISOString()
    });
    // keep the snapshot guard alive briefly so our own echo doesn't revert
    setTimeout(() => {
      if (!_onbWriteTimers[empId] && !_onbWriteInflight[empId]) _onbDirtyIds.delete(empId);
    }, 2000);
  } catch (err) {
    console.error(err);
    showToast('Failed to save onboarding change' + errSuffix(err), 'error');
    scheduleOnboardingWrite(empId); // retry
  } finally {
    _onbWriteInflight[empId] = false;
  }
}

function setOnboardingStep(empId, dKey, stepKey, checked) {
  if (!canCurrentUserAccessOnboarding()) { showToast('Access denied', 'error'); return; }
  const rec = (state.employeeRecords || []).find(r => r.id === empId);
  if (!rec) return;
  const def = DELIVERABLE_DEFS.find(d => d.key === dKey);
  const step = def.steps.find(s => s.key === stepKey);
  const wasComplete = deliverableProgress(rec, def).complete;

  const deliverables = mergeDeliverables(rec);
  deliverables[dKey].steps[stepKey] = !!checked;
  applyDeliveredDates(deliverables, rec);
  rec.deliverables = deliverables;            // optimistic in-memory update

  _onbDirtyIds.add(empId);
  scheduleOnboardingWrite(empId);
  logEmployeeDbActivity(`${checked ? 'ticked' : 'unticked'} "${def.label} › ${step.label}" for ${rec.fullName} (${rec.employeeId})`);

  if (checked) showToast(`Marked done: ${def.label} › ${step.label}`, 'success');
  else showToast(`Undone: ${def.label} › ${step.label}${wasComplete ? ` — "${def.label}" is pending again` : ''}`, 'info');

  updateOnboardingBadge();
  if (state.currentView === 'onboarding') renderOnboarding();
  if (state.viewingOnboardingId === empId) renderOnboardingDetail(rec);
}

function setOnboardingStepNA(empId, dKey, stepKey, na) {
  if (!canCurrentUserAccessOnboarding()) { showToast('Access denied', 'error'); return; }
  const rec = (state.employeeRecords || []).find(r => r.id === empId);
  if (!rec) return;
  const def = DELIVERABLE_DEFS.find(d => d.key === dKey);
  const step = def.steps.find(s => s.key === stepKey);

  const deliverables = mergeDeliverables(rec);
  if (na) {
    deliverables[dKey].na[stepKey] = true;
    deliverables[dKey].steps[stepKey] = false; // can't be both done and N/A
  } else {
    delete deliverables[dKey].na[stepKey];
  }
  applyDeliveredDates(deliverables, rec);
  rec.deliverables = deliverables;

  _onbDirtyIds.add(empId);
  scheduleOnboardingWrite(empId);
  logEmployeeDbActivity(`${na ? 'marked not required' : 'marked required again'}: "${def.label} › ${step.label}" for ${rec.fullName} (${rec.employeeId})`);
  showToast(`${na ? 'Not required' : 'Required again'}: ${def.label} › ${step.label}`, 'info');

  updateOnboardingBadge();
  if (state.currentView === 'onboarding') renderOnboarding();
  if (state.viewingOnboardingId === empId) renderOnboardingDetail(rec);
}

function setOnboardingLink(empId, dKey, stepKey, url) {
  if (!canCurrentUserAccessOnboarding()) { showToast('Access denied', 'error'); return; }
  const rec = (state.employeeRecords || []).find(r => r.id === empId);
  if (!rec) return;
  const def = DELIVERABLE_DEFS.find(d => d.key === dKey);
  const step = def.steps.find(s => s.key === stepKey);

  const deliverables = mergeDeliverables(rec);
  deliverables[dKey].links[stepKey] = empVal(url);
  rec.deliverables = deliverables;

  _onbDirtyIds.add(empId);
  scheduleOnboardingWrite(empId);
  logEmployeeDbActivity(`updated link for "${def.label} › ${step.label}" — ${rec.fullName} (${rec.employeeId})`);
  if (state.viewingOnboardingId === empId) renderOnboardingDetail(rec);
}

function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('mobile-open');
  document.getElementById('sidebar-backdrop')?.classList.add('active');
}

function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebar-backdrop')?.classList.remove('active');
}

// ===========================================================================
// Leave Management (HR)
// ---------------------------------------------------------------------------
// Fully isolated from the content planner: its own Supabase tables
// (leave_records / leave_holidays / leave_policy / leave_log), its own state
// slice, and it never touches state.team or state.tasks. Employees come from
// the Employee Database (state.employeeRecords) — that's the HR source of
// truth and it already carries joinDate, which pro-rating needs.
//
// There is deliberately NO salary or payroll anything in here. "Paid" and
// "Unpaid" are labels on a leave day meaning inside or outside entitlement,
// nothing more.
// ===========================================================================

// Leave types. Adding new codes later (Maternity, Compassionate, TOIL) is an
// edit to this array — records store the single-letter slot value, never a
// composed code like "L1", so no data migration is needed.
const LV_VACATION = 'VL';
const LV_SICK = 'SL';
const LV_WFH = 'WFH';

const LEAVE_TYPES = [
  { key: LV_VACATION, label: 'Vacation Leave', short: 'Vacation', bucket: 'vacation', color: '#38bdf8' },
  { key: LV_SICK,     label: 'Sickness Leave', short: 'Sickness', bucket: 'sick',     color: '#f472b6' },
  { key: LV_WFH,      label: 'Work From Home', short: 'WFH',      bucket: 'vacation', color: '#fbbf24' }
];

// The single-letter codes this view originally shipped with (and the ones the
// old Google Sheet used). Rows written before the rename are normalised to the
// canonical code as they load, so totals, buckets and the WFH override all
// behave identically for old and new data. The row in the database self-heals
// the next time that day is edited.
const LEAVE_LEGACY_CODES = { L: LV_VACATION, S: LV_SICK, W: LV_WFH };

function lvNormalizeCode(code) {
  const c = empVal(code);
  return LEAVE_LEGACY_CODES[c] || c;
}

function lvNormalizeRecord(r) {
  const am = lvNormalizeCode(r.am);
  const pm = lvNormalizeCode(r.pm);
  return (am === empVal(r.am) && pm === empVal(r.pm)) ? r : { ...r, am, pm };
}

const LEAVE_BUCKETS = [
  { key: 'vacation', label: 'Vacation' },
  { key: 'sick',     label: 'Sick' }
];

// Defaults for a leave year. Every one of these is editable in the
// Calendar & Policy tab and stored per year in leave_policy — nothing here
// is hardcoded policy, it's just what a brand-new year starts as.
const DEFAULT_LEAVE_POLICY = {
  vacationDays: 18,
  sickDays: 12,
  blackoutMonths: [10, 11, 12],   // Oct / Nov / Dec rush period
  blackoutApplies: [LV_VACATION, LV_SICK, LV_WFH],
  blackoutBurnsBalance: true,
  weekendDays: [5],               // 0=Sun … 5=Fri, 6=Sat — Friday only
  prorateJoiners: true,
  wfhConsumesVacation: true
};

// Fixed-date Bangladesh national holidays only. Eid, Ashura, Shab-e-Barat,
// Durga Puja and the other lunar/luni-solar dates move every year and are
// set by government gazette — seeding a guess would silently miscount leave,
// so those are left for HR to enter from the official calendar.
const BD_FIXED_HOLIDAYS = [
  { md: '02-21', name: 'Shaheed Day & International Mother Language Day' },
  { md: '03-26', name: 'Independence Day' },
  { md: '04-14', name: 'Pahela Baishakh (Bengali New Year)' },
  { md: '05-01', name: 'May Day' },
  { md: '12-16', name: 'Victory Day' },
  { md: '12-25', name: 'Christmas Day' }
];

const LEAVE_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const LEAVE_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---- Small date helpers ---------------------------------------------------

function lvIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function lvParse(iso) { return new Date(iso + 'T00:00:00'); }
function lvDaysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
function lvToday() { return lvIso(new Date()); }

// 1.5 -> "1.5", 2 -> "2". Half days are real, so never round them away.
function lvDays(n) {
  const v = Math.round(n * 2) / 2;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
function lvRoundHalf(n) { return Math.round(n * 2) / 2; }

function lvTypeDef(code) {
  const key = LEAVE_LEGACY_CODES[code] || code;
  return LEAVE_TYPES.find(t => t.key === key) || null;
}

// Composed display code for a cell: L / L1 / L2, or "LS" for a day split
// across two different types (vacation morning + sick afternoon).
function lvCellCode(am, pm) {
  if (am && pm) return am === pm ? am : `${am}1+${pm}2`;
  if (am) return `${am}1`;
  if (pm) return `${pm}2`;
  return '';
}

// Grid-cell markup. A mixed day gets one label per half so both codes stay
// readable at cell size; everything else is a single centred label.
function lvCellHtml(am, pm) {
  if (am && pm && am !== pm) {
    const cAm = lvTypeDef(am), cPm = lvTypeDef(pm);
    return `<span class="lv-split">` +
      `<i style="color:${cAm ? cAm.color : '#e2e8f0'};">${escapeHtml(am)}</i>` +
      `<i style="color:${cPm ? cPm.color : '#e2e8f0'};">${escapeHtml(pm)}</i></span>`;
  }
  return escapeHtml(lvCellCode(am, pm));
}

function lvCellTitle(am, pm) {
  const name = c => { const d = lvTypeDef(c); return d ? d.label : c; };
  if (am && pm && am === pm) return `${name(am)} — full day`;
  const parts = [];
  if (am) parts.push(`${name(am)} — morning`);
  if (pm) parts.push(`${name(pm)} — afternoon`);
  return parts.join(' / ');
}

// ---- Policy & holidays ----------------------------------------------------

function getLeavePolicy(year) {
  const stored = (state.leavePolicies || []).find(p => String(p.id) === String(year));
  return { ...DEFAULT_LEAVE_POLICY, ...(stored || {}), id: String(year) };
}

function leaveHolidayFor(dateIso) {
  return (state.leaveHolidays || []).find(h => h.date === dateIso) || null;
}
function isLeaveHoliday(dateIso) { return !!leaveHolidayFor(dateIso); }

function isLeaveWeekend(dateIso, policy) {
  return (policy.weekendDays || []).includes(lvParse(dateIso).getDay());
}

// A day only consumes balance if it's an actual working day.
function isLeaveWorkingDay(dateIso, policy) {
  return !isLeaveWeekend(dateIso, policy) && !isLeaveHoliday(dateIso);
}

// Which balance a half-slot draws from, or null if it draws from none.
// WFH is the configurable one: HR sets the general rule in the policy panel
// and can override it on an individual entry.
function leaveSlotBucket(code, rec, policy) {
  if (code === LV_WFH) {
    const override = rec ? rec.wfhCounts : undefined;
    const consumes = override === true ? true
                   : override === false ? false
                   : !!policy.wfhConsumesVacation;
    return consumes ? 'vacation' : null;
  }
  const def = lvTypeDef(code);
  return def ? def.bucket : null;
}

// ---- Entitlement ----------------------------------------------------------

// Someone who joins mid-year is entitled from their joining month through
// December, pro-rated. Joining month counts as a whole month.
function leaveEntitlement(empRec, year, policy) {
  const full = { vacation: policy.vacationDays, sick: policy.sickDays };
  if (!policy.prorateJoiners) return full;
  const jd = toIsoDate(empRec && empRec.joinDate);
  if (!jd || !/^\d{4}-\d{2}-\d{2}$/.test(jd)) return full;
  const jy = +jd.slice(0, 4);
  const jm = +jd.slice(5, 7);
  if (jy > year) return { vacation: 0, sick: 0 };
  if (jy < year) return full;
  const months = 12 - jm + 1;
  return {
    vacation: lvRoundHalf(policy.vacationDays * months / 12),
    sick: lvRoundHalf(policy.sickDays * months / 12)
  };
}

// ---- The engine -----------------------------------------------------------

// Replays one employee's entire leave year in date order and classifies every
// half-day as paid or unpaid.
//
// This is recomputed on every render and deliberately never stored. If HR
// deletes a leave day in March, every day after it has to be able to shift
// from unpaid back to paid — a flag written onto the record at entry time
// could never do that, and would drift out of sync the first time anyone
// corrected a mistake.
function computeLeaveLedger(empRecordId, year) {
  const policy = getLeavePolicy(year);
  const empRec = (state.employeeRecords || []).find(r => r.id === empRecordId);
  const entitlement = leaveEntitlement(empRec, year, policy);

  const used = { vacation: 0, sick: 0 };
  const paidBy = { vacation: 0, sick: 0 };
  const unpaidBy = { vacation: 0, sick: 0 };
  const byCode = {};
  const slots = [];
  const byDate = {};
  let paidDays = 0, unpaidDays = 0, blackoutDays = 0, absenceDays = 0, wfhDays = 0, skippedDays = 0;

  const records = (state.leaveRecords || [])
    .filter(r => r.empRecordId === empRecordId && String(r.date || '').slice(0, 4) === String(year))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  records.forEach(r => {
    const working = isLeaveWorkingDay(r.date, policy);
    const month = +String(r.date).slice(5, 7);
    const inBlackoutMonth = (policy.blackoutMonths || []).includes(month);

    ['am', 'pm'].forEach(slot => {
      const code = empVal(r[slot]);
      if (!code || !lvTypeDef(code)) return;

      // A leave day recorded on a weekend or holiday costs nothing. Kept
      // visible in the grid but excluded from every total.
      if (!working) {
        skippedDays += 0.5;
        const entry = { date: r.date, slot, code, bucket: null, classification: 'skipped', reason: isLeaveHoliday(r.date) ? 'holiday' : 'weekend' };
        slots.push(entry);
        byDate[r.date] = byDate[r.date] || {};
        byDate[r.date][slot] = entry;
        return;
      }

      const bucket = leaveSlotBucket(code, r, policy);
      byCode[code] = (byCode[code] || 0) + 0.5;
      if (code === LV_WFH) wfhDays += 0.5; else absenceDays += 0.5;

      let classification, reason = '';
      if (!bucket) {
        // WFH that HR has decided doesn't consume leave — worked time.
        classification = 'paid';
        reason = 'does not consume leave';
      } else if (inBlackoutMonth && (policy.blackoutApplies || []).includes(code)) {
        classification = 'unpaid';
        reason = 'blackout month';
        blackoutDays += 0.5;
        if (policy.blackoutBurnsBalance) used[bucket] += 0.5;
      } else if (used[bucket] + 0.5 <= entitlement[bucket]) {
        classification = 'paid';
        used[bucket] += 0.5;
      } else {
        classification = 'unpaid';
        reason = 'entitlement exhausted';
        used[bucket] += 0.5;
      }

      if (classification === 'paid') { paidDays += 0.5; if (bucket) paidBy[bucket] += 0.5; }
      else { unpaidDays += 0.5; if (bucket) unpaidBy[bucket] += 0.5; }

      const entry = { date: r.date, slot, code, bucket, classification, reason, note: empVal(r.note) };
      slots.push(entry);
      byDate[r.date] = byDate[r.date] || {};
      byDate[r.date][slot] = entry;
    });
  });

  return {
    year, policy, entitlement,
    used,
    remaining: {
      vacation: Math.max(0, lvRoundHalf(entitlement.vacation - used.vacation)),
      sick: Math.max(0, lvRoundHalf(entitlement.sick - used.sick))
    },
    excess: {
      vacation: Math.max(0, lvRoundHalf(used.vacation - entitlement.vacation)),
      sick: Math.max(0, lvRoundHalf(used.sick - entitlement.sick))
    },
    paidBy, unpaidBy, byCode, slots, byDate,
    paidDays, unpaidDays, blackoutDays, absenceDays, wfhDays, skippedDays
  };
}

// Month slice of a ledger, for the grid's right-hand totals columns.
function leaveMonthTotals(ledger, year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const t = { absence: 0, vacation: 0, sick: 0, wfh: 0, unpaid: 0, paid: 0 };
  ledger.slots.forEach(s => {
    if (!String(s.date).startsWith(prefix)) return;
    if (s.classification === 'skipped') return;
    if (s.code === LV_WFH) t.wfh += 0.5; else t.absence += 0.5;
    if (s.code === LV_VACATION) t.vacation += 0.5;
    if (s.code === LV_SICK) t.sick += 0.5;
    if (s.classification === 'unpaid') t.unpaid += 0.5; else t.paid += 0.5;
  });
  return t;
}

// ---- Writes ---------------------------------------------------------------

// Every leave day this client has successfully written or deleted, held until
// a server snapshot actually reflects it.
//
// This exists because the sync layer rebuilds state.leaveRecords wholesale from
// its own cache on every emit. If that cache is stale or empty — the page was
// opened before the tables existed, so the realtime channel never subscribed
// and never learned about rows inserted since — then a single emit replaces
// everything on screen with nothing. Clearing one day wiped the whole grid
// that way: the rows were still in the database, the UI just threw them away.
//
// An entry is dropped only once the server agrees with it (or after TTL, so a
// write that never lands can't shadow the truth forever).
const _lvLocal = new Map();   // id -> { record: object | null, at: ms }
const LV_LOCAL_TTL = 120000;

function lvRememberLocal(id, record) { _lvLocal.set(id, { record, at: Date.now() }); }
function lvForgetLocal(id) { _lvLocal.delete(id); }

// Lays this client's confirmed writes over a server snapshot.
function lvApplyLocalOverlay(loaded) {
  const now = Date.now();
  const byId = new Map(loaded.map(r => [r.id, r]));
  _lvLocal.forEach((entry, id) => {
    if (now - entry.at > LV_LOCAL_TTL) { _lvLocal.delete(id); return; }
    if (entry.record === null) {
      // Deleted here. Keep it hidden until the snapshot stops returning it.
      if (byId.has(id)) byId.delete(id);
      else _lvLocal.delete(id);
    } else {
      const server = byId.get(id);
      if (server && server.updatedAt === entry.record.updatedAt) _lvLocal.delete(id);
      else byId.set(id, entry.record);
    }
  });
  return Array.from(byId.values());
}

function leaveRecordId(empRecordId, dateIso) { return `${empRecordId}__${dateIso}`; }

// PostgREST reports a table that doesn't exist as PGRST205 / "schema cache".
// For this view that means one thing only: the leave_* tables from
// supabase_migration.sql haven't been created yet.
function isMissingLeaveTableError(err) {
  const msg = String((err && (err.message || err.msg)) || '');
  return (err && err.code === 'PGRST205') || /schema cache/i.test(msg);
}

// Raised by the sync listeners and by any failed write. Flips the view into
// a "needs setup" state so the user gets one clear instruction instead of a
// cryptic PostgREST string on every single click.
function noteLeaveStorageError(err) {
  if (!isMissingLeaveTableError(err)) return false;
  if (!state.leaveStorageMissing) {
    state.leaveStorageMissing = true;
    if (state.currentView === 'leave') renderLeave();
  }
  return true;
}

function leaveWriteFailed(err, what) {
  if (isMissingLeaveTableError(err)) {
    noteLeaveStorageError(err);
    showToast('Leave storage isn\'t set up yet — run supabase_migration.sql in Supabase', 'error');
    return;
  }
  showToast(`Failed to ${what}` + errSuffix(err), 'error');
}

async function logLeaveActivity(actionText) {
  const currentUser = localStorage.getItem('hc_logged_in_user') || 'System';
  const entry = {
    id: `lvlog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user: currentUser,
    action: actionText,
    timestamp: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, "leave_log", entry.id), entry);
    // Show it straight away. The log list is rebuilt from the sync layer's
    // cache, which only learns about new rows via realtime — so without this
    // the panel reads "No changes logged yet" until the next page load.
    state.leaveLog = [entry].concat((state.leaveLog || []).filter(l => l.id !== entry.id)).slice(0, 200);
    if (state.currentView === 'leave') renderLeaveLog();
  }
  catch (err) { console.warn('leave_log write failed:', err); }
}

// Writes (or clears) one day for one employee. Passing both slots null
// deletes the row rather than leaving an empty record behind.
async function setLeaveDay(empRecordId, dateIso, patch, opts) {
  if (!canCurrentUserAccessLeave()) { showToast('Access denied', 'error'); return false; }
  const emp = (state.employeeRecords || []).find(r => r.id === empRecordId);
  if (!emp) { showToast('Employee not found', 'error'); return false; }

  const id = leaveRecordId(empRecordId, dateIso);
  const existing = (state.leaveRecords || []).find(r => r.id === id);
  const am = patch.am === undefined ? (existing ? empVal(existing.am) : '') : empVal(patch.am);
  const pm = patch.pm === undefined ? (existing ? empVal(existing.pm) : '') : empVal(patch.pm);
  const currentUser = localStorage.getItem('hc_logged_in_user') || 'System';
  const nowIso = new Date().toISOString();
  const silent = opts && opts.silent;

  if (!am && !pm) {
    if (!existing) return true;
    state.leaveRecords = (state.leaveRecords || []).filter(r => r.id !== id);
    if (!silent) renderLeave();
    try {
      await deleteDoc(doc(db, "leave_records", id));
      lvRememberLocal(id, null);
      if (!silent) await logLeaveActivity(`cleared leave for ${emp.fullName} on ${toDisplayDate(dateIso)}`);
      return true;
    } catch (err) {
      console.error(err);
      // Put the row back. A leave day that silently vanished from HR's screen
      // but still exists in the database is worse than an error message.
      state.leaveRecords = (state.leaveRecords || []).filter(r => r.id !== id).concat([existing]);
      lvForgetLocal(id);
      if (!silent) renderLeave();
      leaveWriteFailed(err, 'clear leave');
      return false;
    }
  }

  const record = {
    ...(existing || {}),
    id,
    empRecordId,
    employeeId: empVal(emp.employeeId),
    date: dateIso,
    am, pm,
    note: patch.note === undefined ? (existing ? empVal(existing.note) : '') : empVal(patch.note),
    createdBy: existing ? existing.createdBy : currentUser,
    createdAt: existing ? existing.createdAt : nowIso,
    updatedBy: currentUser,
    updatedAt: nowIso
  };
  // Only WFH carries the per-entry balance override; keep other rows clean.
  if (am === LV_WFH || pm === LV_WFH) {
    if (patch.wfhCounts !== undefined) record.wfhCounts = patch.wfhCounts;
  } else {
    delete record.wfhCounts;
  }

  const others = (state.leaveRecords || []).filter(r => r.id !== id);
  state.leaveRecords = others.concat([record]);
  if (!silent) renderLeave();

  try {
    await setDoc(doc(db, "leave_records", id), record);
    lvRememberLocal(id, record);
    if (!silent) {
      await logLeaveActivity(`set ${lvCellCode(am, pm)} for ${emp.fullName} on ${toDisplayDate(dateIso)}`);
    }
    return true;
  } catch (err) {
    console.error(err);
    // Roll the optimistic update back so the grid never shows a leave day
    // that was never actually saved.
    state.leaveRecords = others.concat(existing ? [existing] : []);
    lvForgetLocal(id);
    if (!silent) renderLeave();
    leaveWriteFailed(err, 'save leave');
    return false;
  }
}

// Every working day in a date range, with weekends and holidays already
// dropped. Used by both the range preview and the save.
function leaveWorkingDaysInRange(startIso, endIso, policy) {
  const out = [];
  if (!startIso || !endIso || endIso < startIso) return out;
  const cur = lvParse(startIso);
  const end = lvParse(endIso);
  let guard = 0;
  while (cur <= end && guard++ < 800) {
    const iso = lvIso(cur);
    if (isLeaveWorkingDay(iso, policy)) out.push(iso);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

async function saveLeaveRange(empRecordId, startIso, endIso, code, duration, note, wfhCounts) {
  const policy = getLeavePolicy(+startIso.slice(0, 4));
  const days = leaveWorkingDaysInRange(startIso, endIso, policy);
  if (!days.length) { showToast('That range has no working days', 'error'); return; }
  const emp = (state.employeeRecords || []).find(r => r.id === empRecordId);

  let ok = 0;
  for (const iso of days) {
    const patch = { note, wfhCounts };
    if (duration === 'full') { patch.am = code; patch.pm = code; }
    else if (duration === 'am') { patch.am = code; patch.pm = ''; }
    else { patch.am = ''; patch.pm = code; }
    const done = await setLeaveDay(empRecordId, iso, patch, { silent: true });
    if (done) ok++;
  }

  const label = duration === 'full' ? 'full day' : duration === 'am' ? 'morning' : 'afternoon';
  await logLeaveActivity(
    `recorded ${lvTypeDef(code).label} (${label}) for ${emp ? emp.fullName : empRecordId} — ` +
    `${toDisplayDate(startIso)}${startIso !== endIso ? ` to ${toDisplayDate(endIso)}` : ''}, ${ok} working day${ok === 1 ? '' : 's'}`
  );
  showToast(`${ok} day${ok === 1 ? '' : 's'} recorded`, 'success');
  renderLeave();
}

async function clearLeaveRange(empRecordId, startIso, endIso) {
  const policy = getLeavePolicy(+startIso.slice(0, 4));
  const days = leaveWorkingDaysInRange(startIso, endIso, policy);
  const emp = (state.employeeRecords || []).find(r => r.id === empRecordId);
  let ok = 0;
  for (const iso of days) {
    const id = leaveRecordId(empRecordId, iso);
    if (!(state.leaveRecords || []).some(r => r.id === id)) continue;
    const done = await setLeaveDay(empRecordId, iso, { am: '', pm: '' }, { silent: true });
    if (done) ok++;
  }
  await logLeaveActivity(`cleared ${ok} leave day${ok === 1 ? '' : 's'} for ${emp ? emp.fullName : empRecordId}`);
  showToast(ok ? `${ok} day${ok === 1 ? '' : 's'} cleared` : 'Nothing to clear', ok ? 'info' : 'error');
  renderLeave();
}

// ---- Holidays -------------------------------------------------------------

async function saveLeaveHolidayRange(name, startIso, endIso, type) {
  if (!canCurrentUserAccessLeave()) { showToast('Access denied', 'error'); return; }
  const cur = lvParse(startIso);
  const end = lvParse(endIso);
  let count = 0, guard = 0;
  while (cur <= end && guard++ < 60) {
    const iso = lvIso(cur);
    const entry = { id: `hol-${iso}`, date: iso, name: empVal(name), type: type || 'public' };
    try { await setDoc(doc(db, "leave_holidays", entry.id), entry); count++; }
    catch (err) { console.error(err); if (isMissingLeaveTableError(err)) { leaveWriteFailed(err, 'save holiday'); return; } }
    cur.setDate(cur.getDate() + 1);
  }
  await logLeaveActivity(`added holiday "${name}" (${count} day${count === 1 ? '' : 's'} from ${toDisplayDate(startIso)})`);
  showToast(`Holiday saved (${count} day${count === 1 ? '' : 's'})`, 'success');
}

async function deleteLeaveHoliday(id) {
  if (!canCurrentUserAccessLeave()) { showToast('Access denied', 'error'); return; }
  const h = (state.leaveHolidays || []).find(x => x.id === id);
  if (!h) return;
  if (!confirm(`Remove holiday "${h.name}" on ${toDisplayDate(h.date)}?`)) return;
  try {
    await deleteDoc(doc(db, "leave_holidays", id));
    await logLeaveActivity(`removed holiday "${h.name}" on ${toDisplayDate(h.date)}`);
    showToast('Holiday removed', 'info');
  } catch (err) { console.error(err); leaveWriteFailed(err, 'remove holiday'); }
}

// Seeds only the fixed-date national holidays. Eid, Ashura, Shab-e-Barat and
// Durga Puja shift every year on the government gazette, and seeding a guess
// would silently miscount leave — HR enters those by hand.
async function seedBangladeshHolidays(year) {
  if (!canCurrentUserAccessLeave()) { showToast('Access denied', 'error'); return; }
  let added = 0, skipped = 0;
  for (const h of BD_FIXED_HOLIDAYS) {
    const iso = `${year}-${h.md}`;
    if (isLeaveHoliday(iso)) { skipped++; continue; }
    try {
      await setDoc(doc(db, "leave_holidays", `hol-${iso}`), { id: `hol-${iso}`, date: iso, name: h.name, type: 'public' });
      added++;
    } catch (err) { console.error(err); }
  }
  await logLeaveActivity(`loaded ${added} fixed-date Bangladesh holidays for ${year}`);
  showToast(`${added} added${skipped ? `, ${skipped} already there` : ''}. Add Eid, Ashura and Durga Puja manually — those dates move each year.`, 'success');
}

// ---- Policy ---------------------------------------------------------------

async function saveLeavePolicy(year, patch) {
  if (!canCurrentUserAccessLeave()) { showToast('Access denied', 'error'); return; }
  const merged = { ...getLeavePolicy(year), ...patch, id: String(year) };
  try {
    await setDoc(doc(db, "leave_policy", String(year)), merged);
    await logLeaveActivity(`updated ${year} leave policy`);
    showToast('Policy saved', 'success');
  } catch (err) { console.error(err); leaveWriteFailed(err, 'save policy'); }
}

// ---- Rendering ------------------------------------------------------------

function lvAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Employees eligible for the Leave view, honouring the active/former filter.
// Leave keys off the Employee Database because that's HR's source of truth and
// it's the only list carrying joinDate.
function leaveEmployees(includeInactive) {
  return (state.employeeRecords || [])
    .filter(r => includeInactive || empVal(r.status).toLowerCase() !== 'inactive')
    .sort((a, b) => empVal(a.fullName).localeCompare(empVal(b.fullName)));
}

function leaveEmptyState(msg) {
  return `<div class="lv-empty">${escapeHtml(msg)}</div>`;
}

function renderLeave() {
  if (state.currentView !== 'leave') return;
  renderLeaveSetupBanner();
  refreshLeaveFilterOptions();
  const tab = state.leaveTab || 'grid';
  document.querySelectorAll('#leave-view .leave-tab').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-leave-tab') === tab);
  });
  document.querySelectorAll('#leave-view .leave-tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `leave-tab-${tab}`);
  });
  if (tab === 'grid') renderLeaveGrid();
  else if (tab === 'balances') renderLeaveBalances();
  else if (tab === 'person') renderLeavePerson();
  else if (tab === 'calendar') renderLeaveCalendar();
}

// Shown until the leave_* tables exist. Everything else in the view still
// renders (employees load from the Employee Database), so without this the
// only clue is a PostgREST error on the first click.
function renderLeaveSetupBanner() {
  const el = document.getElementById('leave-setup-banner');
  if (!el) return;
  if (!state.leaveStorageMissing) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = `
    <h4>Leave storage isn't set up yet</h4>
    <p>The four <code>leave_*</code> tables don't exist in Supabase, so nothing can be saved.
    Open your Supabase project &rarr; <strong>SQL Editor</strong> &rarr; <strong>New query</strong>,
    paste the contents of <code>supabase_migration.sql</code> from the repo, and run it.
    It is safe to run more than once. Reload this page afterwards.</p>`;
}

function renderLeaveLegend() {
  const el = document.getElementById('leave-legend');
  if (!el) return;
  const items = [];
  LEAVE_TYPES.forEach(t => {
    items.push(`<span class="leave-legend-item"><span class="leave-legend-swatch" style="background:${t.color};">${escapeHtml(t.key)}</span>${escapeHtml(t.label)} (full)</span>`);
    items.push(`<span class="leave-legend-item"><span class="leave-legend-swatch" style="background:linear-gradient(to bottom, ${t.color} 0 50%, ${lvAlpha(t.color, 0.2)} 50% 100%);">${escapeHtml(t.key)}1</span>Morning &nbsp;<span class="leave-legend-swatch" style="background:linear-gradient(to bottom, ${lvAlpha(t.color, 0.2)} 0 50%, ${t.color} 50% 100%);">${escapeHtml(t.key)}2</span>Afternoon</span>`);
  });
  items.push(`<span class="leave-legend-item"><span class="leave-legend-swatch" style="background:rgba(255,255,255,0.12); position:relative;"><span style="position:absolute;left:2px;right:2px;bottom:2px;height:2px;background:#ef4444;border-radius:1px;"></span></span>Unpaid day</span>`);
  items.push(`<span class="leave-legend-item"><span class="leave-legend-swatch" style="background:rgba(52,211,153,0.35);"></span>Holiday</span>`);
  items.push(`<span class="leave-legend-item"><span class="leave-legend-swatch" style="background:rgba(255,255,255,0.12);"></span>Weekend</span>`);
  el.innerHTML = items.join('');
}

// ---- Tab: Month Grid ------------------------------------------------------

function renderLeaveGrid() {
  const wrap = document.getElementById('leave-grid-wrap');
  if (!wrap) return;

  const year = state.leaveYear;
  const month = state.leaveMonth;
  const policy = getLeavePolicy(year);
  const label = document.getElementById('leave-month-label');
  if (label) label.textContent = `${LEAVE_MONTH_NAMES[month - 1]} ${year}`;

  // "Today" is a no-op while the current month is already showing, so it
  // shouldn't look like a live action there.
  const todayBtn = document.getElementById('leave-today-btn');
  if (todayBtn) {
    const now = new Date();
    const onCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    todayBtn.disabled = onCurrentMonth;
    todayBtn.title = onCurrentMonth
      ? 'Already showing the current month'
      : `Jump to ${LEAVE_MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  }

  renderLeaveLegend();
  renderLeaveLog();

  const all = leaveEmployees(state.leaveActiveFilter === 'all');
  if (!all.length) {
    wrap.innerHTML = leaveEmptyState('No employees yet. Add people in the Employee Database first — leave records attach to those records.');
    return;
  }

  const search = empVal(state.leaveSearchFilter).toLowerCase();
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const rows = [];

  all.forEach(emp => {
    if (search && !(`${empVal(emp.fullName)} ${empVal(emp.employeeId)}`.toLowerCase().includes(search))) return;
    if (state.leaveOfficeFilter !== 'all' && empVal(emp.officeSpace) !== state.leaveOfficeFilter) return;
    const ledger = computeLeaveLedger(emp.id, year);
    const totals = leaveMonthTotals(ledger, year, month);
    const tookLeave = totals.absence + totals.wfh > 0;

    if (state.leaveStatusFilter === 'hasleave' && !tookLeave) return;
    if (state.leaveStatusFilter === 'noleave' && tookLeave) return;
    if (state.leaveStatusFilter === 'unpaid' && totals.unpaid <= 0) return;
    if (state.leaveStatusFilter === 'exhausted' && ledger.excess.vacation <= 0 && ledger.excess.sick <= 0) return;
    if (state.leaveTypeFilter !== 'all') {
      const hasType = ledger.slots.some(s => String(s.date).startsWith(monthPrefix) && s.code === state.leaveTypeFilter);
      if (!hasType) return;
    }
    rows.push({ emp, ledger, totals });
  });

  const days = lvDaysInMonth(year, month);
  const today = lvToday();

  let head1 = `<tr><th class="lv-name-col" rowspan="2">Employee</th>`;
  let head2 = `<tr>`;
  for (let d = 1; d <= days; d++) {
    const iso = `${monthPrefix}-${String(d).padStart(2, '0')}`;
    const hol = leaveHolidayFor(iso);
    const wknd = isLeaveWeekend(iso, policy);
    const cls = hol ? 'lv-holiday' : wknd ? 'lv-weekend' : '';
    const title = hol ? ` title="${escapeHtml(hol.name)}"` : '';
    head1 += `<th class="lv-day-head ${cls}"${title}>${LEAVE_DOW[lvParse(iso).getDay()].charAt(0)}</th>`;
    head2 += `<th class="lv-day-head ${cls}"${title}>${d}</th>`;
  }
  head1 += `<th class="lv-total-head lv-t1" rowspan="2" title="Days genuinely not worked — excludes WFH and holidays">Absence</th>`;
  head1 += `<th class="lv-total-head lv-t2" rowspan="2">Vacation</th>`;
  head1 += `<th class="lv-total-head lv-t3" rowspan="2">Sick</th>`;
  head1 += `<th class="lv-total-head lv-t4" rowspan="2">WFH</th>`;
  head1 += `<th class="lv-total-head lv-t5" rowspan="2" title="Days outside entitlement or falling in a blackout month">Unpaid</th>`;
  head1 += `</tr>`;
  head2 += `</tr>`;

  const body = rows.map(({ emp, ledger, totals }) => {
    let tds = `<td class="lv-name-col" title="${escapeHtml(empVal(emp.designation))}">${escapeHtml(empVal(emp.fullName))}<span class="lv-name-id">${escapeHtml(empVal(emp.employeeId))}</span></td>`;
    for (let d = 1; d <= days; d++) {
      const iso = `${monthPrefix}-${String(d).padStart(2, '0')}`;
      const hol = leaveHolidayFor(iso);
      const wknd = isLeaveWeekend(iso, policy);
      const slotInfo = ledger.byDate[iso] || {};
      const am = slotInfo.am ? slotInfo.am.code : '';
      const pm = slotInfo.pm ? slotInfo.pm.code : '';
      const unpaid = (slotInfo.am && slotInfo.am.classification === 'unpaid') ||
                     (slotInfo.pm && slotInfo.pm.classification === 'unpaid');

      const classes = ['lv-cell'];
      if (hol) classes.push('lv-holiday');
      else if (wknd) classes.push('lv-weekend');
      // A code recorded on a weekend or holiday costs nothing, so it must not
      // look like one that did.
      if ((am || pm) && (hol || wknd)) classes.push('lv-skipped');
      if (unpaid) classes.push('lv-unpaid');
      if (iso === today) classes.push('lv-today');

      let style = '', text = '', title = '';
      if (am || pm) {
        const cAm = am ? lvTypeDef(am).color : null;
        const cPm = pm ? lvTypeDef(pm).color : null;
        if (am && pm && am === pm) {
          style = `background:${lvAlpha(cAm, 0.22)};color:${cAm};`;
        } else if (am && pm) {
          style = `background:linear-gradient(to bottom, ${lvAlpha(cAm, 0.22)} 0 50%, ${lvAlpha(cPm, 0.22)} 50% 100%);color:#e2e8f0;`;
        } else if (am) {
          style = `background:linear-gradient(to bottom, ${lvAlpha(cAm, 0.22)} 0 50%, transparent 50% 100%);color:${cAm};`;
        } else {
          style = `background:linear-gradient(to bottom, transparent 0 50%, ${lvAlpha(cPm, 0.22)} 50% 100%);color:${cPm};`;
        }
        text = lvCellHtml(am, pm);
        title = lvCellTitle(am, pm);
        if (unpaid) title += ' — unpaid';
        if (hol) title += ` (on holiday: ${hol.name} — not counted)`;
        else if (wknd) title += ' (on weekend — not counted)';
      } else if (hol) {
        title = hol.name;
      }

      const clickable = !hol && !wknd;
      tds += `<td class="${classes.join(' ')}"${style ? ` style="${style}"` : ''}` +
             `${title ? ` title="${escapeHtml(title)}"` : ''}` +
             `${clickable ? ` data-lv-emp="${escapeHtml(emp.id)}" data-lv-date="${iso}"` : ''}>${text}</td>`;
    }
    tds += `<td class="lv-total lv-t1">${totals.absence ? lvDays(totals.absence) : ''}</td>`;
    tds += `<td class="lv-total lv-t2">${totals.vacation ? lvDays(totals.vacation) : ''}</td>`;
    tds += `<td class="lv-total lv-t3">${totals.sick ? lvDays(totals.sick) : ''}</td>`;
    tds += `<td class="lv-total lv-t4">${totals.wfh ? lvDays(totals.wfh) : ''}</td>`;
    tds += `<td class="lv-total lv-t5 lv-total-unpaid">${totals.unpaid ? lvDays(totals.unpaid) : ''}</td>`;
    return `<tr>${tds}</tr>`;
  }).join('');

  if (!rows.length) {
    wrap.innerHTML = leaveEmptyState('No employees match these filters.');
    return;
  }

  wrap.innerHTML = `<table class="leave-grid"><thead>${head1}${head2}</thead><tbody>${body}</tbody></table>`;
}

// ---- Tab: Balances --------------------------------------------------------

function leaveBalanceRows(year, opts) {
  const search = empVal(opts.search).toLowerCase();
  return leaveEmployees(true)
    .filter(emp => empVal(emp.status).toLowerCase() !== 'inactive')
    .filter(emp => !search || `${empVal(emp.fullName)} ${empVal(emp.employeeId)}`.toLowerCase().includes(search))
    .filter(emp => opts.office === 'all' || empVal(emp.officeSpace) === opts.office)
    .map(emp => {
      const l = computeLeaveLedger(emp.id, year);
      return {
        emp, ledger: l,
        fullName: empVal(emp.fullName),
        employeeId: empVal(emp.employeeId),
        vacUsed: l.used.vacation, vacLeft: l.remaining.vacation,
        sickUsed: l.used.sick, sickLeft: l.remaining.sick,
        wfh: l.wfhDays, unpaid: l.unpaidDays
      };
    })
    .filter(r => {
      if (opts.status === 'unpaid') return r.unpaid > 0;
      if (opts.status === 'exhausted') return r.ledger.excess.vacation > 0 || r.ledger.excess.sick > 0;
      if (opts.status === 'low') return r.vacLeft < 3 || r.sickLeft < 3;
      if (opts.status === 'noleave') return r.vacUsed === 0 && r.sickUsed === 0 && r.wfh === 0;
      return true;
    });
}

function renderLeaveBalances() {
  const body = document.getElementById('leave-balances-body');
  if (!body) return;
  const year = state.leaveBalYear;
  const lbl = document.getElementById('leave-bal-year-label');
  if (lbl) lbl.textContent = String(year);

  const rows = leaveBalanceRows(year, {
    search: state.leaveBalSearch,
    office: state.leaveBalOfficeFilter,
    status: state.leaveBalStatusFilter
  });

  const col = state.leaveBalSortCol || 'fullName';
  const dir = state.leaveBalSortDir === 'desc' ? -1 : 1;
  rows.sort((a, b) => {
    const x = a[col], y = b[col];
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
    return String(x).localeCompare(String(y)) * dir;
  });

  document.querySelectorAll('#leave-tab-balances th.sortable-th').forEach(th => {
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = th.getAttribute('data-lbsort') === col ? (dir === 1 ? '↑' : '↓') : '↕';
  });

  // Headline stats across everyone shown.
  const stats = rows.reduce((a, r) => {
    a.vacUsed += r.vacUsed; a.sickUsed += r.sickUsed; a.wfh += r.wfh; a.unpaid += r.unpaid;
    if (r.ledger.excess.vacation > 0 || r.ledger.excess.sick > 0) a.over++;
    return a;
  }, { vacUsed: 0, sickUsed: 0, wfh: 0, unpaid: 0, over: 0 });

  const statsEl = document.getElementById('leave-balances-stats');
  if (statsEl) {
    statsEl.innerHTML = [
      { v: rows.length, l: 'Employees' },
      { v: lvDays(stats.vacUsed), l: 'Vacation days used' },
      { v: lvDays(stats.sickUsed), l: 'Sick days used' },
      { v: lvDays(stats.wfh), l: 'WFH days' },
      { v: lvDays(stats.unpaid), l: 'Unpaid days' },
      { v: stats.over, l: 'Over entitlement' }
    ].map(s => `<div class="leave-stat"><div class="lv-stat-val">${escapeHtml(String(s.v))}</div><div class="lv-stat-label">${escapeHtml(s.l)}</div></div>`).join('');
  }

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="10">${leaveEmptyState('No employees match these filters.')}</td></tr>`;
    return;
  }

  body.innerHTML = rows.map(r => {
    const ent = r.ledger.entitlement;
    const bar = (used, total, color) => {
      const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
      return `<div class="lv-bar"><span style="width:${pct}%;background:${used > total ? '#ef4444' : color};"></span></div>`;
    };
    let status = '<span style="color:#34d399;">On track</span>';
    if (r.ledger.excess.vacation > 0 || r.ledger.excess.sick > 0) status = '<span style="color:#f87171;">Over entitlement</span>';
    else if (r.unpaid > 0) status = '<span style="color:#fbbf24;">Has unpaid days</span>';
    else if (r.vacLeft < 3 || r.sickLeft < 3) status = '<span style="color:#fbbf24;">Low balance</span>';

    return `<tr>
      <td style="color:#e2e8f0;">${escapeHtml(r.fullName)}</td>
      <td style="color:#94a3b8;">${escapeHtml(r.employeeId)}</td>
      <td style="color:#94a3b8;">${escapeHtml(empVal(r.emp.officeSpace))}</td>
      <td style="text-align:right;">${lvDays(r.vacUsed)} <span style="color:#64748b;">/ ${lvDays(ent.vacation)}</span>${bar(r.vacUsed, ent.vacation, '#38bdf8')}</td>
      <td style="text-align:right; color:${r.vacLeft < 3 ? '#fbbf24' : '#e2e8f0'};">${lvDays(r.vacLeft)}</td>
      <td style="text-align:right;">${lvDays(r.sickUsed)} <span style="color:#64748b;">/ ${lvDays(ent.sick)}</span>${bar(r.sickUsed, ent.sick, '#f472b6')}</td>
      <td style="text-align:right; color:${r.sickLeft < 3 ? '#fbbf24' : '#e2e8f0'};">${lvDays(r.sickLeft)}</td>
      <td style="text-align:right; color:#fbbf24;">${lvDays(r.wfh)}</td>
      <td style="text-align:right; color:${r.unpaid > 0 ? '#f87171' : '#64748b'};">${lvDays(r.unpaid)}</td>
      <td>${status}</td>
    </tr>`;
  }).join('');
}

// ---- Tab: Person year view ------------------------------------------------

function renderLeavePerson() {
  const body = document.getElementById('leave-person-body');
  const sel = document.getElementById('leave-person-select');
  if (!body || !sel) return;

  const year = state.leavePersonYear;
  const lbl = document.getElementById('leave-person-year-label');
  if (lbl) lbl.textContent = String(year);

  const emps = leaveEmployees(true);
  if (!emps.length) {
    sel.innerHTML = '<option value="">No employees</option>';
    body.innerHTML = leaveEmptyState('No employees yet. Add people in the Employee Database first.');
    return;
  }
  if (!state.leavePersonId || !emps.some(e => e.id === state.leavePersonId)) {
    state.leavePersonId = emps[0].id;
  }
  sel.innerHTML = emps.map(e =>
    `<option value="${escapeHtml(e.id)}"${e.id === state.leavePersonId ? ' selected' : ''}>${escapeHtml(empVal(e.fullName))}${empVal(e.employeeId) ? ` (${escapeHtml(empVal(e.employeeId))})` : ''}</option>`
  ).join('');

  const emp = emps.find(e => e.id === state.leavePersonId);
  const l = computeLeaveLedger(emp.id, year);
  const policy = l.policy;

  const stats = `<div class="leave-stat-row">
    <div class="leave-stat"><div class="lv-stat-val">${lvDays(l.remaining.vacation)}</div><div class="lv-stat-label">Vacation left of ${lvDays(l.entitlement.vacation)}</div></div>
    <div class="leave-stat"><div class="lv-stat-val">${lvDays(l.remaining.sick)}</div><div class="lv-stat-label">Sick left of ${lvDays(l.entitlement.sick)}</div></div>
    <div class="leave-stat"><div class="lv-stat-val">${lvDays(l.wfhDays)}</div><div class="lv-stat-label">WFH days</div></div>
    <div class="leave-stat"><div class="lv-stat-val">${lvDays(l.absenceDays)}</div><div class="lv-stat-label">Days not worked</div></div>
    <div class="leave-stat"><div class="lv-stat-val" style="color:${l.unpaidDays > 0 ? '#f87171' : '#fff'};">${lvDays(l.unpaidDays)}</div><div class="lv-stat-label">Unpaid days</div></div>
  </div>`;

  const joinNote = (() => {
    const jd = toIsoDate(emp.joinDate);
    if (jd && /^\d{4}-\d{2}-\d{2}$/.test(jd) && +jd.slice(0, 4) === year && policy.prorateJoiners) {
      const months = 12 - (+jd.slice(5, 7)) + 1;
      return `<p class="lv-panel-hint">Joined ${toDisplayDate(jd)} — entitlement pro-rated over ${months} month${months === 1 ? '' : 's'} of ${year}.</p>`;
    }
    return '';
  })();

  // Twelve mini-calendars for the year.
  let months = '';
  for (let m = 1; m <= 12; m++) {
    const days = lvDaysInMonth(year, m);
    const first = lvParse(`${year}-${String(m).padStart(2, '0')}-01`).getDay();
    let cells = LEAVE_DOW.map(d => `<div class="lv-mini-cell lv-mini-head">${d.charAt(0)}</div>`).join('');
    for (let i = 0; i < first; i++) cells += '<div class="lv-mini-cell lv-mini-empty"></div>';
    for (let d = 1; d <= days; d++) {
      const iso = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const info = l.byDate[iso] || {};
      const am = info.am ? info.am.code : '';
      const pm = info.pm ? info.pm.code : '';
      const hol = leaveHolidayFor(iso);
      const wknd = isLeaveWeekend(iso, policy);
      let style = '', title = `${toDisplayDate(iso)}`, cls = 'lv-mini-cell';
      if (am || pm) {
        const cAm = am ? lvTypeDef(am).color : null;
        const cPm = pm ? lvTypeDef(pm).color : null;
        if (am && pm && am === pm) style = `background:${lvAlpha(cAm, 0.35)};color:${cAm};`;
        else if (am && pm) style = `background:linear-gradient(to bottom, ${lvAlpha(cAm, 0.35)} 0 50%, ${lvAlpha(cPm, 0.35)} 50% 100%);color:#e2e8f0;`;
        else if (am) style = `background:linear-gradient(to bottom, ${lvAlpha(cAm, 0.35)} 0 50%, rgba(255,255,255,0.03) 50% 100%);color:${cAm};`;
        else style = `background:linear-gradient(to bottom, rgba(255,255,255,0.03) 0 50%, ${lvAlpha(cPm, 0.35)} 50% 100%);color:${cPm};`;
        title += ` — ${lvCellTitle(am, pm)}`;
        const skipped = (info.am || info.pm || {}).classification === 'skipped';
        const isUnpaid = (info.am && info.am.classification === 'unpaid') || (info.pm && info.pm.classification === 'unpaid');
        if (skipped) { cls += ' lv-skipped'; title += hol ? ` (${hol.name} — not counted)` : ' (weekend — not counted)'; }
        else if (isUnpaid) { style += 'box-shadow: inset 0 -2px 0 0 #ef4444;'; title += ' — unpaid'; }
      } else if (hol) {
        style = 'background:rgba(52,211,153,0.18);color:#34d399;';
        title += ` — ${hol.name}`;
      } else if (wknd) {
        style = 'background:rgba(255,255,255,0.06);';
        title += ' — weekend';
      }
      cells += `<div class="${cls}" style="${style}" title="${escapeHtml(title)}">${d}</div>`;
    }
    months += `<div class="lv-month-card"><h5>${LEAVE_MONTH_NAMES[m - 1]}</h5><div class="lv-mini">${cells}</div></div>`;
  }

  // The ledger itself — one line per half-day, in the order the engine
  // classified them. This is the answer to "why is this day unpaid?".
  const ledgerRows = l.slots.length ? l.slots.map(s => {
    const def = lvTypeDef(s.code);
    const cls = s.classification;
    const colour = cls === 'unpaid' ? '#f87171' : cls === 'skipped' ? '#64748b' : '#34d399';
    const word = cls === 'skipped' ? `Not counted (${s.reason})` : cls === 'unpaid' ? `Unpaid — ${s.reason}` : 'Paid';
    return `<tr>
      <td style="color:#e2e8f0;">${escapeHtml(toDisplayDate(s.date))}</td>
      <td style="color:#94a3b8;">${escapeHtml(LEAVE_DOW[lvParse(s.date).getDay()])}</td>
      <td style="color:${def ? def.color : '#e2e8f0'};">${escapeHtml(def ? def.label : s.code)}</td>
      <td style="color:#94a3b8;">${s.slot === 'am' ? 'Morning' : 'Afternoon'}</td>
      <td style="text-align:right; color:#cbd5e1;">${s.classification === 'skipped' ? '0' : '0.5'}</td>
      <td style="color:${colour};">${escapeHtml(word)}</td>
      <td style="color:#64748b;">${escapeHtml(empVal(s.note))}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="7">${leaveEmptyState(`No leave recorded for ${escapeHtml(empVal(emp.fullName))} in ${year}.`)}</td></tr>`;

  body.innerHTML = stats + joinNote + `<div class="lv-year-grid">${months}</div>` +
    `<div class="lv-panel"><h4>Leave ledger — ${escapeHtml(empVal(emp.fullName))}, ${year}</h4>
      <p class="lv-panel-hint">Every half-day in the order it was counted. Paid or unpaid is recalculated from scratch each time this loads, so correcting an earlier day automatically reclassifies the ones after it.</p>
      <div class="tasks-table-container" style="max-height: 420px; overflow: auto;">
        <table class="tasks-table" style="width:100%; border-collapse:collapse; white-space:nowrap;">
          <thead><tr>
            <th style="text-align:left;">Date</th><th style="text-align:left;">Day</th>
            <th style="text-align:left;">Type</th><th style="text-align:left;">Half</th>
            <th style="text-align:right;">Days</th><th style="text-align:left;">Counted as</th>
            <th style="text-align:left;">Note</th>
          </tr></thead>
          <tbody>${ledgerRows}</tbody>
        </table>
      </div>
    </div>`;
}

// ---- Tab: Calendar & Policy ----------------------------------------------

function renderLeaveCalendar() {
  const polEl = document.getElementById('leave-policy-panel');
  const holEl = document.getElementById('leave-holidays-panel');
  if (!polEl || !holEl) return;

  const year = state.leaveCalYear;
  const lbl = document.getElementById('leave-cal-year-label');
  if (lbl) lbl.textContent = String(year);
  const p = getLeavePolicy(year);

  const monthChecks = LEAVE_MONTH_NAMES.map((m, i) =>
    `<label class="lv-check"><input type="checkbox" data-lv-blackout-month="${i + 1}"${(p.blackoutMonths || []).includes(i + 1) ? ' checked' : ''}>${m.slice(0, 3)}</label>`
  ).join('');

  const typeChecks = LEAVE_TYPES.map(t =>
    `<label class="lv-check"><input type="checkbox" data-lv-blackout-type="${t.key}"${(p.blackoutApplies || []).includes(t.key) ? ' checked' : ''}>${escapeHtml(t.label)}</label>`
  ).join('');

  const dowChecks = LEAVE_DOW.map((d, i) =>
    `<label class="lv-check"><input type="checkbox" data-lv-weekend-day="${i}"${(p.weekendDays || []).includes(i) ? ' checked' : ''}>${d}</label>`
  ).join('');

  polEl.innerHTML = `<div class="lv-panel">
    <h4>Leave policy — ${year}</h4>
    <p class="lv-panel-hint">Applies to this leave year only. Every year gets its own settings, so changing next year's entitlement never rewrites this year's history. No salary or payroll values are stored anywhere — "unpaid" here only means a day that fell outside entitlement.</p>
    <div class="lv-policy-grid">
      <div class="lv-field"><label for="lv-pol-vac">Vacation days per year</label><input type="number" id="lv-pol-vac" min="0" max="365" step="0.5" value="${p.vacationDays}"></div>
      <div class="lv-field"><label for="lv-pol-sick">Sick days per year</label><input type="number" id="lv-pol-sick" min="0" max="365" step="0.5" value="${p.sickDays}"></div>
    </div>

    <div class="lv-field" style="margin-top:24px;"><label>Weekend (non-working days)</label><div class="lv-check-row">${dowChecks}</div></div>
    <div class="lv-field" style="margin-top:16px;"><label>Blackout months — leave taken here is unpaid</label><div class="lv-check-row">${monthChecks}</div></div>
    <div class="lv-field" style="margin-top:16px;"><label>Blackout applies to</label><div class="lv-check-row">${typeChecks}</div></div>

    <div class="lv-check-row" style="margin-top:24px;">
      <label class="lv-check"><input type="checkbox" id="lv-pol-burns"${p.blackoutBurnsBalance ? ' checked' : ''}>Blackout days also deduct from the balance</label>
      <label class="lv-check"><input type="checkbox" id="lv-pol-prorate"${p.prorateJoiners ? ' checked' : ''}>Pro-rate entitlement for mid-year joiners</label>
      <label class="lv-check"><input type="checkbox" id="lv-pol-wfh"${p.wfhConsumesVacation ? ' checked' : ''}>Work From Home consumes the vacation balance by default</label>
    </div>
    <p class="lv-panel-hint" style="margin:16px 0 0;">The WFH setting is the default for new entries. Any individual WFH day can be flagged differently when it's entered.</p>

    <div style="margin-top:24px; display:flex; justify-content:flex-end;">
      <button type="button" class="btn-primary" id="lv-pol-save">Save Policy</button>
    </div>
  </div>`;

  const holidays = (state.leaveHolidays || [])
    .filter(h => String(h.date).slice(0, 4) === String(year))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const holRows = holidays.length ? holidays.map(h => `<tr>
      <td style="color:#e2e8f0;">${escapeHtml(toDisplayDate(h.date))}</td>
      <td style="color:#94a3b8;">${escapeHtml(LEAVE_DOW[lvParse(h.date).getDay()])}</td>
      <td style="color:#e2e8f0;">${escapeHtml(empVal(h.name))}</td>
      <td style="color:#94a3b8;">${h.type === 'company' ? 'Company closure' : 'Public holiday'}</td>
      <td style="text-align:right;"><button type="button" class="btn-secondary" data-lv-del-holiday="${escapeHtml(h.id)}" style="height:32px; padding:0 12px; font-size:0.76rem;">Remove</button></td>
    </tr>`).join('')
    : `<tr><td colspan="5">${leaveEmptyState(`No holidays set for ${year}. Leave taken on an unlisted holiday will still consume balance.`)}</td></tr>`;

  holEl.innerHTML = `<div class="lv-panel">
    <h4>Holidays &amp; company closures — ${year}</h4>
    <p class="lv-panel-hint">Days listed here never consume leave balance, and a leave range entered across them skips them automatically. "Load Bangladesh Holidays" adds the fixed-date national holidays only — Eid, Ashura, Shab-e-Barat and Durga Puja move every year on the government gazette, so add those by hand rather than trusting a guess.</p>
    <div class="tasks-table-container" style="max-height: 420px; overflow:auto;">
      <table class="tasks-table" style="width:100%; border-collapse:collapse; white-space:nowrap;">
        <thead><tr>
          <th style="text-align:left;">Date</th><th style="text-align:left;">Day</th>
          <th style="text-align:left;">Name</th><th style="text-align:left;">Type</th>
          <th style="text-align:right;">Actions</th>
        </tr></thead>
        <tbody>${holRows}</tbody>
      </table>
    </div>
    <div class="lv-panel-actions">
      <button type="button" class="btn-secondary" id="leave-seed-holidays-btn">Load Bangladesh Holidays</button>
      <button type="button" class="btn-secondary" id="leave-add-holiday-btn">+ Add Holiday</button>
    </div>
  </div>`;
}

// ---- Change log & badge ---------------------------------------------------

function renderLeaveLog() {
  const list = document.getElementById('leave-log-list');
  if (!list) return;
  const logs = state.leaveLog || [];
  if (!logs.length) { list.innerHTML = '<div style="color:#64748b; padding:12px;">No changes logged yet.</div>'; return; }
  list.innerHTML = logs.map(l => `<div style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.83rem;">
    <span style="color:#e2e8f0;">${escapeHtml(empVal(l.user))}</span>
    <span style="color:#cbd5e1;"> ${escapeHtml(empVal(l.action))}</span>
    <span style="color:#64748b; float:right;">${escapeHtml(String(l.timestamp || '').replace('T', ' ').slice(0, 16))}</span>
  </div>`).join('');
}

// Sidebar badge + dashboard pill: how many people are out today. Only ever
// rendered for someone who holds Leave access.
function updateLeaveBadge() {
  const badge = document.getElementById('leave-badge');
  const pill = document.getElementById('dashboard-leave-badge');
  if (!badge && !pill) return;
  if (!canCurrentUserAccessLeave()) {
    if (badge) badge.style.display = 'none';
    if (pill) pill.style.display = 'none';
    return;
  }
  const today = lvToday();
  const policy = getLeavePolicy(+today.slice(0, 4));
  let count = 0;
  if (isLeaveWorkingDay(today, policy)) {
    const ids = new Set(leaveEmployees(false).map(e => e.id));
    count = (state.leaveRecords || []).filter(r =>
      r.date === today && ids.has(r.empRecordId) && (empVal(r.am) || empVal(r.pm))
    ).length;
  }
  if (badge) {
    badge.textContent = String(count);
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
  if (pill) {
    pill.textContent = `${count} out today`;
    pill.style.display = count > 0 ? 'inline-flex' : 'none';
  }
}

// ---- Cell popover ---------------------------------------------------------

function closeLeavePopover() {
  const el = document.getElementById('leave-popover');
  if (el) el.remove();
}

function openLeavePopover(cellEl, empRecordId, dateIso) {
  closeLeavePopover();
  if (!canCurrentUserAccessLeave()) return;
  const emp = (state.employeeRecords || []).find(r => r.id === empRecordId);
  if (!emp) return;
  const rec = (state.leaveRecords || []).find(r => r.id === leaveRecordId(empRecordId, dateIso));
  const am = rec ? empVal(rec.am) : '';
  const pm = rec ? empVal(rec.pm) : '';
  const policy = getLeavePolicy(+dateIso.slice(0, 4));
  const hasWfh = am === LV_WFH || pm === LV_WFH;
  const wfhCounts = rec && rec.wfhCounts !== undefined ? rec.wfhCounts : !!policy.wfhConsumesVacation;

  const row = (slot, label, active) => `
    <div class="lv-pop-label">${label}</div>
    <div class="lv-pop-row">${LEAVE_TYPES.map(t =>
      `<button type="button" class="lv-pop-btn${active === t.key ? ' active' : ''}" data-lv-set="${slot}" data-lv-code="${t.key}" title="${escapeHtml(t.label)}">${t.key}</button>`
    ).join('')}</div>`;

  const el = document.createElement('div');
  el.id = 'leave-popover';
  el.className = 'leave-popover';
  el.innerHTML = `
    <h4>${escapeHtml(empVal(emp.fullName))}</h4>
    <p class="lv-pop-date">${escapeHtml(toDisplayDate(dateIso))} · ${escapeHtml(LEAVE_DOW[lvParse(dateIso).getDay()])}</p>
    ${row('full', 'Full day', am && pm && am === pm ? am : '')}
    ${row('am', 'Morning', am)}
    ${row('pm', 'Afternoon', pm)}
    ${hasWfh ? `<label class="lv-check" style="margin-top:12px; font-size:0.74rem;">
      <input type="checkbox" id="lv-pop-wfh"${wfhCounts ? ' checked' : ''}>Counts against vacation</label>` : ''}
    ${(am || pm) ? '<button type="button" class="lv-pop-clear" data-lv-clear="1">Clear this day</button>' : ''}
  `;
  document.body.appendChild(el);

  const r = cellEl.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  let left = r.left + r.width / 2 - w / 2;
  let top = r.bottom + 8;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;

  el.querySelectorAll('[data-lv-set]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const slot = btn.getAttribute('data-lv-set');
      const code = btn.getAttribute('data-lv-code');
      closeLeavePopover();
      const patch = { wfhCounts: code === LV_WFH ? wfhCounts : undefined };
      if (slot === 'full') {
        // Clicking the already-set full day toggles it off.
        const already = am === code && pm === code;
        patch.am = already ? '' : code;
        patch.pm = already ? '' : code;
      } else if (slot === 'am') {
        patch.am = am === code ? '' : code;
      } else {
        patch.pm = pm === code ? '' : code;
      }
      await setLeaveDay(empRecordId, dateIso, patch);
      updateLeaveBadge();
    });
  });

  const wfhCb = el.querySelector('#lv-pop-wfh');
  if (wfhCb) wfhCb.addEventListener('change', async () => {
    await setLeaveDay(empRecordId, dateIso, { wfhCounts: wfhCb.checked });
    closeLeavePopover();
  });

  const clearBtn = el.querySelector('[data-lv-clear]');
  if (clearBtn) clearBtn.addEventListener('click', async () => {
    closeLeavePopover();
    await setLeaveDay(empRecordId, dateIso, { am: '', pm: '' });
    updateLeaveBadge();
  });
}

// ---- Entry modal ----------------------------------------------------------

function openLeaveEntryModal(prefill) {
  if (!canCurrentUserAccessLeave()) { showToast('Access denied', 'error'); return; }
  const modal = document.getElementById('leave-entry-modal');
  if (!modal) return;
  const q = (id) => document.getElementById(id);

  const emps = leaveEmployees(true);
  if (!emps.length) { showToast('Add employees in the Employee Database first', 'error'); return; }
  q('leave-entry-employee').innerHTML = emps.map(e =>
    `<option value="${escapeHtml(e.id)}">${escapeHtml(empVal(e.fullName))}${empVal(e.employeeId) ? ` (${escapeHtml(empVal(e.employeeId))})` : ''}</option>`
  ).join('');
  q('leave-entry-type').innerHTML = LEAVE_TYPES.map(t =>
    `<option value="${t.key}">${escapeHtml(t.label)} (${t.key})</option>`
  ).join('');

  const p = prefill || {};
  const defaultDate = p.date || lvToday();
  q('leave-entry-employee').value = p.empRecordId || emps[0].id;
  q('leave-entry-start').value = defaultDate;
  q('leave-entry-end').value = defaultDate;
  q('leave-entry-multi').checked = false;
  q('leave-entry-end-group').style.display = 'none';
  q('leave-entry-type').value = p.code || LV_VACATION;
  q('leave-entry-duration').value = p.duration || 'full';
  q('leave-entry-note').value = '';
  q('leave-entry-wfh-counts').checked = !!getLeavePolicy(+defaultDate.slice(0, 4)).wfhConsumesVacation;
  q('leave-entry-delete-btn').style.display = 'inline-flex';

  modal.classList.add('active');
  updateLeaveEntryPreview();
}

function closeLeaveEntryModal() {
  document.getElementById('leave-entry-modal')?.classList.remove('active');
}

// Live preview of exactly what will be written, including how many of the
// days land as unpaid. Shown before saving so nothing is a surprise.
function updateLeaveEntryPreview() {
  const q = (id) => document.getElementById(id);
  const box = q('leave-entry-preview');
  if (!box) return;
  const empRecordId = q('leave-entry-employee').value;
  const start = q('leave-entry-start').value;
  const end = leaveEntryEndDate();
  const code = q('leave-entry-type').value;
  const duration = q('leave-entry-duration').value;

  const wfhGroup = q('leave-entry-wfh-group');
  if (wfhGroup) {
    wfhGroup.style.display = code === LV_WFH ? 'block' : 'none';
    const hint = q('leave-entry-wfh-hint');
    if (hint) {
      hint.textContent = getLeavePolicy(+((start || lvToday()).slice(0, 4))).wfhConsumesVacation
        ? 'Policy default for this year: WFH does consume vacation.'
        : 'Policy default for this year: WFH does not consume vacation.';
    }
  }

  if (!start || !end || end < start) { box.innerHTML = '<span class="lv-bad">Pick a valid date range.</span>'; return; }

  const policy = getLeavePolicy(+start.slice(0, 4));
  const days = leaveWorkingDaysInRange(start, end, policy);
  if (!days.length) { box.innerHTML = '<span class="lv-bad">No working days in that range — it is all weekends and holidays.</span>'; return; }

  const totalSpan = Math.round((lvParse(end) - lvParse(start)) / 86400000) + 1;
  const skipped = totalSpan - days.length;
  const per = duration === 'full' ? 1 : 0.5;
  const requested = days.length * per;

  // Dry-run the ledger with these days applied to see what lands unpaid.
  const ledger = computeLeaveLedger(empRecordId, +start.slice(0, 4));
  const bucket = leaveSlotBucket(code, { wfhCounts: q('leave-entry-wfh-counts').checked }, policy);
  let used = bucket ? ledger.used[bucket] : 0;
  const entitlement = bucket ? ledger.entitlement[bucket] : Infinity;
  let paid = 0, unpaid = 0, blackout = 0;
  days.forEach(iso => {
    const inBlackout = (policy.blackoutMonths || []).includes(+iso.slice(5, 7)) && (policy.blackoutApplies || []).includes(code);
    for (let i = 0; i < (duration === 'full' ? 2 : 1); i++) {
      if (!bucket) { paid += 0.5; continue; }
      if (inBlackout) { unpaid += 0.5; blackout += 0.5; if (policy.blackoutBurnsBalance) used += 0.5; }
      else if (used + 0.5 <= entitlement) { paid += 0.5; used += 0.5; }
      else { unpaid += 0.5; used += 0.5; }
    }
  });

  const parts = [`<strong>${lvDays(requested)} day${requested === 1 ? '' : 's'}</strong> across ${days.length} working day${days.length === 1 ? '' : 's'}.`];
  if (skipped > 0) parts.push(`<span class="lv-warn">${skipped} weekend/holiday day${skipped === 1 ? '' : 's'} skipped.</span>`);
  if (!bucket) parts.push('Does not consume any balance.');
  else {
    parts.push(`${lvDays(paid)} paid, ${unpaid > 0 ? `<span class="lv-bad">${lvDays(unpaid)} unpaid</span>` : '0 unpaid'}.`);
    if (blackout > 0) parts.push(`<span class="lv-warn">${lvDays(blackout)} fall in a blackout month.</span>`);
    const left = Math.max(0, entitlement - used);
    parts.push(`Balance after saving: <strong>${lvDays(left)}</strong> of ${lvDays(entitlement)} ${bucket} day${entitlement === 1 ? '' : 's'} left.`);
  }
  box.innerHTML = parts.join(' ');
}

// The end of the entry range: the start date unless the user ticked
// "Spans more than one day". Keeps a single day — the common case — to one
// field, and makes an inverted range impossible.
function leaveEntryEndDate() {
  const start = document.getElementById('leave-entry-start').value;
  if (!document.getElementById('leave-entry-multi').checked) return start;
  const end = document.getElementById('leave-entry-end').value;
  return (!end || end < start) ? start : end;
}

function syncLeaveEntryMulti() {
  const multi = document.getElementById('leave-entry-multi').checked;
  const group = document.getElementById('leave-entry-end-group');
  group.style.display = multi ? 'block' : 'none';
  const start = document.getElementById('leave-entry-start');
  const end = document.getElementById('leave-entry-end');
  if (multi) {
    end.min = start.value;
    if (!end.value || end.value < start.value) end.value = start.value;
  }
  updateLeaveEntryPreview();
}

// ---- Holiday modal --------------------------------------------------------

function openLeaveHolidayModal() {
  if (!canCurrentUserAccessLeave()) { showToast('Access denied', 'error'); return; }
  const modal = document.getElementById('leave-holiday-modal');
  if (!modal) return;
  // Default to today when it falls in the year being edited, otherwise the
  // first of that year — beats making HR page back from 1 January every time.
  const today = lvToday();
  const d = today.slice(0, 4) === String(state.leaveCalYear) ? today : `${state.leaveCalYear}-01-01`;
  document.getElementById('leave-holiday-name').value = '';
  document.getElementById('leave-holiday-start').value = d;
  document.getElementById('leave-holiday-end').value = d;
  document.getElementById('leave-holiday-multi').checked = false;
  document.getElementById('leave-holiday-end-group').style.display = 'none';
  document.getElementById('leave-holiday-type').value = 'public';
  modal.classList.add('active');
}
function closeLeaveHolidayModal() {
  document.getElementById('leave-holiday-modal')?.classList.remove('active');
}

function leaveHolidayEndDate() {
  const start = document.getElementById('leave-holiday-start').value;
  if (!document.getElementById('leave-holiday-multi').checked) return start;
  const end = document.getElementById('leave-holiday-end').value;
  return (!end || end < start) ? start : end;
}

function syncLeaveHolidayMulti() {
  const multi = document.getElementById('leave-holiday-multi').checked;
  const group = document.getElementById('leave-holiday-end-group');
  group.style.display = multi ? 'block' : 'none';
  const start = document.getElementById('leave-holiday-start');
  const end = document.getElementById('leave-holiday-end');
  if (multi) {
    end.min = start.value;
    if (!end.value || end.value < start.value) end.value = start.value;
  }
}

// ---- CSV export -----------------------------------------------------------

function lvCsvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function lvDownloadCsv(filename, rows) {
  const csv = rows.map(r => r.map(lvCsvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Mirrors the shape of the Google Sheet HR already reads, so the export
// stays familiar — but with the weekday row generated from the real calendar.
function exportLeaveGridCsv() {
  const year = state.leaveYear, month = state.leaveMonth;
  const policy = getLeavePolicy(year);
  const days = lvDaysInMonth(year, month);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;

  const dayNums = [], dayNames = [];
  for (let d = 1; d <= days; d++) {
    const iso = `${prefix}-${String(d).padStart(2, '0')}`;
    dayNums.push(d);
    dayNames.push(LEAVE_DOW[lvParse(iso).getDay()]);
  }
  const totalCols = ['Total Absence Days', 'Total Vacation Leave Days', 'Total Sick Leave Days', 'Total Work from Home Days', 'Total Unpaid Days'];
  const rows = [
    [`Leave Management worksheet - ${LEAVE_MONTH_NAMES[month - 1]} ${year}`],
    [],
    ['Employee no', 'Name', ...dayNames, ...totalCols],
    ['', '', ...dayNums, ...totalCols.map(() => '')]
  ];

  leaveEmployees(state.leaveActiveFilter === 'all').forEach((emp, i) => {
    const ledger = computeLeaveLedger(emp.id, year);
    const t = leaveMonthTotals(ledger, year, month);
    const cells = [];
    for (let d = 1; d <= days; d++) {
      const iso = `${prefix}-${String(d).padStart(2, '0')}`;
      const info = ledger.byDate[iso] || {};
      cells.push(lvCellCode(info.am ? info.am.code : '', info.pm ? info.pm.code : ''));
    }
    rows.push([i + 1, empVal(emp.fullName), ...cells,
      t.absence || 0, t.vacation || 0, t.sick || 0, t.wfh || 0, t.unpaid || 0]);
  });

  rows.push([]);
  rows.push(['Absence type', 'Code']);
  LEAVE_TYPES.forEach(t => {
    rows.push([`${t.label} (Full Day)`, t.key]);
    rows.push([`${t.label} (Morning)`, `${t.key}1`]);
    rows.push([`${t.label} (Afternoon)`, `${t.key}2`]);
  });
  lvDownloadCsv(`leave-grid-${prefix}.csv`, rows);
  showToast('Grid exported', 'success');
}

// The richer report: everything the sheet has, plus entitlement, remaining
// balance and the paid/unpaid split it never tracked.
function exportLeaveReportCsv() {
  const year = state.leaveYear, month = state.leaveMonth;
  const rows = [[
    'Employee ID', 'Name', 'Designation', 'Department', 'Office', 'Join Date', 'Month',
    'Vacation Full', 'Vacation Half', 'Sick Full', 'Sick Half', 'WFH Days',
    'Total Absence Days', 'Vacation Used (month)', 'Sick Used (month)',
    'Vacation Entitlement (year)', 'Vacation Used (year)', 'Vacation Remaining',
    'Sick Entitlement (year)', 'Sick Used (year)', 'Sick Remaining',
    'Paid Days (month)', 'Unpaid Days (month)', 'Blackout Days (month)'
  ]];
  const prefix = `${year}-${String(month).padStart(2, '0')}`;

  leaveEmployees(state.leaveActiveFilter === 'all').forEach(emp => {
    const l = computeLeaveLedger(emp.id, year);
    const t = leaveMonthTotals(l, year, month);
    const mSlots = l.slots.filter(s => String(s.date).startsWith(prefix) && s.classification !== 'skipped');
    const countFull = code => {
      const byDate = {};
      mSlots.filter(s => s.code === code).forEach(s => { byDate[s.date] = (byDate[s.date] || 0) + 1; });
      const full = Object.values(byDate).filter(n => n === 2).length;
      const half = Object.values(byDate).filter(n => n === 1).length;
      return { full, half };
    };
    const vac = countFull(LV_VACATION), sick = countFull(LV_SICK);
    const blackout = mSlots.filter(s => s.reason === 'blackout month').length * 0.5;

    rows.push([
      empVal(emp.employeeId), empVal(emp.fullName), empVal(emp.designation),
      empVal(emp.department), empVal(emp.officeSpace), toDisplayDate(emp.joinDate),
      `${LEAVE_MONTH_NAMES[month - 1]} ${year}`,
      vac.full, vac.half, sick.full, sick.half, t.wfh,
      t.absence, t.vacation, t.sick,
      l.entitlement.vacation, l.used.vacation, l.remaining.vacation,
      l.entitlement.sick, l.used.sick, l.remaining.sick,
      t.paid, t.unpaid, blackout
    ]);
  });
  lvDownloadCsv(`leave-report-${prefix}.csv`, rows);
  showToast('Report exported', 'success');
}

function exportLeaveBalancesCsv() {
  const year = state.leaveBalYear;
  const rows = [[
    'Employee ID', 'Name', 'Office', 'Join Date',
    'Vacation Entitlement', 'Vacation Used', 'Vacation Remaining',
    'Sick Entitlement', 'Sick Used', 'Sick Remaining',
    'WFH Days', 'Days Not Worked', 'Paid Days', 'Unpaid Days'
  ]];
  leaveBalanceRows(year, {
    search: state.leaveBalSearch, office: state.leaveBalOfficeFilter, status: state.leaveBalStatusFilter
  }).forEach(r => {
    const l = r.ledger;
    rows.push([
      r.employeeId, r.fullName, empVal(r.emp.officeSpace), toDisplayDate(r.emp.joinDate),
      l.entitlement.vacation, l.used.vacation, l.remaining.vacation,
      l.entitlement.sick, l.used.sick, l.remaining.sick,
      l.wfhDays, l.absenceDays, l.paidDays, l.unpaidDays
    ]);
  });
  lvDownloadCsv(`leave-balances-${year}.csv`, rows);
  showToast('Balances exported', 'success');
}

function exportLeavePersonCsv() {
  const year = state.leavePersonYear;
  const emp = (state.employeeRecords || []).find(e => e.id === state.leavePersonId);
  if (!emp) { showToast('Pick an employee first', 'error'); return; }
  const l = computeLeaveLedger(emp.id, year);
  const rows = [['Date', 'Day', 'Type', 'Code', 'Half', 'Days', 'Counted as', 'Reason', 'Note']];
  l.slots.forEach(s => {
    const def = lvTypeDef(s.code);
    rows.push([
      s.date, LEAVE_DOW[lvParse(s.date).getDay()], def ? def.label : s.code, s.code,
      s.slot === 'am' ? 'Morning' : 'Afternoon',
      s.classification === 'skipped' ? 0 : 0.5,
      s.classification === 'skipped' ? 'Not counted' : (s.classification === 'unpaid' ? 'Unpaid' : 'Paid'),
      s.reason || '', empVal(s.note)
    ]);
  });
  lvDownloadCsv(`leave-ledger-${empVal(emp.fullName).replace(/\s+/g, '-')}-${year}.csv`, rows);
  showToast('Ledger exported', 'success');
}

// ---- Wiring ---------------------------------------------------------------

// Office and leave-type dropdowns are built from live data so they never
// drift from what's actually in the Employee Database.
function refreshLeaveFilterOptions() {
  const offices = Array.from(new Set(
    (state.employeeRecords || []).map(r => empVal(r.officeSpace)).filter(Boolean)
  )).sort();

  [['leave-office-filter', 'leaveOfficeFilter'], ['leave-bal-office-filter', 'leaveBalOfficeFilter']].forEach(([id, key]) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = state[key] || 'all';
    sel.innerHTML = '<option value="all">All Offices</option>' +
      offices.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
    sel.value = offices.includes(cur) ? cur : 'all';
    state[key] = sel.value;
  });

  const typeSel = document.getElementById('leave-type-filter');
  if (typeSel && typeSel.options.length !== LEAVE_TYPES.length + 1) {
    const cur = state.leaveTypeFilter || 'all';
    typeSel.innerHTML = '<option value="all">All Leave Types</option>' +
      LEAVE_TYPES.map(t => `<option value="${t.key}">${escapeHtml(t.label)}</option>`).join('');
    typeSel.value = cur;
  }
}

function setupLeaveControls() {
  const q = (id) => document.getElementById(id);

  // Tabs
  document.querySelectorAll('#leave-view .leave-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.leaveTab = btn.getAttribute('data-leave-tab');
      closeLeavePopover();
      renderLeave();
    });
  });

  // Month navigation
  const shiftMonth = (delta) => {
    let m = state.leaveMonth + delta, y = state.leaveYear;
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    state.leaveMonth = m; state.leaveYear = y;
    closeLeavePopover();
    renderLeave();
  };
  q('leave-prev-month')?.addEventListener('click', () => shiftMonth(-1));
  q('leave-next-month')?.addEventListener('click', () => shiftMonth(1));
  q('leave-today-btn')?.addEventListener('click', () => {
    const now = new Date();
    state.leaveYear = now.getFullYear();
    state.leaveMonth = now.getMonth() + 1;
    closeLeavePopover();
    renderLeave();
  });

  // Year navigation on the other three tabs
  const yearNav = (btnId, key, delta) => q(btnId)?.addEventListener('click', () => {
    state[key] += delta; renderLeave();
  });
  yearNav('leave-bal-prev-year', 'leaveBalYear', -1);
  yearNav('leave-bal-next-year', 'leaveBalYear', 1);
  yearNav('leave-person-prev-year', 'leavePersonYear', -1);
  yearNav('leave-person-next-year', 'leavePersonYear', 1);
  yearNav('leave-cal-prev-year', 'leaveCalYear', -1);
  yearNav('leave-cal-next-year', 'leaveCalYear', 1);

  // Filters
  q('leave-search-input')?.addEventListener('input', (e) => { state.leaveSearchFilter = e.target.value; renderLeave(); });
  q('leave-bal-search')?.addEventListener('input', (e) => { state.leaveBalSearch = e.target.value; renderLeave(); });
  Object.entries({
    'leave-type-filter': 'leaveTypeFilter',
    'leave-office-filter': 'leaveOfficeFilter',
    'leave-status-filter': 'leaveStatusFilter',
    'leave-active-filter': 'leaveActiveFilter',
    'leave-bal-office-filter': 'leaveBalOfficeFilter',
    'leave-bal-status-filter': 'leaveBalStatusFilter'
  }).forEach(([id, key]) => {
    q(id)?.addEventListener('change', (e) => { state[key] = e.target.value; renderLeave(); });
  });

  q('leave-person-select')?.addEventListener('change', (e) => { state.leavePersonId = e.target.value; renderLeave(); });

  // Balances sorting
  document.querySelectorAll('#leave-tab-balances th.sortable-th').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-lbsort');
      if (state.leaveBalSortCol === col) {
        state.leaveBalSortDir = state.leaveBalSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.leaveBalSortCol = col;
        state.leaveBalSortDir = 'asc';
      }
      renderLeave();
    });
  });

  // Grid cell clicks (delegated — the grid is rebuilt on every render)
  q('leave-grid-wrap')?.addEventListener('click', (e) => {
    const cell = e.target.closest('td[data-lv-date]');
    if (!cell) { closeLeavePopover(); return; }
    e.stopPropagation();
    openLeavePopover(cell, cell.getAttribute('data-lv-emp'), cell.getAttribute('data-lv-date'));
  });
  document.addEventListener('click', (e) => {
    const pop = document.getElementById('leave-popover');
    if (pop && !pop.contains(e.target) && !e.target.closest('td[data-lv-date]')) closeLeavePopover();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLeavePopover(); });

  // Change log
  q('leave-log-toggle-btn')?.addEventListener('click', () => {
    const panel = q('leave-log-panel');
    if (!panel) return;
    const showing = panel.style.display !== 'none';
    panel.style.display = showing ? 'none' : 'block';
    q('leave-log-toggle-btn').textContent = showing ? 'View Change Log' : 'Hide Change Log';
    if (!showing) renderLeaveLog();
  });

  // Exports
  q('leave-export-grid-btn')?.addEventListener('click', exportLeaveGridCsv);
  q('leave-export-report-btn')?.addEventListener('click', exportLeaveReportCsv);
  q('leave-export-balances-btn')?.addEventListener('click', exportLeaveBalancesCsv);
  q('leave-export-person-btn')?.addEventListener('click', exportLeavePersonCsv);

  // Entry modal
  q('leave-add-btn')?.addEventListener('click', () => openLeaveEntryModal());
  q('leave-entry-modal-close-btn')?.addEventListener('click', closeLeaveEntryModal);
  q('leave-entry-cancel-btn')?.addEventListener('click', closeLeaveEntryModal);
  ['leave-entry-employee', 'leave-entry-end', 'leave-entry-type', 'leave-entry-duration', 'leave-entry-wfh-counts']
    .forEach(id => {
      q(id)?.addEventListener('change', updateLeaveEntryPreview);
      q(id)?.addEventListener('input', updateLeaveEntryPreview);
    });
  q('leave-entry-start')?.addEventListener('change', syncLeaveEntryMulti);
  q('leave-entry-start')?.addEventListener('input', syncLeaveEntryMulti);
  q('leave-entry-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const empRecordId = q('leave-entry-employee').value;
    const start = q('leave-entry-start').value;
    const end = leaveEntryEndDate();
    if (!start) { showToast('Pick a date', 'error'); return; }
    const code = q('leave-entry-type').value;
    closeLeaveEntryModal();
    await saveLeaveRange(empRecordId, start, end, code, q('leave-entry-duration').value,
      q('leave-entry-note').value, code === LV_WFH ? q('leave-entry-wfh-counts').checked : undefined);
    updateLeaveBadge();
  });
  q('leave-entry-delete-btn')?.addEventListener('click', async () => {
    const empRecordId = q('leave-entry-employee').value;
    const start = q('leave-entry-start').value;
    const end = leaveEntryEndDate();
    if (!start) { showToast('Pick a date', 'error'); return; }
    if (!confirm(`Clear all leave for the selected employee between ${toDisplayDate(start)} and ${toDisplayDate(end)}?`)) return;
    closeLeaveEntryModal();
    await clearLeaveRange(empRecordId, start, end);
    updateLeaveBadge();
  });

  // Holiday modal
  q('leave-holiday-modal-close-btn')?.addEventListener('click', closeLeaveHolidayModal);
  q('leave-holiday-multi')?.addEventListener('change', syncLeaveHolidayMulti);
  q('leave-holiday-start')?.addEventListener('change', syncLeaveHolidayMulti);
  q('leave-entry-multi')?.addEventListener('change', syncLeaveEntryMulti);
  q('leave-holiday-cancel-btn')?.addEventListener('click', closeLeaveHolidayModal);
  q('leave-holiday-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = empVal(q('leave-holiday-name').value);
    const start = q('leave-holiday-start').value;
    const end = leaveHolidayEndDate();
    if (!name || !start) { showToast('Give the holiday a name and a date', 'error'); return; }
    closeLeaveHolidayModal();
    await saveLeaveHolidayRange(name, start, end, q('leave-holiday-type').value);
  });

  // Policy save + holiday delete (delegated — both panels are re-rendered)
  q('leave-tab-calendar')?.addEventListener('click', (e) => {
    const del = e.target.closest('[data-lv-del-holiday]');
    if (del) { deleteLeaveHoliday(del.getAttribute('data-lv-del-holiday')); return; }
    if (e.target.closest('#leave-add-holiday-btn')) { openLeaveHolidayModal(); return; }
    if (e.target.closest('#leave-seed-holidays-btn')) { seedBangladeshHolidays(state.leaveCalYear); return; }
    if (e.target.id !== 'lv-pol-save') return;
    const num = (id, fallback) => {
      const v = parseFloat((document.getElementById(id) || {}).value);
      return Number.isFinite(v) && v >= 0 ? v : fallback;
    };
    const checked = (attr) => Array.from(document.querySelectorAll(`#leave-tab-calendar [${attr}]`))
      .filter(c => c.checked).map(c => c.getAttribute(attr));
    saveLeavePolicy(state.leaveCalYear, {
      vacationDays: num('lv-pol-vac', DEFAULT_LEAVE_POLICY.vacationDays),
      sickDays: num('lv-pol-sick', DEFAULT_LEAVE_POLICY.sickDays),
      blackoutMonths: checked('data-lv-blackout-month').map(Number),
      blackoutApplies: checked('data-lv-blackout-type'),
      weekendDays: checked('data-lv-weekend-day').map(Number),
      blackoutBurnsBalance: !!document.getElementById('lv-pol-burns')?.checked,
      prorateJoiners: !!document.getElementById('lv-pol-prorate')?.checked,
      wfhConsumesVacation: !!document.getElementById('lv-pol-wfh')?.checked
    });
  });
}

function switchView(viewName) {
  if (viewName === 'kanban' || viewName === 'analytics' || viewName === 'ideas') {
    viewName = 'dashboard';
  }
  // Board-only accounts (Orthee) may only ever land on the Priority Board or
  // People & Roles.
  if (viewName !== 'priority-board' && viewName !== 'team' && isCurrentUserBoardOnly()) {
    viewName = 'priority-board';
  }
  // Employee Database and Onboarding are HR/admin only — bounce anyone else.
  if (viewName === 'employee-database' && !canCurrentUserAccessEmployeeDb()) {
    viewName = 'dashboard';
  }
  if (viewName === 'onboarding' && !canCurrentUserAccessOnboarding()) {
    viewName = 'dashboard';
  }
  if (viewName === 'leave' && !canCurrentUserAccessLeave()) {
    viewName = 'dashboard';
  }

  state.currentView = viewName;
  localStorage.setItem('hc_last_view', viewName);

  // Update sticky top header title/subtitle to match the active view
  // (Bug fix: this used to be hardcoded to "Content Hub" on every view)
  const VIEW_HEADERS = {
    dashboard: ['Content Hub', 'HoneyComb Inc. Active Pages & Subsections'],
    calendar: ['Calendar', 'Scheduled posts and delivery dates at a glance'],
    tasks: ['Task Tracker', 'Social media posts and general design tasks'],
    'content-links': ['Content Links', 'Directory of completed content deliverables and Google Drive links posted by creatives.'],
    'idea-board': ['Idea Board', 'Upcoming content ideas, seasonal campaigns, and inspiration — plan ahead before a task exists'],
    'priority-board': ['Priority Board', 'DTF/Vinyl and sublimation print-prep requests, flagged by slot and job type'],
    team: ['People & Roles', 'Team roster, roles, and login permissions'],
    logs: ['System Log Report', 'Audit trail of all actions and state updates (Admin Only)'],
    'employee-database': ['Employee Database', 'HR directory — employee records, contact details, and seating (HR & Admins only)'],
    'onboarding': ['Onboarding', 'Formal deliverables for every employee — ID Card, Mug, Bank Account'],
    'leave': ['Leave', 'Vacation, sickness and work-from-home days, entitlements and balances (HR & Admins only)']
  };
  const headerTitleEl = document.querySelector('.header-title');
  if (headerTitleEl && VIEW_HEADERS[viewName]) {
    const [title, subtitle] = VIEW_HEADERS[viewName];
    const h2 = headerTitleEl.querySelector('h2');
    const p = headerTitleEl.querySelector('p');
    if (h2) h2.textContent = title;
    if (p) p.textContent = subtitle;
  }

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
  if (viewName === 'analytics' || viewName === 'tasks' || viewName === 'ideas' || viewName === 'team' || viewName === 'logs' || viewName === 'content-links' || viewName === 'idea-board' || viewName === 'priority-board' || viewName === 'employee-database' || viewName === 'onboarding' || viewName === 'leave') {
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
  else if (viewName === 'idea-board') renderIdeaBoard();
  else if (viewName === 'priority-board') renderPriorityBoard();
  else if (viewName === 'dashboard') renderDashboard();
  else if (viewName === 'calendar') renderCalendar();
  else if (viewName === 'logs') renderLogs();
  else if (viewName === 'employee-database') renderEmployeeDatabase();
  else if (viewName === 'onboarding') renderOnboarding();
  else if (viewName === 'leave') renderLeave();

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
  try { renderIdeaBoard(); } catch(e) { console.error("renderIdeaBoard error:", e); }
  try { renderPriorityBoard(); } catch(e) { console.error("renderPriorityBoard error:", e); }
  try { renderEmployeeDatabase(); } catch(e) { console.error("renderEmployeeDatabase error:", e); }
  try { renderOnboarding(); } catch(e) { console.error("renderOnboarding error:", e); }
  try { renderLeave(); } catch(e) { console.error("renderLeave error:", e); }
  try { updateOnboardingBadge(); } catch(e) { console.error("updateOnboardingBadge error:", e); }
  try { updateLeaveBadge(); } catch(e) { console.error("updateLeaveBadge error:", e); }
  try { updatePublishingQueueBadge(); } catch(e) { console.error("updatePublishingQueueBadge error:", e); }
  try { updatePriorityBoardBadge(); } catch(e) { console.error("updatePriorityBoardBadge error:", e); }
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



// Match a Task Tracker deliverable to a brand so its "Posted" checkbox can
// count toward that brand's weekly Published metric on the Dashboard. Tasks
// have no brandId field, so we infer it: first try a "[Tag]" prefix against
// the brand's 3-letter short code (the same convention already used for
// posts on the Calendar view, see brand.name.substring(0,3) below), then
// fall back to matching the brand name inside the task name — picking the
// longest/most specific brand match to avoid "Tahams" matching every
// Tahams-family sub-brand task.
function matchTaskToBrandId(taskName, brands) {
  if (!taskName) return null;
  const bracketMatch = taskName.match(/^\s*\[([A-Za-z]{2,5})\]/);
  if (bracketMatch) {
    const tag = bracketMatch[1].toLowerCase();
    const byTag = brands.find(b => b.name.substring(0, 3).toLowerCase() === tag);
    if (byTag) return byTag.id;
  }
  const lowerName = taskName.toLowerCase();
  const candidates = brands
    .filter(b => lowerName.includes(b.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length);
  return candidates.length ? candidates[0].id : null;
}

// Prefer the task's explicit "For Brand" selection (task.brandId, set via the
// New/Edit Task modal) and only fall back to the name-matching heuristic for
// older tasks created before that field existed.
function taskEffectiveBrandId(task) {
  if (task.brandId) return task.brandId;
  return matchTaskToBrandId(task.name, state.brands);
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
    
    // Business week: Saturday through Friday (resets Friday 11:59 PM), not
    // the JS-default Sunday-Saturday calendar week. getDay(): 0=Sun..6=Sat.
    // Days since the most recent Saturday: Sat->0, Sun->1, ... Fri->6.
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceSaturday = (dayOfWeek + 1) % 7;
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysSinceSaturday, 0, 0, 0);
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 23, 59, 59);
    
    const weeklyPosts = brandPosts.filter(p => {
      const pDate = new Date(p.date + 'T00:00:00');
      return pDate >= weekStart && pDate <= weekEnd;
    });

    // Published count comes from Task Tracker: a content deliverable only
    // counts once its "Posted" checkbox has actually been checked, not just
    // because it's scheduled/finished. It counts toward whichever week it
    // was actually marked posted in (task.postedAt), not the task's
    // originally scheduled date — a task drafted in week 1 but only marked
    // posted in week 2 belongs to week 2. Tasks marked posted before
    // postedAt existed have no timestamp to go on, so they fall back to
    // their scheduled date.
    const publishedCount = (state.tasks || []).filter(t => {
      if (t.taskType !== 'post' || !isTaskFullyPosted(t)) return false;
      const postedDateStr = t.postedAt ? t.postedAt.slice(0, 10) : t.date;
      if (!postedDateStr) return false;
      const postedDate = new Date(postedDateStr + 'T00:00:00');
      if (!(postedDate >= weekStart && postedDate <= weekEnd)) return false;
      return taskEffectiveBrandId(t) === brand.id;
    }).length;
    const goal = brand.frequencyGoal;
    const progressPct = goal > 0 ? Math.min(Math.round((publishedCount / goal) * 100), 100) : 0;

    // Determine health status
    let healthStatus = 'Healthy';
    let healthClass = 'status-healthy-badge';
    
    // Check overdue posts: a Task Tracker "post" deliverable for this brand
    // that's scheduled before this week and still hasn't been marked Posted.
    // (Was reading the separate `posts` collection, which nothing writes to
    // anymore now that Posted-tracking lives in Task Tracker — that left
    // every brand permanently stuck Critical regardless of real activity.)
    const overduePosts = (state.tasks || []).filter(t => {
      if (t.taskType !== 'post' || isTaskFullyPosted(t) || !t.date) return false;
      const tDate = new Date(t.date + 'T00:00:00');
      if (!(tDate < weekStart)) return false;
      return taskEffectiveBrandId(t) === brand.id;
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
            <h3 class="brand-name-row">
              <span class="brand-name-text" title="${brand.name}">${brand.name}</span>
              <button class="edit-brand-btn" data-id="${brand.id}" style="background: none; border: none; cursor: pointer; color: #a3a3c2; padding: 0; display: inline-flex; align-items: center; flex-shrink: 0;" title="Edit Page/Brand">
                <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
            </h3>
            <div class="brand-subtitle" title="${brand.type}">${brand.type}</div>
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
          <span class="progress-pct">${goal > 0 ? `${progressPct}%` : 'No Goal Set'}</span>
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
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-assignee-avatar')) return;
        openPostModal(post);
      });

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
      
      eventItem.textContent = `[${brand.name.substring(0,3)}] ${post.title}`;
      eventItem.title = `${brand.name}: ${post.title} (${(post.platforms || []).join(', ').toUpperCase()})`;
      
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

    // On the compact mobile grid, event pills collapse into small dots (see
    // CSS) capped at 4 per day — this chip surfaces the remainder so density
    // is still visible without needing full pill text to fit in a ~48px cell.
    const totalDayEvents = dayPosts.length + dayTasks.length;
    if (totalDayEvents > 4) {
      const overflowChip = document.createElement('span');
      overflowChip.className = 'calendar-day-overflow';
      overflowChip.textContent = `+${totalDayEvents - 4}`;
      eventsArea.appendChild(overflowChip);
    }

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
  const assignee = document.getElementById('post-assignee').value;
  const checkedPlatforms = Array.from(document.querySelectorAll('input[name="post-platforms"]:checked')).map(cb => cb.value);
  const date = document.getElementById('post-date').value;
  const time = document.getElementById('post-time').value;
  const caption = document.getElementById('post-caption').value.trim();

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
      post.title = title;
      post.brandId = brandId;
      post.platforms = checkedPlatforms;
      post.status = status;
      post.assignee = assignee;
      post.date = date;
      post.time = time;
      post.caption = caption;

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
      assignee,
      date,
      time,
      caption
    };

    // Save to Firestore
    try {
      await setDoc(doc(db, "posts", newId), newPost);
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
    try {
      await deleteDoc(doc(db, "posts", postId));
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

// Turns a Supabase/Postgrest error (or anything else thrown) into a short,
// human-readable suffix so failure toasts show the real cause (e.g. "not
// logged in" / RLS rejection) instead of a generic, misleading network
// message that's impossible to debug from the UI alone.
function errSuffix(err) {
  const msg = err && (err.message || err.error_description || err.msg);
  if (!msg) return '';
  if (err.code === '42501' || /row-level security/i.test(msg)) {
    return ' (not signed in, or your session expired — please sign in again)';
  }
  return ` (${msg})`;
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

  // Only Creatives / Assigners / admins get the write controls; everyone else
  // sees the same board read-only. Done here rather than once at startup so
  // the buttons follow sign-in and sign-out without needing a reload.
  const canManageTasks = canCurrentUserManageTasks();
  ['create-task-btn', 'csv-import-btn'].forEach(id => {
    const el = document.getElementById(id);
    // '' restores the stylesheet's own display value instead of guessing it.
    if (el) el.style.display = canManageTasks ? '' : 'none';
  });

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

  // Filter by brand
  if (state.taskBrandFilter !== 'all') {
    filteredTasks = filteredTasks.filter(t => taskEffectiveBrandId(t) === state.taskBrandFilter);
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
  const socialTasks = filteredTasks.filter(t => t.taskType === 'post');
  const generalTasks = filteredTasks.filter(t => t.taskType !== 'post');

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

    // Hook "Posted" checkbox(es) — only present for social rows the current
    // user is allowed to mark. Tahams sub-brand rows carry two (sub page +
    // Tahams parent page); everyone else carries at most one.
    row.querySelectorAll('.post-select-checkbox').forEach(cb => {
      cb.addEventListener('change', updateMarkSelectedPostedButtonState);
    });

    // Hook the "Posted" badge's undo control, if present for this row.
    row.querySelectorAll('.posted-undo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        unpostTaskPage(btn.dataset.taskId, btn.dataset.pageKey);
      });
    });

    targetBody.appendChild(row);
  };

  const canMarkPosted = canCurrentUserMarkPosted();

  // Tahams sub-brand tasks need two independent posted pages (their own
  // sub-brand page + the Tahams parent page) instead of one; everything else
  // keeps the original single badge/checkbox/"Pending" cell. Each page is
  // its own badge-or-checkbox, so a sub-brand row can show one page already
  // posted (green ✓) right next to the other page still needing a click.
  const buildPostedCellHtml = (task) => {
    const posted = task.posted || {};
    const pageKeys = pageKeysForTask(task);
    const isSub = pageKeys.length > 1;
    const postedState = getTaskPostedState(task);

    // 'sub' uses the task's own brand short code (e.g. "PDT"); 'parent' is
    // always the Tahams mother page; 'main' (non-Tahams tasks) also gets its
    // own brand's short code instead of a blank checkbox.
    const brandName = (state.brands && state.brands.length > 0 ? state.brands : DEFAULT_BRANDS)
      .find(b => b.id === taskEffectiveBrandId(task))?.name;
    const PAGE_LABELS = {
      main: brandShortCode(brandName),
      sub: brandShortCode(brandName),
      parent: 'TMS'
    };

    const partialBadge = (isSub && postedState === 'partial')
      ? `<div class="posted-partial-badge" title="Only one of the two pages has been posted">◐ Partially Posted</div>`
      : '';

    const pageHtml = pageKeys.map(key => {
      const label = PAGE_LABELS[key];
      if (posted[key]) {
        // Marking posted was previously one-way — no way to fix a mistaken
        // click. canMarkPosted users can now click the badge itself to undo
        // that one page (confirmed first, since it's a meaningful change).
        if (canMarkPosted) {
          return `<button type="button" class="posted-badge posted-undo-btn" data-task-id="${task.id}" data-page-key="${key}" title="${label ? label + ' page — ' : ''}Click to undo this posted mark">
            <svg viewBox="0 0 24 24" class="posted-badge-icon"><path d="M20 6L9 17l-5-5"/></svg><span class="posted-badge-label">${label} Posted</span>
          </button>`;
        }
        return `<span class="posted-badge" title="${label ? label + ' page — ' : ''}Already marked posted">
          <svg viewBox="0 0 24 24" class="posted-badge-icon"><path d="M20 6L9 17l-5-5"/></svg><span class="posted-badge-label">${label} Posted</span>
        </span>`;
      }
      if (canMarkPosted) {
        return `<label class="posted-checkbox-label" title="Select to mark ${label} page as posted">
          <input type="checkbox" class="post-select-checkbox" data-task-id="${task.id}" data-page-key="${key}"><span class="posted-checkbox-tag">${label}</span>
        </label>`;
      }
      return `<span class="posted-pending-label">${label} Pending</span>`;
    }).join('');

    return `${partialBadge}<div class="posted-cell-pages">${pageHtml}</div>`;
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

  const anyUnposted = socialTasks.some(t => !isTaskFullyPosted(t));

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
      // Each checkbox represents one page (main, or sub/parent for Tahams
      // sub-brands) — collect {taskId, pageKey} pairs rather than plain task
      // IDs so checking only the "Sub" box (say) marks just that page, not
      // both, while checking both marks the task fully posted.
      const checked = Array.from(document.querySelectorAll('.post-select-checkbox:checked'));
      const selections = checked.map(cb => ({
        taskId: cb.getAttribute('data-task-id'),
        pageKey: cb.getAttribute('data-page-key') || 'main'
      }));
      if (selections.length === 0) return;
      await markTasksPostedBulk(selections);
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

// Marks a batch of (task, page) selections as posted in one action. Takes
// {taskId, pageKey} pairs rather than plain task IDs so that, for a Tahams
// sub-brand task, checking only the "Sub" box marks just posted.sub — the
// other page stays untouched until its own box is checked (possibly in a
// later pass) — while checking both boxes for a row marks it fully posted.
async function markTasksPostedBulk(selections) {
  if (!canCurrentUserMarkPosted()) {
    showToast('You do not have permission to mark posts as posted', 'error');
    return;
  }

  // Group selected page keys by task so each task gets exactly one write.
  const pageKeysByTaskId = new Map();
  for (const { taskId, pageKey } of selections) {
    if (!pageKeysByTaskId.has(taskId)) pageKeysByTaskId.set(taskId, new Set());
    pageKeysByTaskId.get(taskId).add(pageKey);
  }

  let successCount = 0;
  for (const [taskId, pageKeys] of pageKeysByTaskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) continue;

    const posted = { ...(task.posted || {}) };
    let changed = false;
    pageKeys.forEach(key => {
      if (!posted[key]) { posted[key] = true; changed = true; }
    });
    if (!changed) continue;

    task.posted = posted;
    task.postedAt = new Date().toISOString();

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

// Undoes a single posted page on a task (clicked from the green "Posted"
// badge in the Task Tracker table). Posting used to be one-way with no
// fix for a mistaken click — this is the escape hatch. Confirmed first
// since it reverses a real, logged action.
const PAGE_KEY_LABELS = { main: 'this task', sub: 'the sub-brand page', parent: 'the Tahams parent page' };

async function unpostTaskPage(taskId, pageKey) {
  if (!canCurrentUserMarkPosted()) {
    showToast('You do not have permission to change posted status', 'error');
    return;
  }

  const task = state.tasks.find(t => t.id === taskId);
  if (!task || !task.posted || !task.posted[pageKey]) return;

  const label = PAGE_KEY_LABELS[pageKey] || 'this page';
  if (!confirm(`Undo "Posted" for ${label} on "${task.name}"? This can't be undone automatically — you'll need to re-mark it if this was a mistake.`)) return;

  const posted = { ...task.posted, [pageKey]: false };
  const updatedTask = { ...task, posted };

  try {
    await setDoc(doc(db, "tasks", taskId), updatedTask);
    Object.assign(task, updatedTask);
    logActivity(`Undid posted mark (${pageKey}) on task "${task.name}"`, db);
    showToast(`Undid posted mark for ${label}`, 'info');
    refreshViews();
  } catch (err) {
    console.error(`Failed to undo posted mark for task ${taskId}:`, err);
    showToast('Failed to undo — check your connection and try again' + errSuffix(err), 'error');
  }
}

function openTaskModal(task = null) {
  const currentUser = localStorage.getItem('hc_logged_in_user');

  // Accessibility: Guests cannot create new tasks
  if (!task && !currentUser) {
    showToast('Access Denied: Please sign in to create tasks', 'error');
    showLoginOverlay();
    return;
  }

  // ...and signed-in accounts that are neither Creative nor Assigner cannot
  // create them either (see canCurrentUserManageTasks).
  if (!task && !canCurrentUserManageTasks()) {
    showToast('Access Denied: Only Creatives and Assigners can create tasks', 'error');
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

  const teamList = (state.team && state.team.length > 0) ? state.team : DEFAULT_TEAM;
  const account = teamList.find(p => p.name === currentUser);
  const isLimited = account && account.access === 'limited';
  const canManageTasks = canCurrentUserManageTasks();

  if (task) {
    // Edit mode
    modalTitle.textContent = `Edit Task ${task.id}`;
    if (deleteBtn) {
      deleteBtn.style.display = (!currentUser || isLimited || !canManageTasks) ? 'none' : 'block';
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
    } else if (!canManageTasks) {
      // Signed in, but not on the Task Tracker: read-only on every task,
      // including any that happen to be assigned to them.
      form.querySelectorAll('.form-control').forEach(el => el.setAttribute('disabled', 'true'));
      if (submitBtn) submitBtn.style.display = 'none';

      const formBody = form.querySelector('.modal-body') || form;
      formBody.insertAdjacentHTML('afterbegin', `
        <div id="task-view-only-banner" class="view-only-banner">
          <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01"/></svg>
          <span>View Only: Editing tasks is limited to Creatives and Assigners.</span>
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

    // Autofill defaults to the current date/time
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('task-form-date').value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    document.getElementById('task-form-time').value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    document.getElementById('task-form-status').value = 'Not Started';
    document.getElementById('task-form-assigner').value = currentUser || 'Razin';
    renderTaskComments(null);
  }

  // Populate job type select
  const jobTypeSelect = document.getElementById('task-form-job-type');
  if (jobTypeSelect) {
    jobTypeSelect.value = (task && task.taskType) ? task.taskType : 'general';
  }

  // Populate brand select
  const brandSelect = document.getElementById('task-form-brand');
  if (brandSelect) {
    brandSelect.innerHTML = '<option value="">No Brand / Internal</option>' +
      (state.brands || []).map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    brandSelect.value = (task && task.brandId) ? task.brandId : '';
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

  // Backstop for the UI gates above (a modal left open across a sign-out, a
  // stale listener). Cheap, and keeps every write path behind one rule.
  if (!canCurrentUserManageTasks()) {
    showToast('Access Denied: Only Creatives and Assigners can change tasks', 'error');
    return;
  }

  const name = document.getElementById('task-form-name').value.trim();
  const designer = document.getElementById('task-form-designer').value;
  const assignedBy = document.getElementById('task-form-assigner').value;
  const date = document.getElementById('task-form-date').value;
  const time = document.getElementById('task-form-time').value;
  const urgency = document.getElementById('task-form-urgency').value.trim();
  const status = document.getElementById('task-form-status').value;
  const deliveryLink = document.getElementById('task-form-delivery').value.trim();
  const comments = document.getElementById('task-form-comments').value.trim();
  const jobType = document.getElementById('task-form-job-type').value;
  const brandId = document.getElementById('task-form-brand').value;

  if (!name) {
    showToast('Please enter a task name', 'error');
    return;
  }

  if (state.editingTask) {
    const task = state.tasks.find(t => t.id === state.editingTask.id);
    if (task) {
      const updatedTask = {
        ...task,
        name, designer, assignedBy, date, time, urgency, status,
        deliveryLink, comments, taskType: jobType, brandId
      };

      // Bug fix: this used to update local state and show "success" immediately,
      // then attempt the Firestore write afterward with a silently-swallowed
      // catch. If that write failed (network blip, etc.), the change only ever
      // existed in this browser tab's memory — the very next Firestore snapshot
      // from ANY task change (by anyone) would overwrite state.tasks from the
      // server and silently erase it, with the user having been told it saved.
      // Now the write is awaited and confirmed before we tell the user it worked.
      try {
        await setDoc(doc(db, "tasks", task.id), updatedTask);
        Object.assign(task, updatedTask);
        showToast('Task updated successfully', 'success');
        logActivity(`updated Task ${task.id}: "${task.name}"`, db);
        refreshViews();
        closeTaskModal();
      } catch (err) {
        console.error("Firestore task update failed:", err);
        showToast('Failed to save changes — check your connection and try again' + errSuffix(err), 'error');
        return; // keep the modal open so nothing typed is lost
      }
    }
  } else {
    // Allocate the id from the SERVER's live task ids and INSERT (never
    // upsert) so a stale/def­ault-seeded cache can't hand us an id that
    // already belongs to someone else's task and overwrite it. See
    // createSequentialDoc / insertDoc.
    const fields = {
      name, designer, assignedBy, date, time, urgency, status,
      deliveryLink, comments, taskType: jobType, brandId
    };

    let newId;
    try {
      newId = await createSequentialDoc('tasks', 'T-', 2, (id) => ({ id, ...fields }));
    } catch (err) {
      console.error("New task insert failed:", err);
      showToast('Failed to create task — check your connection and try again' + errSuffix(err), 'error');
      return; // keep the modal open so nothing typed is lost
    }

    const newTask = { id: newId, ...fields };
    state.tasks.push(newTask);
    showToast(`Task ${newId} created successfully`, 'success');
    logActivity(`created task ${newId}: "${newTask.name}"`, db);
    refreshViews();
    closeTaskModal();
  }
}

async function deleteTask() {
  if (!state.editingTask) return;

  // Backstop for the UI gates above (a modal left open across a sign-out, a
  // stale listener). Cheap, and keeps every write path behind one rule.
  if (!canCurrentUserManageTasks()) {
    showToast('Access Denied: Only Creatives and Assigners can change tasks', 'error');
    return;
  }
  
  if (confirm(`Are you sure you want to delete Task ${state.editingTask.id}?`)) {
    const taskId = state.editingTask.id;
    const taskName = state.editingTask.name;

    // Same fix as handleTaskFormSubmit: confirm the Firestore delete before
    // updating local state / telling the user it worked. Previously this
    // removed the task locally and said "removed" even if the server-side
    // delete failed — the task would then silently reappear on the next
    // Firestore sync with no explanation.
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      state.tasks = state.tasks.filter(t => t.id !== taskId);
      showToast(`Task ${taskId} removed`, 'info');
      logActivity(`deleted task ${taskId}: "${taskName}"`, db);
      refreshViews();
      closeTaskModal();
    } catch (err) {
      console.error("Firestore delete failed:", err);
      showToast('Failed to delete task — check your connection and try again' + errSuffix(err), 'error');
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

  // Populate task brand filter
  const taskBrandFilter = document.getElementById('task-brand-filter');
  if (taskBrandFilter) {
    const currentVal = state.taskBrandFilter;
    taskBrandFilter.innerHTML = '<option value="all">All Brands</option>' +
      (state.brands || []).map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    if ((state.brands || []).some(b => b.id === currentVal) || currentVal === 'all') {
      taskBrandFilter.value = currentVal;
    } else {
      taskBrandFilter.value = 'all';
      state.taskBrandFilter = 'all';
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

  // Populate Task Form Assigner select box with everyone in People & Roles
  // (not just those flagged isAssigner) so it always stays in sync with
  // whoever's actually listed there, rather than needing that flag set too.
  const taskFormAssigner = document.getElementById('task-form-assigner');
  if (taskFormAssigner) {
    const curVal = taskFormAssigner.value;
    const allPeople = [...activeTeam].sort((a, b) => a.name.localeCompare(b.name));
    taskFormAssigner.innerHTML = allPeople.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    if (curVal && allPeople.some(p => p.name === curVal)) taskFormAssigner.value = curVal;
  }

  // Populate users in Login Select box
  const loginUser = document.getElementById('login-user');
  if (loginUser) {
    const curVal = loginUser.value;
    loginUser.innerHTML = loginUsers.map(p => `<option value="${p.name}">${p.name} (${p.role})</option>`).join('');
    if (curVal && loginUsers.some(p => p.name === curVal)) loginUser.value = curVal;
  }
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
    if (p.canPlanContent) roleTagsHtml += `<span class="badge" style="background: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.15); margin-right: 4px;">Ideator</span>`;
    if (p.canAccessEmployeeDb) roleTagsHtml += `<span class="badge" style="background: rgba(236, 72, 153, 0.1); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.15); margin-right: 4px;">Employee DB</span>`;
    if (p.canAccessOnboarding && !p.canAccessEmployeeDb) roleTagsHtml += `<span class="badge" style="background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.15); margin-right: 4px;">Onboarding</span>`;
    if (p.canAccessLeave) roleTagsHtml += `<span class="badge" style="background: rgba(52, 211, 153, 0.1); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.15); margin-right: 4px;">Leave</span>`;
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
      document.getElementById('person-form-auth-email').value = person.authEmail || '';
      document.getElementById('person-form-access').value = person.access || 'none';
      document.getElementById('person-form-photo').value = person.photo || '';
      
      document.getElementById('person-role-designer').checked = !!person.isDesigner;
      document.getElementById('person-role-assigner').checked = !!person.isAssigner;
      document.getElementById('person-role-plan-content').checked = !!person.canPlanContent;
      const empDbCb = document.getElementById('person-role-employee-db');
      if (empDbCb) empDbCb.checked = !!person.canAccessEmployeeDb;
      const onbCb = document.getElementById('person-role-onboarding');
      if (onbCb) onbCb.checked = !!person.canAccessOnboarding;
      const leaveCb = document.getElementById('person-role-leave');
      if (leaveCb) leaveCb.checked = !!person.canAccessLeave;
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
  const authEmail = document.getElementById('person-form-auth-email').value.trim();
  const access = document.getElementById('person-form-access').value;
  const photo = document.getElementById('person-form-photo').value.trim();

  const isDesigner = document.getElementById('person-role-designer').checked;
  const isAssigner = document.getElementById('person-role-assigner').checked;
  const canPlanContent = document.getElementById('person-role-plan-content').checked;
  const empDbCb = document.getElementById('person-role-employee-db');
  const canAccessEmployeeDb = empDbCb ? empDbCb.checked : false;
  const onbCb = document.getElementById('person-role-onboarding');
  const canAccessOnboarding = onbCb ? onbCb.checked : false;
  const leaveCb = document.getElementById('person-role-leave');
  const canAccessLeave = leaveCb ? leaveCb.checked : false;

  if (!name || !role) {
    showToast('Please fill out all required fields', 'error');
    return;
  }

  const initial = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const personId = state.editingPersonId || `person-${Date.now()}`;

  // The Supabase setDoc() shim does a FULL document replace — the { merge: true }
  // option it used to rely on under Firestore is ignored. So we merge here:
  // start from the person's existing record and overlay only the fields this
  // form owns. This preserves aliases, canMarkPosted, canAccessPriorityBoard,
  // canManagePriorityNotes and any other flag the form has no input for.
  const existingPerson = (state.team || []).find(p => p.id === personId) || {};
  const personData = {
    ...existingPerson,
    id: personId,
    name,
    role,
    initial,
    authEmail: authEmail || null,
    canLogin: !!authEmail,
    access,
    photo: photo || null,
    isDesigner,
    isAssigner,
    canPlanContent,
    canAccessEmployeeDb,
    canAccessOnboarding,
    canAccessLeave
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

// ==========================================================================
// Idea Board (Content Planning)
//
// Permission model:
// - View: anyone logged in.
// - Create / edit core fields (name, date, links, notes) / delete: only
//   people with canPlanContent: true (canCurrentUserPlanContent()).
// - Claim (set assigned designer) and toggle "Handled": any logged-in user.
// ==========================================================================

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function renderIdeaBoard() {
  const tbody = document.getElementById('idea-board-list-body');
  if (!tbody) return;

  const canEdit = canCurrentUserPlanContent();

  const newBtn = document.getElementById('idea-new-btn');
  if (newBtn) newBtn.style.display = canEdit ? 'inline-flex' : 'none';

  let ideas = [...(state.contentIdeas || [])];

  const search = (state.ideaSearchFilter || '').toLowerCase().trim();
  if (search) {
    ideas = ideas.filter(i =>
      (i.name || '').toLowerCase().includes(search) ||
      (i.notes || '').toLowerCase().includes(search)
    );
  }

  if (state.ideaStatusFilter === 'pending') {
    ideas = ideas.filter(i => !i.handled);
  } else if (state.ideaStatusFilter === 'handled') {
    ideas = ideas.filter(i => !!i.handled);
  }

  if (ideas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 32px; color: #64748b;">No ideas yet${canEdit ? ' — click "New Idea" to plan something ahead.' : '.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = ideas.map(idea => {
    const links = idea.links || [];
    const linksHtml = links.length
      ? links.map((l, idx) => `<a href="${escapeHtml(l)}" target="_blank" rel="noopener" style="display:block; color: var(--honey-gold); font-size: 0.8rem; text-decoration: none;">Link ${idx + 1} ↗</a>`).join('')
      : `<span style="color:#64748b; font-size: 0.8rem;">—</span>`;

    // Idea Initiator badge — who created it and when, set automatically at
    // creation time (see handleIdeaFormSubmit) and never editable, so it
    // stays a reliable "signed" record instead of an assignable field.
    const initiatorHtml = idea.initiatedBy
      ? `<div class="idea-initiator-badge"><span class="idea-initiator-name">${escapeHtml(idea.initiatedBy)}</span>${idea.initiatedAt ? `<span class="idea-initiator-time">${escapeHtml(new Date(idea.initiatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}</span>` : ''}</div>`
      : `<span style="color:#64748b; font-size: 0.8rem;">—</span>`;

    const actionsHtml = canEdit
      ? `<button class="btn-icon idea-edit-btn" data-id="${idea.id}" style="width: 32px; height: 32px" title="Edit Idea"><svg viewBox="0 0 24 24" style="fill:none; stroke:currentColor; stroke-width:2; width:16px; height:16px;"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`
      : '';

    return `
      <tr>
        <td>${escapeHtml(idea.id)}</td>
        <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(idea.name)}"><strong>${escapeHtml(idea.name)}</strong></td>
        <td>${escapeHtml(idea.date)}</td>
        <td>${linksHtml}</td>
        <td style="padding-top: 18px; padding-bottom: 18px;" title="${escapeHtml(idea.notes || '')}"><div style="color: #cbd5e1; font-size: 0.85rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(idea.notes || '')}</div></td>
        <td>${initiatorHtml}</td>
        <td style="text-align:center;">
          <input type="checkbox" class="idea-handled-checkbox" data-id="${idea.id}" ${idea.handled ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--honey-gold); cursor: pointer;">
        </td>
        <td style="text-align:center;">${actionsHtml}</td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.idea-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openIdeaModal(btn.dataset.id));
  });

  // Toggling "Handled" is open to any logged-in user, per the agreed
  // permission model — not gated behind canCurrentUserPlanContent().
  tbody.querySelectorAll('.idea-handled-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => toggleIdeaHandled(cb.dataset.id, e.target.checked));
  });
}

async function toggleIdeaHandled(ideaId, handled) {
  const idea = (state.contentIdeas || []).find(i => i.id === ideaId);
  if (!idea) return;
  try {
    await setDoc(doc(db, "content_ideas", ideaId), { ...idea, handled });
    await logActivity(`marked idea ${ideaId}: "${idea.name}" as ${handled ? 'handled' : 'not handled'}`, db);
  } catch (err) {
    console.error("Failed to update idea handled state:", err);
    showToast('Failed to save — check your connection and try again' + errSuffix(err), 'error');
    renderIdeaBoard(); // revert the checkbox to last known-good state
  }
}

function addIdeaLinkRow(value) {
  const list = document.getElementById('idea-form-links-list');
  if (!list) return;
  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:8px; margin-top:8px;';
  row.innerHTML = `
    <input type="url" class="form-control idea-link-input" placeholder="https://..." value="${escapeHtml(value || '')}" style="flex:1;">
    <button type="button" class="btn-secondary idea-link-remove-btn" style="padding: 0 12px;">✕</button>
  `;
  row.querySelector('.idea-link-remove-btn').addEventListener('click', () => row.remove());
  list.appendChild(row);
}

function collectIdeaLinks() {
  return Array.from(document.querySelectorAll('#idea-form-links-list .idea-link-input'))
    .map(inp => inp.value.trim())
    .filter(v => v.length > 0);
}

function openIdeaModal(ideaId = null) {
  if (!canCurrentUserPlanContent()) {
    showToast('Access Denied: Only Idea Board editors can add or edit ideas', 'error');
    return;
  }

  state.editingIdeaId = ideaId;
  const modal = document.getElementById('idea-modal');
  const modalTitle = document.getElementById('idea-modal-title');
  const deleteBtn = document.getElementById('idea-modal-delete-btn');
  const form = document.getElementById('idea-form');
  const linksList = document.getElementById('idea-form-links-list');

  form.reset();
  if (linksList) linksList.innerHTML = '';

  if (ideaId) {
    modalTitle.textContent = 'Edit Idea';
    if (deleteBtn) deleteBtn.style.display = 'block';

    const idea = (state.contentIdeas || []).find(i => i.id === ideaId);
    if (idea) {
      document.getElementById('idea-form-name').value = idea.name || '';
      document.getElementById('idea-form-date').value = idea.date || '';
      document.getElementById('idea-form-notes').value = idea.notes || '';
      (idea.links || []).forEach(link => addIdeaLinkRow(link));
    }
  } else {
    modalTitle.textContent = 'New Idea';
    if (deleteBtn) deleteBtn.style.display = 'none';
  }

  if (linksList && linksList.children.length === 0) addIdeaLinkRow('');

  if (modal) modal.classList.add('active');
}

function closeIdeaModal() {
  const modal = document.getElementById('idea-modal');
  if (modal) modal.classList.remove('active');
  state.editingIdeaId = null;
}

async function handleIdeaFormSubmit(e) {
  e.preventDefault();

  if (!canCurrentUserPlanContent()) {
    showToast('Access Denied: Only Idea Board editors can save ideas', 'error');
    return;
  }

  const name = document.getElementById('idea-form-name').value.trim();
  const date = document.getElementById('idea-form-date').value;
  const notes = document.getElementById('idea-form-notes').value.trim();
  const links = collectIdeaLinks();

  if (!name || !date) {
    showToast('Please fill out the idea name and target date', 'error');
    return;
  }

  const isEditing = !!state.editingIdeaId;
  let ideaId = state.editingIdeaId;
  const existing = isEditing ? (state.contentIdeas || []).find(i => i.id === ideaId) : null;

  const currentUser = localStorage.getItem('hc_logged_in_user') || 'System';

  const build = (id) => ({
    id,
    name,
    date,
    notes,
    links,
    // Idea Initiator is set once, at creation, and never re-signed on edits —
    // it records who originated the idea, not who last touched it.
    initiatedBy: existing ? existing.initiatedBy : currentUser,
    initiatedAt: existing ? existing.initiatedAt : new Date().toISOString(),
    handled: existing ? !!existing.handled : false
  });

  try {
    if (isEditing) {
      await setDoc(doc(db, "content_ideas", ideaId), build(ideaId));
    } else {
      // Sequential I-<n> id allocated from the server's live ids and
      // INSERTed, so a stale cache can't reuse an id and overwrite an idea.
      ideaId = await createSequentialDoc('content_ideas', 'I-', 0, build);
    }
    showToast(isEditing ? 'Idea updated successfully' : 'Idea added to the board', 'success');
    await logActivity(isEditing ? `updated idea ${ideaId}: "${name}"` : `added idea ${ideaId}: "${name}"`, db);
    closeIdeaModal();
  } catch (err) {
    console.error("Idea save failed:", err);
    showToast('Failed to save idea — check your connection and try again' + errSuffix(err), 'error');
  }
}

async function deleteIdea() {
  if (!canCurrentUserPlanContent()) {
    showToast('Access Denied: Only Idea Board editors can delete ideas', 'error');
    return;
  }

  const ideaId = state.editingIdeaId;
  if (!ideaId) return;

  const idea = (state.contentIdeas || []).find(i => i.id === ideaId);
  if (!idea) return;

  if (!confirm(`Are you sure you want to delete "${idea.name}" from the Idea Board?`)) return;

  try {
    await deleteDoc(doc(db, "content_ideas", ideaId));
    showToast(`Idea "${idea.name}" removed`, 'info');
    await logActivity(`deleted idea ${ideaId}: "${idea.name}"`, db);
    closeIdeaModal();
  } catch (err) {
    console.error("Firestore idea delete failed:", err);
    showToast('Failed to delete idea — check your connection and try again' + errSuffix(err), 'error');
  }
}

// ============================================================
// Priority Board — DTF/Vinyl and sublimation print-prep requests
// ============================================================

const PRIORITY_NOTE_JOB_TYPES = ['DTF', 'Vinyl', 'Mug', 'Water Bottle', 'Frame'];

// The real internal cutoff to watch, not the 6:45pm office close — unhandled
// end-of-day notes get a visual warning once the clock enters this window.
const PRIORITY_BOARD_WARNING_HOUR = 17;   // 5:00 PM
const PRIORITY_BOARD_WARNING_MINUTE = 0;

// How long a note stays visible (with an Undo affordance) on the active
// board after being marked Handled, before it drops off for good.
const PRIORITY_NOTE_UNDO_WINDOW_MS = 6000;

function getRelativeTimeString(isoString) {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function isPriorityNoteNearDeadline(note) {
  if (note.status !== 'open' || note.slot !== 'end-of-day') return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (note.date !== todayStr) return false;
  const warningStart = new Date(today);
  warningStart.setHours(PRIORITY_BOARD_WARNING_HOUR, PRIORITY_BOARD_WARNING_MINUTE, 0, 0);
  return today >= warningStart;
}

function renderPriorityBoard() {
  const grid = document.getElementById('priority-board-grid');
  if (!grid) return;

  const canManage = canCurrentUserManagePriorityNotes();
  const canHandle = canCurrentUserHandlePriorityNotes();
  const currentUser = localStorage.getItem('hc_logged_in_user');

  const newBtn = document.getElementById('priority-note-new-btn');
  if (newBtn) newBtn.style.display = canManage ? 'inline-flex' : 'none';

  const now = Date.now();
  const recentlyHandled = state.recentlyHandledNoteIds || {};
  // Purge expired undo-window entries so they don't leak forever.
  Object.keys(recentlyHandled).forEach(id => {
    if (now - recentlyHandled[id] > PRIORITY_NOTE_UNDO_WINDOW_MS) delete recentlyHandled[id];
  });

  let notes = (state.priorityNotes || []).filter(n => n.status === 'open' || recentlyHandled[n.id]);

  const dateFilter = state.priorityBoardDateFilter;
  if (dateFilter) notes = notes.filter(n => n.date === dateFilter);

  if (notes.length === 0) {
    grid.innerHTML = `<div style="text-align:center; padding: 48px; color: #64748b;">No open priority notes${canManage ? ' — click "New Priority Note" to flag print-prep work.' : '.'}</div>`;
    return;
  }

  const dates = [...new Set(notes.map(n => n.date))].sort();

  grid.innerHTML = dates.map(date => {
    const dayNotes = notes.filter(n => n.date === date);
    const startNotes = dayNotes.filter(n => n.slot === 'start-of-day');
    const endNotes = dayNotes.filter(n => n.slot === 'end-of-day');
    const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    const renderSlotCards = (slotNotes, slotClass) => slotNotes.map(note => {
      const isUndo = !!recentlyHandled[note.id];
      const isWarning = isPriorityNoteNearDeadline(note);
      const postedTime = new Date(note.postedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const commentCount = (note.commentsList || []).length;

      const handledControl = isUndo
        ? `<div class="priority-note-undo-banner">Marked handled — <button type="button" class="priority-note-undo-btn" data-id="${note.id}">Undo</button></div>`
        : (canHandle
          ? `<label class="priority-note-handle-toggle"><input type="checkbox" class="priority-note-handled-checkbox" data-id="${note.id}"> Mark Handled</label>`
          : '');

      const editDeleteHtml = (canManage && note.postedBy === currentUser)
        ? `<button type="button" class="btn-icon priority-note-edit-btn" data-id="${note.id}" title="Edit"><svg viewBox="0 0 24 24" style="fill:none; stroke:currentColor; stroke-width:2; width:14px; height:14px;"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`
        : '';

      return `
        <div class="priority-note-card ${slotClass} ${isWarning ? 'priority-note-warning' : ''} ${isUndo ? 'priority-note-undoing' : ''}" data-id="${note.id}">
          <div class="priority-note-card-top">
            <span class="priority-note-jobtype">${escapeHtml(note.jobType)}</span>
            ${isWarning ? '<span class="priority-note-warning-icon" title="Approaching end-of-day cutoff">⚠</span>' : ''}
            ${editDeleteHtml}
          </div>
          <div class="priority-note-text">${escapeHtml(note.text)}</div>
          <div class="priority-note-meta">
            <span>${escapeHtml(note.postedBy || '')}</span>
            <span>${postedTime}</span>
          </div>
          <div class="priority-note-footer">
            <button type="button" class="priority-note-comments-btn" data-id="${note.id}">💬 ${commentCount}</button>
            ${handledControl}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="priority-board-day">
        <h4 class="priority-board-day-label">${dateLabel}</h4>
        <div class="priority-board-slots">
          <div class="priority-board-slot">
            <div class="priority-board-slot-label priority-slot-start-label">Start of Day</div>
            <div class="priority-board-slot-cards">${startNotes.length ? renderSlotCards(startNotes, 'priority-slot-start') : '<div class="priority-slot-empty">Nothing flagged</div>'}</div>
          </div>
          <div class="priority-board-slot">
            <div class="priority-board-slot-label priority-slot-end-label">End of Day</div>
            <div class="priority-board-slot-cards">${endNotes.length ? renderSlotCards(endNotes, 'priority-slot-end') : '<div class="priority-slot-empty">Nothing flagged</div>'}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.priority-note-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openPriorityNoteModal(btn.dataset.id));
  });
  grid.querySelectorAll('.priority-note-comments-btn').forEach(btn => {
    btn.addEventListener('click', () => openPriorityNoteDetailModal(btn.dataset.id));
  });
  grid.querySelectorAll('.priority-note-handled-checkbox').forEach(cb => {
    cb.addEventListener('change', () => togglePriorityNoteHandled(cb.dataset.id));
  });
  grid.querySelectorAll('.priority-note-undo-btn').forEach(btn => {
    btn.addEventListener('click', () => undoPriorityNoteHandled(btn.dataset.id));
  });

  const logPanel = document.getElementById('priority-board-log-panel');
  if (logPanel && logPanel.style.display !== 'none') renderPriorityBoardLog();
}

function renderPriorityBoardLog() {
  const list = document.getElementById('priority-board-log-list');
  if (!list) return;
  const logs = state.priorityBoardLog || [];
  if (logs.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding: 24px; color: #64748b;">No Priority Board activity yet.</div>`;
    return;
  }
  list.innerHTML = logs.map(log => {
    const date = new Date(log.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `<div class="activity-log-item">
      <div><span class="activity-log-user">${escapeHtml(log.user)}</span> <span class="activity-log-text">${escapeHtml(log.actionText)}</span></div>
      <div class="activity-log-time">${dateStr} at ${timeStr}</div>
    </div>`;
  }).join('');
}

function updatePriorityBoardBadge() {
  const openCount = (state.priorityNotes || []).filter(n => n.status === 'open').length;
  const navBadge = document.getElementById('priority-board-badge');
  if (navBadge) {
    if (openCount > 0) {
      navBadge.textContent = openCount;
      navBadge.style.display = 'flex';
    } else {
      navBadge.style.display = 'none';
    }
  }
  const dashboardBadge = document.getElementById('dashboard-priority-board-badge');
  if (dashboardBadge) {
    if (openCount > 0) {
      dashboardBadge.textContent = `${openCount} open Priority Board note${openCount === 1 ? '' : 's'}`;
      dashboardBadge.style.display = 'inline-flex';
    } else {
      dashboardBadge.style.display = 'none';
    }
  }
}

async function togglePriorityNoteHandled(noteId) {
  if (!canCurrentUserHandlePriorityNotes()) {
    showToast('Access Denied: Only the creative team can mark notes as handled', 'error');
    renderPriorityBoard();
    return;
  }
  const note = (state.priorityNotes || []).find(n => n.id === noteId);
  if (!note) return;
  const currentUser = localStorage.getItem('hc_logged_in_user') || 'System';

  // Set the undo-window flag *before* writing to Firestore — the onSnapshot
  // listener can fire (and call renderPriorityBoard) the instant the write
  // lands, and if this flag isn't set yet by then the card would flash off
  // the board before the undo banner ever has a chance to show.
  state.recentlyHandledNoteIds = state.recentlyHandledNoteIds || {};
  state.recentlyHandledNoteIds[noteId] = Date.now();
  setTimeout(() => {
    delete (state.recentlyHandledNoteIds || {})[noteId];
    renderPriorityBoard();
  }, PRIORITY_NOTE_UNDO_WINDOW_MS);

  try {
    await setDoc(doc(db, "priority_notes", noteId), { ...note, status: 'handled', handledBy: currentUser, handledAt: new Date().toISOString() });
    renderPriorityBoard();
    await logActivity(`marked priority note "${note.jobType}" (${note.date}, ${note.slot === 'start-of-day' ? 'start of day' : 'end of day'}) as handled`, db);
    await logPriorityBoardActivity(`marked "${note.jobType}" note as handled`, db);
  } catch (err) {
    console.error("Failed to mark priority note handled:", err);
    showToast('Failed to save — check your connection and try again' + errSuffix(err), 'error');
    delete (state.recentlyHandledNoteIds || {})[noteId];
    renderPriorityBoard();
  }
}

async function undoPriorityNoteHandled(noteId) {
  const note = (state.priorityNotes || []).find(n => n.id === noteId);
  if (!note) return;
  delete (state.recentlyHandledNoteIds || {})[noteId];
  try {
    await setDoc(doc(db, "priority_notes", noteId), { ...note, status: 'open', handledBy: null, handledAt: null });
    await logActivity(`undid "handled" on priority note "${note.jobType}" (${note.date})`, db);
    await logPriorityBoardActivity(`undid "handled" on "${note.jobType}" note`, db);
  } catch (err) {
    console.error("Failed to undo priority note handled state:", err);
    showToast('Failed to undo — check your connection and try again' + errSuffix(err), 'error');
  }
  renderPriorityBoard();
}

function openPriorityNoteModal(noteId = null) {
  if (!canCurrentUserManagePriorityNotes()) {
    showToast('Access Denied: Only Orthee can add or edit Priority Board notes', 'error');
    return;
  }

  const note = noteId ? (state.priorityNotes || []).find(n => n.id === noteId) : null;
  if (noteId && note && note.postedBy !== localStorage.getItem('hc_logged_in_user')) {
    showToast('Access Denied: You can only edit your own notes', 'error');
    return;
  }

  state.editingPriorityNoteId = noteId;
  const modal = document.getElementById('priority-note-modal');
  const modalTitle = document.getElementById('priority-note-modal-title');
  const deleteBtn = document.getElementById('priority-note-modal-delete-btn');
  const form = document.getElementById('priority-note-form');

  form.reset();

  if (noteId && note) {
    modalTitle.textContent = 'Edit Priority Note';
    if (deleteBtn) deleteBtn.style.display = 'block';
    document.getElementById('priority-note-form-date').value = note.date || '';
    document.getElementById('priority-note-form-slot').value = note.slot || 'start-of-day';
    document.getElementById('priority-note-form-jobtype').value = note.jobType || 'DTF';
    document.getElementById('priority-note-form-text').value = note.text || '';
  } else {
    modalTitle.textContent = 'New Priority Note';
    if (deleteBtn) deleteBtn.style.display = 'none';
    const today = new Date();
    document.getElementById('priority-note-form-date').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  if (modal) modal.classList.add('active');
}

function closePriorityNoteModal() {
  const modal = document.getElementById('priority-note-modal');
  if (modal) modal.classList.remove('active');
  state.editingPriorityNoteId = null;
}

async function handlePriorityNoteFormSubmit(e) {
  e.preventDefault();

  if (!canCurrentUserManagePriorityNotes()) {
    showToast('Access Denied: Only Orthee can save Priority Board notes', 'error');
    return;
  }

  const date = document.getElementById('priority-note-form-date').value;
  const slot = document.getElementById('priority-note-form-slot').value;
  const jobType = document.getElementById('priority-note-form-jobtype').value;
  const text = document.getElementById('priority-note-form-text').value.trim();

  if (!date || !slot || !jobType || !text) {
    showToast('Please fill out all fields', 'error');
    return;
  }
  if (!PRIORITY_NOTE_JOB_TYPES.includes(jobType)) {
    showToast('Invalid job type', 'error');
    return;
  }

  const isEditing = !!state.editingPriorityNoteId;
  const currentUser = localStorage.getItem('hc_logged_in_user') || 'System';
  let noteId = state.editingPriorityNoteId;
  const existing = isEditing ? (state.priorityNotes || []).find(n => n.id === noteId) : null;

  if (isEditing && existing && existing.postedBy !== currentUser) {
    showToast('Access Denied: You can only edit your own notes', 'error');
    return;
  }

  const build = (id) => ({
    id,
    date,
    slot,
    jobType,
    text,
    postedAt: existing ? existing.postedAt : new Date().toISOString(),
    postedBy: existing ? existing.postedBy : currentUser,
    status: existing ? existing.status : 'open',
    handledBy: existing ? existing.handledBy : null,
    handledAt: existing ? existing.handledAt : null,
    commentsList: existing ? (existing.commentsList || []) : []
  });

  try {
    if (isEditing) {
      await setDoc(doc(db, "priority_notes", noteId), build(noteId));
    } else {
      // Sequential PN-<n> id from the server's live ids, INSERTed so a stale
      // cache can't reuse an id and overwrite an existing note.
      noteId = await createSequentialDoc('priority_notes', 'PN-', 0, build);
    }
    showToast(isEditing ? 'Priority note updated' : 'Priority note posted', 'success');
    const summary = `"${jobType}" note (${date}, ${slot === 'start-of-day' ? 'start of day' : 'end of day'})`;
    await logActivity(`${isEditing ? 'updated' : 'posted'} priority board ${summary}`, db);
    await logPriorityBoardActivity(`${isEditing ? 'updated' : 'posted'} ${summary}: "${text}"`, db);
    closePriorityNoteModal();
  } catch (err) {
    console.error("Firestore priority note save failed:", err);
    showToast('Failed to save note — check your connection and try again' + errSuffix(err), 'error');
  }
}

async function deletePriorityNote() {
  if (!canCurrentUserManagePriorityNotes()) {
    showToast('Access Denied: Only Orthee can delete Priority Board notes', 'error');
    return;
  }

  const noteId = state.editingPriorityNoteId;
  if (!noteId) return;

  const note = (state.priorityNotes || []).find(n => n.id === noteId);
  if (!note) return;

  if (note.postedBy !== localStorage.getItem('hc_logged_in_user')) {
    showToast('Access Denied: You can only delete your own notes', 'error');
    return;
  }

  if (!confirm(`Are you sure you want to delete this "${note.jobType}" priority note?`)) return;

  try {
    await deleteDoc(doc(db, "priority_notes", noteId));
    showToast('Priority note deleted', 'info');
    const summary = `"${note.jobType}" note (${note.date}, ${note.slot === 'start-of-day' ? 'start of day' : 'end of day'})`;
    await logActivity(`deleted priority board ${summary}`, db);
    await logPriorityBoardActivity(`deleted ${summary}`, db);
    closePriorityNoteModal();
  } catch (err) {
    console.error("Firestore priority note delete failed:", err);
    showToast('Failed to delete note — check your connection and try again' + errSuffix(err), 'error');
  }
}

// --- Priority Board note comment thread (mirrors renderPostComments/addCommentToPost) ---

function openPriorityNoteDetailModal(noteId) {
  const note = (state.priorityNotes || []).find(n => n.id === noteId);
  if (!note) return;
  state.viewingPriorityNoteId = noteId;

  const modal = document.getElementById('priority-note-detail-modal');
  const title = document.getElementById('priority-note-detail-title');
  const body = document.getElementById('priority-note-detail-body');
  if (title) title.textContent = `${note.jobType} — ${note.date} (${note.slot === 'start-of-day' ? 'Start of Day' : 'End of Day'})`;
  if (body) {
    const postedTime = new Date(note.postedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    body.innerHTML = `
      <div style="color:#cbd5e1; font-size:0.9rem; line-height:1.5; margin-bottom:8px;">${escapeHtml(note.text)}</div>
      <div style="color:#64748b; font-size:0.75rem;">Posted by ${escapeHtml(note.postedBy || '')} · ${postedTime}${note.status === 'handled' ? ` · Handled by ${escapeHtml(note.handledBy || '')}` : ''}</div>
    `;
  }
  renderPriorityNoteComments(note);
  if (modal) modal.classList.add('active');
}

function closePriorityNoteDetailModal() {
  const modal = document.getElementById('priority-note-detail-modal');
  if (modal) modal.classList.remove('active');
  state.viewingPriorityNoteId = null;
}

function renderPriorityNoteComments(note) {
  const feed = document.getElementById('priority-note-comments-feed');
  if (!feed) return;
  if (!note || !note.commentsList || note.commentsList.length === 0) {
    feed.innerHTML = '<div style="color: #64748b; font-style: italic; font-size: 0.8rem; text-align: center; padding: 10px;">No comments yet. Start the discussion!</div>';
    return;
  }
  feed.innerHTML = note.commentsList.map(c => {
    const initials = c.user.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    return `
      <div class="comment-bubble-card">
        <div class="comment-avatar">${initials}</div>
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-user">${escapeHtml(c.user)}</span>
            <span class="comment-time">${getRelativeTimeString(c.timestamp)}</span>
          </div>
          <div class="comment-text">${escapeHtml(c.text)}</div>
        </div>
      </div>
    `;
  }).join('');
  feed.scrollTop = feed.scrollHeight;
}

async function submitPriorityNoteComment() {
  const input = document.getElementById('priority-note-comment-input');
  const noteId = state.viewingPriorityNoteId;
  if (!input || !noteId) return;
  const text = input.value.trim();
  if (!text) return;

  const currentUser = localStorage.getItem('hc_logged_in_user');
  if (!currentUser) {
    showToast('Please sign in to comment', 'error');
    return;
  }

  const note = (state.priorityNotes || []).find(n => n.id === noteId);
  if (!note) return;

  const commentsList = note.commentsList || [];
  commentsList.push({ user: currentUser, text, timestamp: new Date().toISOString() });

  try {
    await setDoc(doc(db, "priority_notes", noteId), { ...note, commentsList });
    input.value = '';
    note.commentsList = commentsList;
    renderPriorityNoteComments(note);
    await logActivity(`commented on priority note "${note.jobType}" (${note.date}): "${text}"`, db);
    await logPriorityBoardActivity(`commented on "${note.jobType}" note: "${text}"`, db);
  } catch (err) {
    console.error("Failed to add comment to priority note:", err);
    showToast('Failed to post comment — check your connection and try again' + errSuffix(err), 'error');
  }
}

// --- Publishing Queue Logic ---
function updatePublishingQueueBadge() {
  const badge = document.getElementById('publishing-queue-badge');
  if (!badge) return;

  const pendingPublishing = state.tasks.filter(t => t.taskType === 'post' && t.status === 'Finished' && !isTaskFullyPosted(t));
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

  const pendingPublishing = state.tasks.filter(t => t.taskType === 'post' && t.status === 'Finished' && !isTaskFullyPosted(t));

  if (pendingPublishing.length === 0) {
    list.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748b;">No pending posts to publish.</div>`;
    return;
  }

  list.innerHTML = pendingPublishing.map(task => {
    const postInfo = '';

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

  // Bug fix: same silent-failure pattern found and fixed elsewhere in task
  // create/update/delete — this one lives in the Publishing Queue widget's
  // individual "Mark as Posted" button and was missed during that earlier
  // pass. It set isPosted locally and showed "success" BEFORE the Firestore
  // write was attempted, with failures only console.warn'd (falsely claiming
  // "saved locally" — there is no local persistence). If the write failed,
  // the next Firestore sync from anyone's action would silently wipe the
  // posted mark back off with no indication anything went wrong. This is a
  // very likely explanation for previously-marked posts losing their
  // "Posted" status. Now the write is confirmed before claiming success.
  // A single "Mark as Posted" action (Publishing Queue / Activity Log quick
  // button) marks the task fully posted — both pages for a Tahams sub-brand
  // task, the one page for everyone else. Marking just one page of a
  // sub-brand task is done via the Task Tracker table's per-page checkboxes.
  const posted = { ...(task.posted || {}) };
  pageKeysForTask(task).forEach(key => { posted[key] = true; });
  const updatedTask = { ...task, posted, postedAt: new Date().toISOString() };
  try {
    await setDoc(doc(db, "tasks", taskId), updatedTask);
    Object.assign(task, updatedTask);
    logActivity(`Marked task "${task.name}" as posted`, db);
    showToast(`Marked "${task.name}" as posted`, 'success');
    renderActivityLog();
    updateActivityBadge();
    refreshViews();
  } catch (err) {
    console.error("Firestore task update failed:", err);
    showToast(`Failed to mark "${task.name}" as posted — check your connection and try again${errSuffix(err)}`, 'error');
  }
};
