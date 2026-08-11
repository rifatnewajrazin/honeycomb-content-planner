import re
import json
import csv
import io

raw_csv = '''Serial,Name,Designer,Assigner,Date,Time,Needed by,Status,,Link,Comments
T-01,Evoka Visiting Card Design,Razin,Ashiq Bhaia,2026-06-29,3:00 PM,24 hours,Delayed,General Task,Evoka Visiting Card Design,Will start and finish on 4th.
T-02,Tahams DC2 Visiting Card Order Update,Razin,Tohfa Apu,2026-06-29,11:15 AM,24 hours,Finished,General Task,Tahams DC2 Visiting Card,Monday Delivery.
T-03,Lovelife Memories 10 Years,Razin,Ashiq Bhaia,2026-06-29,9:00 PM,16 hours,Finished,General Task,10 Years of Tahams,Will finish on 30th.
T-04,Brand Identity Design,Razin,Tohfa Apu,2026-06-30,3:45 AM,N/A,Finished,General Task,Brand Identity Tahams,"Font done, working on the color section."
T-05,Asad Rasel Investment Post Tahams,Razin,Ashiq Bhaia,2026-06-30,3:00 PM,Today,Finished,General Task,Tahams Investment Post AR,On correction.
T-06,Perfume Box Resize + Roll on Box,Razin,Tohfa Apu,2026-06-30,6:00 PM,24 hours,Finished,General Task,Perfume Box Redesign,Handed over to Saddam Bhai
T-07,Emon Bhai DC2 Cameo Machine Troubleshoot,Razin,Emon Bhai,2026-07-01,4:00 PM,24 hours,Finished,General Task,Cameo Troubleshoot,Talked and Fixed.
T-08,Font Guideline for Tahams,Razin,Tohfa Apu,2026-07-02,1:00 PM,ASAP,Finished,General Task,https://rifatnewajrazin.github.io/tahams-font-guidelines/,Finished finally.
T-09,Asad Rasel Investment Post Tahams (More Correction),Razin,Ashiq Bhaia,2026-07-03,11:00 AM,ASAP,Finished,General Task,Tahams Investment Post AR,Confirmed.
T-10,Cuban Collar Shirt 4 color,Rabby,Tohfa Apu,2026-07-04,10:00 AM,N/A,Finished,Social Media ,Cuban Collar Hawai Shirt,4 color diye diyechi 
T-11,Evoka Experiences Logo Format Delivery,Razin,Ashiq Bhaia,2026-07-04,10:00 AM,N/A,Finished,General Task,Evoka Experiences Logo and Cover,Done and dusted.
T-12,Investor Post Delivery - Asad Rasel,Razin,Ashiq Bhaia,2026-07-04,10:00 AM,N/A,Finished,General Task,Tahams Investment Post New,Updated
T-13,New Billboard Design,Razin,Ashiq Bhaia,2026-07-05,4:00 PM,ASAP,Finished,General Task,New Billboard Design,.
T-14,DC4 Opening Soon Post + Cover,Razin,Ashiq Bhaia,2026-07-05,4:00 PM,ASAP,Finished,General Task,Tahams DC4 Post and Cover,Notepad for Details
T-17,750 Ml Water Bottle (Straw) Design,Rabby,Tohfa Apu,2026-07-05,3:00 PM,ASAP,Finished,Social Media ,Strow Water Bottle design PNG.png,.
T-18,Big Boss Post Design,Rabby,Ashiq Bhaia,2026-07-05,3:00 PM,Week,Finished,Social Media ,Big Boss New Design,.
T-20,Fantasy Inner Beauty Perfume Post Design ,Rabby,Rabby,2026-07-07,10:00 AM,N/A,Finished,Social Media ,Fantasy Inner Beauty PNG.png,.
T-21,Vampire Blood Dark Elegance Perfume Post Design ,Rabby,Rabby,2026-07-07,10:00 AM,N/A,Finished,Social Media ,Vampire Blood Dark Elegance PNG.png,.
T-22,Together in Comfort Post Design ,Rabby,Rabby,2026-07-07,10:00 AM,1 Hour,Finished,Social Media ,Together in Comfort PNG.png,.
T-23,Argentina Content Design,Razin,Tohfa Apu,2026-07-08,11.59 PM,1 Hour,Finished,Social Media ,Committee'r Lok Design,.
T-24,Fifa Content Design,Niaz,Razin,2026-07-09,11.59 PM,1 Day,Finished,General Task,Fifa Content Design,.
T-25,Mafia Messi Mockup Design,Razin,Razin,2026-07-09,11.59 PM,1 Day,Finished,Social Media ,Mafia Messi,.
T-26,Evoka Carousel Post Design,Razin,Razin,2026-07-09,3:30 AM,1 Day,Finished,Social Media ,Evoka Carousel,Sunday
T-27,Metro Drop Shoulder,Rabby,Rabby,2026-07-08,10:00 AM,1 Day,Finished,Social Media ,Metro Drop Shoulder Post design,.
T-28,Outdoor Kids tshirt with Psnt Post Design,Rabby,Ashiq Bhaia,2026-07-07,4:00 PM,2,Finished,Social Media ,Outdor Kids Tshirt With Pant Design,.
T-29,Merchtile Service Post Design,Rabby,Rabby,2026-07-09,11:00 AM,N/A,Finished,Social Media ,MT-ServicesPost Design PNG.png,.
T-30,SamTech Services Post Design,Rabby,Rabby,2026-07-09,11:00 AM,N/A,Finished,Social Media ,Our Services Post Design PNG.png,.
T-31,Lumina Post Design ,Rabby,Rabby,2026-07-09,11:00 AM,N/A,Finished,Social Media ,https://www.facebook.com/share/p/19RE2WbxLh/,.
T-32,Spider Man Adult Series Post Design ,Rabby,Tohfa Apu,2026-07-09,1:10 PM,N/A,Finished,Social Media ,Spider Man Tshirt Post Design,.
T-33,Tahams DC4 In Mirpur Post Design ,Rabby,Tohfa Apu,2026-07-09,1:10 PM,N/A,Finished,Social Media ,https://www.facebook.com/share/p/19EGr3jGMM/,.
T-35,Best Trio Perfume For Men & Women Post Design,Rabby,Tohfa Apu,2026-07-11,12:30 PM,N/A,Finished,Social Media ,Trio Best Perfume for Men & Women Post Design ,.
T-36,Kids Spiderman Cut & Sew Tshirt Post Design,Rabby,Tohfa Apu,2026-07-11,1:00 PM,N/A,Finished,Social Media ,Kids Spider Man Cut & Sew Tshirt Post Design,.
T-38,Lokman Measurement,Razin,Ashiq Bhaia,2026-07-11,1:00 PM,N/A,Finished,General Task,Lokman Measurements,Sunday
T-39,Fotua post design needed ,Rabby,Jubaer Bhai,2026/07/12,15:35,ASAP,Finished,Social Media ,Fotua Post Design PNG.png,.
T-40,July Revolution Tshirt Designs,Niaz,Razin,2026/07/13,6:00 PM,N/A,Finished,Social Media ,BANGLAdesh-Niaz,Posted
T-41,Water bottle Design,Rabby,Rabby,2026-07-14,10:30 AM,N/A,Finished,Social Media ,750 Ml Water Bottle,.
T-42,DC1 Layout,Razin,Tohfa Apu,2026-07-14,1:30 PM,N/A,Finished,General Task,https://www.facebook.com/share/p/19AhyB1TLh/,Yet to handover
T-43,Female CO-ORD Set Post Design,Rabby,Rabby,2026-07-14,4:00 AM,N/A,Finished,Social Media ,Co-ord Post Design,.
T-44,Trademark Certification Post Research and Create Tahams,Razin,Ashiq Bhaia,2026-07-14,4:00 AM,N/A,Finished,General Task,Trademark Post,.
T-45,Ultra male perfume post design ,Rabby,Rabby,2026-07-15,1:10 PM,N/A,Finished,Social Media ,Ultra Male ,.
T-46,Evoka Invoice,Razin,Rajjo,2026-07-16,1:10 PM,N/A,Finished,General Task,Evoka Documents,.
T-47,DC 4 Opening Post Design ,Rabby,Tohfa Apu,2026-07-15,3:20 PM,N/A,Finished,Social Media ,DC4 Printables,.
T-48,"Coming Soon Banner - DC4 (Only Banner, no cover/post)",Razin,Ashiq Bhaia,2026-07-15,3:20 PM,N/A,Finished,General Task,DC4 Printables,.
T-49,DC1 Shifting Banner (2nd Floor) - We are shifting from 2nd Floor 4:5 Cover,Razin,Ashiq Bhaia,2026-07-15,3:20 PM,N/A,Finished,General Task,DC1 Printables,.
T-50,DC1 Shifting Banner (1st Floor) - We are coming,Razin,Ashiq Bhaia,2026-07-15,3:20 PM,N/A,Finished,General Task,DC1 Printables,.
T-51,Customize Kids Tshirt Post Design,Rabby,Rabby,2026-07-16,11:00 AM,N/A,Finished,Social Media ,Kids Tshirt Design,.
T-52,Freshness That Defines You Cool Water Post Design,Rabby,Rabby,2026-07-16,3:00 PM,N/A,Finished,Social Media ,Freshness That Defines You Cool Water PNG.png,.
T-54,DC1 Layout,Razin,Tohfa Apu,2026-07-18,6:00 PM,N/A,Finished,General Task,DC1 Layout,.
T-55,Tahams Own The City Post Design,Rabby,Rabby,2026-07-09,12:10 PM,N/A,Finished,Social Media ,Tahams Own The City PNG,.
T-56,"Evoka post: What is Evoka Experiences?",Razin,Rajjo,2026-07-19,12:10 PM,N/A,Finished,Social Media ,Evoka Documents,.
T-57,Evoka Moodboard for Client,Razin,Rajjo,2026-07-19,12:10 PM,N/A,Finished,General Task,Evoka Documents,.
T-58,Evoka Pad Page Doc,Razin,Rajjo,2026-07-19,12:10 PM,N/A,Finished,General Task,Evoka Documents,.
T-59,Spain Tshirt Post Design ,Rabby,Niaz,2026-07-19,3:40 PM,N/A,Finished,Social Media ,https://www.facebook.com/share/p/1HndvJUULq/,.
T-60,Friendship Day Wish Post,Rabby,Zahid,2026-07-19,7:30 PM,29/07/26,Finished,Social Media ,Friendship Day Post Design 26,Post it on 30th July
T-61,Friendship Day Product Design Post,Rabby,Zahid,2026-07-19,7:30 PM,21/07/26,Finished,Social Media ,Friendship Day Post Design,.
T-62,Kids Stripe Tshirt Design ,Rabby,Rabby,2026-07-20,15:00,N/A,Finished,Social Media ,Kids Stripe tshirt Design PNG,.
T-63,Mug Post Design For Friendship Day,Rabby,Tohfa Apu,2026-07-20,5:00 PM,N/A,Finished,Social Media ,https://www.facebook.com/share/p/1EkpV5RsgL/,.
T-64,Uncommon Looks Begin here,Rabby,Rabby,2026-07-21,10:00 AM,N/A,Finished,Social Media ,Uncommn Looks Begin Here PNG.png,.
T-65,Neck Printed Tshirt Design,Rabby,Ashiq Bhaia,2026-07-21,2: PM,N/A,Finished,Social Media ,Neck Printed Tshirt Design PNG.png,.
T-66,Spain Fan made tshirt design ,Niaz,Niaz,2026-07-21,1:00 PM,N/A,Finished,Social Media ,Spain Niaz,.
T-67,Tshirt Post Design For Friendship Day,Rabby,Zahid,2026-07-21,1:00 PM,N/A,Finished,Social Media ,Friendship Day post design PNG.png,.
T-68,Water Bottle Post Design For Friendship Day,Rabby,Zahid,2026-07-21,1:00 PM,N/A,Finished,Social Media ,Start Prepared Water Bottle post Design,.
T-69,Perfume Post Design For Friendship Day,Rabby,Zahid,2026-07-21,1:00 PM,N/A,Finished,Social Media ,3mm Board PVC Prints,.
T-70,Printing Charge এর তালিকা,Rabby,Tohfa Apu,2026-07-21,1:00 PM,N/A,Finished,Social Media ,Printing Charge এর তালিকা =PNG.png,.
T-71,"Male Female Washroom, DTF Pricing PVC Print",Razin,Ashiq Bhaia,2026-07-21,1:00 PM,N/A,Finished,General Task,3mm Board PVC Prints,Handed over to Lokman.
T-72,The Solid Series Post Design,Rabby,Rabby,2026-07-23,9:45 AM,N/A,Finished,Social Media ,The Solid Series Post Design,.
T-73,Boylar murgi & cockroach funny tshirt post design,Rabby,Rabby,2026-07-25,9:45 AM,N/A,Finished,Social Media ,Funny Tshirt Post Design,.
T-74,Cuban Collar Shirt & Denim Pants Combo Post Design ,Rabby,Tohfa Apu,2026-07-25,1:00 PM,N/A,Finished,Social Media ,Cuban Collar & Denim Pants Combo Offer Design,.
T-75,Tahams DC Reallocation Post Design,Rabby,Tohfa Apu,2026-07-25,6:30 PM,N/A,Finished,Social Media ,Tahams DC1 Reallocation Post PNG.png,.
T-76,Evoka Introduction Post Design,Razin,Rajjo,2026-07-26,3:50 PM,N/A,Finished,General Task,Evoka First Post Carousel ,.
T-77,Start Prepared Water Bottle post Design,Rabby,Rabby,2026-07-26,1:00 PM,N/A,Finished,Social Media ,Start Prepared Water Bottle post Design,.
T-78,Signboard Design DC4,Razin,Ashiq Bhaia,2026-07-26,6:24 PM,N/A,Finished,General Task,DC4 Signboard,.
T-79,ক্যাম্পাসের স্মৃতি Tahams এর সাথে Post Design,Rabby,Ashiq Bhaia,2026-07-06,5:00 PM,N/A,Finished,Social Media ,ক্যাম্পাসের স্মৃতি Tahams এর সাথে,.
T-80,Make Memories with Tahams,Rabby,Rabby,2026-07-28,10:00 AM,N/A,Finished,Social Media ,Make Memories with Tahams PNG.png,.
T-81,Enviroment friendly Water Bottle ,Rabby,Tohfa Apu,2026-07-28,10:40 AM,N/A,Finished,Social Media ,,.
T-82,Executive Polo Female Post Design,Rabby,Rabby,2026-07-28,3:00 PM,N/A,Finished,Social Media ,Executive Polo Female Post Design,.
T-83,Raj Bhai LLM ID Card,Razin,Zahid,2026-07-29,11:50 AM,ASAP ,Finished,General Task,Naim Bhai LLM ID Card for Banking,.
T-84,Mirpur Edition Tshirt Post Design,Rabby,Ashiq Bhaia,2026-07-29,10:00 AM,N/A,Finished,Social Media ,Mirpur Edition Tshirt Post Design,.
T-108,Own The Heat Tank Top post Design,Rabby,Jubaer Bhai,03/08/26,4:00 PM,N/A,Finished,Social Media ,Tank Top Post Design,.
T-86,Sister's Day Post,Rabby,Zahid,31/07/26,4:30 PM,01/08/26,Finished,Social Media ,Tahams Sister day post Design PNG.png,.
T-87,DC4 Grand Opening Poster Design,Rabby,Rabby,01/08/26,11:00 AM,N/A,Finished,Social Media ,DC4 Grand Opening Poster Design PNG.png,.
T-88,Discover your perfect scent Post Design,Rabby,Rabby,01-08-26,4:00 PM,N/A,Finished,Social Media ,Discover your perfect scent Post Design PNG.png,.
T-94,জুলাই গণ-অভ্যুত্থান দিবস ৫ আগস্ট Wish Poster,Razin,Jubaer Bhai,02/08/26,10:52,2 Days,Not Started,,,.
T-97,Full Sleeve t shirt solid Poster Design ,Razin,Jubaer Bhai,02/08/26,11:07,Week ,Not Started,,,.
T-102,Tahams- Wear You Lifestyle 4 Type Posters Design,Rabby,Ashiq Bhaia,02/08/26,9:45 AM,N/A,Finished,Social Media ,Tahams- Ware your Lifestyle,.
T-103,"Crop Basic, Stripe, Lettuce Poster Design ",Rabby,Jubaer Bhai,03/08/26,10:20,N/A,Not Started,,,.
T-104,Basic Tshirt & Pants Post Design ,Rabby,Jubaer Bhai,03/08/26,10:21,N/A,Finished,Social Media ,Basic Tshirt & Pants Post Design,.
T-105,V Neck Drop Shoulder Solid Poster Design ,Rabby,Jubaer Bhai,03/08/26,10:22,N/A,Not Started,,,.
T-106,Polo Half Sleeve Big Boss Poster ,Rabby,Jubaer Bhai,03/08/26,10;23,N/A,Not Started,,,.
T-16,"Merchandiser Formalities : ID Card , Mug, Database",Razin,Oishi Apu,2026-07-05,12:00 PM,ASAP,On Progress,General Task,Merchandiser Formalities,.
T-15,All Brands Social Media Refinement,Razin,Razin,2026-07-05,12:00 PM,ASAP,On Progress,General Task,Social Media Refinement,.
T-19,DC4 Post and Cover,Razin,Jubaer Bhai,2026-07-05,6:11 PM,Week,Finished,Social Media ,Tahams DC4 Post and Cover,.
T-85,MerchTile Post Design ,Rabby,Rabby,2026-07-30,10:30 AM,N/A,Delayed,,,.
T-115,Investment Post Correction,Razin,Tohfa Apu,08/03/26,6:53 PM,1 Day,Finished,General Task,Investment Post AR,.
T-116,"HoneyComb Employee, Designation and Details Sorting",Razin,Razin,08/03/26,7.50 PM,1 Day,On Progress,General Task,,.
T-117,5th August Notice Post Design,Rabby,Tohfa Apu,04/08/26,12:30 PM,N/A,Finished,Social Media ,5th august Notice PNG.png,.
T-118,Game of Thrones,Niaz,Razin,,,,Finished,Social Media ,GOT_NIAZ,.
T-119,Snoopy Series,Niaz,Razin,,,,Finished,Social Media ,Snoopy Design File,.
T-120,Woodpecker Signs Price Quotation,Razin,Tohfa Apu,,,,Finished,General Task,,.
T-121,SSM hiring Post Design,Rabby,Oishi Apu,09/08/26,9:00 PM,N/A,Finished,Social Media ,SMM Hiring Post Design PNG.png,.
T-122,Female CO-ORD Set KOROBI Post Design,Rabby,Tohfa Apu,-,-,-,Finished,Social Media ,KOROBI,.
T-123,Female CO-ORD Set ORCHID Post Design,Rabby,Tohfa Apu,-,-,-,Finished,Social Media ,ORCHID,.
T-124,Female CO-ORD Set ROJONI Post Design,Rabby,Tohfa Apu,-,-,-,Finished,Social Media ,ROJONI,.
T-125,Niaz Snoopy Post Design,Niaz,Razin,-,-,-,Finished,Social Media ,Niaz Snoopy Design,.
T-126,4 Investment Post Design,Razin,Ashiq Bhaia,09/08/26,7:37 PM,-,Finished,Social Media ,Investment Post,.
T-127,Ai Investment Post Design ,Rabby,Ashiq Bhaia,-,-,-,Finished,Social Media ,Ai Invest Post Design,.
T-128,Cat T shirt Design,Niaz,Razin,11/08/26,,,On Progress,Social Media ,,.
'''

