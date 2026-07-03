const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const vocabData = [
  {order_no: 1, word: 'Christmas', meaning_th: 'คริสต์มาส', pronunciation: 'คริส-มัส', part_of_speech: 'noun', category: 'festival', difficulty_rank: 1, example_sentence: 'Merry Christmas!', example_meaning_th: 'สุขสันต์วันคริสต์มาส'},
  {order_no: 2, word: 'Santa Claus', meaning_th: 'ซานตาคลอส', pronunciation: 'แซน-ทะ-คลอส', part_of_speech: 'noun', category: 'people', difficulty_rank: 1, example_sentence: 'Santa Claus gives presents to children.', example_meaning_th: 'ซานตาคลอสให้ของขวัญแก่เด็ก ๆ'},
  {order_no: 3, word: 'reindeer', meaning_th: 'กวางเรนเดียร์', pronunciation: 'เรน-เดียร์', part_of_speech: 'noun', category: 'animals', difficulty_rank: 1, example_sentence: 'The reindeer pulls the sleigh.', example_meaning_th: 'กวางเรนเดียร์ลากรถเลื่อน'},
  {order_no: 4, word: 'sleigh', meaning_th: 'รถเลื่อนหิมะ', pronunciation: 'สเลย์', part_of_speech: 'noun', category: 'objects', difficulty_rank: 2, example_sentence: 'Santa rides a sleigh.', example_meaning_th: 'ซานตานั่งรถเลื่อนหิมะ'},
  {order_no: 5, word: 'present', meaning_th: 'ของขวัญ', pronunciation: 'เพรส-เซินท์', part_of_speech: 'noun', category: 'gifts', difficulty_rank: 1, example_sentence: 'I got a present from my friend.', example_meaning_th: 'ฉันได้รับของขวัญจากเพื่อน'},
  {order_no: 6, word: 'gift', meaning_th: 'ของขวัญ', pronunciation: 'กิฟท์', part_of_speech: 'noun', category: 'gifts', difficulty_rank: 1, example_sentence: 'This gift is for you.', example_meaning_th: 'ของขวัญนี้สำหรับคุณ'},
  {order_no: 7, word: 'tree', meaning_th: 'ต้นไม้', pronunciation: 'ทรี', part_of_speech: 'noun', category: 'decoration', difficulty_rank: 1, example_sentence: 'We decorate the Christmas tree.', example_meaning_th: 'เราตกแต่งต้นคริสต์มาส'},
  {order_no: 8, word: 'Christmas tree', meaning_th: 'ต้นคริสต์มาส', pronunciation: 'คริส-มัส ทรี', part_of_speech: 'noun', category: 'decoration', difficulty_rank: 1, example_sentence: 'The Christmas tree is beautiful.', example_meaning_th: 'ต้นคริสต์มาสสวยงาม'},
  {order_no: 9, word: 'star', meaning_th: 'ดาว', pronunciation: 'สตาร์', part_of_speech: 'noun', category: 'decoration', difficulty_rank: 1, example_sentence: 'There is a star on the tree.', example_meaning_th: 'มีดาวอยู่บนต้นไม้'},
  {order_no: 10, word: 'bell', meaning_th: 'ระฆัง', pronunciation: 'เบล', part_of_speech: 'noun', category: 'decoration', difficulty_rank: 1, example_sentence: 'I hear a Christmas bell.', example_meaning_th: 'ฉันได้ยินเสียงระฆังคริสต์มาส'},
  {order_no: 11, word: 'candle', meaning_th: 'เทียน', pronunciation: 'แคน-เดิล', part_of_speech: 'noun', category: 'decoration', difficulty_rank: 1, example_sentence: 'The candle is bright.', example_meaning_th: 'เทียนสว่าง'},
  {order_no: 12, word: 'snow', meaning_th: 'หิมะ', pronunciation: 'สโนว์', part_of_speech: 'noun', category: 'winter', difficulty_rank: 1, example_sentence: 'Snow falls in winter.', example_meaning_th: 'หิมะตกในฤดูหนาว'},
  {order_no: 13, word: 'snowman', meaning_th: 'ตุ๊กตาหิมะ', pronunciation: 'สโนว์-แมน', part_of_speech: 'noun', category: 'winter', difficulty_rank: 1, example_sentence: 'We make a snowman.', example_meaning_th: 'พวกเราปั้นตุ๊กตาหิมะ'},
  {order_no: 14, word: 'winter', meaning_th: 'ฤดูหนาว', pronunciation: 'วิน-เทอร์', part_of_speech: 'noun', category: 'winter', difficulty_rank: 1, example_sentence: 'Winter is cold.', example_meaning_th: 'ฤดูหนาวอากาศหนาว'},
  {order_no: 15, word: 'cold', meaning_th: 'หนาว', pronunciation: 'โคลด์', part_of_speech: 'adjective', category: 'winter', difficulty_rank: 1, example_sentence: 'It is cold today.', example_meaning_th: 'วันนี้อากาศหนาว'},
  {order_no: 16, word: 'ice', meaning_th: 'น้ำแข็ง', pronunciation: 'ไอซ์', part_of_speech: 'noun', category: 'winter', difficulty_rank: 1, example_sentence: 'The ice is very cold.', example_meaning_th: 'น้ำแข็งเย็นมาก'},
  {order_no: 17, word: 'stocking', meaning_th: 'ถุงเท้าคริสต์มาส', pronunciation: 'สต็อก-คิง', part_of_speech: 'noun', category: 'decoration', difficulty_rank: 2, example_sentence: 'The stocking is full of gifts.', example_meaning_th: 'ถุงเท้าคริสต์มาสเต็มไปด้วยของขวัญ'},
  {order_no: 18, word: 'wreath', meaning_th: 'พวงหรีดคริสต์มาส', pronunciation: 'รีธ', part_of_speech: 'noun', category: 'decoration', difficulty_rank: 2, example_sentence: 'There is a wreath on the door.', example_meaning_th: 'มีพวงหรีดคริสต์มาสอยู่ที่ประตู'},
  {order_no: 19, word: 'ornament', meaning_th: 'เครื่องประดับต้นคริสต์มาส', pronunciation: 'ออร์-นะ-เมินท์', part_of_speech: 'noun', category: 'decoration', difficulty_rank: 2, example_sentence: 'The ornament is red.', example_meaning_th: 'เครื่องประดับเป็นสีแดง'},
  {order_no: 20, word: 'lights', meaning_th: 'ไฟประดับ', pronunciation: 'ไลท์ส', part_of_speech: 'noun', category: 'decoration', difficulty_rank: 1, example_sentence: 'The lights are colorful.', example_meaning_th: 'ไฟประดับมีสีสัน'},
  {order_no: 21, word: 'card', meaning_th: 'การ์ด', pronunciation: 'คาร์ด', part_of_speech: 'noun', category: 'gifts', difficulty_rank: 1, example_sentence: 'I write a Christmas card.', example_meaning_th: 'ฉันเขียนการ์ดคริสต์มาส'},
  {order_no: 22, word: 'cookie', meaning_th: 'คุกกี้', pronunciation: 'คุค-คี', part_of_speech: 'noun', category: 'food', difficulty_rank: 1, example_sentence: 'I eat a cookie.', example_meaning_th: 'ฉันกินคุกกี้'},
  {order_no: 23, word: 'candy cane', meaning_th: 'ลูกอมไม้เท้า', pronunciation: 'แคน-ดี เคน', part_of_speech: 'noun', category: 'food', difficulty_rank: 2, example_sentence: 'A candy cane is red and white.', example_meaning_th: 'ลูกอมไม้เท้ามีสีแดงและขาว'},
  {order_no: 24, word: 'gingerbread', meaning_th: 'ขนมปังขิง', pronunciation: 'จิน-เจอร์-เบรด', part_of_speech: 'noun', category: 'food', difficulty_rank: 2, example_sentence: 'I like gingerbread cookies.', example_meaning_th: 'ฉันชอบคุกกี้ขนมปังขิง'},
  {order_no: 25, word: 'turkey', meaning_th: 'ไก่งวง', pronunciation: 'เทอร์-คี', part_of_speech: 'noun', category: 'food', difficulty_rank: 1, example_sentence: 'We eat turkey at Christmas dinner.', example_meaning_th: 'พวกเรากินไก่งวงในมื้อค่ำคริสต์มาส'},
  {order_no: 26, word: 'dinner', meaning_th: 'อาหารเย็น', pronunciation: 'ดิน-เนอร์', part_of_speech: 'noun', category: 'food', difficulty_rank: 1, example_sentence: 'My family has Christmas dinner.', example_meaning_th: 'ครอบครัวของฉันกินอาหารเย็นวันคริสต์มาส'},
  {order_no: 27, word: 'family', meaning_th: 'ครอบครัว', pronunciation: 'แฟม-มะ-ลี', part_of_speech: 'noun', category: 'people', difficulty_rank: 1, example_sentence: 'My family celebrates Christmas.', example_meaning_th: 'ครอบครัวของฉันฉลองคริสต์มาส'},
  {order_no: 28, word: 'friend', meaning_th: 'เพื่อน', pronunciation: 'เฟรนด์', part_of_speech: 'noun', category: 'people', difficulty_rank: 1, example_sentence: 'I give a gift to my friend.', example_meaning_th: 'ฉันให้ของขวัญแก่เพื่อน'},
  {order_no: 29, word: 'children', meaning_th: 'เด็ก ๆ', pronunciation: 'ชิล-เดริน', part_of_speech: 'noun', category: 'people', difficulty_rank: 1, example_sentence: 'Children wait for Santa.', example_meaning_th: 'เด็ก ๆ รอซานตา'},
  {order_no: 30, word: 'elf', meaning_th: 'เอลฟ์', pronunciation: 'เอลฟ์', part_of_speech: 'noun', category: 'people', difficulty_rank: 2, example_sentence: 'The elf makes toys.', example_meaning_th: 'เอลฟ์ทำของเล่น'},
  {order_no: 31, word: 'toy', meaning_th: 'ของเล่น', pronunciation: 'ทอย', part_of_speech: 'noun', category: 'gifts', difficulty_rank: 1, example_sentence: 'The toy is in the box.', example_meaning_th: 'ของเล่นอยู่ในกล่อง'},
  {order_no: 32, word: 'box', meaning_th: 'กล่อง', pronunciation: 'บ็อกซ์', part_of_speech: 'noun', category: 'gifts', difficulty_rank: 1, example_sentence: 'The gift is in the box.', example_meaning_th: 'ของขวัญอยู่ในกล่อง'},
  {order_no: 33, word: 'ribbon', meaning_th: 'ริบบิ้น', pronunciation: 'ริบ-เบิน', part_of_speech: 'noun', category: 'gifts', difficulty_rank: 1, example_sentence: 'The ribbon is red.', example_meaning_th: 'ริบบิ้นเป็นสีแดง'},
  {order_no: 34, word: 'wrap', meaning_th: 'ห่อ', pronunciation: 'แรพ', part_of_speech: 'verb', category: 'gifts', difficulty_rank: 2, example_sentence: 'I wrap the present.', example_meaning_th: 'ฉันห่อของขวัญ'},
  {order_no: 35, word: 'celebrate', meaning_th: 'เฉลิมฉลอง', pronunciation: 'เซล-ละ-เบรท', part_of_speech: 'verb', category: 'festival', difficulty_rank: 2, example_sentence: 'We celebrate Christmas together.', example_meaning_th: 'พวกเราเฉลิมฉลองคริสต์มาสด้วยกัน'},
  {order_no: 36, word: 'decorate', meaning_th: 'ตกแต่ง', pronunciation: 'เดค-คะ-เรท', part_of_speech: 'verb', category: 'decoration', difficulty_rank: 2, example_sentence: 'We decorate the tree.', example_meaning_th: 'พวกเราตกแต่งต้นไม้'},
  {order_no: 37, word: 'sing', meaning_th: 'ร้องเพลง', pronunciation: 'ซิง', part_of_speech: 'verb', category: 'activity', difficulty_rank: 1, example_sentence: 'We sing Christmas songs.', example_meaning_th: 'พวกเราร้องเพลงคริสต์มาส'},
  {order_no: 38, word: 'song', meaning_th: 'เพลง', pronunciation: 'ซอง', part_of_speech: 'noun', category: 'activity', difficulty_rank: 1, example_sentence: 'I like this Christmas song.', example_meaning_th: 'ฉันชอบเพลงคริสต์มาสนี้'},
  {order_no: 39, word: 'carol', meaning_th: 'เพลงคริสต์มาส', pronunciation: 'แค-รอล', part_of_speech: 'noun', category: 'activity', difficulty_rank: 2, example_sentence: 'We sing a Christmas carol.', example_meaning_th: 'พวกเราร้องเพลงคริสต์มาส'},
  {order_no: 40, word: 'church', meaning_th: 'โบสถ์', pronunciation: 'เชิร์ช', part_of_speech: 'noun', category: 'place', difficulty_rank: 2, example_sentence: 'Some people go to church.', example_meaning_th: 'บางคนไปโบสถ์'},
  {order_no: 41, word: 'holiday', meaning_th: 'วันหยุด', pronunciation: 'ฮอล-ละ-เดย์', part_of_speech: 'noun', category: 'festival', difficulty_rank: 1, example_sentence: 'Christmas is a holiday.', example_meaning_th: 'คริสต์มาสเป็นวันหยุด'},
  {order_no: 42, word: 'December', meaning_th: 'เดือนธันวาคม', pronunciation: 'ดิ-เซม-เบอร์', part_of_speech: 'noun', category: 'time', difficulty_rank: 1, example_sentence: 'Christmas is in December.', example_meaning_th: 'คริสต์มาสอยู่ในเดือนธันวาคม'},
  {order_no: 43, word: 'night', meaning_th: 'กลางคืน', pronunciation: 'ไนท์', part_of_speech: 'noun', category: 'time', difficulty_rank: 1, example_sentence: 'Christmas night is beautiful.', example_meaning_th: 'คืนคริสต์มาสสวยงาม'},
  {order_no: 44, word: 'eve', meaning_th: 'คืนก่อนวันสำคัญ', pronunciation: 'อีฟ', part_of_speech: 'noun', category: 'time', difficulty_rank: 2, example_sentence: 'Christmas Eve is on December 24.', example_meaning_th: 'คริสต์มาสอีฟคือวันที่ 24 ธันวาคม'},
  {order_no: 45, word: 'wish', meaning_th: 'คำอวยพร', pronunciation: 'วิช', part_of_speech: 'noun', category: 'festival', difficulty_rank: 2, example_sentence: 'I make a Christmas wish.', example_meaning_th: 'ฉันอธิษฐานในวันคริสต์มาส'},
  {order_no: 46, word: 'merry', meaning_th: 'รื่นเริง', pronunciation: 'เมอร์-รี', part_of_speech: 'adjective', category: 'festival', difficulty_rank: 1, example_sentence: 'Merry Christmas!', example_meaning_th: 'สุขสันต์วันคริสต์มาส'},
  {order_no: 47, word: 'bright', meaning_th: 'สว่างสดใส', pronunciation: 'ไบรท์', part_of_speech: 'adjective', category: 'decoration', difficulty_rank: 1, example_sentence: 'The star is bright.', example_meaning_th: 'ดวงดาวสว่างสดใส'},
  {order_no: 48, word: 'red', meaning_th: 'สีแดง', pronunciation: 'เรด', part_of_speech: 'adjective', category: 'color', difficulty_rank: 1, example_sentence: 'The ribbon is red.', example_meaning_th: 'ริบบิ้นเป็นสีแดง'},
  {order_no: 49, word: 'green', meaning_th: 'สีเขียว', pronunciation: 'กรีน', part_of_speech: 'adjective', category: 'color', difficulty_rank: 1, example_sentence: 'The tree is green.', example_meaning_th: 'ต้นไม้เป็นสีเขียว'},
  {order_no: 50, word: 'gold', meaning_th: 'สีทอง', pronunciation: 'โกลด์', part_of_speech: 'adjective', category: 'color', difficulty_rank: 1, example_sentence: 'The bell is gold.', example_meaning_th: 'ระฆังเป็นสีทอง'},
  {order_no: 51, word: 'silver', meaning_th: 'สีเงิน', pronunciation: 'ซิล-เวอร์', part_of_speech: 'adjective', category: 'color', difficulty_rank: 1, example_sentence: 'The ornament is silver.', example_meaning_th: 'เครื่องประดับเป็นสีเงิน'},
  {order_no: 52, word: 'angel', meaning_th: 'นางฟ้า', pronunciation: 'เอน-เจิล', part_of_speech: 'noun', category: 'decoration', difficulty_rank: 2, example_sentence: 'There is an angel on the tree.', example_meaning_th: 'มีนางฟ้าอยู่บนต้นไม้'},
  {order_no: 53, word: 'chimney', meaning_th: 'ปล่องไฟ', pronunciation: 'ชิม-นี', part_of_speech: 'noun', category: 'house', difficulty_rank: 2, example_sentence: 'Santa comes down the chimney.', example_meaning_th: 'ซานตาลงมาทางปล่องไฟ'},
  {order_no: 54, word: 'fireplace', meaning_th: 'เตาผิง', pronunciation: 'ไฟร์-เพลซ', part_of_speech: 'noun', category: 'house', difficulty_rank: 2, example_sentence: 'The stockings are near the fireplace.', example_meaning_th: 'ถุงเท้าคริสต์มาสอยู่ใกล้เตาผิง'},
  {order_no: 55, word: 'north pole', meaning_th: 'ขั้วโลกเหนือ', pronunciation: 'นอร์ธ โพล', part_of_speech: 'noun', category: 'place', difficulty_rank: 2, example_sentence: 'Santa lives at the North Pole.', example_meaning_th: 'ซานตาอยู่ที่ขั้วโลกเหนือ'},
  {order_no: 56, word: 'snowflake', meaning_th: 'เกล็ดหิมะ', pronunciation: 'สโนว์-เฟลค', part_of_speech: 'noun', category: 'winter', difficulty_rank: 2, example_sentence: 'A snowflake is small and beautiful.', example_meaning_th: 'เกล็ดหิมะเล็กและสวยงาม'},
  {order_no: 57, word: 'mitten', meaning_th: 'ถุงมือกันหนาว', pronunciation: 'มิท-เทิน', part_of_speech: 'noun', category: 'winter', difficulty_rank: 2, example_sentence: 'I wear mittens in winter.', example_meaning_th: 'ฉันใส่ถุงมือกันหนาวในฤดูหนาว'},
  {order_no: 58, word: 'scarf', meaning_th: 'ผ้าพันคอ', pronunciation: 'สคาร์ฟ', part_of_speech: 'noun', category: 'winter', difficulty_rank: 1, example_sentence: 'I wear a scarf.', example_meaning_th: 'ฉันใส่ผ้าพันคอ'},
  {order_no: 59, word: 'coat', meaning_th: 'เสื้อโค้ท', pronunciation: 'โค้ท', part_of_speech: 'noun', category: 'winter', difficulty_rank: 1, example_sentence: 'I wear a coat in winter.', example_meaning_th: 'ฉันใส่เสื้อโค้ทในฤดูหนาว'},
  {order_no: 60, word: 'joy', meaning_th: 'ความสุข', pronunciation: 'จอย', part_of_speech: 'noun', category: 'feeling', difficulty_rank: 2, example_sentence: 'Christmas brings joy.', example_meaning_th: 'คริสต์มาสนำความสุขมาให้'}
];

