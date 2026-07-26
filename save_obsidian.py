import os
import datetime

vault_dir = "/Users/rifatnewajrazin/Downloads/ObsidianVault/T1890"
scratch_dir = "/Users/rifatnewajrazin/.gemini/antigravity/scratch/honeycomb-content-planner"

# 1. Write Honeycomb Content Planner Source Code.md
source_md_path = os.path.join(vault_dir, "Honeycomb Content Planner Source Code.md")
files_to_backup = ["index.html", "style.css", "app.js", "package.json"]

markdown_content = f"""---
title: Honeycomb Content Planner Source Code (V3.6.2)
date: {datetime.date.today().isoformat()}
tags: [project, code, honeycomb, planner, v3.6.2]
---

# Honeycomb Content Planner Source Code (V3.6.2)

This is the complete source code backup for **Honeycomb Content Planner V3.6.2**.

- **Version**: 3.6.2
- **Release Date**: July 27, 2026
- **Main Release Note**: [[Honeycomb Content Planner V3.6.2]]
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
        lang = 'javascript' if ext == 'js' else 'html' if ext == 'html' else 'css' if ext == 'css' else 'json'
        markdown_content += f"## `{filename}`\n\n```{lang}\n{code}\n```\n\n"

with open(source_md_path, "w", encoding="utf-8") as f:
    f.write(markdown_content)

print("Updated Honeycomb Content Planner Source Code.md (V3.6.2)")

# 2. Write Honeycomb Content Planner V3.6.2.md
v3_md_path = os.path.join(vault_dir, "Honeycomb Content Planner V3.6.2.md")
v3_content = f"""---
title: Honeycomb Content Planner V3.6.2
date: {datetime.date.today().isoformat()}
tags: [project, release, honeycomb, planner, v3.6.2]
---

# Honeycomb Content Planner V3.6.2

The production-ready release of the internal **HoneyComb Inc. Content Tracker & Planner** web application.

- **Mother Company**: [[Places/HoneyComb Inc.]]
- **Lead Developer & Designer**: [[People/Rifat Newaj Razin]]
- **Source Code Note**: [[Honeycomb Content Planner Source Code]]
- **Local Server URL**: [http://localhost:8000/](http://localhost:8000/)
- **File Location**: `file://{scratch_dir}/index.html`

---

## 🌟 What's New in Version 3.6.2

### 1. ↕️ Interactive Ascending & Descending Column Header Sorting
- Added click-to-sort headers with active `▲` / `▼` / `↕` indicators across:
  - **Task Tracker**: Social Media Posts & General Design Tasks tables
  - **Content Links Directory**: Delivery Links table
  - **Content Planner**: Idea Bank table
  - **People & Roles**: Team Directory table

### 2. 📅 Calendar Layout & Grid Overflow Fix
- Fixed 7-column grid layout with `repeat(7, minmax(0, 1fr))` ensuring the calendar fits 100% inside container without horizontal page overflow.
- Truncated event badges with `ellipsis` to prevent column expansion.

### 3. 📑 Separate Social Media & General Design Tasks
- Parsed 76 Google Sheet tasks into 46 Social Media Posts and 30 General Design Tasks.
- Excluded General Tasks from the Social Media Publishing Queue & notifications drawer.

### 4. 🔗 Universal Google Drive & Facebook Link Resolution
- Direct web links (Facebook/Drive) open directly in new browser tabs.
- Plain text file titles resolve automatically into direct **Google Drive Search Queries**.

### 5. 📷 Employee Profile Picture Integration
- Linked profile pictures for [[People/Nazmul Hoseen Emon]] and [[People/Rafiunoor Rahman Rajjo]] in `assets/avatars/`.

---

## 📁 Project Architecture & Backup

Full code repository backup is maintained in [[Honeycomb Content Planner Source Code]].
"""

with open(v3_md_path, "w", encoding="utf-8") as f:
    f.write(v3_content)

print("Created Honeycomb Content Planner V3.6.2.md")

