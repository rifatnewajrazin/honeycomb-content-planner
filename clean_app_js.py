import re, json, urllib.request, csv, io, ssl

app_js_path = '/Users/rifatnewajrazin/.gemini/antigravity/scratch/honeycomb-content-planner/app.js'
with open(app_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove duplicate const DEFAULT_TASKS block (starts at '// Default spreadsheet tasks' and ends before '// Default Content Planner Ideas')
pattern = r'// Default spreadsheet tasks \(DESIGNER TASK TRACKER & WORKFLOW\)[\s\S]*?(?=// Default Content Planner Ideas)'
content = re.sub(pattern, '', content)

with open(app_js_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Duplicate DEFAULT_TASKS removed from app.js successfully.')