async function seedChristmasEvent() {
  console.log('Seeding Christmas Event...');
  
  // 1. Insert Event
  const { data: event, error: eventError } = await supabase.from('events').upsert({
    slug: 'christmas-word-hunt',
    title: 'Christmas Word Hunt',
    description: 'ภารกิจล่าคำศัพท์คริสต์มาสในหมู่บ้านหิมะ',
    event_type: 'vocabulary',
    theme: 'christmas_village',
    icon: '🎄',
    status: 'active',
    settings: {
      question_count_per_round: 20,
      hearts: 3,
      has_study_camp: true,
      has_review_mode: true,
      has_leaderboard: true
    }
  }, { onConflict: 'slug' }).select('id').single();

  if (eventError) {
    console.error('Error inserting event:', eventError);
    process.exit(1);
  }

  const eventId = event.id;
  console.log(`Created/Found Event ID: ${eventId}`);

  // 2. Insert Vocabulary Words
  const vocabToInsert = vocabData.map(v => ({
    event_id: eventId,
    ...v
  }));

  const { error: vocabError } = await supabase.from('event_vocabulary')
    .upsert(vocabToInsert, { onConflict: 'event_id,word' });

  if (vocabError) {
    console.error('Error inserting vocabulary:', vocabError);
    process.exit(1);
  }

  console.log('Successfully inserted 60 Christmas words!');
  console.log('Seed completed successfully.');
}

seedChristmasEvent();
