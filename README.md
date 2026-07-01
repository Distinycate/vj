# Vocab Journey

ระบบเรียนรู้คำศัพท์ภาษาอังกฤษแบบ Adaptive สำหรับใช้งานภายในโรงเรียน ประกอบด้วยเส้นทางนักเรียน 100 ด่าน ระบบทบทวนคำศัพท์ แดชบอร์ดครู และรายงานผู้บริหาร

## เทคโนโลยี

- Next.js 16 และ React 19
- TypeScript, Tailwind CSS 4 และ Zustand
- Supabase สำหรับฐานข้อมูล
- Framer Motion, Lucide และ DiceBear Avatar

## เริ่มต้นใช้งาน

สร้างไฟล์ `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

จากนั้น:

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000`

## ฐานข้อมูล

`SUPABASE_SCHEMA.sql` เป็นสคริปต์สำหรับติดตั้งฐานข้อมูลใหม่และมีคำสั่งลบตารางเดิม ห้ามรันกับฐานข้อมูลจริงที่มีข้อมูลโดยไม่สำรองข้อมูลก่อน

สำหรับฐานข้อมูลเดิม ให้รัน migration ตามลำดับ:

1. `MIGRATION_ADAPTIVE.sql`
2. `MIGRATION_DUPLICATE_WORDS.sql`
3. `MIGRATION_AVATAR_VALIDATION.sql`
4. `MIGRATION_RUNTIME_CONSISTENCY.sql`

Migration ตัวสุดท้ายทำให้ชื่อฟิลด์รุ่นเก่าและรุ่น Adaptive สอดคล้องกัน สร้างข้อมูล analytics ที่ขาด และปิดคำศัพท์อังกฤษซ้ำในด่านเดียวโดยไม่ลบประวัติเดิม

## คำสั่งตรวจสอบ

```bash
npm run lint
npm run typecheck
npm test
npm run check
npm run build
```

## โครงสร้างหลัก

- `src/app/page.tsx` — สมัครและเข้าสู่ระบบ
- `src/components/PreTest.tsx` — Pre-Test 5 รอบ
- `src/components/Dashboard.tsx` — แผนที่ คลังศัพท์ แรงกิ้ง ร้านค้า และโปรไฟล์
- `src/components/StudyCamp.tsx` — Flashcard ประจำด่าน
- `src/components/Game.tsx` — Challenge Game
- `src/utils/adaptiveEngine.ts` — สร้างข้อสอบ รางวัล Rank และ Spaced Repetition
- `src/lib/quizUtils.ts` — มาตรฐานคำตอบและตัวเลือกกลาง
- `src/app/admin` — แดชบอร์ดครูและ Question Audit
- `src/app/executive` — รายงานผู้บริหาร

ระบบบัญชีปัจจุบันออกแบบสำหรับเครือข่ายภายในโรงเรียนและอ่านบัญชีจากตาราง Supabase โดยตรง
