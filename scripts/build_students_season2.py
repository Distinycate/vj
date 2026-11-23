import json
import csv
import os

roster_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backups", "private-rosters")
with open(os.path.join(roster_dir, "students_season2.json"), encoding="utf-8-sig") as f:
    students = json.load(f)

out_csv = os.path.join(roster_dir, "students_season2_summary.csv")

with open(out_csv, "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["ลำดับ", "ระดับชั้น", "ห้อง", "เลขประจำตัวนักเรียน (Password)", "เลขประจำตัวประชาชน 13 หลัก (Username)", "คำนำหน้า", "ชื่อ", "นามสกุล", "ชื่อ-สกุลเต็ม"])
    for idx, s in enumerate(students, 1):
        fullname = s["prefix"] + s["fname"] + " " + s["lname"]
        writer.writerow([idx, s["grade"], s["room"], s["sid"], s["nid"], s["prefix"], s["fname"], s["lname"], fullname])

print("Wrote files successfully!")
