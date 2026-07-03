-- seed_christmas.sql
-- Run this in Supabase SQL Editor to insert the Event and 60 Vocabulary Words

-- 1. Insert Event
INSERT INTO public.events (slug, title, description, event_type, theme, icon, status, settings)
VALUES (
  'christmas-word-hunt',
  'Christmas Word Hunt',
  'ภารกิจล่าคำศัพท์คริสต์มาสในหมู่บ้านหิมะ',
  'vocabulary',
  'christmas_village',
  '🎄',
  'active',
  '{"question_count_per_round": 20, "hearts": 3, "has_study_camp": true, "has_review_mode": true, "has_leaderboard": true}'::jsonb
) ON CONFLICT (slug) DO UPDATE 
SET status = 'active';

-- 2. Insert Vocabulary Words
DO $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT id INTO v_event_id FROM public.events WHERE slug = 'christmas-word-hunt';

  INSERT INTO public.event_vocabulary (event_id, order_no, word, meaning_th, pronunciation, part_of_speech, category, difficulty_rank, example_sentence, example_meaning_th)
  VALUES 
  (v_event_id, 1, 'Christmas', 'คริสต์มาส', 'คริส-มัส', 'noun', 'festival', 1, 'Merry Christmas!', 'สุขสันต์วันคริสต์มาส'),
  (v_event_id, 2, 'Santa Claus', 'ซานตาคลอส', 'แซน-ทะ-คลอส', 'noun', 'people', 1, 'Santa Claus gives presents to children.', 'ซานตาคลอสให้ของขวัญแก่เด็ก ๆ'),
  (v_event_id, 3, 'reindeer', 'กวางเรนเดียร์', 'เรน-เดียร์', 'noun', 'animals', 1, 'The reindeer pulls the sleigh.', 'กวางเรนเดียร์ลากรถเลื่อน'),
  (v_event_id, 4, 'sleigh', 'รถเลื่อนหิมะ', 'สเลย์', 'noun', 'objects', 2, 'Santa rides a sleigh.', 'ซานตานั่งรถเลื่อนหิมะ'),
  (v_event_id, 5, 'present', 'ของขวัญ', 'เพรส-เซินท์', 'noun', 'gifts', 1, 'I got a present from my friend.', 'ฉันได้รับของขวัญจากเพื่อน'),
  (v_event_id, 6, 'gift', 'ของขวัญ', 'กิฟท์', 'noun', 'gifts', 1, 'This gift is for you.', 'ของขวัญนี้สำหรับคุณ'),
  (v_event_id, 7, 'tree', 'ต้นไม้', 'ทรี', 'noun', 'decoration', 1, 'We decorate the Christmas tree.', 'เราตกแต่งต้นคริสต์มาส'),
  (v_event_id, 8, 'Christmas tree', 'ต้นคริสต์มาส', 'คริส-มัส ทรี', 'noun', 'decoration', 1, 'The Christmas tree is beautiful.', 'ต้นคริสต์มาสสวยงาม'),
  (v_event_id, 9, 'star', 'ดาว', 'สตาร์', 'noun', 'decoration', 1, 'There is a star on the tree.', 'มีดาวอยู่บนต้นไม้'),
  (v_event_id, 10, 'bell', 'ระฆัง', 'เบล', 'noun', 'decoration', 1, 'I hear a Christmas bell.', 'ฉันได้ยินเสียงระฆังคริสต์มาส'),
  (v_event_id, 11, 'candle', 'เทียน', 'แคน-เดิล', 'noun', 'decoration', 1, 'The candle is bright.', 'เทียนสว่าง'),
  (v_event_id, 12, 'snow', 'หิมะ', 'สโนว์', 'noun', 'winter', 1, 'Snow falls in winter.', 'หิมะตกในฤดูหนาว'),
  (v_event_id, 13, 'snowman', 'ตุ๊กตาหิมะ', 'สโนว์-แมน', 'noun', 'winter', 1, 'We make a snowman.', 'พวกเราปั้นตุ๊กตาหิมะ'),
  (v_event_id, 14, 'winter', 'ฤดูหนาว', 'วิน-เทอร์', 'noun', 'winter', 1, 'Winter is cold.', 'ฤดูหนาวอากาศหนาว'),
  (v_event_id, 15, 'cold', 'หนาว', 'โคลด์', 'adjective', 'winter', 1, 'It is cold today.', 'วันนี้อากาศหนาว'),
  (v_event_id, 16, 'ice', 'น้ำแข็ง', 'ไอซ์', 'noun', 'winter', 1, 'The ice is very cold.', 'น้ำแข็งเย็นมาก'),
  (v_event_id, 17, 'stocking', 'ถุงเท้าคริสต์มาส', 'สต็อก-คิง', 'noun', 'decoration', 2, 'The stocking is full of gifts.', 'ถุงเท้าคริสต์มาสเต็มไปด้วยของขวัญ'),
  (v_event_id, 18, 'wreath', 'พวงหรีดคริสต์มาส', 'รีธ', 'noun', 'decoration', 2, 'There is a wreath on the door.', 'มีพวงหรีดคริสต์มาสอยู่ที่ประตู'),
  (v_event_id, 19, 'ornament', 'เครื่องประดับต้นคริสต์มาส', 'ออร์-นะ-เมินท์', 'noun', 'decoration', 2, 'The ornament is red.', 'เครื่องประดับเป็นสีแดง'),
  (v_event_id, 20, 'lights', 'ไฟประดับ', 'ไลท์ส', 'noun', 'decoration', 1, 'The lights are colorful.', 'ไฟประดับมีสีสัน'),
  (v_event_id, 21, 'card', 'การ์ด', 'คาร์ด', 'noun', 'gifts', 1, 'I write a Christmas card.', 'ฉันเขียนการ์ดคริสต์มาส'),
  (v_event_id, 22, 'cookie', 'คุกกี้', 'คุค-คี', 'noun', 'food', 1, 'I eat a cookie.', 'ฉันกินคุกกี้'),
  (v_event_id, 23, 'candy cane', 'ลูกอมไม้เท้า', 'แคน-ดี เคน', 'noun', 'food', 2, 'A candy cane is red and white.', 'ลูกอมไม้เท้ามีสีแดงและขาว'),
  (v_event_id, 24, 'gingerbread', 'ขนมปังขิง', 'จิน-เจอร์-เบรด', 'noun', 'food', 2, 'I like gingerbread cookies.', 'ฉันชอบคุกกี้ขนมปังขิง'),
  (v_event_id, 25, 'turkey', 'ไก่งวง', 'เทอร์-คี', 'noun', 'food', 1, 'We eat turkey at Christmas dinner.', 'พวกเรากินไก่งวงในมื้อค่ำคริสต์มาส'),
  (v_event_id, 26, 'dinner', 'อาหารเย็น', 'ดิน-เนอร์', 'noun', 'food', 1, 'My family has Christmas dinner.', 'ครอบครัวของฉันกินอาหารเย็นวันคริสต์มาส'),
  (v_event_id, 27, 'family', 'ครอบครัว', 'แฟม-มะ-ลี', 'noun', 'people', 1, 'My family celebrates Christmas.', 'ครอบครัวของฉันฉลองคริสต์มาส'),
  (v_event_id, 28, 'friend', 'เพื่อน', 'เฟรนด์', 'noun', 'people', 1, 'I give a gift to my friend.', 'ฉันให้ของขวัญแก่เพื่อน'),
  (v_event_id, 29, 'children', 'เด็ก ๆ', 'ชิล-เดริน', 'noun', 'people', 1, 'Children wait for Santa.', 'เด็ก ๆ รอซานตา'),
  (v_event_id, 30, 'elf', 'เอลฟ์', 'เอลฟ์', 'noun', 'people', 2, 'The elf makes toys.', 'เอลฟ์ทำของเล่น'),
  (v_event_id, 31, 'toy', 'ของเล่น', 'ทอย', 'noun', 'gifts', 1, 'The toy is in the box.', 'ของเล่นอยู่ในกล่อง'),
  (v_event_id, 32, 'box', 'กล่อง', 'บ็อกซ์', 'noun', 'gifts', 1, 'The gift is in the box.', 'ของขวัญอยู่ในกล่อง'),
  (v_event_id, 33, 'ribbon', 'ริบบิ้น', 'ริบ-เบิน', 'noun', 'gifts', 1, 'The ribbon is red.', 'ริบบิ้นเป็นสีแดง'),
  (v_event_id, 34, 'wrap', 'ห่อ', 'แรพ', 'verb', 'gifts', 2, 'I wrap the present.', 'ฉันห่อของขวัญ'),
  (v_event_id, 35, 'celebrate', 'เฉลิมฉลอง', 'เซล-ละ-เบรท', 'verb', 'festival', 2, 'We celebrate Christmas together.', 'พวกเราเฉลิมฉลองคริสต์มาสด้วยกัน'),
  (v_event_id, 36, 'decorate', 'ตกแต่ง', 'เดค-คะ-เรท', 'verb', 'decoration', 2, 'We decorate the tree.', 'พวกเราตกแต่งต้นไม้'),
  (v_event_id, 37, 'sing', 'ร้องเพลง', 'ซิง', 'verb', 'activity', 1, 'We sing Christmas songs.', 'พวกเราร้องเพลงคริสต์มาส'),
  (v_event_id, 38, 'song', 'เพลง', 'ซอง', 'noun', 'activity', 1, 'I like this Christmas song.', 'ฉันชอบเพลงคริสต์มาสนี้'),
  (v_event_id, 39, 'carol', 'เพลงคริสต์มาส', 'แค-รอล', 'noun', 'activity', 2, 'We sing a Christmas carol.', 'พวกเราร้องเพลงคริสต์มาส'),
  (v_event_id, 40, 'church', 'โบสถ์', 'เชิร์ช', 'noun', 'place', 2, 'Some people go to church.', 'บางคนไปโบสถ์'),
  (v_event_id, 41, 'holiday', 'วันหยุด', 'ฮอล-ละ-เดย์', 'noun', 'festival', 1, 'Christmas is a holiday.', 'คริสต์มาสเป็นวันหยุด'),
  (v_event_id, 42, 'December', 'เดือนธันวาคม', 'ดิ-เซม-เบอร์', 'noun', 'time', 1, 'Christmas is in December.', 'คริสต์มาสอยู่ในเดือนธันวาคม'),
  (v_event_id, 43, 'night', 'กลางคืน', 'ไนท์', 'noun', 'time', 1, 'Christmas night is beautiful.', 'คืนคริสต์มาสสวยงาม'),
  (v_event_id, 44, 'eve', 'คืนก่อนวันสำคัญ', 'อีฟ', 'noun', 'time', 2, 'Christmas Eve is on December 24.', 'คริสต์มาสอีฟคือวันที่ 24 ธันวาคม'),
  (v_event_id, 45, 'wish', 'คำอวยพร', 'วิช', 'noun', 'festival', 2, 'I make a Christmas wish.', 'ฉันอธิษฐานในวันคริสต์มาส'),
  (v_event_id, 46, 'merry', 'รื่นเริง', 'เมอร์-รี', 'adjective', 'festival', 1, 'Merry Christmas!', 'สุขสันต์วันคริสต์มาส'),
  (v_event_id, 47, 'bright', 'สว่างสดใส', 'ไบรท์', 'adjective', 'decoration', 1, 'The star is bright.', 'ดวงดาวสว่างสดใส'),
  (v_event_id, 48, 'red', 'สีแดง', 'เรด', 'adjective', 'color', 1, 'The ribbon is red.', 'ริบบิ้นเป็นสีแดง'),
  (v_event_id, 49, 'green', 'สีเขียว', 'กรีน', 'adjective', 'color', 1, 'The tree is green.', 'ต้นไม้เป็นสีเขียว'),
  (v_event_id, 50, 'gold', 'สีทอง', 'โกลด์', 'adjective', 'color', 1, 'The bell is gold.', 'ระฆังเป็นสีทอง'),
  (v_event_id, 51, 'silver', 'สีเงิน', 'ซิล-เวอร์', 'adjective', 'color', 1, 'The ornament is silver.', 'เครื่องประดับเป็นสีเงิน'),
  (v_event_id, 52, 'angel', 'นางฟ้า', 'เอน-เจิล', 'noun', 'decoration', 2, 'There is an angel on the tree.', 'มีนางฟ้าอยู่บนต้นไม้'),
  (v_event_id, 53, 'chimney', 'ปล่องไฟ', 'ชิม-นี', 'noun', 'house', 2, 'Santa comes down the chimney.', 'ซานตาลงมาทางปล่องไฟ'),
  (v_event_id, 54, 'fireplace', 'เตาผิง', 'ไฟร์-เพลซ', 'noun', 'house', 2, 'The stockings are near the fireplace.', 'ถุงเท้าคริสต์มาสอยู่ใกล้เตาผิง'),
  (v_event_id, 55, 'north pole', 'ขั้วโลกเหนือ', 'นอร์ธ โพล', 'noun', 'place', 2, 'Santa lives at the North Pole.', 'ซานตาอยู่ที่ขั้วโลกเหนือ'),
  (v_event_id, 56, 'snowflake', 'เกล็ดหิมะ', 'สโนว์-เฟลค', 'noun', 'winter', 2, 'A snowflake is small and beautiful.', 'เกล็ดหิมะเล็กและสวยงาม'),
  (v_event_id, 57, 'mitten', 'ถุงมือกันหนาว', 'มิท-เทิน', 'noun', 'winter', 2, 'I wear mittens in winter.', 'ฉันใส่ถุงมือกันหนาวในฤดูหนาว'),
  (v_event_id, 58, 'scarf', 'ผ้าพันคอ', 'สคาร์ฟ', 'noun', 'winter', 1, 'I wear a scarf.', 'ฉันใส่ผ้าพันคอ'),
  (v_event_id, 59, 'coat', 'เสื้อโค้ท', 'โค้ท', 'noun', 'winter', 1, 'I wear a coat in winter.', 'ฉันใส่เสื้อโค้ทในฤดูหนาว'),
  (v_event_id, 60, 'joy', 'ความสุข', 'จอย', 'noun', 'feeling', 2, 'Christmas brings joy.', 'คริสต์มาสนำความสุขมาให้')
  ON CONFLICT (event_id, word) DO UPDATE 
  SET 
    meaning_th = EXCLUDED.meaning_th,
    pronunciation = EXCLUDED.pronunciation,
    part_of_speech = EXCLUDED.part_of_speech,
    category = EXCLUDED.category,
    difficulty_rank = EXCLUDED.difficulty_rank,
    example_sentence = EXCLUDED.example_sentence,
    example_meaning_th = EXCLUDED.example_meaning_th;
END $$;
