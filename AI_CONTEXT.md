# 🤖 AI Collaboration Context & Handover Guide
**Project:** Vocab Journey (Educational Gamification Platform)
**Stack:** Next.js (App Router), React, TailwindCSS, Supabase (PostgreSQL)

## 📌 1. Project Philosophy
Vocab Journey ไม่ใช่แค่แอปพลิเคชันเล่นเกม แต่เป็น **"นวัตกรรมทางการศึกษา"** ที่ทำงานสอดคล้องกับวงจรคุณภาพ PDCA (Plan-Do-Check-Act) เป้าหมายคือการแก้ปัญหา "เด็กคลังศัพท์น้อย" ผ่านระบบ Gamification และ Spaced Repetition System (SRS)

---

## 🏗️ 2. Core Architecture & Rules (IMPORTANT)
หากคุณ (AI ตัวใหม่) จะทำการแก้ไขโค้ด กรุณาอ่านและปฏิบัติตามกฎเหล่านี้อย่างเคร่งครัดเพื่อป้องกัน Data Corruption และ State Mismatches:

### 2.1 Database Conventions (Supabase)
- **Single Source of Truth สำหรับคำศัพท์ที่ผิด:** ใช้ตาราง `wrong_words` เป็นหลักในการแสดงผลให้ครูดู (ใช้ `student_id` ไม่ใช่ `user_id`)
- **การเข้าถึง Object/Array Relations:** Supabase Foreign Key Join บางครั้งคืนค่าเป็น Object, บางครั้งเป็น Array 1 ตัว (เช่น `analytics_summary`). **ห้าม** ใช้ `.analytics_summary?.[0]` ตรงๆ ให้ใช้ pattern นี้เสมอ:
  ```typescript
  const stats = Array.isArray(s.analytics_summary) ? s.analytics_summary[0] : s.analytics_summary;
  ```
- **ห้ามลบ UNIQUE CONSTRAINTS:** เช่น `students_student_id_key` หรือตารางหลักเด็ดขาด

### 2.2 Game Engine (`src/components/Game.tsx`)
- **Asynchronous State:** ใน `setTimeout` ตอนจบคำถาม closure จะดึงค่า State เก่ามาใช้ **ห้าม** ใช้ `score` หรือ `wrongWords` จาก React State โดยตรงในฟังก์ชันประมวลผล ให้ส่งค่าล่าสุด (Latest Value) ผ่าน Parameter เข้าไปที่ฟังก์ชัน `handleProcessResults(finalScore, finalWrongWords)` เท่านั้น
- **Anti-Cheat System:** ตรวจจับ Speed Hack และการสลับจอ (Blur) ต้องประมวลผล UI จับโกง **ก่อน** UI โหลดประมวลผลด่าน เพื่อป้องกันเกมค้าง

### 2.3 Adaptive Engine (`src/utils/adaptiveEngine.ts`)
- **Decoupled Analytics (แยกคะแนนเกม vs วิชาการ):** คะแนนเกมมีโบนัส/คอมโบ/ไอเทม แต่คะแนนวิชาการ (Raw Analytics) **ต้องหักออก** หากใช้ไอเทมช่วยเหลือ (เช่น 50/50 หรือ Hint ให้ถือว่า `academicWasCorrect = 0`)
- **Blocking Analytics:** การอัปเดต Database ตอนจบด่าน **ห้าม** ทำแบบ Fire-and-forget เด็ดขาด (เกมจะโหลดหน้า Dashboard ทั้งที่ข้อมูลยังไม่เสร็จ) ต้องทำ `await` การอัปเดต Analytics ให้เสร็จก่อน

---

## 📊 3. Database Schema Updates (Recent Patches)
เพิ่งมีการอัปเดต Schema ล่าสุดที่ AI ตัวก่อนหน้าทำไว้:
- `item_analysis`: ตารางใหม่สำหรับวิเคราะห์ข้อสอบ (P-Value ความยาก, D-Value อำนาจจำแนก)
- `team_battle_seasons`: สำหรับแบ่งฤดูกาลแข่งของนักเรียน
- *ระบบ Team Leaderboard ในระดับห้องเรียน จะต้องรับค่า `classroom_id` เข้าไปกรองเสมอ ไม่เช่นนั้นจะดึงคะแนนรวมของทั้งโรงเรียนมาแสดง*

---

## 🚀 4. Completed & Pending Features (อัปเดตล่าสุด)

**✅ เพิ่งทำเสร็จ (Recently Completed):**
1. **Contextual Puzzles (ประโยคบริบท):** 
   - เพิ่มคอลัมน์ `example_sentence` ในตาราง `vocabulary` เรียบร้อยแล้ว (อ้างอิง `MIGRATION_CONTEXTUAL_PUZZLES.sql`)
   - `Game.tsx` และ `adaptiveEngine.ts` รองรับโหมด `FILL_BLANK` โดยเจาะช่องว่าง `________` ในประโยคให้เด็กเติมคำอัตโนมัติ
2. **Decoupled Analytics (แยกระบบคะแนนเกมและวิชาการ):**
   - ใน `adaptiveEngine.ts` ตัวแปร `academicWasCorrect` จะมีค่าเป็น 0 ทันที หากนักเรียนใช้ไอเทมช่วยเหลือ (Hint หรือ 50/50) เพื่อป้องกันความสามารถถูกบิดเบือนในตารางวิเคราะห์ข้อสอบ (`item_analysis`)

**⏳ ฟีเจอร์ที่รอการพัฒนา (Pending Features):**
1. **AI Insight Improvements:**
   - ระบบรายงานจุดอ่อนเด็กให้ครูฟัง ปัจจุบันมีการใช้ `gpt-3.5-turbo` แบบ hard-code
   - สิ่งที่ต้องทำ: เปลี่ยนเป็นรุ่นใหม่ (เช่น GPT-4o หรือ Claude) และสร้างระบบให้ครูกรอก API Key ของตัวเองได้
2. **ระบบการแข่งขันแบบทีม (Advanced Team Battles):**
   - ปัจจุบันมีการสร้างตารางฤดูกาลไว้แล้ว สิ่งที่ต้องทำคือ UI สำหรับครูในการสร้างและควบคุม Season การแข่งขัน

---
*Message to AI:* You are fully briefed. Proceed with extreme caution regarding async state and database relations. Good luck! 🚀
