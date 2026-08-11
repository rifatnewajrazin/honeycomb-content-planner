# Honeycomb Content Planner

Internal Content Tracker & Planner for **HoneyComb Inc.**, built to match the team's real production workflow: senior brief → task assigned to a Creative → Google Drive delivery → Social Media Manager captions & posts.

- **Lead Developer & Designer:** Rifat Newaj Razin
- **Current version:** V3.9.0

## Running locally

```bash
npm install
node server.mjs
```

Then open [http://localhost:8000/](http://localhost:8000/).

## What's new in V3.9.0

- Removed the standalone Ideas system (topic/initiator tracking, Ideas kanban, calendar idea events) — it wasn't part of the team's actual workflow.
- Removed the "Content Type" field from the New Post form (overlapped with Target Platforms).
- Merged the separate Work Assigner and Idea Initiator roles into a single **Assigner** role.
- Restricted sign-in to the three team members with active accounts.
- Fixed the Task Tracker creative filter dropdown to include all creatives.

## Stack

Static frontend (`index.html`, `style.css`, `app.js`) with a small Node WebSocket server (`server.mjs`) and optional Firestore sync for real-time updates, with an offline fallback if Firebase is unreachable.
