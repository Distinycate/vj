# Vocab Journey — Handoff สำหรับตรวจ staging และปล่อยระบบ

- **ต้นทาง:** branch `codex/vocab-audit-remediation` ของ `Distinycate/vj`
- **สถานะ:** ยังไม่ merge `main`, ยังไม่ deploy, และยังไม่รัน SQL บนฐานจริงจากงานนี้
- **ข้อห้าม:** คงรหัสเข้าเกม รอบการเรียน ยอดคงเหลือ และประวัตินักเรียนปัจจุบัน ห้าม reset season, import roster, ปิดฤดูกาลทีม หรือแจกรางวัลเป็นขั้นตอน deploy

## สิ่งที่ได้รับ

- Admin sidebar และรายงาน Pre/Post, Learning Gain และคำผิดแยกเทอมตามการเริ่มเทอม 2 วันที่ 1 พ.ย. 2569 เวลาไทย; Accuracy/Rank ที่ระบุว่าสะสมไม่ใช่ตัวเลขเฉพาะเทอม
- Pre-test 5 รอบ รองรับคะแนน 0 และค่าเฉลี่ยทศนิยม; Post-test เลือกทำได้ทุก 10 ด่านที่ผ่าน; RPC ป้องกันการส่งซ้ำและการส่งข้ามรอบการเรียน ปุ่มนำเข้าบัญชีใช้ preview และไม่เปลี่ยนรหัสบัญชีเดิม
- Campaign: Listening ใช้คำศัพท์อังกฤษ, Meaning ใช้คำแปลไทย, ตัวเลือกไม่อิง index, เฉลยและการจบด่านอยู่ที่เซิร์ฟเวอร์ นักเรียนเครือข่ายยังเล่นและเก็บความก้าวหน้าได้ แต่ไม่สะสมเหรียญ/EXP จากจบด่านหลังติดตั้ง guard ยอดเดิมไม่ถูกหัก ไม่เปลี่ยน Demo/Review, Grandmaster หรือ Puzzle
- แก้ 0/ร: บันทึกผลรายด่านและยอดผู้เรียนพร้อมกัน, กันส่งซ้ำจากหน้าใหม่, ปิดกิจกรรมแล้วปฏิเสธผลใหม่, คำตอบว่างไม่ถูกนับเป็นตัวเลือกแรก และเวลา/ป้ายแจ้งเตือนครูไม่เปลี่ยนเมื่อเล่นย้อนหลัง
- Team Battle: ฤดูกาลโรงเรียนและห้องแยกกัน กระดาน/ตัวอย่างรางวัล/การปิดฤดูกาลใช้คะแนนสุทธิจาก SQL เดียวกัน ทีมที่ไม่มีคะแนนไม่รับรางวัลหรือถูกริบการ์ด การยืนยันจะถูกปฏิเสธหากคะแนนหรือสมาชิกเปลี่ยน และเก็บตารางอันดับเมื่อปิดเพื่อไม่ให้เปลี่ยนตามสมาชิกในภายหลัง

## ก่อนอนุมัติปล่อย