designer_map = {
    'Razin': 'Rifat Newaj Razin',
    'Rabby': 'Md. Yasin Arafat',
    'Niaz': 'Niaz Uddin'
}

assigner_map = {
    'Ashiq Bhaia': 'Ashiq Ahmed',
    'Tohfa Apu': 'Israt Sultana Tohfa',
    'Emon Bhai': 'Nazmul Hoseen Emon',
    'Jubaer Bhai': 'Social Media Manager',
    'Razin': 'Rifat Newaj Razin',
    'Rabby': 'Md. Yasin Arafat',
    'Rajjo': 'Rafiunoor Rahman Rajjo',
    'Zahid': 'Mohammad Zahidul Islam',
    'Oishi Apu': 'Oisarjo Tarafder',
    'Niaz': 'Niaz Uddin'
}

def clean_date(d_str):
    d_str = d_str.strip()
    if not d_str or d_str == '-':
        return ''
    if re.match(r'^\d{4}-\d{2}-\d{2}$', d_str):
        return d_str
    if re.match(r'^\d{4}/\d{2}/\d{2}$', d_str):
        return d_str.replace('/', '-')
    if re.match(r'^\d{2}/\d{2}/\d{2}$', d_str):
        parts = d_str.split('/')
        return f"20{parts[2]}-{parts[1]}-{parts[0]}"
    if re.match(r'^\d{2}-\d{2}-\d{2}$', d_str):
        parts = d_str.split('-')
        return f"20{parts[2]}-{parts[1]}-{parts[0]}"
    return d_str

