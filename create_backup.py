import os
import datetime

vault_path = "/Users/rifatnewajrazin/Downloads/ObsidianVault/T1890/Honeycomb Content Planner Source Code.md"
scratch_dir = "/Users/rifatnewajrazin/.gemini/antigravity/scratch/honeycomb-content-planner"

files_to_backup = ["index.html", "style.css", "app.js", "package.json"]

markdown_content = f"""---
title: Honeycomb Content Planner Source Code
date: {datetime.date.today().isoformat()}
tags: [project, code, honeycomb, planner]
---

# Honeycomb Content Planner Source Code

This is the complete source code backup for the Honeycomb Content Planner.

"""

for filename in files_to_backup:
    filepath = os.path.join(scratch_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            code = f.read()
        
        ext = filename.split('.')[-1]
        lang = 'javascript' if ext == 'js' else 'html' if ext == 'html' else 'css' if ext == 'css' else 'json'
        
        markdown_content += f"## `{filename}`\n\n```{lang}\n{code}\n```\n\n"

with open(vault_path, "w", encoding="utf-8") as f:
    f.write(markdown_content)

print("Successfully backed up source code to Obsidian Vault.")
