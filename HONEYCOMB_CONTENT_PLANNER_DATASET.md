# Honeycomb Content Planner — Complete Dataset & Reference

> Internal Content Tracker & Planner for **HoneyComb Inc.**
> Lead Developer & Designer: Rifat Newaj Razin
> This document explains *how things work, which piece serves which purpose, and why each was built.*
> Compiled from `app.js`, `index.html`, `style.css`, `server.mjs`, the Python helper scripts, the Supabase SQL files, and git history.

---

## 1. What the app is and why it exists

A single-page internal web app that mirrors HoneyComb Inc.'s **real production workflow**:

```
Senior brief  →  Task assigned to a Creative  →  Google Drive delivery  →  Social Media Manager writes captions & posts
```

It was built to replace scattered Google Sheets / chat threads with one shared board that tracks:

- **General design/creative tasks** (who briefed it, who is doing it, deadline, status, delivery link)
- **Social media post deliverables** (a special task type that also tracks whether the finished asset was actually *posted* on each brand page)
- **Content ideas** (the Idea Board — a lightweight backlog of upcoming events/campaigns)
- **Priority Board notes** (print-prep prep requests: DTF/Vinyl/Mug/etc. that must be ready by start-of-day or end-of-day)
- **Activity history** for accountability, plus a small celebration animation when work is completed.

Everything is scoped to a fixed roster of ~18 real employees and 8 real brands.

---

## 2. Tech stack and how it runs

| Layer | What | Purpose |
|---|---|---|
| Frontend | `index.html` + `style.css` (~3.2k lines) + `app.js` (~6.8k lines), no framework | The entire UI. Views are `<section class="view-panel">` blocks toggled by `switchView()`. |
| Local server | `server.mjs` (Node `http`, port **8000**) | Static file server for local dev. `npm install` then `node server.mjs`, open `http://localhost:8000/`. `package.json` only depends on `ws`. |
| Realtime DB | **Supabase** (Postgres + Realtime channels + Supabase Auth) | Shared state across the team. `initSupabase()` wires a Firestore-style shim: `collection()`, `doc()`, `setDoc()`, `deleteDoc()`, `onSnapshot()` map onto Supabase tables holding `{ id, data }` rows with a realtime subscription per table (`realtime:<table>`). |
| Auth | Supabase Auth (email/password), emails like `name@honeycomb-hub.app` | Restricts sign-in to team members whose roster record has `canLogin: true` and an `authEmail`. |
| Offline fallback | `localStorage` (`hc_*` keys, e.g. `hc_logged_in_user`) | If the backend is unreachable the app still renders from cached/seed data. `saveToStorage()` persists state. |

**Auth history (important context):**
1. Originally a plaintext password check in the client.
2. Migrated to **Firebase Auth** — broke sign-in, was reverted to plaintext (`0608386`).
3. Finally migrated to **Supabase Auth**, and all data moved off an openly-readable Firestore into Supabase (`82df3fa`). `supabase_migration.sql` = schema; `supabase_data_restore.sql` = data dump for restore.
4. Latest fix (`ac0f032`): failure toasts now surface the real Supabase error via `errSuffix()` instead of a generic message.

---

## 3. The views (nav modules) — what each is for and who sees it

Nav items live in `index.html` as `<a data-view="…">`; `switchView()` shows the matching panel and `renderUserProfile()` decides visibility per signed-in user.