1. ยืนยัน repo และ project ref Supabase `ljgpljhszzlneawwpcwt` ผ่านบัญชีที่เจ้าของอนุญาต ตรวจ schema, SQL ที่เคยติดตั้ง และการกู้คืนข้อมูลด้วยสิทธิ์อ่านก่อน ห้ามใช้ Supabase โปรเจกต์อื่นแทน ใช้ staging ที่ไม่รับ service-role key ของ production และอย่านำข้อมูลรายคนไปใส่ public logs หรือ test artifacts
2. ปิดความเสี่ยงข้อมูลก่อน: branch ใหม่ไม่มีไฟล์รายชื่อดิบที่เอาออกแล้ว แต่ Git history และ build เก่ายังอาจเข้าถึงได้ ค่า `TERM_ONE_REPORT_JSON` ต้องมาจากไฟล์สรุปจริงในพื้นที่จำกัดสิทธิ์ (`backups/private-rosters/term-one-report.json` ในเครื่องผู้ดูแลเมื่อมีสิทธิ์) ตั้ง server-only; ตั้ง `SEASON_ROSTER_JSON` เฉพาะเมื่อต้องเปิดใช้ import โดยได้รับอนุญาต ตรวจ URL เก่าแบบดูเฉพาะ HTTP status และจำกัดประวัติหรือ deployment เก่าตามขอบเขตที่เจ้าของอนุมัติ การลบใน commit ใหม่ไม่เท่ากับปิดการเข้าถึงข้อมูลเก่า
3. ติดตั้งบน staging เฉพาะ migration ที่ยังขาดโดยดู dependencies ด้านล่าง จากนั้นรัน [SQL สำหรับตรวจสิทธิ์และ schema](../scripts/verify-private-campaign-release.sql) แบบอ่านอย่างเดียว ทุกแถวต้องเป็น `true` จึงทดสอบ release build ต่อ
4. ยืนยัน SHA ที่จะปล่อยด้วย `git rev-parse HEAD` แล้วรัน `npm run check`, `npm run build` และชุดทดสอบ SQL ด้านล่าง ใช้บัญชีทดสอบที่มีสิทธิ์จริงบน staging เท่านั้น ทดสอบมือถือและ PC: รหัสเดิมเข้าได้ → Dashboard → เล่นด่านใหม่/ย้อนหลัง; Listening เสียงจากคลังจริงและ fallback; คะแนน Pre-test 5 รอบและเข้า Stage 1; Post-test เลือกทำ/ข้ามได้ทั้งด่าน 10 และ 20; คะแนนจริงของทั้งสองเทอมและคำผิดช่วงตัดเทอม; ปุ่มการ์ดและแก้ 0/ร; Guest ไม่เห็นทีม/การ์ดและยอดเหรียญ/EXP ไม่เพิ่มหลังผ่านด่าน 21 ที่ 70% เทียบกับผล 60% ที่ไม่ผ่าน
5. เปิดใช้จริงได้เมื่อผ่าน staging และเจ้าของยืนยันขอบเขต ตรวจจุดค้างด้านล่างก่อนปล่อยทั้งชุด หากต้องปล่อย hotfix ความเป็นส่วนตัวก่อน ให้แยกชุดนั้นออกจากการเปลี่ยน runtime; ห้ามเลี่ยง gate ด้วยการใช้ข้อมูลจำลองแทนรายงานจริง

### ลำดับ SQL และ rollback

ตรวจว่าฐานเดิมมี External Network, Remedial Event, Team Battle, V3 และ Word Mastery ที่รองรับอยู่แล้ว ไฟล์ฐานที่เกี่ยวข้องคือ `MIGRATION_REMEDIAL_EVENT_RUNS.sql`, `MIGRATION_GAME_PROGRESSION_V3.sql`, `MIGRATION_RANK_AND_PASS_SCORE_UPDATE.sql` และ `MIGRATION_V3_PRODUCTION_RLS_HARDENING.sql` **อย่ารันไฟล์ฐานทั้งชุดซ้ำ** โดยเฉพาะไฟล์ Rank เดิมมีคำสั่ง UPDATE รายการเดิม และไฟล์ Team/External เดิมอาจทับ RPC/grant เวอร์ชันใหม่ หาก routine จริงต่างจาก repo ให้เทียบ definition และเตรียม migration เพิ่มที่ผู้ดูแลตรวจแทนการวางไฟล์เก่าทับ

เมื่อฐานและ dependency ตรงกัน ให้ตรวจ/ติดตั้งเฉพาะไฟล์ที่ขาดภายใต้ `supabase/migrations/` ตามลำดับ:

1. `20261104045621_reset_term2_progress_with_archive.sql` และ `20261104050458_assessment_season_atomic_reset.sql`: ติดตั้ง archive/RPC และ schema สำหรับ assessment; ตัวหลังมี backfill สรุป ควรเทียบก่อน/หลัง **ไม่เรียกคำสั่ง reset**
2. `20261123160536_import_new_students_without_reset.sql`, `20261123163451_atomic_team_season.sql`, `20261123163715_posttest_checkpoint.sql`
3. `20261123165742_private_live_game_answers.sql`: หลัง V3/Hint RPC
4. `20261124120000_atomic_remedial_stage.sql` และ `20261124121500_campaign_guest_reward_guard.sql`: หลังมีตารางแก้ 0/ร และ V3 แบบ Rank แล้ว หาก guard ปฏิเสธ body ให้หยุดและเทียบ definition; อย่าตัดเงื่อนไข guard ทิ้ง
5. `20261124130000_team_season_standings.sql`: หลังมี V3 completion, Team Battle, ระบบการ์ด, `ensure_student_team_memberships` ที่กันนักเรียนเครือข่าย และ `randomize_all_teams` เดิมจาก `MIGRATION_VOCAB_JOURNEY_V5.sql` ติดตั้งก่อน release build ในช่วงที่กำหนด: SQL ใหม่นับคะแนนจากผลจบด่านโดยตรง และปิดสิทธิ์ RPC จ่ายรางวัล/สุ่มทีมรุ่นเก่ากับการอ่านตารางทีมจาก browser หน้า Team Battle ใน deployment เดิมอาจโหลดไม่ได้ในช่วงสั้น ๆ ระหว่างติดตั้ง SQL กับสลับโค้ด จึงควรสลับพร้อมกันและให้ผู้ใช้รีเฟรชแท็บเดิม