reader = csv.reader(io.StringIO(raw_csv.strip()))
header = next(reader)

tasks = []
seen_ids = set()

for row in reader:
    if not row or not row[0].strip() or not row[0].startswith('T-'):
        continue
    t_id = row[0].strip()
    if t_id in seen_ids:
        continue
    seen_ids.add(t_id)

    name = row[1].strip()
    des = row[2].strip()
    ass = row[3].strip()
    dt = clean_date(row[4])
    tm = row[5].strip() if len(row) > 5 else ''
    urg = row[6].strip() if len(row) > 6 else 'N/A'
    st = row[7].strip() if len(row) > 7 else 'Not Started'
    category = row[8].strip() if len(row) > 8 else ''
    link = row[9].strip() if len(row) > 9 else ''
    notes = row[10].strip() if len(row) > 10 else ''

    designer_full = designer_map.get(des, des)
    assigner_full = assigner_map.get(ass, ass)
    task_type = 'post' if 'Social Media' in category else 'general'

    if st == 'Finished' and not dt:
        dt = '2026-08-09'

    task_obj = {
        "id": t_id,
        "name": name,
        "designer": designer_full,
        "assignedBy": assigner_full,
        "date": dt,
        "time": tm,
        "urgency": urg if urg else 'N/A',
        "status": st,
        "deliveryLink": link,
        "notes": notes,
        "taskType": task_type,
        "associatedPostId": ""
    }
    tasks.append(task_obj)

print(f"Total parsed tasks: {len(tasks)}")

js_code = "const DEFAULT_TASKS = " + json.dumps(tasks, indent=2) + ";\n"

with open("app.js", "r") as f:
    app_js = f.read()

# Replace DEFAULT_TASKS in app.js
start_idx = app_js.find("const DEFAULT_TASKS = [")
end_idx = app_js.find("];", start_idx) + 2

if start_idx != -1 and end_idx != -1:
    new_app_js = app_js[:start_idx] + js_code.strip() + app_js[end_idx:]
    with open("app.js", "w") as f:
        f.write(new_app_js)
    print("Successfully updated DEFAULT_TASKS in app.js!")
else:
    print("Failed to find DEFAULT_TASKS bounds in app.js")
