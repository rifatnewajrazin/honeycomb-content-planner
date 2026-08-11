import os
import datetime

vault_dir = "/Users/rifatnewajrazin/Downloads/ObsidianVault/T1890"
scratch_dir = "/Users/rifatnewajrazin/.gemini/antigravity/scratch/honeycomb-content-planner"

# 1. Write Honeycomb Content Planner Source Code.md
source_md_path = os.path.join(vault_dir, "Honeycomb Content Planner Source Code.md")
files_to_backup = ["index.html", "style.css", "app.js", "package.json", "parse_and_update_tasks.py"]

markdown_content = f"""---
title: Honeycomb Content Planner Source Code (V3.8.3)
date: {datetime.date.today().isoformat()}
tags: [project, code, honeycomb, planner, v3.8.3]
---

# Honeycomb Content Planner Source Code (V3.8.3)

This is the complete source code backup for **Honeycomb Content Planner V3.8.3**.

- **Version**: 3.8.3
- **Release Date**: August 11, 2026
- **Main Release Note**: [[Honeycomb Content Planner V3.8.3]]
- **Local Application Path**: `file://{scratch_dir}/index.html`
- **Local Server**: [http://localhost:8000/](http://localhost:8000/)

---

"""

for filename in files_to_backup:
    filepath = os.path.join(scratch_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            code = f.read()
        
        ext = filename.split('.')[-1]
        lang = 'python' if ext == 'py' else 'javascript' if ext == 'js' else 'html' if ext == 'html' else 'css' if ext == 'css' else 'json'
        markdown_content += f"## `{filename}`\n\n```{lang}\n{code}\n```\n\n"

with open(source_md_path, "w", encoding="utf-8") as f:
    f.write(markdown_content)

print("Updated Honeycomb Content Planner Source Code.md (V3.8.3)")

# 2. Write Honeycomb Content Planner V3.8.3.md
v3_md_path = os.path.join(vault_dir, "Honeycomb Content Planner V3.8.3.md")
v3_content = f"""---
title: Honeycomb Content Planner V3.8.3
date: {datetime.date.today().isoformat()}
tags: [project, release, honeycomb, planner, v3.8.3]
---

# Honeycomb Content Planner V3.8.3

The production-ready release of the internal **HoneyComb Inc. Content Tracker & Planner** web application.

- **Mother Company**: [[Places/HoneyComb Inc.]]
- **Lead Developer & Designer**: [[People/Rifat Newaj Razin]]
- **Source Code Note**: [[Honeycomb Content Planner Source Code]]
- **Local Server URL**: [http://localhost:8000/](http://localhost:8000/)
- **File Location**: `file://{scratch_dir}/index.html`

---

## 🌟 What's New in Version 3.8.3

### 1. 📊 Master Task Dataset Synchronization (`T-01` to `T-128`)
- Parsed and synchronized 108 master CSV task records directly into `DEFAULT_TASKS` in `app.js`.
- Added new entries `T-121` through `T-128` covering SSM hiring, CO-ORD sets, Snoopy posts, and Cat T-Shirt designs.
- Enforced automated team alias mapping (`Razin` -> `[[People/Rifat Newaj Razin]]`, `Rabby` -> `Md. Yasin Arafat`, `Niaz` -> `Niaz Uddin`, `Jubaer Bhai` -> `Social Media Manager`, `Ashiq Bhaia` -> `Ashiq Ahmed`, `Tohfa Apu` -> `Israt Sultana Tohfa`).

### 2. 🎨 Evoka Experiences Brand Page & Asset Integration
- Added official `evoka-experiences` brand entry to `DEFAULT_BRANDS` in `app.js`.
- Linked official brand logo asset at `assets/logos/evoka-experiences.png`.
- Added brand auto-detection across tasks and posts (*Evoka, Lovelife, SammTech, Merchtile, Perfume, Lumina, Star/Kids, Tahams*).

### 3. 🔒 Account Security & Password Privacy Protection
- Enforced Admin-only password visibility in **People & Roles** view (`renderTeam()`).
- Passwords are strictly visible ONLY to Admins (`Rifat Newaj Razin`, `Mostaque Ahammed Naim`) and the account owner; non-admin users see masked bullets (`••••••••`).

### 4. ⚡ Non-Blocking Optimistic Local State Operations
- Re-architected task creation, editing, deletion, and idea submissions (`handleTaskFormSubmit`, `handleIdeaFormSubmit`, `deleteTask`, `markTaskPosted`).
- All user actions update memory state (`state.tasks`, `state.ideas`) and UI views (`refreshViews()`) **instantly** without blocking on Firestore cloud REST calls, eliminating cloud save timeout errors.

### 5. 🧹 Interface Streamlining & Cleanup
- **Navigation Cleanup**: Removed unused **Publishing Queue** and **Analytics** tabs from sidebar and header.
- **Modal Cleanup**: Stripped out legacy *Discussion & Updates* comment sections from Task and Post modals to maintain a clean, high-performance interface.

---

## 📁 Project Architecture & Backup

Full code repository backup is maintained in [[Honeycomb Content Planner Source Code]].
"""

with open(v3_md_path, "w", encoding="utf-8") as f:
    f.write(v3_content)

print("Created Honeycomb Content Planner V3.8.3.md")