Rollback: เก็บ last-known-good ที่ไม่เปิดไฟล์ส่วนตัว; เมื่อต้องย้อน Campaign ให้หยุดเริ่ม attempt ใหม่และรอ attempt รุ่นที่เก็บเฉลยใน DB จบ/หมดเวลาก่อนย้อนโค้ดที่ยังอ่าน ledger ไม่ได้ อย่าเปิดสิทธิ์อ่านข้อมูลรายบุคคลคืนเพื่อแก้หน้าโหลด และอย่าย้อนด้วยการกู้ backup ทับผลใหม่ทั้งหมด หากตัว migration ทีมกระทบการบันทึกด่าน ให้หยุดปล่อยและตรวจ PostgreSQL logs; ใช้ hotfix แบบพา endpoint รุ่นใหม่ติดไปด้วย ไม่เปิด RPC จ่ายรุ่นเก่าให้ browser

### งานที่ยังค้างและเกณฑ์ตรวจรับ

- **Team Battle:** เทียบอันดับกระดาน/ตัวอย่าง/หลังปิดบน staging ที่มีห้อง 2 ห้องและฤดูกาลโรงเรียน 1 ฤดูกาล ตรวจ latency จบด่านเมื่อหลายคนเล่นพร้อมกัน และตรวจฤดูกาลเก่าที่อาจเคยจ่ายบางส่วนก่อนกดปิด คะแนนรายห้องเดิมที่ระบบเก่าฝากไว้ในฤดูกาลโรงเรียนไม่ถูกย้ายหรือคำนวณย้อนหลัง ห้องที่ยังไม่มีฤดูกาลให้แสดงสถานะตามจริง เมื่อคะแนนเสมอเรียงด้วยรหัสทีมคงที่เหมือนกันทุกหน้า โหมดโรงเรียนได้ตั๋ว 10/7/5 และรายห้อง 3/2/1 ต่อคน ตามกติกาเดิม
- ยืนยัน source ของ legacy term mapping, ประสิทธิภาพและความครบถ้วนของรายงานบนฐานที่ได้รับอนุญาต รวมถึง UX หน้า Demo/Study Camp, O-NET, การ์ด, แก้ 0/ร และเครือข่ายบนอุปกรณ์จริง งานท้องถิ่นยังไม่ยืนยันข้อมูลรายบุคคลหรือเวลาโหลดใน production

### การทดสอบ

ใช้ `npm run check`, `npm run build`, `git diff --check` และ `scripts/test-{assessment-season,safe-roster-import,atomic-team-season,private-live-game,remedial-stage-transaction,guest-campaign-reward,team-season-standings}.mjs` เมื่อมี PGlite (รองรับ `PGLITE_MODULE` สำหรับ path ภายในเครื่อง) ชุด Guest เรียก V3 แบบ Rank จริงของ repo บนฐาน fixture ไม่ใช่การยืนยัน definition ของ Supabase จริง ชุด browser `scripts/test-{private-live-game,team-battle}-browser.mjs` ใช้ API จำลองและไม่ทดแทนการเปิดเสียงจริงหรือ smoke test staging

ส่งกลับเฉพาะ SHA ที่ทดสอบ, ผล CI, ผล gate SQL, รายการ smoke test ที่ผ่าน/ไม่ผ่าน และสถานะ production; ไม่แนบ Secret, บัญชีจริง หรือข้อมูลนักเรียน
