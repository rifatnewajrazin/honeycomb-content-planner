import urllib.request, json, csv, io, ssl, re

ctx = ssl._create_unverified_context()
url = 'https://docs.google.com/spreadsheets/d/1GOsVeUVqFDinz9PHDqJ-6QXRg2jNZth0TzvIa_Bpk1M/export?format=csv'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx) as resp:
    content = resp.read().decode('utf-8')

reader = csv.reader(io.StringIO(content))
rows = list(reader)

designer_map = {
    'razin': 'Rifat Newaj Razin',
    'rifat': 'Rifat Newaj Razin',
    'rifat razin': 'Rifat Newaj Razin',
    'rabby': 'Md. Yasin Arafat',
    'yasin arafat': 'Md. Yasin Arafat',
    'yasin arafat rabby': 'Md. Yasin Arafat',
    'niaz': 'Niaz Uddin',
    'mahim': 'Md. Mahim'
}

assigner_map = {
    'ashiq bhaia': 'Ashiq Ahmed',
    'ashiq': 'Ashiq Ahmed',
    'tohfa apu': 'Israt Sultana Tohfa',
    'tohfa': 'Israt Sultana Tohfa',
    'emon bhai': 'Nazmul Hoseen Emon',
    'emon': 'Nazmul Hoseen Emon',
    'nazmul': 'Nazmul Hoseen Emon',
    'jubaer bhai': 'Jubayer Hossain',
    'jubaer': 'Jubayer Hossain',
    'zahid': 'Jubayer Hossain',
    'oishi apu': 'Oisarjo Tarafder',
    'oishi': 'Oisarjo Tarafder',
    'oisarjo': 'Oisarjo Tarafder',
    'rajjo': 'Rafiunoor Rahman Rajjo',
    'razin': 'Rifat Newaj Razin',
    'rifat': 'Rifat Newaj Razin',
    'rabby': 'Md. Yasin Arafat',
    'niaz': 'Niaz Uddin'
}

def clean_designer(val):
    if not val: return 'Unassigned'
    v = val.strip().lower()
    return designer_map.get(v, val.strip())

def clean_assigner(val):
    if not val: return 'Unassigned'
    v = val.strip().lower()
    return assigner_map.get(v, val.strip())

def clean_date(val):
    if not val: return ''
    val = val.strip().replace('/', '-')
    parts = val.split('-')
    if len(parts) == 3:
        y, m, d = parts[0], parts[1].zfill(2), parts[2].zfill(2)
        return f'{y}-{m}-{d}'
    return val

def clean_status(val):
    v = val.strip().lower() if val else ''
    if 'finish' in v: return 'Finished'
    if 'progress' in v or 'ongoing' in v: return 'On Progress'
    if 'delay' in v: return 'Delayed'
    return 'Not Started'

tasks = []
social_count = 0
general_count = 0

for r in rows:
    if len(r) >= 2 and r[0].startswith('T-') and r[1].strip():
        t_id = r[0].strip()
        t_name = r[1].strip()
        t_designer = clean_designer(r[2] if len(r) > 2 else '')
        t_assigner = clean_assigner(r[3] if len(r) > 3 else '')
        t_date = clean_date(r[4] if len(r) > 4 else '')
        t_time = r[5].strip() if len(r) > 5 else ''
        t_urgency = r[6].strip() if len(r) > 6 else 'N/A'
        t_status = clean_status(r[7] if len(r) > 7 else '')
        t_link = r[8].strip() if len(r) > 8 else ''
        t_notes = r[9].strip() if len(r) > 9 else ''
        t_category = r[10].strip() if len(r) > 10 else ''
        
        t_type = 'post' if 'social' in t_category.lower() else 'general'
        if t_type == 'post': social_count += 1
        else: general_count += 1
        
        task_obj = {
            'id': t_id,
            'name': t_name,
            'designer': t_designer,
            'assignedBy': t_assigner,
            'date': t_date,
            'time': t_time,
            'urgency': t_urgency or 'N/A',
            'status': t_status,
            'deliveryLink': t_link,
            'notes': t_notes,
            'taskType': t_type,
            'associatedPostId': ''
        }
        tasks.append(task_obj)

print(f'Total tasks parsed: {len(tasks)} (Social Media Posts: {social_count}, General Tasks: {general_count})')

app_js_path = '/Users/rifatnewajrazin/.gemini/antigravity/scratch/honeycomb-content-planner/app.js'
with open(app_js_path, 'r', encoding='utf-8') as f:
    app_js_content = f.read()

# Replace or insert DEFAULT_TASKS
tasks_json_str = json.dumps(tasks, indent=2, ensure_ascii=False)
start_marker = 'const DEFAULT_TASKS = ['
end_marker = '];\n\n// Default mock content posts'

if start_marker in app_js_content:
    start_pos = app_js_content.find(start_marker)
    end_pos = app_js_content.find(end_marker, start_pos) + len('];')
    new_app_js = app_js_content[:start_pos] + f'const DEFAULT_TASKS = {tasks_json_str};' + app_js_content[end_pos:]
else:
    posts_marker = '// Default mock content posts'
    posts_pos = app_js_content.find(posts_marker)
    new_app_js = app_js_content[:posts_pos] + f'// Default spreadsheet tasks (DESIGNER TASK TRACKER & WORKFLOW)\nconst DEFAULT_TASKS = {tasks_json_str};\n\n' + app_js_content[posts_pos:]

with open(app_js_path, 'w', encoding='utf-8') as f:
    f.write(new_app_js)

print('Updated DEFAULT_TASKS in app.js successfully!')

# Batch Sync to Firestore database
base_url = 'https://firestore.googleapis.com/v1/projects/honeycomb-content-hub/databases/(default)/documents/tasks'

success_count = 0
for task in tasks:
    doc_id = task['id']
    patch_url = f'{base_url}/{doc_id}'
    
    fields = {}
    for k, v in task.items():
        fields[k] = {'stringValue': str(v)}
        
    body = {'fields': fields}
    
    try:
        patch_req = urllib.request.Request(
            patch_url,
            data=json.dumps(body).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PATCH'
        )
        with urllib.request.urlopen(patch_req, context=ctx) as resp:
            success_count += 1
    except Exception as e:
        print(f'Error updating task {doc_id}: {e}')

print(f'Successfully updated {success_count}/{len(tasks)} tasks in Firebase Firestore database!')