| View | `data-view` | Purpose | Visibility |
|---|---|---|---|
| **Dashboard** | `dashboard` | At-a-glance health: per-brand posting cadence vs `frequencyGoal`, counts of Not Started / Finished / Delayed, pending-publishing queue, priority-board badge. Default landing view. | Everyone logged in |
| **Logs** | `logs` | Full activity log with a per-user filter (`populateLogsUserFilter()`). | Hidden by default; shown to admins (`nav-logs-link` starts `display:none`) |
| **Calendar** | `calendar` | Month grid of posts/tasks by date; click a day to create a post. `normalizeDateString()` guards date parsing. | Everyone logged in |
| **Priority Board** | `priority-board` | Sticky-note board of print-prep requests grouped by **date + slot** (Start of Day / End of Day). Job types: DTF, Vinyl, Mug, Water Bottle, Frame. Notes have handled/undo state, near-deadline highlighting, a detail modal with comments, and its own history log. Built for Orthee's DTF/Vinyl/sublimation print-prep workflow (`ace6635`). | Hidden; only `canAccessPriorityBoard: true` users. "Board-only" accounts (Orthee) see *only* this + People & Roles (+ Idea Board if also an Ideator). |
| **Idea Board** | `idea-board` | Lightweight backlog of upcoming events/campaigns: name, target date, link rows, notes. Shows an **Idea Initiator** badge (auto-set to whoever created it). Ideas can be converted into posts (`convertIdeaToPost()`). | Everyone logged in can view; only `canPlanContent: true` ("Ideator") users can create/edit |
| **Task Tracker** | `tasks` | The core table. Two sections: **Social Media Posts** and **General Tasks**. Sortable/filterable by creative, assigner, brand, status, free-text search. Holds the **Mark as Posted** bulk controls + per-page undo. | Everyone logged in |
| **Content Links** | `content-links` | Flat, sortable list of every delivery link, matched to a brand via `matchTaskToBrandId()` (longest/most-specific brand-name match wins, so "Tahams" doesn't swallow every sub-brand). | Everyone logged in |
| **People & Roles** | `team` | Roster with photos, roles, and role badges (Ideator, HR, etc.). Add/edit/delete people and their permission flags. | Everyone logged in (incl. board-only accounts) |
| **Employee Database** | `employee-database` | Standalone HR directory — one record per employee (ID, designation, department, office space [HQ1 / Warehouse 2 / HQ2], desk, phone, work/personal email, DOB, blood group, join date, emergency contact, address, NID, optional CV Drive link + notes). Sortable/filterable table, add/edit/delete, CSV export, and import from a published Google Sheet CSV URL or pasted/uploaded CSV (matched by Employee ID). Own scoped change log. **Fully isolated: its own Supabase tables (`employee_records`, `employee_db_log`), never touches `state.team`.** | `canAccessEmployeeDb: true` or `access: 'admin'` only |

---

## 4. Roles and the permission model

Permissions are **per-person boolean flags** on each roster record (`DEFAULT_TEAM` in `app.js`, overridable from the DB), *not* named roles. `role` is just a free-text job title.

| Flag | Gate function | What it unlocks |
|---|---|---|
| `canLogin` | `initAuth()` / login restriction | May sign in at all. Needs an `authEmail`. |
| `access: 'admin' \| 'limited'` | — | `admin` surfaces the Logs nav link and admin-only affordances. |
| `isDesigner` | creative dropdowns | Appears in the "Designer"/creative assignment dropdowns and Task Tracker creative filter. |
| `isAssigner` | assigner dropdowns | Appears in the "Assigned By" dropdown (`ef201c4` lists everyone from People & Roles). Merged former "Work Assigner" + "Idea Initiator" into one **Assigner** role in V3.9.0. |
| `canMarkPosted` | `canCurrentUserMarkPosted()` | Sees/uses the bulk **Mark as Posted** controls + undo. |
| `canPlanContent` | `canCurrentUserPlanContent()` | "Ideator" — create/edit Idea Board ideas. |
| `canAccessPriorityBoard` | `canCurrentUserAccessPriorityBoard()` | Sees the Priority Board nav + view. |
| `canManagePriorityNotes` | `canCurrentUserManagePriorityNotes()` | Create/edit/delete Priority Board notes (vs. just handling them). |
| board-only | `isCurrentUserBoardOnly()` | Has `canAccessPriorityBoard` but is not part of the content team → nav is stripped to Priority Board + People & Roles (+ Idea Board if `canPlanContent`). This is Orthee's setup. |
| `canAccessEmployeeDb` | `canCurrentUserAccessEmployeeDb()` | "HR" — sees the Employee Database nav + view and can add/edit/delete/import employee records. Admins pass automatically. Toggled by the "Employee Database (HR)" checkbox in the Add/Edit Person modal. |

### Roster (as seeded in `DEFAULT_TEAM`)

| Name | Title | Login | Key flags |
|---|---|---|---|
| Rifat Newaj Razin | Head of Multimedia & Creative Dept | ✅ admin | designer, assigner, markPosted, planContent, priorityBoard — full access |
| Md. Mahim | Cinematographer & Video Editor | ❌ | designer |
| Md. Yasin Arafat (Rabby) | Creative Design Associate | ✅ | designer, priorityBoard |
| Niaz Uddin | Junior Designer | ✅ | designer, priorityBoard |
| Social Media Manager (Jubayer) | Social Media Manager | ❌ | assigner |
| Mohammad Zahidul Islam | Marketing, Sales & Comms Manager | ✅ | markPosted |
| Ashiq Ahmed | CFO | ❌ | assigner |
| Israt Sultana Tohfa | COO | ❌ | assigner |
| Saddam Hossain | Office Manager | ❌ | assigner |
| Mostaque Ahammed Naim | Head of IT | ✅ admin | assigner |
| Oisarjo Tarafder | Head of HR | ❌ | assigner |
| Sharmin Mahmud Khan Orthee | Sales & Customer Support Exec | ✅ | priorityBoard, managePriorityNotes — **board-only** |
| Md. Abdur Rafi Islam | Client Relationship Exec | ❌ | — |
| Md. Milon Hossain Anik | Inventory & QA Officer | ❌ | — |
| Labiba Laisa Esha | Exec, Growth & Strategic Planning | ❌ | — |
| Rafiunoor Rahman Rajjo | Event Decor & Management | ❌ | assigner |
| Nazmul Hoseen Emon | Manager, Display Center | ❌ | assigner |

`findTeamMember()` resolves names fuzzily via an `aliases` array (nicknames like "Razin Bhaia", "Rabby", "Tohfa Apu", "SMM") so imported spreadsheet data maps to the right person.

---

## 5. Brands and the Tahams sub-brand hierarchy

`DEFAULT_BRANDS` (merged with any DB overrides on load). Each brand: `id`, `name`, `type`, `sub`, `frequencyGoal` (target posts/period, drives the Dashboard cadence health), `logo`, gradient/color styling, `lastPostDate`.

| Brand | Type | `frequencyGoal` | Sub? | Short code |
|---|---|---|---|---|
| SammTech | Agency & Marketing | 2 | no | SMT |
| Lovelife Memories | Photography & Cinematography | 0 | no | LLM |
| Tahams | Customized Clothing POD | 14 | no (parent) | TMS |
| Perfume de Tahams | Tahams Subsection | 2 | yes | PDT |
| Lumina by Tahams | Tahams Subsection | 1 | yes | LBT |
| Tahams Little Star | Tahams Subsection | 1 | yes | TLS |
| Merchtile | Wholesale POD Platform | 2 | no | MER |
| Evoka Experiences | Event Decor & Management | 2 | no | EE |

### The two-page "posted" rule

`BRAND_HIERARCHY` maps the three Tahams sub-brands → `"Tahams"`. Consequence (`pageKeysForTask()`, `isTaskFullyPosted()`, `getTaskPostedState()`):

- A **normal** post task has **one** posted page key: `main`.
- A **Tahams sub-brand** post task has **two**: `sub` (its own page) and `parent` (the Tahams mother page). It only counts as *fully posted* when **both** are checked.
- `PAGE_KEY_LABELS = { main: 'this task', sub: 'the sub-brand page', parent: 'the Tahams parent page' }`.
- Short codes (`BRAND_SHORT_CODES`) keep the Posted-column badges compact instead of wrapping brand names.

The design note in the code: to add another multi-page sub-brand later, just extend `BRAND_HIERARCHY` — nothing else in the posted-tracking logic needs to change.

---

## 6. Data model / `state` shape

`state` (in `app.js` ~line 1922) is the single in-memory store, synced to Supabase and mirrored to `localStorage`:

| Key | Holds |
|---|---|
| `brands` | Brand configs (merged with `DEFAULT_BRANDS`) |
| `posts` | Calendar/social posts (brand, date, caption, platforms, status) |
| `tasks` | The task records. `taskType: 'post'` → social media deliverable (adds posted-tracking); otherwise a general task. Fields: id, name, designer, assigner, date/time, `neededBy`, `status`, `deliveryLink`, comments, `postedState` per page key, `archived`. |
| `team` | Roster (merged with `DEFAULT_TEAM`) |
| `contentIdeas` | Idea Board entries (+ `editingIdeaId`, `ideaSearchFilter`, `ideaStatusFilter`) |
| `priorityNotes` / `priorityBoardLog` | Priority Board notes + its history (+ `editingPriorityNoteId`, `viewingPriorityNoteId`, `recentlyHandledNoteIds`, `priorityBoardDateFilter`) |
| `currentView`, `currentDate` (pinned `2026-07-05`), `calendarDate` | UI state |
| `selectedBrandFilter`, `task*Filter`, `task*Sort*`, `contentLinks*Sort*`, `team*Sort*` | Per-view filter/sort state |
| `editingPost`, `editingTask` | Modal editing targets |

Comments are per-entity (`renderPostComments`, `renderTaskComments`, `renderPriorityNoteComments`) with `addCommentToPost/Task` writing through to the DB. `logActivity()` / `logPriorityBoardActivity()` append to the activity feeds; `updateActivityBadge()` / `updatePriorityBoardBadge()` / `updatePublishingQueueBadge()` drive the nav badges.

---

## 7. Workflows

### 7.1 Task lifecycle
Statuses in the task form: **Not Started · Finished · Delayed** (older data also carries "In Progress"). Kanban (`renderKanban()`) maps: `Not Started → ideation`, `Delayed → ready`, `Finished → published`. Post-type tasks are hidden from the Kanban to avoid duplication with the Task Tracker's Social Media section.

### 7.2 Mark as Posted (social deliverables)
- Only `canMarkPosted` users see the controls (`setupMarkAsPostedControls()`).
- Bulk: select rows, `markTasksPostedBulk(selections)` sets the chosen page keys (`main`, or `sub`/`parent`).
- Undo: `unpostTaskPage(taskId, pageKey)` reverts a mistaken mark (`a84ab22`).
- The **Publishing Queue** / pending-publishing badge = tasks where `taskType==='post' && status==='Finished' && !isTaskFullyPosted(t)` — i.e. asset done but not yet posted everywhere.

### 7.3 Idea → Post
Idea Board entry → `convertIdeaToPost(ideaId, kanbanStatus)` creates a post from the idea. Idea Initiator badge is stamped automatically at creation (`1d84c35` replaced the old "Assigned Designer" field with it).

### 7.4 Priority Board note lifecycle
Create (needs `canManagePriorityNotes`) → grouped by date + slot → `togglePriorityNoteHandled()` marks done, `undoPriorityNoteHandled()` reverts → near-deadline notes get a visual flag (`isPriorityNoteNearDeadline()`) → detail modal supports threaded comments → all changes logged to `priorityBoardLog`.

### 7.5 Feedback / delight
`triggerCelebration()` fires a confetti-style animation on completion. `showToast(msg, type)` for transient feedback; `setButtonLoading()` for pending states.

---

## 8. Helper scripts and data files (what each is for)

| File | Purpose |
|---|---|
| `parse_and_update_tasks.py` | Parses a big embedded raw CSV of the team's real task log, maps nickname → canonical name via `designer_map` / `assigner_map`, and rewrites the `DEFAULT_TASKS` seed inside `app.js`. |
| `process_pasted_csv.py` | Same idea for an ad-hoc pasted CSV blob — normalizes designer/assigner names and produces task JSON. |
| `update_from_google_sheet.py` | Pulls the team's live Google Sheet (`.../export?format=csv`, sheet id `1GOsVeUVqFDinz9PHDqJ-6QXRg2jNZth0TzvIa_Bpk1M`), normalizes names, and updates the seed data. The "import from Google Sheet" path. |
| `process_pasted_csv.py` / `input_data.csv` | `input_data.csv` is the working CSV snapshot used by the import scripts. |
| `clean_app_js.py` | One-off cleanup: strips a duplicated `DEFAULT_TASKS` block from `app.js`. |
| `save_obsidian.py` | Writes a full source backup ("Honeycomb Content Planner Source Code (V3.9.0)") into the user's Obsidian vault at `Downloads/ObsidianVault/T1890`. |
| `create_backup.py` | Older/simpler version of the same Obsidian backup routine. |
| `supabase_migration.sql` | Supabase schema (tables of `{ id, data }` + policies) for the Firestore→Supabase move. |
| `supabase_data_restore.sql` | ~184 KB data dump to repopulate Supabase. |
| `server.mjs` | Local static dev server (port 8000) with a small MIME map. |
| `assets/` | Brand logos (`assets/logos/*.png`) and team avatars (`assets/avatars/*.png`). |
| `.gitignore` | Excludes `node_modules` and local cruft. |

---

## 9. Condensed version / change history

Distilled from git log + README milestones (newest first):

- **`ac0f032`** — Failure toasts show the real Supabase error, not a generic string.
- **`82df3fa`** — Replaced plaintext credentials with **Supabase Auth**; migrated data off the openly-readable Firestore into Supabase.
- **`70611ea`** — Responsive **mobile layout** with slide-out sidebar menu (`openMobileSidebar()` / `closeMobileSidebar()`).
- **`8073e74` / `5387df3` / `33a2ecd` / `d748257` / `964d9fc`** — Iterative polish of the **Posted column**: brand short codes, fixed-width badge pills, alignment, "Posted" labels, clipping fixes.
- **`a84ab22`** — **Undo** control for mistakenly-posted pages.
- **`a2f1f5c`** — Per-page **Posted tracking for Tahams sub-brands** (the two-page rule).
- **`1d84c35`** — Idea Board: replaced "Assigned Designer" with an **Idea Initiator** badge.
- **`9ace984` / `278b3cf`** — Board-only Ideators can reach the Idea Board.
- **`0608386` / `c51de88`** — Reverted a broken Firebase Auth login back to plaintext (interim).
- **`dc4b953` / `1446cfa`** — Ideator badge in People & Roles; let Orthee see People & Roles from the Priority Board account.
- **`ace6635`** — Added the **Priority Board** for Orthee's DTF/Vinyl & sublimation print-prep requests.
- **`7f981d8`** — Fixed Content Post modal crash + stuck "Critical" dashboard health badge.
- **`ef201c4`** — "Assigned By" dropdown now lists everyone from People & Roles.
- **README / V3.9.0** — Removed the standalone Ideas system (topic/initiator tracking, Ideas kanban, calendar idea events) as not part of the real workflow; removed "Content Type" from the New Post form (overlapped Target Platforms); merged Work Assigner + Idea Initiator into one **Assigner** role; restricted sign-in to the three members with active accounts; fixed the Task Tracker creative filter to include all creatives.
- **README stack note** — earlier versions ran a Node **WebSocket** server (`ws`) + optional **Firestore** sync with an offline fallback; the current build uses Supabase.

---

## 10. Quick "which serves which" cheat sheet

| If you want to… | Use / look at |
|---|---|
| See if a brand is posting enough | Dashboard cadence vs `frequencyGoal` |
| Assign creative work | Task Tracker → General Tasks; assigner from `isAssigner` list, creative from `isDesigner` list |
| Track a social asset from brief to live | Task Tracker → Social Media Posts; status `Finished` then **Mark as Posted** (two pages for Tahams sub-brands) |
| Queue an upcoming campaign/event | Idea Board (needs `canPlanContent`) |
| Request print-prep (DTF/Vinyl/Mug/…) ready by SOD/EOD | Priority Board (needs `canAccessPriorityBoard`; create needs `canManagePriorityNotes`) |
| Find any delivery link | Content Links |
| Audit who did what | Logs (admin) / activity badges |
| Add a person or change their access | People & Roles → permission flags |
| Import the team's real task log | `update_from_google_sheet.py` / `parse_and_update_tasks.py` |
| Back up the whole app | `save_obsidian.py` |
| Restore the database | `supabase_migration.sql` + `supabase_data_restore.sql` |
