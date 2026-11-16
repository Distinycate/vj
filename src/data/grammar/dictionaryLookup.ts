// DICTIONARY LOOKUP SERVICE FOR VOCAB JOURNEY TEACHING DECK
// ผสานคลังคำศัพท์ O-NET ม.3 ย้อนหลัง 10 ปี, คลังคำศัพท์ ม.1-ม.3 และระบบแปลภาษาออนไลน์สำรอง

export interface WordDefinition {
  word: string;
  meaning: string;
  pos?: string;
  note?: string;
  source?: 'local' | 'online';
}

export const LOCAL_DICTIONARY: Record<string, WordDefinition> = {
  "better late than never": {
    "word": "better late than never",
    "meaning": "มาสายยังดีกว่าไม่มาเลย / ทำช้ายังดีกว่าไม่ทำ",
    "pos": "Proverb (สุภาษิต)",
    "note": "💡 พบบ่อยมากในบทสนทนา Conversation เรื่องการนัดหมาย"
  },
  "make ends meet": {
    "word": "make ends meet",
    "meaning": "หาเงินให้พอใช้ประทังชีวิต / ชักหน้าให้ถึงหลัง / รายได้พอกับรายจ่าย",
    "pos": "Idiom (สุภาษิต/สำนวน)",
    "note": "💡 พบบ่อยในบทอ่าน Reading เชิงเศรษฐกิจและสังคม"
  },
  "leave a scar": {
    "word": "leave a scar",
    "meaning": "ทิ้งรอยแผลใจ / สร้างความเจ็บปวดที่ฝังลึกไม่ลืม",
    "pos": "Idiom",
    "note": "💡 ข้อสอบ O-NET 2568 (เรื่องพ่อกับรั้วตะปู): mean words leave a scar"
  },
  "lose one's temper": {
    "word": "Lose one's temper",
    "meaning": "โกรธ / ฟิวส์ขาด / ควบคุมอารมณ์ไม่อยู่",
    "pos": "",
    "note": "มักออกคู่กับคำว่า get mad, irritated"
  },
  "keep one's fingers crossed": {
    "word": "Keep one's fingers crossed",
    "meaning": "อวยพรให้โชคดี / ขอให้ผ่านไปด้วยดี",
    "pos": "",
    "note": "สำนวนให้กำลังใจเพื่อนในบทสนทนา"
  },
  "out of the blue": {
    "word": "Out of the blue",
    "meaning": "จู่ๆ ก็เกิดขึ้น / ไม่มีปี่ไม่มีขลุ่ย",
    "pos": "",
    "note": "มักออกในบทอ่านเล่าเรื่อง (Narrative)"
  },
  "piece of cake": {
    "word": "Piece of cake",
    "meaning": "ง่ายเหมือนปอกกล้วย / หมูมาก",
    "pos": "",
    "note": "ใช้ตอบเมื่อมีคนถามว่ายากไหม"
  },
  "under the weather": {
    "word": "Under the weather",
    "meaning": "รู้สึกไม่ค่อยสบาย / ป่วยเล็กน้อย",
    "pos": "",
    "note": "ใช้เป็นข้ออ้างในการขอตัวหรือไม่ไปเรียน"
  },
  "give up": {
    "word": "give up",
    "meaning": "ยอมแพ้ / ละทิ้งความพยายาม / เลิกทำ",
    "pos": "Phrasal Verb",
    "note": "💡 Never give up on your dreams."
  },
  "keep in touch": {
    "word": "Keep in touch",
    "meaning": "ติดต่อกันไว้ / อย่าขาดการติดต่อ",
    "pos": "",
    "note": "ใช้พูดตอนกล่าวลาก่อนเพื่อนย้าย/เดินทาง"
  },
  "it happens / that happens": {
    "word": "It happens / That happens",
    "meaning": "เรื่องแบบนี้เกิดขึ้นได้ / อย่าคิดมาก",
    "pos": "",
    "note": "ใช้ตอบรับคำขอโทษอย่างสุภาพ"
  },
  "go right ahead": {
    "word": "Go right ahead",
    "meaning": "เชิญเลย / ทำตามสบายได้เลย",
    "pos": "",
    "note": "ใช้ตอบรับเมื่อมีคนขออนุญาต"
  },
  "figure out": {
    "word": "figure out",
    "meaning": "คิดออก / หาคำตอบได้ / ทำความเข้าใจได้",
    "pos": "Phrasal Verb",
    "note": "💡 We need to figure out why the experiment failed."
  },
  "run out of": {
    "word": "run out of",
    "meaning": "หมดเกลี้ยง / ขาดแคลน / ใช้หมดแล้ว (ห้ามแปลว่า วิ่งออกนอก!)",
    "pos": "Phrasal Verb",
    "note": "💡 ข้อสอบบทอ่าน: ran out of nails (ตะปูหมด)"
  },
  "look forward to": {
    "word": "look forward to",
    "meaning": "ตั้งตารอคอยอย่างใจจดใจจ่อ (ต้องแปลทั้ง 3 คำด้วยกัน ห้ามแยกแปล!)",
    "pos": "Phrasal Verb",
    "note": "💡 O-NET TRAP: to ตัวนี้เป็น Preposition กริยาที่ตามหลังต้องเติม -ing (Gerund) หรือเป็นคำนามเสมอ! (O-NET 2566 ข้อ 26)"
  },
  "take place": {
    "word": "take place",
    "meaning": "เกิดขึ้น / จัดขึ้น (มีความหมายเท่ากับ happen / occur)",
    "pos": "Idiom / Phrase",
    "note": "💡 The concert will take place next month."
  },
  "hand in / turn in": {
    "word": "Hand in / Turn in",
    "meaning": "ส่งงาน / ส่งการบ้าน / ยื่นเอกสาร",
    "pos": "v.",
    "note": "He handed in an empty page of the unit summary."
  },
  "look after / care for": {
    "word": "Look after / Care for",
    "meaning": "ดูแล / เลี้ยงดู / เอาใจใส่",
    "pos": "v.",
    "note": "The sanctuary looks after injured sea mammals."
  },
  "get along with": {
    "word": "Get along with",
    "meaning": "เข้ากันได้ดีกับ / เข้ากับผู้อื่นได้",
    "pos": "v.",
    "note": "She gets along very well with all her classmates."
  },
  "carry out": {
    "word": "Carry out",
    "meaning": "ดำเนินการ / ปฏิบัติการ / ทดลอง",
    "pos": "v.",
    "note": "Scientists carried out research on toxic algal blooms."
  },
  "put off": {
    "word": "Put off",
    "meaning": "เลื่อนออกไป (synonym: postpone, delay)",
    "pos": "v.",
    "note": "Never put off until tomorrow what you can do today."
  },
  "turn down": {
    "word": "turn down",
    "meaning": "ปฏิเสธ (ข้อเสนอ/คำเชิญ) หรือ หรี่เสียง (โทรทัศน์/วิทยุ)",
    "pos": "Phrasal Verb",
    "note": "💡 He turned down the job offer."
  },
  "break down": {
    "word": "Break down",
    "meaning": "พัง / เสีย / สติแตก",
    "pos": "v.",
    "note": "The dishwasher broke down after three years of use."
  },
  "find out": {
    "word": "Find out",
    "meaning": "ค้นพบ / ตรวจพบข้อมูล",
    "pos": "v.",
    "note": "Doctors tried to find out the cause of the disease."
  },
  "depend on / rely on": {
    "word": "Depend on / Rely on",
    "meaning": "ขึ้นอยู่กับ / พึ่งพา",
    "pos": "v.",
    "note": "Success depends on hard work and discipline."
  },
  "result in / lead to": {
    "word": "Result in / Lead to",
    "meaning": "ส่งผลให้เกิด / นำไปสู่",
    "pos": "v.",
    "note": "Excessive fertilizer results in harmful algal blooms."
  },
  "result from": {
    "word": "Result from",
    "meaning": "เกิดมาจาก / มีสาเหตุมาจาก",
    "pos": "v.",
    "note": "The accident resulted from careless driving."
  },
  "however / nevertheless": {
    "word": "However / Nevertheless",
    "meaning": "อย่างไรก็ตาม",
    "pos": "",
    "note": "He studied hard; however, the test was tricky."
  },
  "although / even though": {
    "word": "Although / Even though",
    "meaning": "แม้ว่า / ทั้งๆ ที่",
    "pos": "",
    "note": "Although he is 61, he does his own movie stunts."
  },
  "despite / in spite of": {
    "word": "Despite / In spite of",
    "meaning": "ทั้งๆ ที่ / แม้ว่า",
    "pos": "",
    "note": "Despite heavy rain, the football match continued."
  },
  "therefore / consequently": {
    "word": "Therefore / Consequently",
    "meaning": "ดังนั้น / เป็นผลให้",
    "pos": "",
    "note": "Sea water warmed up; therefore, algae grew rapidly."
  },
  "furthermore / moreover": {
    "word": "Furthermore / Moreover",
    "meaning": "ยิ่งไปกว่านั้น / นอกจากนี้",
    "pos": "",
    "note": "Smartphones are fast; furthermore, they save time."
  },
  "in addition to": {
    "word": "In addition to",
    "meaning": "นอกเหนือจาก...",
    "pos": "",
    "note": "In addition to reading, she loves painting."
  },
  "on the other hand": {
    "word": "on the other hand",
    "meaning": "ในทางกลับกัน / ในอีกแง่มุมหนึ่ง (บอกความขัดแย้งเชิงตรรกะ)",
    "pos": "Transition Phrase",
    "note": "💡 มักขึ้นต้นประโยคแล้วตามด้วย comma (,)"
  },
  "because / since / as": {
    "word": "Because / Since / As",
    "meaning": "เพราะว่า / เนื่องจาก",
    "pos": "",
    "note": "Since the fence had holes, it was never the same."
  },
  "because of / due to / owing to": {
    "word": "Because of / Due to / Owing to",
    "meaning": "เนื่องจาก / เพราะมี...",
    "pos": "",
    "note": "The flight was delayed due to thick winter fog."
  },
  "in order to / so as to": {
    "word": "In order to / So as to",
    "meaning": "เพื่อที่จะ...",
    "pos": "",
    "note": "He removed a nail each day in order to control temper."
  },
  "unless": {
    "word": "Unless",
    "meaning": "เว้นแต่ว่า / ถ้าไม่...",
    "pos": "",
    "note": "You will not pass unless you practice regularly."
  },
  "as well as": {
    "word": "as well as",
    "meaning": "เช่นเดียวกับ... / รวมทั้ง... (เชื่อมข้อมูลในทิศทางเดียวกัน)",
    "pos": "Conjunction Phrase",
    "note": "💡 กริยาจะผันตามประธานตัวหน้า as well as"
  },
  "environment": {
    "word": "Environment",
    "meaning": "สิ่งแวดล้อม / ธรรมชาติรอบตัว",
    "pos": "n.",
    "note": "Harmful algae damage the marine environment."
  },
  "pollution": {
    "word": "Pollution",
    "meaning": "มลพิษ / ภาวะมลพิษ",
    "pos": "n.",
    "note": "Air pollution in big cities causes lung diseases."
  },
  "disaster": {
    "word": "Disaster",
    "meaning": "ภัยพิบัติ / หายนะ",
    "pos": "n.",
    "note": "Earthquake is one of the most destructive natural disasters."
  },
  "harmful / toxic": {
    "word": "Harmful / Toxic",
    "meaning": "เป็นอันตราย / มีพิษ",
    "pos": "adj.",
    "note": "A harmful algal bloom produces toxic domoic acid."
  },
  "deplete / depletion": {
    "word": "Deplete / Depletion",
    "meaning": "ทำให้หมดสิ้น / ลดลงอย่างรุนแรง",
    "pos": "v./n.",
    "note": "HABs deplete oxygen levels in coastal seawater."
  },
  "organism": {
    "word": "Organism",
    "meaning": "สิ่งมีชีวิต / จุลินทรีย์",
    "pos": "n.",
    "note": "Algae are microscopic organisms living in aquatic habitats."
  },
  "aquatic": {
    "word": "Aquatic",
    "meaning": "เกี่ยวกับน้ำ / ที่อาศัยในน้ำ",
    "pos": "adj.",
    "note": "Aquatic animals suffer from contaminated sea waters."
  },
  "severe": {
    "word": "Severe",
    "meaning": "รุนแรง / สาหัส / ร้ายแรง",
    "pos": "adj.",
    "note": "Last year's outbreak was particularly severe for sea lions."
  },
  "destroy / destruction": {
    "word": "Destroy / Destruction",
    "meaning": "ทำลาย / การทำลายล้าง",
    "pos": "v./n.",
    "note": "The storm destroyed many ancient stone buildings."
  },
  "eruption": {
    "word": "Eruption",
    "meaning": "การปะทุ (ภูเขาไฟ)",
    "pos": "n.",
    "note": "Volcanic eruption covered the surrounding towns in ash."
  },
  "symptom": {
    "word": "Symptom",
    "meaning": "อาการของโรค",
    "pos": "n.",
    "note": "Symptoms of poisoning include confusion and seizures."
  },
  "devastating": {
    "word": "Devastating",
    "meaning": "ที่ทำลายล้าง / ก่อความเสียหายหนัก",
    "pos": "adj.",
    "note": "His uncontrolled anger led to devastating results."
  },
  "temper": {
    "word": "Temper",
    "meaning": "อารมณ์ / ความใจร้อน",
    "pos": "n.",
    "note": "The boy had difficulty keeping his temper under control."
  },
  "irritated / annoyed": {
    "word": "Irritated / Annoyed",
    "meaning": "ที่หงุดหงิด / รำคาญใจ",
    "pos": "adj.",
    "note": "I thought the teacher was joking, but he was irritated."
  },
  "sarcastic": {
    "word": "Sarcastic",
    "meaning": "ประชดประชัน / เสียดสี",
    "pos": "adj.",
    "note": "He was being sarcastic when praising the boy's laziness."
  },
  "apologize / apology": {
    "word": "Apologize / Apology",
    "meaning": "ขอโทษ / คำขอโทษ",
    "pos": "v./n.",
    "note": "He sincerely apologized for forgetting her notebook."
  },
  "forgive": {
    "word": "Forgive",
    "meaning": "ให้อภัย / ยกโทษให้",
    "pos": "v.",
    "note": "Please forgive me for arriving twenty minutes late."
  },
  "punctual / punctuality": {
    "word": "Punctual / Punctuality",
    "meaning": "adj./n.",
    "pos": "",
    "note": "Punctuality is considered an essential social value."
  },
  "complicated": {
    "word": "Complicated",
    "meaning": "ซับซ้อน / ยุ่งยาก",
    "pos": "adj.",
    "note": "The recipe seemed complicated at first reading."
  },
  "distinctive": {
    "word": "Distinctive",
    "meaning": "โดดเด่น / มีเอกลักษณ์เฉพาะตัว",
    "pos": "adj.",
    "note": "The tower features a distinctive curved metal base."
  },
  "percentage / proportion": {
    "word": "Percentage / Proportion",
    "meaning": "ร้อยละ / เปอร์เซ็นต์ / สัดส่วน",
    "pos": "n.",
    "note": "The chart illustrates the percentage of smartphone owners."
  },
  "increase / rise": {
    "word": "Increase / Rise",
    "meaning": "เพิ่มขึ้น / การเพิ่มขึ้น",
    "pos": "v./n.",
    "note": "A significant increase was observed in the 55-64 age group."
  },
  "decrease / decline / drop": {
    "word": "Decrease / Decline / Drop",
    "meaning": "ลดลง / การลดลง",
    "pos": "v./n.",
    "note": "Book readership dropped considerably over the decade."
  },
  "illustrate / depict": {
    "word": "Illustrate / Depict",
    "meaning": "แสดงให้เห็น / อธิบายด้วยภาพ",
    "pos": "v.",
    "note": "The bar chart illustrates trends in mobile data usage."
  },
  "significant": {
    "word": "significant",
    "meaning": "สำคัญ / มีนัยสำคัญ / อย่างเห็นได้ชัด",
    "pos": "adj.",
    "note": "O-NET 2568"
  },
  "majority": {
    "word": "Majority",
    "meaning": "ส่วนใหญ่ / เสียงส่วนมาก",
    "pos": "n.",
    "note": "The majority of respondents preferred messaging to calling."
  },
  "minority": {
    "word": "Minority",
    "meaning": "ส่วนน้อย",
    "pos": "n.",
    "note": "Only a minority of teenagers preferred desktop computers."
  },
  "survey / respondent": {
    "word": "Survey / Respondent",
    "meaning": "การสำรวจ / ผู้ตอบแบบสอบถาม",
    "pos": "n.",
    "note": "The survey shows user feedback on mobile banking apps."
  },
  "category": {
    "word": "category",
    "meaning": "หมวดหมู่ / กลุ่มประเภท",
    "pos": "n.",
    "note": "O-NET 2568"
  },
  "average": {
    "word": "Average",
    "meaning": "adj./n.",
    "pos": "",
    "note": "The national average score in English remained at 30%."
  },
  "hide": {
    "word": "hide",
    "meaning": "ซ่อน / ปกปิดไม่ให้เห็น",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "burn": {
    "word": "burn",
    "meaning": "เผาไหม้ด้วยไฟ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "collect": {
    "word": "collect",
    "meaning": "รวบรวม / สะสม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "hold": {
    "word": "hold",
    "meaning": "ถือ / จับไว้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "repair": {
    "word": "repair",
    "meaning": "ซ่อมแซม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "copy": {
    "word": "copy",
    "meaning": "คัดลอก / ทำซ้ำ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "download": {
    "word": "download",
    "meaning": "ดาวน์โหลดข้อมูล",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "heat": {
    "word": "heat",
    "meaning": "ทำให้อุ่นหรือร้อนขึ้น",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "light": {
    "word": "light",
    "meaning": "จุดไฟ / แสงสว่าง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "apply": {
    "word": "apply",
    "meaning": "สมัครงาน / ยื่นคำร้อง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "knock": {
    "word": "knock",
    "meaning": "เคาะประตู",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "push": {
    "word": "push",
    "meaning": "ผลัก / ดันไปข้างหน้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "rise": {
    "word": "rise",
    "meaning": "ลอยขึ้น / สูงขึ้น",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "react": {
    "word": "react",
    "meaning": "มีปฏิกิริยาตอบสนอง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "book": {
    "word": "book",
    "meaning": "หนังสือ / จองตั๋ว",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "smell": {
    "word": "smell",
    "meaning": "ฉันดมกลิ่นดอกไม้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "fish": {
    "word": "fish",
    "meaning": "พวกเขาวางแผนจะไปตกปลาที่ทะเลสาบสุดสัปดาห์นี้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "shake": {
    "word": "shake",
    "meaning": "แผ่นดินไหวทำให้พื้นดินสั่นสะเทือนใต้ฝ่าเท้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "ring": {
    "word": "ring",
    "meaning": "คุณสามารถโทรหาฉันได้ตอนประมาณ 2 ทุ่ม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "hurt": {
    "word": "hurt",
    "meaning": "ระวังอย่าทำให้ตัวเองบาดเจ็บกับหินแหลมคมก้อนนั้น",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "boil": {
    "word": "boil",
    "meaning": "อย่าลืมต้มน้ำก่อนชงชา",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "wait": {
    "word": "wait",
    "meaning": "พวกเราต้องยืนรอรถประจำทางในอากาศหนาวตอนเช้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "dreamed": {
    "word": "dreamed",
    "meaning": "เมื่อคืนนี้ ฉันฝันถึงคุณ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "shut": {
    "word": "shut",
    "meaning": "อย่าลืมปิดหน้าต่างก่อนออกจากบ้าน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "fail": {
    "word": "fail",
    "meaning": "แม้จะตั้งใจเรียนอย่างหนัก แต่เขาก็ยังสอบตกวิชาสะกดคำ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "attack": {
    "word": "attack",
    "meaning": "กองทัพวางแผนที่จะบุกโจมตีตอนรุ่งสาง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "shout": {
    "word": "shout",
    "meaning": "กรุณาอย่าตะโกนในห้องเรียน ให้ยกมือขึ้นแทน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "dead": {
    "word": "dead",
    "meaning": "ตาย / ไม่มีชีวิต",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "alive": {
    "word": "alive",
    "meaning": "มีชีวิตอยู่",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "inside": {
    "word": "inside",
    "meaning": "ข้างใน / ภายในอาคาร",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "outside": {
    "word": "outside",
    "meaning": "ข้างนอก / กลางแจ้ง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "heavy": {
    "word": "heavy",
    "meaning": "มีน้ำหนักมาก / หนัก",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "formal": {
    "word": "formal",
    "meaning": "เป็นทางการ / สุภาพเรียบร้อย",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "informal": {
    "word": "informal",
    "meaning": "ไม่เป็นทางการ / ลำลอง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "stupid": {
    "word": "stupid",
    "meaning": "โง่เขลา / ไม่ฉลาด",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "intelligent": {
    "word": "intelligent",
    "meaning": "ฉลาด / มีไหวพริบ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "crowded": {
    "word": "crowded",
    "meaning": "แออัด / ผู้คนหนาแน่น",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "blank": {
    "word": "blank",
    "meaning": "ว่างเปล่า (ไม่มีข้อความ)",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "empty": {
    "word": "empty",
    "meaning": "ว่างเปล่า (ไม่มีน้ำเหลืออยู่)",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "round": {
    "word": "round",
    "meaning": "ทรงกลม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "wooden": {
    "word": "wooden",
    "meaning": "ทำด้วยไม้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "narrow": {
    "word": "narrow",
    "meaning": "แคบ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "flat": {
    "word": "flat",
    "meaning": "แบนราบ / เรียบ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "huge": {
    "word": "huge",
    "meaning": "ใหญ่โตมโหฬาร",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "unusual": {
    "word": "unusual",
    "meaning": "ผิดปกติ / ไม่ค่อยเกิดขึ้น",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "usual": {
    "word": "usual",
    "meaning": "ตามปกติ / ประจำ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "normal": {
    "word": "normal",
    "meaning": "ปกติ / ตามมาตรฐาน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "clever": {
    "word": "clever",
    "meaning": "ฉลาดหลักแหลม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "rude": {
    "word": "rude",
    "meaning": "เสียมารยาท / หยาบคาย",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "polite": {
    "word": "polite",
    "meaning": "สุภาพอ่อนน้อม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "active": {
    "word": "active",
    "meaning": "กระฉับกระเฉง / คล่องแคล่ว",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "thin": {
    "word": "thin",
    "meaning": "ผอมบาง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "adult": {
    "word": "adult",
    "meaning": "ผู้ใหญ่",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "loudly": {
    "word": "loudly",
    "meaning": "คุณครูพูดเสียงดังเพื่อให้ทุกคนได้ยิน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "badly": {
    "word": "badly",
    "meaning": "เขาเล่นฟุตบอลได้แย่เพราะเขาเหนื่อย",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "happily": {
    "word": "happily",
    "meaning": "เธอเต้นรำอย่างมีความสุขในงานปาร์ตี้โรงเรียน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "suddenly": {
    "word": "Suddenly",
    "meaning": "ทันใดนั้น แมวก็กระโดดออกมาจากกล่อง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "carefully": {
    "word": "carefully",
    "meaning": "กรุณาเดินอย่างระมัดระวังบนพื้นเปียก",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "correctly": {
    "word": "correctly",
    "meaning": "เขาตอบคำถามได้อย่างถูกต้องและได้รับรางวัล",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "quietly": {
    "word": "quietly",
    "meaning": "นักเรียนอ่านหนังสืออย่างเงียบๆ ในห้องสมุด",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "normally": {
    "word": "Normally",
    "meaning": "โดยปกติแล้ว ฉันตื่นนอนเวลา 6 โมงเช้าทุกวัน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "actually": {
    "word": "Actually",
    "meaning": "อันที่จริงแล้ว ฉันไม่ค่อยชอบอาหารรสเผ็ดเท่าไหร่",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "easily": {
    "word": "easily",
    "meaning": "เธอแก้ปริศนาได้อย่างง่ายดายเพราะมันง่ายมาก",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "exactly": {
    "word": "exactly",
    "meaning": "นั่นคือสิ่งที่ฉันอยากได้เป๊ะเลย!",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "clearly": {
    "word": "clearly",
    "meaning": "เธออธิบายกติกาอย่างชัดเจนจนทุกคนเล่นเกมได้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "nearly": {
    "word": "nearly",
    "meaning": "ฉันอ่านหนังสือเกือบจบแล้ว เหลืออีกแค่บทเดียว",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "finally": {
    "word": "finally",
    "meaning": "หลังจากเดินทางมาทั้งวัน ในที่สุดพวกเราก็มาถึงโรงแรม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "especially": {
    "word": "especially",
    "meaning": "เขาซ้อมกีฬาทุกวัน โดยเฉพาะอย่างยิ่งว่ายน้ำและบาสเกตบอล",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "mostly": {
    "word": "mostly",
    "meaning": "ฉันกินอาหารเพื่อสุขภาพ ซึ่งส่วนใหญ่เป็นผักและผลไม้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "already": {
    "word": "already",
    "meaning": "ฉันทำความสะอาดห้องเสร็จเรียบร้อยแล้วก่อนมื้อเย็น",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "fortunately": {
    "word": "fortunately",
    "meaning": "เราตกรถเมล์ แต่โชคดีที่คันใหม่มาถึงอย่างรวดเร็ว",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "unfortunately": {
    "word": "Unfortunately",
    "meaning": "น่าเสียดาย/โชคร้ายที่เมื่อคืนฉันทำการบ้านไม่เสร็จ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "certainly": {
    "word": "certainly",
    "meaning": "ถ้าคุณตั้งใจเรียน คุณจะสอบผ่านอย่างแน่นอน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "architect": {
    "word": "architect",
    "meaning": "สถาปนิก (ผู้ออกแบบอาคาร)",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "architecture": {
    "word": "architecture",
    "meaning": "สถาปัตยกรรม (ศาสตร์การออกแบบอาคาร)",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "assistant": {
    "word": "assistant",
    "meaning": "ผู้ช่วย",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "author": {
    "word": "author",
    "meaning": "นักเขียน / ผู้ประพันธ์",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "chef": {
    "word": "chef",
    "meaning": "เชฟ / หัวหน้าพ่อครัว",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "director": {
    "word": "director",
    "meaning": "ผู้กำกับภาพยนตร์ / ผู้อำนวยการ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "dentist": {
    "word": "dentist",
    "meaning": "ทันตแพทย์ (หมอฟัน)",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "designer": {
    "word": "designer",
    "meaning": "นักออกแบบ (ดีไซเนอร์)",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "camping": {
    "word": "camping",
    "meaning": "การไปตั้งแคมป์กางเต็นท์",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "baseball": {
    "word": "baseball",
    "meaning": "กีฬาเบสบอล",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "basketball": {
    "word": "basketball",
    "meaning": "กีฬาบาสเกตบอล",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "athlete": {
    "word": "athlete",
    "meaning": "นักกีฬา / นักกรีฑา",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "runner": {
    "word": "runner",
    "meaning": "นักวิ่ง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "running": {
    "word": "running",
    "meaning": "กีฬาวิ่ง / การวิ่งออกกำลังกาย",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "camp": {
    "word": "camp",
    "meaning": "ค่ายพักแรม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "coach": {
    "word": "coach",
    "meaning": "โค้ช / ผู้ฝึกสอนกีฬา",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "goal": {
    "word": "goal",
    "meaning": "ประตูฟุตบอล / เป้าหมาย",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "golf": {
    "word": "golf",
    "meaning": "กีฬากอล์ฟ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "final": {
    "word": "final",
    "meaning": "รอบชิงชนะเลิศ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "ski": {
    "word": "ski",
    "meaning": "สกีหิมะ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "winner": {
    "word": "winner",
    "meaning": "ผู้ชนะเลิศ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "race": {
    "word": "race",
    "meaning": "การแข่งขันความเร็ว",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "tip": {
    "word": "tip",
    "meaning": "เคล็ดลับ / คำแนะนำดีๆ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "device": {
    "word": "device",
    "meaning": "ฉันใช้อุปกรณ์อิเล็กทรอนิกส์เพื่อเล่นเกมโปรด",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "data": {
    "word": "data",
    "meaning": "พวกเรารวบรวมข้อมูลเกี่ยวกับสัตว์สำหรับโครงงานโรงเรียน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "system": {
    "word": "system",
    "meaning": "ระบบสัญญาณกันขโมยช่วยให้บ้านของเราปลอดภัย",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "laptop": {
    "word": "laptop",
    "meaning": "คุณพ่อเปิดคอมพิวเตอร์พกพาและทำงานในออฟฟิศ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "network": {
    "word": "network",
    "meaning": "ห้องเรียนของเรามีเครือข่ายอินเทอร์เน็ตสำหรับการเรียนรู้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "digital": {
    "word": "digital",
    "meaning": "โรงเรียนนำเสนอแพลตฟอร์มดิจิทัลสำหรับการเรียนรู้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "platform": {
    "word": "platform",
    "meaning": "เว็บไซต์นี้เป็นแพลตฟอร์มสำหรับแชร์ไฟล์ออนไลน์",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "mobile": {
    "word": "mobile",
    "meaning": "คุณแม่ใช้โทรศัพท์มือถือโทรหาคุณยายทุกวัน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "program": {
    "word": "program",
    "meaning": "รายการทีวีโปรดของฉันเกี่ยวกับธรรมชาติและสัตว์",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "smartphone": {
    "word": "smartphone",
    "meaning": "สมาร์ตโฟนของคุณพ่อมีหน้าจอใหญ่และถ่ายรูปสวย",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "screen": {
    "word": "screen",
    "meaning": "พวกเราดูภาพยนตร์บนจอภาพขนาดใหญ่ที่โรงหนัง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "search": {
    "word": "search",
    "meaning": "การค้นหาซอฟต์แวร์ที่เหมาะสมใช้เวลาหลายชั่วโมง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "background": {
    "word": "background",
    "meaning": "เสียงเพลงบรรเลงคลอเบาๆ เป็นพื้นหลังระหว่างคาบศิลปะ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "user": {
    "word": "user",
    "meaning": "ผู้ใช้งานแต่ละคนต้องสร้างบัญชีก่อนใช้แอปพลิเคชัน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "control": {
    "word": "control",
    "meaning": "ฉันใช้รีโมตคอนโทรลเปิดทีวีเพื่อดูการ์ตูน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "physics": {
    "word": "physics",
    "meaning": "วิชาฟิสิกส์",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "chemistry": {
    "word": "chemistry",
    "meaning": "วิชาเคมี",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "biology": {
    "word": "biology",
    "meaning": "วิชาชีววิทยา",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "math": {
    "word": "math",
    "meaning": "วิชาคณิตศาสตร์",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "uniform": {
    "word": "uniform",
    "meaning": "เครื่องแบบนักเรียน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "poster": {
    "word": "poster",
    "meaning": "แผ่นโปสเตอร์ความรู้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "notice": {
    "word": "notice",
    "meaning": "ป้ายประกาศแจ้งเตือน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "solution": {
    "word": "solution",
    "meaning": "ทางออก / คำตอบของปัญหา",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "explanation": {
    "word": "explanation",
    "meaning": "คำอธิบาย",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "knowledge": {
    "word": "knowledge",
    "meaning": "ความรู้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "circle": {
    "word": "circle",
    "meaning": "รูปวงกลม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "square": {
    "word": "square",
    "meaning": "รูปสี่เหลี่ยมจัตุรัส",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "employee": {
    "word": "employee",
    "meaning": "ลูกจ้าง / พนักงาน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "employer": {
    "word": "employer",
    "meaning": "นายจ้าง / บริษัทผู้ว่าจ้าง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "boss": {
    "word": "boss",
    "meaning": "เจ้านาย / หัวหน้างาน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "colleague": {
    "word": "colleague",
    "meaning": "เพื่อนร่วมงาน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "salary": {
    "word": "salary",
    "meaning": "เงินเดือน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "benefit": {
    "word": "benefit",
    "meaning": "สวัสดิการ / ผลประโยชน์",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "factory": {
    "word": "factory",
    "meaning": "โรงงานอุตสาหกรรม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "advertisement": {
    "word": "advertisement",
    "meaning": "โฆษณาประชาสัมพันธ์",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "competition": {
    "word": "competition",
    "meaning": "การแข่งขันทางธุรกิจ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "service": {
    "word": "service",
    "meaning": "การบริการลูกค้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "opportunity": {
    "word": "opportunity",
    "meaning": "โอกาสที่ดี",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "manage": {
    "word": "manage",
    "meaning": "บริหาร / จัดการดูแล",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "themselves": {
    "word": "themselves",
    "meaning": "เด็กๆ แต่งตัวด้วยตัวเองเพื่อไปงานปาร์ตี้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "hers": {
    "word": "hers",
    "meaning": "จักรยานสีแดงเป็นของเจน มันเป็นของเธอ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "herself": {
    "word": "herself",
    "meaning": "เธอแนะนำตัวเองกับเพื่อนบ้านใหม่",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "ourselves": {
    "word": "ourselves",
    "meaning": "พวกเราต้องทำโครงงานนี้ด้วยตัวพวกเราเอง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "itself": {
    "word": "itself",
    "meaning": "แมวเลียทำความสะอาดตัวเองหลังจากกินอาหารเสร็จ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "himself": {
    "word": "himself",
    "meaning": "เขาต่อรถจำลองด้วยตัวเขาเอง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "his": {
    "word": "His",
    "meaning": "สีโปรดของเขาคือสีฟ้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "myself": {
    "word": "myself",
    "meaning": "ฉันตัดสินใจด้วยตัวของฉันเอง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "mine": {
    "word": "mine",
    "meaning": "หนังสือเล่มนั้นเป็นของฉัน ไม่ใช่ของคุณ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "zero": {
    "word": "zero",
    "meaning": "ฉันเหลือแอปเปิ้ล 0 ลูกในกล่องข้าวเพราะกินหมดแล้ว",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "billions": {
    "word": "billions",
    "meaning": "โลกของเรามีผู้คนหลายพันล้านคนอาศัยอยู่",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "first": {
    "word": "first",
    "meaning": "ซาร่าห์เป็นคนแรกที่วาดรูปเสร็จในคาบศิลปะ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "second": {
    "word": "second",
    "meaning": "เธอวิ่งเข้าเส้นชัยเป็นอันดับที่ 2 ในการวิ่งมาราธอน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "thirds": {
    "word": "thirds",
    "meaning": "เขาแบ่งเงินออกเป็น 3 ส่วนเท่าๆ กัน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "firstly": {
    "word": "Firstly",
    "meaning": "ลำดับแรก ฉันทำอาหารเช้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "secondly": {
    "word": "secondly",
    "meaning": "และลำดับที่สอง ฉันทำความสะอาดห้องครัว",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "bean": {
    "word": "bean",
    "meaning": "เมล็ดถั่ว",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "beef": {
    "word": "beef",
    "meaning": "เนื้อวัว",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "biscuit": {
    "word": "biscuit",
    "meaning": "ขนมปังกรอบ / บิสกิต",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "chip": {
    "word": "chip",
    "meaning": "มันฝรั่งทอดแผ่นบาง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "lemon": {
    "word": "lemon",
    "meaning": "ผลเลมอน (มะนาวสีเหลือง)",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "fresh": {
    "word": "fresh",
    "meaning": "สดใหม่",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "jam": {
    "word": "jam",
    "meaning": "แยมผลไม้ทาขนมปัง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "sauce": {
    "word": "sauce",
    "meaning": "ซอสปรุงรส",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "manner": {
    "word": "manner",
    "meaning": "เธอพูดกับเขาด้วยท่าที/มารยาทที่สุภาพ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "female": {
    "word": "female",
    "meaning": "นกตัวเมียสร้างรังอยู่บนต้นไม้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "habit": {
    "word": "habit",
    "meaning": "การตื่นเช้ากลายเป็นนิสัย/กิจวัตรประจำวันของเธอ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "diary": {
    "word": "diary",
    "meaning": "เธอเขียนบันทึกประจำวันทุกคืนก่อนนอน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "birth": {
    "word": "birth",
    "meaning": "การถือกำเนิดของน้องสาวเป็นช่วงเวลาแห่งความสุขของครอบครัว",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "behavior": {
    "word": "behavior",
    "meaning": "ความประพฤติที่ดีเป็นสิ่งสำคัญทั้งที่โรงเรียนและที่บ้าน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "feature": {
    "word": "feature",
    "meaning": "มีจุดเด่นคือ / นำแสดงโดย / ลักษณะเด่น",
    "pos": "v./n.",
    "note": "O-NET 2568"
  },
  "charity": {
    "word": "charity",
    "meaning": "พวกเขาบริจาคเงินให้องค์กรการกุศลในท้องถิ่นเพื่อช่วยเหลือผู้ยากไร้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "ability": {
    "word": "ability",
    "meaning": "ความสามารถทางศิลปะของเขาทำให้เขาวาดภาพที่สวยงามได้",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "weight": {
    "word": "weight",
    "meaning": "การออกกำลังกายและอาหารที่ดีช่วยรักษาน้ำหนักตัวให้เหมาะสม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "wedding": {
    "word": "wedding",
    "meaning": "พวกเขาจัดงานแต่งงานที่สวยงามริมชายหาด",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "male": {
    "word": "male",
    "meaning": "สิงโตตัวผู้เป็นที่รู้จักในฐานะจ่าฝูงที่ทรงพลัง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "human": {
    "word": "human",
    "meaning": "พวกเราทุกคนล้วนเป็นมนุษย์และทำผิดพลาดกันได้บ้าง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "guy": {
    "word": "guy",
    "meaning": "ผู้ชายตัวสูงที่สวมแว่นตาช่วยฉันตามหาสุนัขที่หลงทาง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "experience": {
    "word": "experience",
    "meaning": "การเดินทางไปต่างประเทศมอบประสบการณ์ที่มีค่าให้กับคุณ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "skin": {
    "word": "skin",
    "meaning": "ผิวหนัง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "voice": {
    "word": "voice",
    "meaning": "เสียงพูด / เสียงร้องเพลง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "finger": {
    "word": "finger",
    "meaning": "นิ้วมือ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "blood": {
    "word": "blood",
    "meaning": "เลือด / โลหิต",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "ankle": {
    "word": "ankle",
    "meaning": "ข้อเท้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "appearance": {
    "word": "appearance",
    "meaning": "รูปลักษณ์ภายนอก",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "neck": {
    "word": "neck",
    "meaning": "ลำคอ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "bone": {
    "word": "bone",
    "meaning": "กระดูก",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "physical": {
    "word": "physical",
    "meaning": "ทางกายภาพ / เกี่ยวกับร่างกาย",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "brain": {
    "word": "brain",
    "meaning": "สมอง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "fridge": {
    "word": "fridge",
    "meaning": "ตู้เย็น",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "cupboard": {
    "word": "cupboard",
    "meaning": "ตู้เก็บของ / ตู้กับข้าว",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "bowl": {
    "word": "bowl",
    "meaning": "ถ้วย / ชาม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "brush": {
    "word": "brush",
    "meaning": "แปรง (แปรงผม/แปรงขัด)",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "can": {
    "word": "can",
    "meaning": "สามารถ...ได้ / ขออนุญาต...",
    "pos": "Modal Verb",
    "note": "📌 กฎไวยากรณ์: ตามด้วย V.inf เสมอ"
  },
  "cooker": {
    "word": "cooker",
    "meaning": "เตาทำอาหาร / หม้อหุงต้ม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "fan": {
    "word": "fan",
    "meaning": "พัดลม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "knife": {
    "word": "knife",
    "meaning": "มีด",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "fork": {
    "word": "fork",
    "meaning": "ส้อม",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "pet": {
    "word": "pet",
    "meaning": "สัตว์เลี้ยง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "bin": {
    "word": "bin",
    "meaning": "ถังขยะ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "carpet": {
    "word": "carpet",
    "meaning": "พรมปูพื้น",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "mirror": {
    "word": "mirror",
    "meaning": "กระจกเงา",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "starred": {
    "word": "starred",
    "meaning": "ทอม ฮอลแลนด์ แสดงนำในภาพยนตร์เรื่อง Spider-Man",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "comedy": {
    "word": "comedy",
    "meaning": "เธอได้แสดงนำในซีรีส์ตลกสุดฮิตที่ทำให้ทุกคนหัวเราะ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "lifestyle": {
    "word": "lifestyle",
    "meaning": "นิตยสารแนะนำเคล็ดลับหลากหลายในการพัฒนาวิถีชีวิตของคุณ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "rock": {
    "word": "rock",
    "meaning": "ฉันอยากเป็นมือกีตาร์นำในวงดนตรีร็อกชื่อดัง",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "celebrity": {
    "word": "celebrity",
    "meaning": "นักแสดงหน้าใหม่หลายคนฝันอยากเป็นคนดังในฮอลลีวูด",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "fiction": {
    "word": "fiction",
    "meaning": "การเขียนเรื่องแต่ง/นวนิยายช่วยให้เธอได้สำรวจจินตนาการ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "column": {
    "word": "column",
    "meaning": "ฉันอ่านคอลัมน์ของเธอในหนังสือพิมพ์ท้องถิ่นเสมอ",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "joke": {
    "word": "joke",
    "meaning": "เขาเล่ามุกตลกที่ขำมากจนเพื่อนทั้งห้องหัวเราะลั่น",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "drama": {
    "word": "drama",
    "meaning": "คุณแม่ชอบดูละครดราม่าเกาหลีซึ้งๆ ทางทีวี",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "novel": {
    "word": "novel",
    "meaning": "แฮร์รี่ พอตเตอร์ เป็นนวนิยายแฟนตาซีชื่อดังที่มีคนอ่านนับล้าน",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "cartoon": {
    "word": "cartoon",
    "meaning": "เด็กๆ ชอบดูตัวละครการ์ตูนแอนิเมชันอย่างทอมแอนด์เจอร์รี่",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "jazz": {
    "word": "jazz",
    "meaning": "แซกโซโฟนและทรัมเป็ตเป็นเครื่องดนตรียอดนิยมในดนตรีแจ๊ส",
    "pos": "",
    "note": "คำศัพท์ระดับ M1"
  },
  "consider": {
    "word": "consider",
    "meaning": "กรุณาพิจารณาตัวเลือกทั้งหมดก่อนตัดสินใจ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "affect": {
    "word": "affect",
    "meaning": "ความคิดเห็นของคุณจะไม่ส่งผลกระทบต่อการตัดสินใจของฉัน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "jump": {
    "word": "jump",
    "meaning": "เขาชอบกระโดดข้ามรั้วทุกเช้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "disagree": {
    "word": "disagree",
    "meaning": "พวกเขาไม่เห็นด้วยกันเกี่ยวกับวิธีที่ดีที่สุดในการแก้ปัญหา",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "enter": {
    "word": "enter",
    "meaning": "กรุณาเคาะประตูก่อนเข้ามาข้างใน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "train": {
    "word": "train",
    "meaning": "เราต้องฝึกซ้อมอย่างหนักหากต้องการชนะการแข่งขัน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "develop": {
    "word": "develop",
    "meaning": "เด็กบางคนมีพัฒนาการช้ากว่าคนอื่น",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "greet": {
    "word": "greet",
    "meaning": "เขาจะกล่าวทักทายแขกอย่างอบอุ่นในงานปาร์ตี้",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "contain": {
    "word": "contain",
    "meaning": "เครื่องดื่มนี้ไม่มีส่วนผสมของแอลกอฮอล์",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "review": {
    "word": "review",
    "meaning": "กรุณาให้คะแนนและเขียนรีวิวสินค้าที่ซื้อบนเว็บไซต์",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "worry": {
    "word": "worry",
    "meaning": "ไม่ต้องกังวล เรายังมีเวลาอีกเยอะ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "employ": {
    "word": "employ",
    "meaning": "พวกเราว่าจ้างพนักงานประจำ 16 คน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "expect": {
    "word": "expect",
    "meaning": "พวกเราคาดว่าเขาจะมาถึงภายในตอนเที่ยง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "disappear": {
    "word": "disappear",
    "meaning": "นักมายากลเสกให้กระต่ายหายตัวไปจากหมวก",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "smoke": {
    "word": "smoke",
    "meaning": "อย่าสูบบุหรี่ มันเป็นอันตรายต่อสุขภาพของคุณ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "accept": {
    "word": "accept",
    "meaning": "ฉันจะตอบรับคำเชิญไปงานปาร์ตี้ของคุณ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "earn": {
    "word": "earn",
    "meaning": "ฉันจะได้รับดาวทองถ้าทำการบ้านเสร็จทั้งหมด",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "attend": {
    "word": "attend",
    "meaning": "คุณจะมาร่วมงานวันเกิดของฉันวันเสาร์หน้าไหม?",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "invite": {
    "word": "invite",
    "meaning": "ฉันอยากเชิญเพื่อนสนิทมางานปาร์ตี้ชุดนอนที่บ้าน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "suggest": {
    "word": "suggest",
    "meaning": "ฉันขอเสนอแนะให้พวกเราออกไปทานข้าวข้างนอกคืนนี้",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "have": {
    "word": "have",
    "meaning": "พวกเราต้องรับประทานอาหารเช้าก่อนไปโรงเรียน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "increase": {
    "word": "increase",
    "meaning": "เพิ่มขึ้น / การเพิ่มขึ้น",
    "pos": "v./n.",
    "note": "O-NET 2568"
  },
  "support": {
    "word": "support",
    "meaning": "ถ้าคุณหยิบยกเรื่องนี้ขึ้นในที่ประชุม ฉันจะสนับสนุนคุณ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "lead": {
    "word": "lead",
    "meaning": "ถ้าคุณนำทาง ฉันจะเดินตาม",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "arrange": {
    "word": "arrange",
    "meaning": "ฉันขอจัดตารางนัดหมายสำหรับวันจันทร์ได้ไหม?",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "destroy": {
    "word": "destroy",
    "meaning": "พายุอาจพัดทำลายปราสาททรายที่เราสร้างไว้",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "stress": {
    "word": "stress",
    "meaning": "คุณต้องเน้นเสียงที่พยางค์แรกของคำว่า happiness",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "pronounce": {
    "word": "pronounce",
    "meaning": "มีคนน้อยมากที่สามารถออกเสียงชื่อของฉันได้ถูกต้อง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "lift": {
    "word": "lift",
    "meaning": "คุณพ่อช่วยฉันยกกล่องหนักๆ ขึ้นรถ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "worst": {
    "word": "worst",
    "meaning": "นั่นเป็นมื้ออาหารที่แย่ที่สุดเท่าที่ฉันเคยชิมมา",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "closed": {
    "word": "closed",
    "meaning": "ร้านค้าปิดแล้วตอนที่ฉันไปถึงเวลา 2 ทุ่ม",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "missing": {
    "word": "missing",
    "meaning": "ฉันหากุญแจไม่เจอ มันหายไปจากกระเป๋าของฉัน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "regular": {
    "word": "regular",
    "meaning": "เขาเป็นผู้เข้าร่วมประชุมประจำทุกสัปดาห์อย่างสม่ำเสมอ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "careful": {
    "word": "careful",
    "meaning": "จงระมัดระวังเวลาถือแจกันที่แตกหักง่าย",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "broken": {
    "word": "broken",
    "meaning": "ขาเก้าอี้ที่หักต้องได้รับการซ่อมแซม",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "clear": {
    "word": "clear",
    "meaning": "ท้องฟ้าปลอดโปร่งแจ่มใสหลังจากพายุพัดผ่านไป",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "creative": {
    "word": "creative",
    "meaning": "เธอมีความคิดสร้างสรรค์มากและมักมีไอเดียแปลกใหม่เสมอ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "impossible": {
    "word": "impossible",
    "meaning": "มันดูเหมือนจะเป็นไปไม่ได้เลยที่จะปีนเขาสูงชันลูกนั้น แต่พวกเขาก็ทำสำเร็จ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "low": {
    "word": "low",
    "meaning": "เขามีรายได้ต่ำ/น้อย",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "original": {
    "word": "original",
    "meaning": "ภาพวาดต้นฉบับของจริงถูกจัดแสดงอยู่ในพิพิธภัณฑ์",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "soft": {
    "word": "soft",
    "meaning": "หมอนใบนี้มีความนุ่มและหนุนสบายมาก",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "noisy": {
    "word": "noisy",
    "meaning": "ห้องเรียนเสียงดังเจี๊ยวจ๊าวมากในช่วงพักเบรก",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "weak": {
    "word": "weak",
    "meaning": "หลังจากอาการป่วย เขารู้สึกอ่อนเพลียและไม่มีแรง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "fair": {
    "word": "fair",
    "meaning": "สิ่งสำคัญคือต้องมีความยุติธรรมในการตัดสินการแข่งขัน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "curly": {
    "word": "curly",
    "meaning": "ผมหยิก / ผมหยักศก",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "divorced": {
    "word": "divorced",
    "meaning": "หย่าร้าง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "wild": {
    "word": "wild",
    "meaning": "สัตว์ป่า / ตามธรรมชาติ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "attractive": {
    "word": "attractive",
    "meaning": "มีเสน่ห์ / ดึงดูดใจ / หน้าตาดี",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "brilliant": {
    "word": "brilliant",
    "meaning": "ฉลาดหลักแหลมมาก / ยอดเยี่ยม",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "following": {
    "word": "following",
    "meaning": "ถัดไป / ดังต่อไปนี้",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "alone": {
    "word": "alone",
    "meaning": "ตามลำพังคนเดียว",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "double": {
    "word": "double",
    "meaning": "เป็นสองเท่า / คู่",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "likely": {
    "word": "likely",
    "meaning": "มีแนวโน้มที่จะ / เป็นไปได้",
    "pos": "adj./adv.",
    "note": "O-NET 2568"
  },
  "further": {
    "word": "further",
    "meaning": "ไกลออกไป / เพิ่มเติมมากกว่าเดิม",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "detective": {
    "word": "detective",
    "meaning": "นักสืบ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "cook": {
    "word": "cook",
    "meaning": "คนทำอาหาร / พ่อครัวแม่ครัว",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "engineer": {
    "word": "engineer",
    "meaning": "วิศวกร",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "journalist": {
    "word": "journalist",
    "meaning": "นักข่าว / สื่อมวลชน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "fishing": {
    "word": "fishing",
    "meaning": "การประมง / การจับปลา",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "manager": {
    "word": "manager",
    "meaning": "ผู้จัดการ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "officer": {
    "word": "officer",
    "meaning": "เจ้าหน้าที่ / นายทหาร / นายตำรวจ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "soldier": {
    "word": "soldier",
    "meaning": "ทหาร",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "farmer": {
    "word": "farmer",
    "meaning": "ชาวนา / เกษตรกร",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "plumber": {
    "word": "plumber",
    "meaning": "ช่างประปา",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "nurse": {
    "word": "nurse",
    "meaning": "ฉันดูแลคนป่วยและเป็นผู้ช่วยคุณหมอ ฉันคือพยาบาล",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "teacher": {
    "word": "teacher",
    "meaning": "ฉันทำงานในโรงเรียนและสอนหนังสือเด็กๆ ฉันคือคุณครู",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "pilot": {
    "word": "pilot",
    "meaning": "ฉันบินไปหลายประเทศและขับเครื่องบิน ฉันคือนักบิน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "firefighter": {
    "word": "firefighter",
    "meaning": "ฉันดับเพลิงและช่วยชีวิตผู้คน ฉันคือนักดับเพลิง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "air hostess": {
    "word": "air hostess",
    "meaning": "ฉันดูแลผู้โดยสารบนเครื่องบินแต่ไม่ได้ขับเครื่องบิน ฉันคือแอร์โฮสเตส",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "baker": {
    "word": "baker",
    "meaning": "ฉันอบขนมปัง เค้ก และคุกกี้ ฉันคือคนทำขนมปัง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "taxi driver": {
    "word": "taxi driver",
    "meaning": "ฉันขับรถส่งผู้โดยสารไปยังที่ที่ต้องการ ฉันคือคนขับแท็กซี่",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "police officer": {
    "word": "police officer",
    "meaning": "ฉันสวมเครื่องแบบและจับกุมคนร้าย ฉันคือเจ้าหน้าที่ตำรวจ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "astronaut": {
    "word": "astronaut",
    "meaning": "ฉันเดินทางด้วยจรวดออกไปสู่อวกาศ ฉันคือนักบินอวกาศ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "doctor": {
    "word": "doctor",
    "meaning": "ฉันตรวจรักษาคนไข้ที่โรงพยาบาล ฉันคือแพทย์/คุณหมอ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "waiter": {
    "word": "waiter",
    "meaning": "ฉันรับออเดอร์และเสิร์ฟอาหารที่โต๊ะในร้านอาหาร ฉันคือพนักงานเสิร์ฟ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "judge": {
    "word": "judge",
    "meaning": "ฉันตัดสินคดีความในศาลตามกฎหมาย ฉันคือผู้พิพากษา",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "hockey": {
    "word": "hockey",
    "meaning": "กีฬาฮอกกี้",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "skiing": {
    "word": "skiing",
    "meaning": "กีฬาเล่นสกีบนหิมะ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "soccer": {
    "word": "soccer",
    "meaning": "กีฬาฟุตบอล",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "trainer": {
    "word": "trainer",
    "meaning": "รองเท้าผ้าใบกีฬา / เทรนเนอร์ผู้ฝึกสอน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "throw": {
    "word": "throw",
    "meaning": "ขว้าง / ปา / โยนลูกบอล",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "touch": {
    "word": "touch",
    "meaning": "แตะ / สัมผัส",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "sailing": {
    "word": "sailing",
    "meaning": "กีฬาแล่นเรือใบ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "start": {
    "word": "start",
    "meaning": "จุดเริ่มต้น / การออกสตาร์ต",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "successful": {
    "word": "successful",
    "meaning": "ประสบความสำเร็จ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "score": {
    "word": "score",
    "meaning": "คะแนน / แต้มการแข่งขัน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "surprise": {
    "word": "surprise",
    "meaning": "ความประหลาดใจ / เรื่องเซอร์ไพรส์",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "middle": {
    "word": "middle",
    "meaning": "ตรงกลาง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "button": {
    "word": "button",
    "meaning": "ปุ่มกด / กระดุม",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "use": {
    "word": "use",
    "meaning": "การใช้งาน / ประโยชน์",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "chat": {
    "word": "chat",
    "meaning": "การคุยแชต / การสนทนาอย่างเป็นกันเอง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "technology": {
    "word": "technology",
    "meaning": "เทคโนโลยี",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "media": {
    "word": "media",
    "meaning": "สื่อมวลชน / ช่องทางสื่อสาร",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "engine": {
    "word": "engine",
    "meaning": "เครื่องยนต์ / เครื่องจักร",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "memory": {
    "word": "memory",
    "meaning": "หน่วยความจำ / ความทรงจำ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "tool": {
    "word": "tool",
    "meaning": "เครื่องมือ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "electricity": {
    "word": "electricity",
    "meaning": "พลังงานไฟฟ้า / กระแสไฟฟ้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "process": {
    "word": "process",
    "meaning": "กระบวนการ / ขั้นตอนการทำงาน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "electric": {
    "word": "electric",
    "meaning": "ที่ใช้ไฟฟ้าทำงานโดยตรง (เช่น รถยนต์ไฟฟ้า)",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "electrical": {
    "word": "electrical",
    "meaning": "ที่เกี่ยวข้องกับระบบไฟฟ้า (เช่น วิศวกรรมไฟฟ้า/อุปกรณ์ไฟฟ้า)",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "electronic": {
    "word": "electronic",
    "meaning": "เกี่ยวกับระบบอิเล็กทรอนิกส์",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "discovery": {
    "word": "discovery",
    "meaning": "การค้นพบสิ่งใหม่",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "source": {
    "word": "source",
    "meaning": "แหล่งที่มาของข้อมูล",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "expert": {
    "word": "expert",
    "meaning": "ผู้เชี่ยวชาญ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "lecture": {
    "word": "lecture",
    "meaning": "การบรรยายให้ความรู้ในชั้นเรียน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "tradition": {
    "word": "tradition",
    "meaning": "ประเพณี / ธรรมเนียมปฏิบัติ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "stamp": {
    "word": "stamp",
    "meaning": "ดวงตราไปรษณียากร (แสตมป์)",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "schedule": {
    "word": "schedule",
    "meaning": "ตารางเรียน / ตารางเวลา",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "degree": {
    "word": "degree",
    "meaning": "องศา (อุณหภูมิ/มุม) หรือปริญญาบัตร",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "instructor": {
    "word": "instructor",
    "meaning": "ครูฝึกสอน / ผู้สอน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "dress": {
    "word": "dress",
    "meaning": "ชุดเดรส / ชุดกระโปรงติดกัน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "clothing": {
    "word": "clothing",
    "meaning": "เสื้อผ้าเครื่องนุ่งห่ม",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "tie": {
    "word": "tie",
    "meaning": "เนกไท",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "size": {
    "word": "size",
    "meaning": "ขนาดไซซ์เสื้อผ้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "pants": {
    "word": "pants",
    "meaning": "กางเกงขายาว",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "socks": {
    "word": "socks",
    "meaning": "ถุงเท้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "jewelry": {
    "word": "jewelry",
    "meaning": "เครื่องประดับอัญมณี",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "belt": {
    "word": "belt",
    "meaning": "เข็มขัด",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "suit": {
    "word": "suit",
    "meaning": "ชุดสูทสากล",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "shoes": {
    "word": "shoes",
    "meaning": "รองเท้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "towel": {
    "word": "towel",
    "meaning": "ผ้าเช็ดตัว",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "continent": {
    "word": "continent",
    "meaning": "ทวีป",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "grass": {
    "word": "grass",
    "meaning": "ต้นหญ้า / สนามหญ้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "desert": {
    "word": "desert",
    "meaning": "ทะเลทราย",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "lake": {
    "word": "lake",
    "meaning": "ทะเลสาบ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "ocean": {
    "word": "ocean",
    "meaning": "มหาสมุทร",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "rubbish": {
    "word": "rubbish",
    "meaning": "ขยะมูลฝอย",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "forest": {
    "word": "forest",
    "meaning": "ผืนป่า / ป่าไม้",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "earth": {
    "word": "earth",
    "meaning": "โลก / พื้นดิน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "stone": {
    "word": "stone",
    "meaning": "ก้อนหิน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "insect": {
    "word": "insect",
    "meaning": "แมลง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "hill": {
    "word": "hill",
    "meaning": "เนินเขา",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "storm": {
    "word": "storm",
    "meaning": "พายุฝนฟ้าคะนอง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "wind": {
    "word": "wind",
    "meaning": "กระแสลม",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "moon": {
    "word": "moon",
    "meaning": "ดวงจันทร์",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "climate": {
    "word": "climate",
    "meaning": "ภูมิอากาศ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "temperature": {
    "word": "temperature",
    "meaning": "อุณหภูมิ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "sky": {
    "word": "sky",
    "meaning": "ท้องฟ้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "cloud": {
    "word": "cloud",
    "meaning": "ก้อนเมฆ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "planet": {
    "word": "planet",
    "meaning": "ดาวเคราะห์",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "airline": {
    "word": "airline",
    "meaning": "สายการบิน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "land": {
    "word": "land",
    "meaning": "ลงจอด (เครื่องบิน)",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "transport": {
    "word": "transport",
    "meaning": "การขนส่ง / ระบบคมนาคม",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "ship": {
    "word": "ship",
    "meaning": "เรือเดินสมุทรขนาดใหญ่",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "vehicle": {
    "word": "vehicle",
    "meaning": "ยานพาหนะ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "van": {
    "word": "van",
    "meaning": "รถตู้",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "sail": {
    "word": "sail",
    "meaning": "แล่นเรือใบ / เดินเรือ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "motorcycle": {
    "word": "motorcycle",
    "meaning": "รถจักรยานยนต์ (มอเตอร์ไซค์)",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "speed": {
    "word": "speed",
    "meaning": "ความเร็ว",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "flying": {
    "word": "flying",
    "meaning": "การเดินทางด้วยเครื่องบิน (การบิน)",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "palace": {
    "word": "palace",
    "meaning": "พระราชวัง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "tower": {
    "word": "tower",
    "meaning": "หอคอยสูง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "parking": {
    "word": "parking",
    "meaning": "ลานจอดรถ / ที่จอดรถ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "railway": {
    "word": "railway",
    "meaning": "ทางรถไฟ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "gate": {
    "word": "gate",
    "meaning": "ประตูรั้ว / ทางเข้าออกขนาดใหญ่",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "hall": {
    "word": "hall",
    "meaning": "หอประชุม / โถงขนาดใหญ่",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "corner": {
    "word": "corner",
    "meaning": "หัวมุมถนน / มุมห้อง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "gallery": {
    "word": "gallery",
    "meaning": "หอศิลป์ / แกลเลอรีแสดงภาพ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "underground": {
    "word": "underground",
    "meaning": "รถไฟใต้ดิน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "castle": {
    "word": "castle",
    "meaning": "ปราสาทหินโบราณ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "church": {
    "word": "church",
    "meaning": "โบสถ์คริสต์",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "bar": {
    "word": "bar",
    "meaning": "บาร์เครื่องดื่ม / เคาน์เตอร์เครื่องดื่ม",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "sofa": {
    "word": "sofa",
    "meaning": "โซฟายาวในห้องนั่งเล่น",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "sink": {
    "word": "sink",
    "meaning": "อ่างล้างจานในห้องครัว",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "bed": {
    "word": "bed",
    "meaning": "เตียงนอน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "oven": {
    "word": "oven",
    "meaning": "เตาอบขนม",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "desk": {
    "word": "desk",
    "meaning": "โต๊ะทำงาน / โต๊ะเขียนหนังสือ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "table": {
    "word": "table",
    "meaning": "โต๊ะรับประทานอาหาร",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "chair": {
    "word": "chair",
    "meaning": "เก้าอี้",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "cabinet": {
    "word": "cabinet",
    "meaning": "ตู้เก็บของติดผนัง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "armchair": {
    "word": "armchair",
    "meaning": "เก้าอี้โซฟาเดี่ยวมีที่วางแขน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "television": {
    "word": "television",
    "meaning": "เครื่องรับโทรทัศน์ (ทีวี)",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "wardrobe": {
    "word": "wardrobe",
    "meaning": "ตู้เสื้อผ้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "bathtub": {
    "word": "bathtub",
    "meaning": "อ่างอาบน้ำ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "bookcase": {
    "word": "bookcase",
    "meaning": "ชั้นวางหนังสือ / ตู้หนังสือ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "furniture": {
    "word": "furniture",
    "meaning": "เฟอร์นิเจอร์ / เครื่องเรือน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "soap": {
    "word": "soap",
    "meaning": "สบู่",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "wash": {
    "word": "wash",
    "meaning": "ซักล้าง / ทำความสะอาดด้วยน้ำ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "spoon": {
    "word": "spoon",
    "meaning": "ช้อน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "tidy": {
    "word": "tidy",
    "meaning": "จัดเก็บให้เป็นระเบียบเรียบร้อย",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "lock": {
    "word": "lock",
    "meaning": "ล็อกกุญแจ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "pocket": {
    "word": "pocket",
    "meaning": "กระเป๋าเสื้อ / กระเป๋ากางเกง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "plate": {
    "word": "plate",
    "meaning": "จานใส่อาหาร",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "mail": {
    "word": "mail",
    "meaning": "ส่งจดหมาย/ไปรษณีย์",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "material": {
    "word": "material",
    "meaning": "วัสดุ / วัตถุดิบ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "oil": {
    "word": "oil",
    "meaning": "น้ำมัน (น้ำมันดิบ / น้ำมันพืช)",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "silver": {
    "word": "silver",
    "meaning": "แร่เงิน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "gold": {
    "word": "gold",
    "meaning": "ทองคำ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "petrol": {
    "word": "petrol",
    "meaning": "น้ำมันเบนซิน (เติมรถยนต์)",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "metal": {
    "word": "metal",
    "meaning": "โลหะ / เหล็ก",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "plastic": {
    "word": "plastic",
    "meaning": "พลาสติก",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "kitchen": {
    "word": "kitchen",
    "meaning": "ห้องครัว",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "garage": {
    "word": "garage",
    "meaning": "โรงจอดรถ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "living room": {
    "word": "living room",
    "meaning": "ห้องนั่งเล่น / ห้องรับแขก",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "laundry area": {
    "word": "laundry area",
    "meaning": "พื้นที่ซักรีดเสื้อผ้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "dining room": {
    "word": "dining room",
    "meaning": "ห้องรับประทานอาหาร",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "bedroom": {
    "word": "bedroom",
    "meaning": "ห้องนอน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "attic": {
    "word": "attic",
    "meaning": "ห้องใต้หลังคา",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "garden": {
    "word": "garden",
    "meaning": "สวนรอบบ้าน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "bathroom": {
    "word": "bathroom",
    "meaning": "ห้องน้ำ / ห้องอาบน้ำ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "stairs": {
    "word": "stairs",
    "meaning": "บันไดขึ้นชั้นบน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "cliff": {
    "word": "cliff",
    "meaning": "หน้าผาสูงชัน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "dam": {
    "word": "dam",
    "meaning": "เขื่อนกั้นน้ำ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "field": {
    "word": "field",
    "meaning": "ทุ่งหญ้า / ท้องนา",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "beach": {
    "word": "beach",
    "meaning": "ชายหาด",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "monkey": {
    "word": "monkey",
    "meaning": "ลิง",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "bear": {
    "word": "bear",
    "meaning": "หมี",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "spider": {
    "word": "spider",
    "meaning": "แมงมุม",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "jungle": {
    "word": "jungle",
    "meaning": "ป่าทึบเขตร้อน / ป่าดงดิบ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "valley": {
    "word": "valley",
    "meaning": "หุบเขา",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "coast": {
    "word": "coast",
    "meaning": "ชายฝั่งทะเล",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "bay": {
    "word": "bay",
    "meaning": "อ่าว",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "lighthouse": {
    "word": "lighthouse",
    "meaning": "ประภาคาร",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "island": {
    "word": "island",
    "meaning": "เกาะ",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "soil": {
    "word": "soil",
    "meaning": "ดินเพาะปลูก",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "bridge": {
    "word": "bridge",
    "meaning": "สะพาน",
    "pos": "",
    "note": "คำศัพท์ระดับ M2"
  },
  "act": {
    "word": "act",
    "meaning": "นักแสดงจะแสดงฉากหนึ่งจากในเนื้อเรื่อง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "blow": {
    "word": "blow",
    "meaning": "สายลมจะพัดใบไม้ร่วงหล่นจากต้นไม้ในฤดูใบไม้ร่วง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "catch": {
    "word": "catch",
    "meaning": "ซาร่าห์สามารถรับลูกบอลด้วยถุงมือระหว่างซ้อมเบสบอล",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "appear": {
    "word": "appear",
    "meaning": "ดวงดาวดวงแรกจะปรากฏขึ้นบนท้องฟ้าเมื่อดวงอาทิตย์ลับขอบฟ้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "communicate": {
    "word": "communicate",
    "meaning": "เราสามารถติดต่อสื่อสารกับเพื่อนๆ ได้ด้วยการส่งข้อความโซเชียลมีเดีย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "focus": {
    "word": "focus",
    "meaning": "พวกเรามามุ่งความสนใจไปที่การทำการบ้านให้เสร็จก่อนมื้อเย็นกันเถอะ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "continue": {
    "word": "continue",
    "meaning": "พวกเราจะอ่านหนังสือเล่มนี้ต่อในวันพรุ่งนี้ช่วงเวลาอ่านหนังสือ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "connect": {
    "word": "connect",
    "meaning": "เราสามารถลากเส้นเชื่อมจุดเพื่อเปิดเผยภาพที่ซ่อนอยู่",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "cover": {
    "word": "cover",
    "meaning": "ใช้ผ้าห่มคลุมตัวของคุณเวลานอนหลับ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "involve": {
    "word": "involve",
    "meaning": "ทุกคนสามารถมีส่วนร่วมในเกมได้ด้วยการผลัดกันเล่น",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "mention": {
    "word": "mention",
    "meaning": "กรุณาเอ่ยถึง/ระบุชื่อเพื่อนเมื่อคุณพูดถึงพวกเขา",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "remove": {
    "word": "remove",
    "meaning": "คุณแม่ช่วยฉันถอดรองเท้าก่อนเดินเข้าบ้าน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "predict": {
    "word": "predict",
    "meaning": "ฉันคาดการณ์ว่าพรุ่งนี้หิมะจะตกเพราะวันนี้อากาศหนาวมาก",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "matters": {
    "word": "matters",
    "meaning": "พยานหลักฐานมีความสำคัญอย่างมากในคดีนี้",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "major": {
    "word": "major",
    "meaning": "พายุสร้างความเสียหายครั้งใหญ่ให้กับต้นโอ๊กเก่าแก่ในสวน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "incredible": {
    "word": "incredible",
    "meaning": "เหลือเชื่อ / ยอดเยี่ยมมาก",
    "pos": "adj.",
    "note": "O-NET 2568"
  },
  "classical": {
    "word": "classical",
    "meaning": "พวกเราฟังดนตรีคลาสสิกระหว่างงานเลี้ยงอาหารค่ำ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "certain": {
    "word": "certain",
    "meaning": "ฉันมีความรู้สึกมั่นใจอย่างยิ่งว่าพวกเราจะชนะเกมในวันพรุ่งนี้",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "extreme": {
    "word": "extreme",
    "meaning": "มันเป็นความท้าทายขั้นสุดยอดในการปีนขึ้นไปถึงยอดเขา",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "secret": {
    "word": "secret",
    "meaning": "ซาร่าห์กระซิบความลับกับเพื่อนสนิทของเธอในช่วงพักเบรก",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "connected": {
    "word": "connected",
    "meaning": "แม่น้ำทั้งสองสายถูกเชื่อมต่อถึงกันด้วยคลองสายเล็กๆ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "comfortable": {
    "word": "comfortable",
    "meaning": "โซฟาตัวใหม่นุ่มสบายมากจนฉันเผลอหลับไปบนนั้น",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "excellent": {
    "word": "excellent",
    "meaning": "บิลลี่ได้รับเกรดที่ยอดเยี่ยมมากในโครงงานวิทยาศาสตร์ของเขา",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "traditional": {
    "word": "traditional",
    "meaning": "พวกเราฉลองวันขอบคุณพระเจ้าตามวิถีดั้งเดิมด้วยมื้อค่ำครอบครัวชุดใหญ่",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "recent": {
    "word": "recent",
    "meaning": "มีการเปลี่ยนแปลงมากมายในช่วงไม่กี่ปีที่ผ่านมานี้",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "individual": {
    "word": "individual",
    "meaning": "นักเรียนแต่ละคนในชั้นเรียนมีโต๊ะและเก้าอี้ของตัวเอง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "foreign": {
    "word": "foreign",
    "meaning": "คุณยายนำขนมแสนอร่อยมาจากต่างประเทศ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "whole": {
    "word": "whole",
    "meaning": "ซาร่าห์กินแอปเปิ้ลทั้งลูกจนหมดเพราะเธอหิวมาก",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "simple": {
    "word": "simple",
    "meaning": "การหัดผูกเชือกรองเท้าเป็นงานง่ายๆ เมื่อคุณได้ลองฝึกฝน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "necessary": {
    "word": "necessary",
    "meaning": "เป็นสิ่งจำเป็นที่จะต้องแปรงฟันก่อนเข้านอน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "particular": {
    "word": "particular",
    "meaning": "ทอมมี่มีของเล่นชิ้นโปรดเฉพาะเจาะจงที่เขานำมาเล่นเสมอ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "later": {
    "word": "later",
    "meaning": "พวกเราค่อยออกไปเล่นข้างนอกทีหลัง เมื่อทำการบ้านเสร็จแล้ว",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "argument": {
    "word": "argument",
    "meaning": "การโต้เถียง / ข้อถกเถียง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "war": {
    "word": "war",
    "meaning": "สงคราม",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "government": {
    "word": "government",
    "meaning": "รัฐบาล",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "king": {
    "word": "king",
    "meaning": "พระมหากษัตริย์ (พระราชา)",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "queen": {
    "word": "queen",
    "meaning": "พระราชินี",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "president": {
    "word": "president",
    "meaning": "ประธานาธิบดี / ประธาน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "leader": {
    "word": "leader",
    "meaning": "ผู้นำ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "peace": {
    "word": "peace",
    "meaning": "สันติภาพ / ความสงบสุข",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "public": {
    "word": "public",
    "meaning": "สาธารณะ / ประชาชนทั่วไป",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "state": {
    "word": "state",
    "meaning": "รัฐ / ประเทศ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "speech": {
    "word": "speech",
    "meaning": "สุนทรพจน์ / การกล่าวปราศรัย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "power": {
    "word": "power",
    "meaning": "อำนาจ / พลัง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "abroad": {
    "word": "abroad",
    "meaning": "พวกเขาเดินทางไปต่างประเทศเพื่อเยี่ยมคุณปู่คุณย่าเมื่อฤดูร้อนที่แล้ว",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "along": {
    "word": "along",
    "meaning": "เขาเดินไปตามเส้นทางเพื่อตามหาของเล่นที่หายไป",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "little": {
    "word": "little",
    "meaning": "เธอพูดดังขึ้นอีกนิดหน่อยเพื่อให้ทุกคนได้ยินเธอ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "nowhere": {
    "word": "nowhere",
    "meaning": "เขาค้นหาทุกที่แล้วแต่ไม่พบของเล่นของเขาที่ไหนเลย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "past": {
    "word": "past",
    "meaning": "รถบัสแล่นผ่านหน้าห้องสมุดระหว่างทางไปโรงเรียน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "straight": {
    "word": "straight",
    "meaning": "เดินตรงไปข้างหน้าเรื่อยๆ จนกว่าจะเห็นต้นไม้ใหญ่",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "yet": {
    "word": "yet",
    "meaning": "พวกเรายังทำโครงงานไม่เสร็จเลย เรายังต้องการเวลาเพิ่ม",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "almost": {
    "word": "almost",
    "meaning": "เธอทำการบ้านเกือบจะเสร็จแล้วตอนที่กริ่งดังขึ้น",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "as": {
    "word": "as",
    "meaning": "เธอวิ่งเร็วที่สุดเท่าที่จะทำได้เพื่อตามเพื่อนๆ ให้ทัน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "best": {
    "word": "best",
    "meaning": "เขาทำงานได้ดีที่สุดในตอนเช้าเมื่อสมองปลอดโปร่ง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "better": {
    "word": "better",
    "meaning": "เสียงเดินทางในน้ำได้ดีกว่าในอากาศ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "in between": {
    "word": "in between",
    "meaning": "สวนสาธารณะตั้งอยู่ตรงกลางระหว่างห้องสมุดกับสระว่ายน้ำ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "anybody": {
    "word": "anybody",
    "meaning": "มีใครมีสายชาร์จโทรศัพท์ไหม? — มีครับ ฉันมี",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "anywhere": {
    "word": "anywhere",
    "meaning": "คุณได้เดินทางไปที่ไหนที่น่าสนใจบ้างไหมในช่วงปิดเทอมฤดูร้อน?",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "everything": {
    "word": "everything",
    "meaning": "เธอใส่ทุกสิ่งทุกอย่างที่เธอมีลงในกล่อง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "something": {
    "word": "something",
    "meaning": "คุณรับอะไรดื่มสักหน่อยไหม เช่น น้ำเปล่าหรือน้ำส้ม?",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "somebody": {
    "word": "somebody",
    "meaning": "ฉันหวังว่าจะมีใครสักคนมาช่วยเก็บกวาดความรกนี้ที!",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "knee": {
    "word": "knee",
    "meaning": "หัวเข่า",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "stomach": {
    "word": "stomach",
    "meaning": "กระเพาะอาหาร / ท้อง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "shoulder": {
    "word": "shoulder",
    "meaning": "หัวไหล่",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "disease": {
    "word": "disease",
    "meaning": "โรคภัยไข้เจ็บ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "patient": {
    "word": "patient",
    "meaning": "คนไข้ / ผู้ป่วย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "medicine": {
    "word": "medicine",
    "meaning": "ยารักษาโรค",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "pain": {
    "word": "pain",
    "meaning": "ความเจ็บปวด",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "heart": {
    "word": "heart",
    "meaning": "หัวใจ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "headache": {
    "word": "headache",
    "meaning": "อาการปวดศีรษะ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "flu": {
    "word": "flu",
    "meaning": "ไข้หวัดใหญ่",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "injury": {
    "word": "injury",
    "meaning": "อาการบาดเจ็บ / บาดแผล",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "virus": {
    "word": "virus",
    "meaning": "เชื้อไวรัส",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "tablet": {
    "word": "tablet",
    "meaning": "ยาเม็ด",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "ill": {
    "word": "ill",
    "meaning": "ป่วย / ไม่สบาย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "site": {
    "word": "site",
    "meaning": "สถานที่ตั้ง / พื้นที่ปฏิบัติงาน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "offer": {
    "word": "offer",
    "meaning": "ข้อเสนอ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "sign": {
    "word": "sign",
    "meaning": "ลงนาม / เซ็นชื่อ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "choice": {
    "word": "choice",
    "meaning": "ทางเลือก / ตัวเลือก",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "condition": {
    "word": "condition",
    "meaning": "สภาพ / เงื่อนไขข้อตกลง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "strategy": {
    "word": "strategy",
    "meaning": "กลยุทธ์ / แผนการ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "target": {
    "word": "target",
    "meaning": "เป้าหมาย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "crime": {
    "word": "crime",
    "meaning": "อาชญากรรม / ความผิดทางกฎหมาย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "request": {
    "word": "request",
    "meaning": "คำร้องขอ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "evidence": {
    "word": "evidence",
    "meaning": "พยานหลักฐาน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "gun": {
    "word": "gun",
    "meaning": "อาวุธปืน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "hit": {
    "word": "hit",
    "meaning": "การตี / การชน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "law": {
    "word": "law",
    "meaning": "กฎหมาย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "kill": {
    "word": "kill",
    "meaning": "ทำให้เสียชีวิต / ฆ่า",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "criminal": {
    "word": "criminal",
    "meaning": "อาชญากร / ผู้กระทำผิดกฎหมาย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "thief": {
    "word": "thief",
    "meaning": "ขโมย / โจรลักทรัพย์",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "prison": {
    "word": "prison",
    "meaning": "เรือนจำ / คุก",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "trouble": {
    "word": "trouble",
    "meaning": "ความเดือดร้อน / ปัญหา",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "steal": {
    "word": "steal",
    "meaning": "ลักขโมย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "discussion": {
    "word": "discussion",
    "meaning": "การพูดคุยอภิปรายแลกเปลี่ยนความคิดเห็น",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "method": {
    "word": "method",
    "meaning": "วิธีการ / ขั้นตอนวิธี",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "professor": {
    "word": "professor",
    "meaning": "ศาสตราจารย์ในมหาวิทยาลัย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "researcher": {
    "word": "researcher",
    "meaning": "นักวิจัย / ผู้ค้นคว้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "survey": {
    "word": "survey",
    "meaning": "การสำรวจความคิดเห็น / แบบสำรวจ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "symbol": {
    "word": "symbol",
    "meaning": "สัญลักษณ์ / เครื่องหมาย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "solve": {
    "word": "solve",
    "meaning": "แก้ปัญหา / หาคำตอบของโจทย์",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "context": {
    "word": "context",
    "meaning": "บริบทแวดล้อมของคำหรือสถานการณ์",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "step": {
    "word": "step",
    "meaning": "ขั้นตอน / ก้าวเดิน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "cross": {
    "word": "cross",
    "meaning": "เครื่องหมายกากบาท",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "couple": {
    "word": "couple",
    "meaning": "คู่รักหนุ่มสาวคบหากันมา 5 ปีก่อนจะถึงงานแต่งงานของพวกเขา",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "marry": {
    "word": "marry",
    "meaning": "พวกเขาตัดสินใจแต่งงานกันในพิธีที่สวยงามเมื่อสุดสัปดาห์ที่แล้ว",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "lady": {
    "word": "lady",
    "meaning": "เธอเป็นสุภาพสตรีที่ใจดีมากและคอยช่วยเหลือเพื่อนบ้านเสมอ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "smile": {
    "word": "smile",
    "meaning": "เธอมักจะมีรอยยิ้มที่อบอุ่นบนใบหน้าให้กับทุกคนเสมอ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "toy": {
    "word": "toy",
    "meaning": "เขาไปห้างสรรพสินค้าและซื้อหุ่นยนต์ของเล่นชิ้นใหม่",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "kid": {
    "word": "kid",
    "meaning": "เขามอบของขวัญให้กับลูกตัวน้อยในวันเกิดครบรอบ 7 ขวบ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "passed": {
    "word": "passed",
    "meaning": "เขายังสอบใบขับขี่ไม่ผ่านเลย จึงยังขับรถคนเดียวไม่ได้",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "promise": {
    "word": "promise",
    "meaning": "เขาให้คำสัญญากับคุณพ่อคุณแม่ว่าจะตั้งใจเรียน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "sir": {
    "word": "sir",
    "meaning": "สวัสดีตอนเช้าครับคุณผู้ชาย มีอะไรให้ช่วยไหมครับ?",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "single": {
    "word": "single",
    "meaning": "รูปปั้นนี้ถูกแกะสลักขึ้นมาจากไม้เพียงท่อนเดียว",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "lawyer": {
    "word": "lawyer",
    "meaning": "ทนายความ / นักกฎหมาย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "photographer": {
    "word": "photographer",
    "meaning": "ช่างภาพ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "musician": {
    "word": "musician",
    "meaning": "นักดนตรี",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "maid": {
    "word": "maid",
    "meaning": "แม่บ้านทำความสะอาด",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "reporter": {
    "word": "reporter",
    "meaning": "ผู้สื่อข่าวภาคสนาม / นักข่าว",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "mechanic": {
    "word": "mechanic",
    "meaning": "ช่างซ่อมเครื่องยนต์ / ช่างซ่อมรถ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "secretary": {
    "word": "secretary",
    "meaning": "เลขานุการ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "scientist": {
    "word": "scientist",
    "meaning": "นักวิทยาศาสตร์",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "singer": {
    "word": "singer",
    "meaning": "นักร้อง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "tailor": {
    "word": "tailor",
    "meaning": "ช่างตัดเสื้อ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "surgeon": {
    "word": "surgeon",
    "meaning": "ศัลยแพทย์ (หมอผ่าตัด)",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "drive": {
    "word": "drive",
    "meaning": "การขับรถเดินทาง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "driving": {
    "word": "driving",
    "meaning": "ทักษะ/ลักษณะการขับขี่รถยนต์",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "dream": {
    "word": "dream",
    "meaning": "ความฝัน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "guest": {
    "word": "guest",
    "meaning": "แขกผู้มาเยือน / แขกที่เข้าพัก",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "guide": {
    "word": "guide",
    "meaning": "มัคคุเทศก์ (ไกด์นำเที่ยว)",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "reception": {
    "word": "reception",
    "meaning": "เคาน์เตอร์ต้อนรับของโรงแรม",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "adventure": {
    "word": "adventure",
    "meaning": "การผจญภัยอันน่าตื่นเต้น",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "passenger": {
    "word": "passenger",
    "meaning": "ผู้โดยสาร",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "tour": {
    "word": "tour",
    "meaning": "ทัวร์ท่องเที่ยวหลายสถานที่",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "tourism": {
    "word": "tourism",
    "meaning": "อุตสาหกรรมการท่องเที่ยว",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "traveler": {
    "word": "traveler",
    "meaning": "นักเดินทาง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "rest": {
    "word": "rest",
    "meaning": "การพักผ่อน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "cigarette": {
    "word": "cigarette",
    "meaning": "การสูบบุหรี่เป็นอันตรายอย่างยิ่งต่อปอดและสุขภาพ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "image": {
    "word": "image",
    "meaning": "เธอมองดูภาพสะท้อนของตัวเองในกระจกแล้วยิ้ม",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "roof": {
    "word": "roof",
    "meaning": "หลังคาของบ้านได้รับความเสียหายจากพายุลูกใหญ่",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "home": {
    "word": "home",
    "meaning": "เรามีบริการจัดส่งถึงบ้านฟรีสำหรับลูกค้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "downstairs": {
    "word": "downstairs",
    "meaning": "ห้องนอนอยู่ชั้นบน ส่วนห้องครัวและห้องนั่งเล่นอยู่ชั้นล่าง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "washing": {
    "word": "washing",
    "meaning": "ตะกร้าเต็มไปด้วยเสื้อผ้าเปื้อน วันนี้ฉันมีผ้าที่ต้องซัก",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "lamp": {
    "word": "lamp",
    "meaning": "เนื่องจากห้องมืด เขาจึงเปิดโคมไฟตั้งโต๊ะเพื่ออ่านหนังสือ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "equipment": {
    "word": "equipment",
    "meaning": "จงระมัดระวังเสมอเมื่อใช้งานอุปกรณ์ไฟฟ้าเก่าๆ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "army": {
    "word": "army",
    "meaning": "กองทัพบก / กองกำลังทหาร",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "crowd": {
    "word": "crowd",
    "meaning": "ฝูงชน / กลุ่มคนจำนวนมาก",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "god": {
    "word": "god",
    "meaning": "พระเจ้า / เทพเจ้า",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "society": {
    "word": "society",
    "meaning": "สังคม",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "international": {
    "word": "international",
    "meaning": "ระหว่างประเทศ / นานาชาติ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "national": {
    "word": "national",
    "meaning": "ระดับชาติ / ประจำชาติ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "social": {
    "word": "social",
    "meaning": "เกี่ยวกับการเข้าสังคม",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "matter": {
    "word": "matter",
    "meaning": "เรื่องราว / ประเด็นสำคัญ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "position": {
    "word": "position",
    "meaning": "ตำแหน่งหน้าที่ / สถานะ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "possibility": {
    "word": "possibility",
    "meaning": "ความเป็นไปได้",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "relationship": {
    "word": "relationship",
    "meaning": "ความสัมพันธ์",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "personality": {
    "word": "personality",
    "meaning": "บุคลิกภาพ / ลักษณะนิสัย",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "need": {
    "word": "need",
    "meaning": "ความจำเป็น / สิ่งที่ต้องการ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "inventions": {
    "word": "inventions",
    "meaning": "โฆมัส เอดิสัน มีชื่อเสียงจากสิ่งประดิษฐ์มากมายของเขา รวมถึงหลอดไฟ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "link": {
    "word": "link",
    "meaning": "เมื่อคุณคลิกที่ลิงก์บนหน้าเว็บ มันจะพาคุณไปยังอีกหน้าหนึ่ง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "lab": {
    "word": "lab",
    "meaning": "นักวิทยาศาสตร์ค้นพบสิ่งสำคัญในการวิจัยด้วยการทำทดลองในห้องแล็บ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "response": {
    "word": "response",
    "meaning": "เมื่อเราส่งอีเมลสำคัญ เรามักคาดหวังการตอบกลับที่รวดเร็ว",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "recycle": {
    "word": "recycle",
    "meaning": "สิ่งสำคัญคือการนำกระดาษและขวดพลาสติกกลับมารีไซเคิลเพื่อลดขยะ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "print": {
    "word": "print",
    "meaning": "คุณครูขอให้พวกเราพิมพ์งานลงกระดาษแล้วนำมาส่ง",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "publish": {
    "word": "publish",
    "meaning": "นักเขียนตีพิมพ์เผยแพร่หนังสือเพื่อให้ผู้อ่านทั่วโลกได้อ่าน",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "progress": {
    "word": "progress",
    "meaning": "การรีไซเคิลช่วยให้เราสร้างความก้าวหน้าในการอนุรักษ์สิ่งแวดล้อม",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "invented": {
    "word": "invented",
    "meaning": "ใครเป็นผู้ประดิษฐ์คิดค้นคอมพิวเตอร์เครื่องแรกในประวัติศาสตร์?",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "printer": {
    "word": "printer",
    "meaning": "เครื่องพิมพ์ (พรินเตอร์) ใช้สำหรับพิมพ์เอกสารดิจิทัลลงบนกระดาษ",
    "pos": "",
    "note": "คำศัพท์ระดับ M3"
  },
  "decide to + v.1": {
    "word": "decide to + V.1",
    "meaning": "ตัดสินใจที่จะ...",
    "pos": "v. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "catch a fever": {
    "word": "catch a fever",
    "meaning": "เป็นไข้ / ป่วยเป็นไข้",
    "pos": "idiom",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "because": {
    "word": "because",
    "meaning": "เพราะว่า (บอกสาเหตุ)",
    "pos": "conj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "weather forecast": {
    "word": "weather forecast",
    "meaning": "การพยากรณ์อากาศ",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "warn of": {
    "word": "warn of",
    "meaning": "เตือนภัยเกี่ยวกับ...",
    "pos": "v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "as planned": {
    "word": "as planned",
    "meaning": "ตามที่วางแผนไว้",
    "pos": "phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "however,": {
    "word": "However,",
    "meaning": "อย่างไรก็ตาม",
    "pos": "adv.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "cancel": {
    "word": "cancel",
    "meaning": "ยกเลิก",
    "pos": "v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "sudden": {
    "word": "sudden",
    "meaning": "กะทันหัน / ทันใด",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "electrical blackout": {
    "word": "electrical blackout",
    "meaning": "ไฟฟ้าดับ",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "because of": {
    "word": "because of",
    "meaning": "เนื่องจาก... / เพราะว่า... (ตามด้วยคำนามหรือ V-ing เท่านั้น!)",
    "pos": "Compound Preposition",
    "note": "💡 ต่างจาก because: because + S + V | because of + Noun"
  },
  "be allowed to + v.1": {
    "word": "be allowed to + V.1",
    "meaning": "ได้รับอนุญาตให้...",
    "pos": "passive phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "laboratory (lab)": {
    "word": "laboratory (lab)",
    "meaning": "ห้องปฏิบัติการทดลอง",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "proper": {
    "word": "proper",
    "meaning": "เหมาะสม / ถูกต้องตามระเบียบ",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "prefer + v-ing / noun": {
    "word": "prefer + V-ing / Noun",
    "meaning": "ชอบ...มากกว่า",
    "pos": "v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "twin brother": {
    "word": "twin brother",
    "meaning": "พี่ชายหรือน้องชายฝาแฝด",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "while": {
    "word": "while",
    "meaning": "ในขณะที่ (เปรียบเทียบความต่าง)",
    "pos": "conj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "illustrate": {
    "word": "illustrate",
    "meaning": "แสดงให้เห็น / อธิบายด้วยภาพ",
    "pos": "v.",
    "note": "O-NET 2568"
  },
  "ownership": {
    "word": "ownership",
    "meaning": "การเป็นเจ้าของ",
    "pos": "n.",
    "note": "O-NET 2568"
  },
  "significant increase": {
    "word": "significant increase",
    "meaning": "การเพิ่มขึ้นอย่างมาก / อย่างมีนัยสำคัญ",
    "pos": "n. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "deal with": {
    "word": "deal with",
    "meaning": "รับมือกับ / จัดการกับ",
    "pos": "phr.v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "loss": {
    "word": "loss",
    "meaning": "การสูญเสีย",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "mentor": {
    "word": "mentor",
    "meaning": "อาจารย์ที่ปรึกษา / ผู้ชี้แนะ",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "prepare": {
    "word": "prepare",
    "meaning": "เตรียมตัว / เตรียมความพร้อม",
    "pos": "v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "charity run": {
    "word": "charity run",
    "meaning": "การวิ่งเพื่อการกุศล",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "worried about": {
    "word": "worried about",
    "meaning": "รู้สึกเป็นกังวลเกี่ยวกับ... (+ Noun หรือ V-ing)",
    "pos": "Adjective + Preposition",
    "note": "💡 O-NET 2565 ข้อ 25: worried about me spending so much time"
  },
  "pay attention to": {
    "word": "pay attention to",
    "meaning": "ให้ความสนใจ / ตั้งใจฟัง / จดจ่อกับ... (ห้ามแปลว่า จ่ายความสนใจ!)",
    "pos": "Collocation / Phrase",
    "note": "💡 O-NET TRAP: ออกสอบคู่กับคำว่า pay เสมอ เช่น pay more attention to my studies (O-NET 2565 ข้อ 26)"
  },
  "concern": {
    "word": "concern",
    "meaning": "ความห่วงใย / ความกังวล",
    "pos": "n./v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "from now on": {
    "word": "from now on",
    "meaning": "นับจากนี้เป็นต้นไป",
    "pos": "phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "spacious": {
    "word": "spacious",
    "meaning": "กว้างขวาง / โปร่งสบาย",
    "pos": "adj.",
    "note": "O-NET 2566"
  },
  "well equipped": {
    "word": "well equipped",
    "meaning": "ที่ติดตั้งอุปกรณ์ไว้อย่างครบครัน",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "all-in-one": {
    "word": "all-in-one",
    "meaning": "ครบวงจรในหนึ่งเดียว / แบบรวมศูนย์ทุกฟังก์ชันในเครื่องเดียว",
    "pos": "Compound Adjective",
    "note": "💡 O-NET 2566 ข้อ 25: ขยาย models เช่น latest all-in-one models"
  },
  "look forward to + v-ing": {
    "word": "look forward to + V-ing",
    "meaning": "ตั้งตารอคอยที่จะ... (สำนวนออกสอบบ่อยมาก)",
    "pos": "phrase / idiom",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "as though": {
    "word": "as though",
    "meaning": "ราวกับว่า (= as if)",
    "pos": "conj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "live action": {
    "word": "live action",
    "meaning": "ภาพยนตร์ที่ใช้คนแสดงจริง (ไม่ใช่แอนิเมชัน)",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "gritty": {
    "word": "gritty",
    "meaning": "สมจริง / ดิบเถื่อน / เข้มข้น",
    "pos": "adj.",
    "note": "O-NET 2566"
  },
  "stunning": {
    "word": "stunning",
    "meaning": "น่าทึ่ง / สวยสะกดตา / ยอดเยี่ยม",
    "pos": "adj.",
    "note": "O-NET 2568"
  },
  "cameo": {
    "word": "cameo",
    "meaning": "นักแสดงรับเชิญบทสั้นๆ",
    "pos": "n.",
    "note": "O-NET 2566"
  },
  "tacked on": {
    "word": "tacked on",
    "meaning": "ถูกแปะเพิ่มเข้ามาทีหลัง",
    "pos": "phr.v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "withdrawn": {
    "word": "withdrawn",
    "meaning": "เก็บตัว / เงียบขรึม / สันโดษ",
    "pos": "adj.",
    "note": "O-NET 2567"
  },
  "rural": {
    "word": "rural",
    "meaning": "ในชนบท (ตรงข้ามกับ urban = ในเมือง)",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "pregnancy": {
    "word": "pregnancy",
    "meaning": "การตั้งครรภ์",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "stand out": {
    "word": "stand out",
    "meaning": "โดดเด่นสะดุดตา / เด่นกว่าสิ่งอื่นอย่างเห็นได้ชัด",
    "pos": "Phrasal Verb",
    "note": "💡 O-NET 2567 ข้อ 31: This movie surely stands out among this year's movies."
  },
  "nominate": {
    "word": "nominate",
    "meaning": "เสนอชื่อเข้าชิงรางวัล",
    "pos": "v.",
    "note": "O-NET 2567"
  },
  "thoroughly": {
    "word": "thoroughly",
    "meaning": "อย่างละเอียด / อย่างยิ่ง",
    "pos": "adv.",
    "note": "O-NET 2568"
  },
  "impressed": {
    "word": "impressed",
    "meaning": "รู้สึกประทับใจ",
    "pos": "adj.",
    "note": "O-NET 2568"
  },
  "fantastic": {
    "word": "fantastic",
    "meaning": "ยอดเยี่ยม / มหัศจรรย์",
    "pos": "adj.",
    "note": "O-NET 2568"
  },
  "frantic": {
    "word": "frantic",
    "meaning": "ดุเดือด / คลั่งไคล้ / วุ่นวายอย่างรวดเร็ว",
    "pos": "adj.",
    "note": "O-NET 2568"
  },
  "release": {
    "word": "release",
    "meaning": "ปล่อย / ออกฉาย / เผยแพร่",
    "pos": "v.",
    "note": "O-NET 2568"
  },
  "heavy → heavier → heaviest": {
    "word": "heavy → heavier → heaviest",
    "meaning": "หนัก → หนักกว่า → หนักที่สุด",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "carry": {
    "word": "carry",
    "meaning": "ถือ / แบก / ขน",
    "pos": "v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "densely populated": {
    "word": "densely populated",
    "meaning": "ที่มีประชากรอาศัยอยู่หนาแน่น",
    "pos": "adj. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "southeast asia": {
    "word": "Southeast Asia",
    "meaning": "ภูมิภาคเอเชียตะวันออกเฉียงใต้",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "accent": {
    "word": "accent",
    "meaning": "สำเนียงการพูด",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "much better": {
    "word": "much better",
    "meaning": "ดีขึ้นกว่าเดิมมาก",
    "pos": "comparative phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "early → earlier": {
    "word": "early → earlier",
    "meaning": "เร็ว / แต่เนิ่นๆ → เร็วกว่า",
    "pos": "adv./adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "prepare for": {
    "word": "prepare for",
    "meaning": "เตรียมตัวสำหรับ...",
    "pos": "v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "confident": {
    "word": "confident",
    "meaning": "มั่นใจ",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "without + n./v-ing": {
    "word": "without + N./V-ing",
    "meaning": "โดยปราศจาก / โดยไม่...",
    "pos": "prep.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "helmet": {
    "word": "helmet",
    "meaning": "หมวกกันน็อก / หมวกนิรภัย",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "public transport": {
    "word": "public transport",
    "meaning": "ระบบขนส่งสาธารณะ",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "in general": {
    "word": "in general",
    "meaning": "โดยทั่วไปแล้ว / โดยภาพรวมแล้ว (ใช้เปิดข้อความสรุป)",
    "pos": "Prepositional Phrase",
    "note": "💡 O-NET 2568 ข้อ 25: In general, the younger people were..."
  },
  "be likely to + v.1": {
    "word": "be likely to + V.1",
    "meaning": "มีแนวโน้มที่จะ... / น่าจะ...",
    "pos": "adj. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "own": {
    "word": "own",
    "meaning": "เป็นเจ้าของ",
    "pos": "v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "cinematography": {
    "word": "cinematography",
    "meaning": "การกำกับภาพ / งานภาพยนตร์",
    "pos": "n.",
    "note": "O-NET 2568"
  },
  "definitely": {
    "word": "definitely",
    "meaning": "อย่างแน่นอน",
    "pos": "adv.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "fantastic view": {
    "word": "fantastic view",
    "meaning": "ทัศนียภาพ/วิวที่สวยงามน่าทึ่ง",
    "pos": "n. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "furthermore": {
    "word": "furthermore",
    "meaning": "นอกจากนี้ / ยิ่งไปกว่านั้น (= moreover)",
    "pos": "adv.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "one of the most famous restaurants": {
    "word": "one of the most famous restaurants",
    "meaning": "หนึ่งในร้านอาหารที่มีชื่อเสียงที่สุดหลายแห่ง",
    "pos": "n. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "on duty": {
    "word": "on duty",
    "meaning": "ที่เข้าเวร / ปฏิบัติหน้าที่ประจำวัน",
    "pos": "prep. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "are cleaned": {
    "word": "are cleaned",
    "meaning": "ถูกทำความสะอาด",
    "pos": "passive v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "parcel": {
    "word": "parcel",
    "meaning": "พัสดุไปรษณีย์ / กล่องพัสดุ",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "send → sent → sent": {
    "word": "send → sent → sent",
    "meaning": "ส่ง",
    "pos": "v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "return": {
    "word": "return",
    "meaning": "นำมาคืน / ส่งคืน",
    "pos": "v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "semester": {
    "word": "semester",
    "meaning": "ภาคเรียน / เทอม",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "historical temple": {
    "word": "historical temple",
    "meaning": "วัดสำคัญทางประวัติศาสตร์ / วัดโบราณ",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "thousands of": {
    "word": "thousands of",
    "meaning": "หลายพัน...",
    "pos": "phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "community": {
    "word": "community",
    "meaning": "ชุมชน",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "officially": {
    "word": "officially",
    "meaning": "อย่างเป็นทางการ",
    "pos": "adv.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "governor": {
    "word": "governor",
    "meaning": "ผู้ว่าราชการจังหวัด",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "be nominated for": {
    "word": "be nominated for",
    "meaning": "ได้รับการเสนอชื่อเข้าชิงรางวัล...",
    "pos": "passive phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "feature film": {
    "word": "feature film",
    "meaning": "ภาพยนตร์ขนาดยาว (ที่ฉายในโรงภาพยนตร์)",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "amazing experience": {
    "word": "amazing experience",
    "meaning": "ประสบการณ์ที่ยอดเยี่ยมน่าทึ่ง",
    "pos": "n. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "solve the problem": {
    "word": "solve the problem",
    "meaning": "แก้ไขปัญหา",
    "pos": "v. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "be limited to": {
    "word": "be limited to",
    "meaning": "ถูกจำกัดไว้ที่...",
    "pos": "passive phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "safe level": {
    "word": "safe level",
    "meaning": "ระดับที่ปลอดภัย",
    "pos": "n. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "documentary": {
    "word": "documentary",
    "meaning": "ภาพยนตร์สารคดี / รายการสารคดี",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "marine animals": {
    "word": "marine animals",
    "meaning": "สัตว์ทะเล",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "educational": {
    "word": "educational",
    "meaning": "ซึ่งให้ความรู้ / เชิงการศึกษา",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "extremely": {
    "word": "extremely",
    "meaning": "อย่างยิ่ง / มากที่สุด",
    "pos": "adv.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "excited vs exciting": {
    "word": "excited vs exciting",
    "meaning": "รู้สึกตื่นเต้น (คน) vs น่าตื่นเต้น (สิ่งของ)",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "first prize": {
    "word": "first prize",
    "meaning": "รางวัลชนะเลิศอันดับที่ 1",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "fire drill": {
    "word": "fire drill",
    "meaning": "การฝึกซ้อมหนีไฟ",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "calmly": {
    "word": "calmly",
    "meaning": "อย่างสงบ / อย่างมีสติ",
    "pos": "adv.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "provide": {
    "word": "provide",
    "meaning": "ให้ / จัดหาให้",
    "pos": "v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "health benefits": {
    "word": "health benefits",
    "meaning": "ประโยชน์ต่อสุขภาพ",
    "pos": "n. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "beneficial": {
    "word": "beneficial",
    "meaning": "ที่เป็นประโยชน์",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "inspiring": {
    "word": "inspiring",
    "meaning": "ที่สร้างแรงบันดาลใจ",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "local youth": {
    "word": "local youth",
    "meaning": "เยาวชนในท้องถิ่น",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "fearful": {
    "word": "fearful",
    "meaning": "หวาดกลัว / น่ากลัว",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "faithless": {
    "word": "faithless",
    "meaning": "ไม่ซื่อสัตย์ / ไร้ศรัทธา",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "fortunate": {
    "word": "fortunate",
    "meaning": "โชคดี (= lucky)",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "similar": {
    "word": "similar",
    "meaning": "คล้ายคลึงกัน",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "slight": {
    "word": "slight",
    "meaning": "เล็กน้อย / บางเบา",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "expectation": {
    "word": "expectation",
    "meaning": "ความคาดหวัง",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "pleasantly surprised": {
    "word": "pleasantly surprised",
    "meaning": "รู้สึกประหลาดใจในทางที่ดี / ประทับใจเกินคาด",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "standard": {
    "word": "standard",
    "meaning": "มาตรฐาน",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "aspect": {
    "word": "aspect",
    "meaning": "แง่มุม / องค์ประกอบ",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "believable": {
    "word": "believable",
    "meaning": "น่าเชื่อถือ / สมจริง",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "portrayal": {
    "word": "portrayal",
    "meaning": "การถ่ายทอดบทบาท / การแสดง",
    "pos": "n.",
    "note": "O-NET 2568"
  },
  "flawed": {
    "word": "flawed",
    "meaning": "มีข้อบกพร่อง / มีตำหนิ",
    "pos": "adj.",
    "note": "O-NET 2568"
  },
  "expensive": {
    "word": "expensive",
    "meaning": "ราคาแพง",
    "pos": "adj. (Opinion)",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "leather": {
    "word": "leather",
    "meaning": "หนังสัตว์ / ที่ทำจากหนัง",
    "pos": "n./adj. (Material)",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "department store": {
    "word": "department store",
    "meaning": "ห้างสรรพสินค้า",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "be equipped with": {
    "word": "be equipped with",
    "meaning": "ได้รับการติดตั้งอุปกรณ์ด้วย...",
    "pos": "passive phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "latest": {
    "word": "latest",
    "meaning": "ใหม่ล่าสุด",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "perform": {
    "word": "perform",
    "meaning": "แสดง (ดนตรี/ละคร)",
    "pos": "v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "charity concert": {
    "word": "charity concert",
    "meaning": "คอนเสิร์ตการกุศล",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "auditorium": {
    "word": "auditorium",
    "meaning": "หอประชุม",
    "pos": "n.",
    "note": "O-NET"
  },
  "rarely": {
    "word": "rarely",
    "meaning": "แทบจะไม่ / นานๆ ครั้ง (= seldom)",
    "pos": "adv.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "soft drinks": {
    "word": "soft drinks",
    "meaning": "น้ำอัดลม",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "junk food": {
    "word": "junk food",
    "meaning": "อาหารขยะ (อาหารที่มีประโยชน์น้อย)",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "include": {
    "word": "include",
    "meaning": "รวมเอาไว้ / ใส่เข้าไปด้วย",
    "pos": "v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "dramatic": {
    "word": "dramatic",
    "meaning": "ตื่นเต้นเร้าใจ / เข้มข้นดราม่า",
    "pos": "adj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "chase scenes": {
    "word": "chase scenes",
    "meaning": "ฉากการไล่ล่า",
    "pos": "n. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "tense": {
    "word": "tense",
    "meaning": "ตึงเครียด / กดดัน",
    "pos": "adj.",
    "note": "O-NET 2568"
  },
  "action scenes": {
    "word": "action scenes",
    "meaning": "ฉากแอ็กชัน / ฉากต่อสู้",
    "pos": "n. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "frantic music": {
    "word": "frantic music",
    "meaning": "ดนตรีประกอบที่เร่งเร้าตื่นเต้น",
    "pos": "n. phrase",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "once + s + v": {
    "word": "Once + S + V",
    "meaning": "เมื่อ...แล้ว / ทันทีที่...",
    "pos": "conj.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "be registered": {
    "word": "be registered",
    "meaning": "ได้รับการลงทะเบียนเรียบร้อย",
    "pos": "passive v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "announcement": {
    "word": "announcement",
    "meaning": "ประกาศ",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "participant": {
    "word": "participant",
    "meaning": "ผู้เข้าร่วม",
    "pos": "n.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "provide someone with something": {
    "word": "provide someone with something",
    "meaning": "จัดหา/มอบบางสิ่งให้แก่บางคน",
    "pos": "phrase / idiom",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "register": {
    "word": "register",
    "meaning": "ลงทะเบียน / สมัคร",
    "pos": "v.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "onward": {
    "word": "onward",
    "meaning": "เป็นต้นไป (มักใช้คู่กับ from ... onward)",
    "pos": "adv.",
    "note": "คำศัพท์สำคัญ O-NET ม.3"
  },
  "overall": {
    "word": "overall",
    "meaning": "โดยภาพรวม / ทั้งหมด",
    "pos": "adv.",
    "note": "O-NET 2568"
  },
  "percentage": {
    "word": "percentage",
    "meaning": "ร้อยละ / เปอร์เซ็นต์",
    "pos": "n.",
    "note": "O-NET 2568"
  },
  "proportion": {
    "word": "proportion",
    "meaning": "สัดส่วน",
    "pos": "n.",
    "note": "O-NET 2568"
  },
  "population": {
    "word": "population",
    "meaning": "ประชากร",
    "pos": "n.",
    "note": "O-NET 2568"
  },
  "however": {
    "word": "however",
    "meaning": "อย่างไรก็ตาม",
    "pos": "adv.",
    "note": "O-NET 2568"
  },
  "action": {
    "word": "action",
    "meaning": "การกระทำ / ฉากบู๊แอ็กชัน",
    "pos": "n.",
    "note": "O-NET 2568"
  },
  "scene": {
    "word": "scene",
    "meaning": "ฉาก (ในภาพยนตร์)",
    "pos": "n.",
    "note": "O-NET 2568"
  },
  "expectations": {
    "word": "expectations",
    "meaning": "ความคาดหวัง",
    "pos": "n.",
    "note": "O-NET 2568"
  },
  "troubled": {
    "word": "troubled",
    "meaning": "ที่มีปัญหา / สับสนวุ่นวาย",
    "pos": "adj.",
    "note": "O-NET 2568"
  },
  "masterful": {
    "word": "masterful",
    "meaning": "เชี่ยวชาญ / ระดับปรมาจารย์",
    "pos": "adj.",
    "note": "O-NET 2568"
  },
  "tacked": {
    "word": "tacked",
    "meaning": "แปะต่อท้าย / ติดเสริม",
    "pos": "v.",
    "note": "O-NET 2566"
  },
  "blackout": {
    "word": "blackout",
    "meaning": "ไฟฟ้าดับ / มืดสนิท",
    "pos": "n.",
    "note": "O-NET"
  },
  "crate": {
    "word": "crate",
    "meaning": "ลังไม้ / ลังใส่ของ",
    "pos": "n.",
    "note": "O-NET"
  },
  "carton": {
    "word": "carton",
    "meaning": "กล่องกระดาษแข็ง",
    "pos": "n.",
    "note": "O-NET"
  },
  "must": {
    "word": "must",
    "meaning": "ต้อง... (บอกความจำเป็นเด็ดขาด หรือ การคาดคะเนที่มีหลักฐานชัดเจน)",
    "pos": "Modal Verb (กริยาช่วย)",
    "note": "📌 กฎไวยากรณ์: ตามด้วย V.inf (กริยาไม่ผัน) เสมอ! เช่น must return, must be cleaned (Passive) | ปฏิเสธ mustn't = ห้ามทำเด็ดขาด"
  },
  "have to": {
    "word": "have to",
    "meaning": "จำเป็นต้อง... (เนื่องจากกฎระเบียบหรือสถานการณ์บังคับ — ห้ามแปลว่า \"มี\"!)",
    "pos": "Semi-Modal Verb",
    "note": "📌 กฎไวยากรณ์: ตามด้วย V.inf เสมอ เช่น have to get up early (O-NET 2566 ข้อ 27) | ปฏิเสธ don't have to = ไม่จำเป็นต้องทำ"
  },
  "has to": {
    "word": "has to",
    "meaning": "จำเป็นต้อง... (ใช้กับประธานเอกพจน์ He/She/It — ห้ามแปลว่า \"มี\"!)",
    "pos": "Semi-Modal Verb",
    "note": "📌 กฎไวยากรณ์: ตามด้วย V.inf เช่น She has to study hard."
  },
  "had to": {
    "word": "had to",
    "meaning": "จำเป็นต้อง...ในอดีต (รูปอดีตของ must และ have to)",
    "pos": "Semi-Modal (Past)",
    "note": "📌 กฎไวยากรณ์: ตามด้วย V.inf เช่น We had to cancel the trip."
  },
  "should": {
    "word": "should",
    "meaning": "ควรจะ... (ใช้ให้คำแนะนำ แนะนำสิ่งที่ดีกว่า)",
    "pos": "Modal Verb",
    "note": "📌 กฎไวยากรณ์: ตามด้วย V.inf เสมอ เช่น You should drink more water."
  },
  "ought to": {
    "word": "ought to",
    "meaning": "ควรจะ... (ความหมายเท่ากับ should)",
    "pos": "Modal Verb",
    "note": "📌 กฎไวยากรณ์: ตามด้วย V.inf เสมอ"
  },
  "had better": {
    "word": "had better",
    "meaning": "ควรจะ...ดีกว่า (เตือนว่าถ้าไม่ทำจะเกิดผลเสีย — ห้ามแปลว่า \"มีดีกว่า\"!)",
    "pos": "Idiomatic Modal",
    "note": "📌 กฎไวยากรณ์: ตามด้วย V.inf เสมอ เช่น You had better hurry up. | ปฏิเสธ: had better not"
  },
  "would rather": {
    "word": "would rather",
    "meaning": "อยากจะ...มากกว่า / ขอเลือก...ดีกว่า (บอกความพึงพอใจ)",
    "pos": "Modal Phrase",
    "note": "📌 กฎไวยากรณ์: ตามด้วย V.inf เสมอ เช่น I would rather stay home than go out."
  },
  "used to": {
    "word": "used to",
    "meaning": "เคย...ในอดีต (แต่ปัจจุบันไม่ได้ทำแล้ว — ห้ามแปลว่า \"ใช้เพื่อ\"!)",
    "pos": "Semi-Modal",
    "note": "📌 กฎไวยากรณ์: used to + V.inf แปลว่า \"เคยทำ\" | ระวัง! be used to + V-ing แปลว่า \"เคยชินกับ...\""
  },
  "be used to": {
    "word": "be used to",
    "meaning": "เคยชินกับ... / คุ้นเคยกับ... (ตามด้วย Noun หรือ V-ing)",
    "pos": "Idiomatic Phrase",
    "note": "📌 ต่างจาก used to + V.inf: be used to living here = ชินกับการอยู่ที่นี่แล้ว"
  },
  "be going to": {
    "word": "be going to",
    "meaning": "กำลังจะ... / ตั้งใจว่าจะ... (บอกแผนการในอนาคต — ไม่ได้แปลว่า \"กำลังเดินไป\"!)",
    "pos": "Auxiliary Structure",
    "note": "📌 กฎไวยากรณ์: be going to + V.inf เช่น I am going to sleep (O-NET 2566 ข้อ 27)"
  },
  "am going to": {
    "word": "am going to",
    "meaning": "กำลังจะ... / ตั้งใจว่าจะ... (บอกแผนการในอนาคตของประธาน I)",
    "pos": "Auxiliary Structure",
    "note": "📌 ตามด้วย V.inf เช่น am going to sleep (O-NET 2566 ข้อ 27)"
  },
  "could": {
    "word": "could",
    "meaning": "สามารถ...ได้ในอดีต / ขอร้องอย่างสุภาพ",
    "pos": "Modal Verb",
    "note": "📌 กฎไวยากรณ์: ตามด้วย V.inf เสมอ"
  },
  "may": {
    "word": "may",
    "meaning": "อาจจะ... (ความเป็นไปได้ 50%) / ขออนุญาต...",
    "pos": "Modal Verb",
    "note": "📌 กฎไวยากรณ์: ตามด้วย V.inf เสมอ"
  },
  "might": {
    "word": "might",
    "meaning": "อาจจะ... (ความเป็นไปได้น้อยกว่า may ราว 30-40%)",
    "pos": "Modal Verb",
    "note": "📌 กฎไวยากรณ์: ตามด้วย V.inf เสมอ"
  },
  "will": {
    "word": "will",
    "meaning": "จะ... (บอกอนาคต หรือการตัดสินใจในทันที)",
    "pos": "Modal Verb",
    "note": "📌 กฎไวยากรณ์: will + V.inf เสมอ เช่น will increase (อนาคต)"
  },
  "would": {
    "word": "would",
    "meaning": "จะ...ในอดีต / มักจะ... / ใช้ขอร้องอย่างสุภาพ",
    "pos": "Modal Verb",
    "note": "📌 กฎไวยากรณ์: ตามด้วย V.inf เสมอ"
  },
  "be able to": {
    "word": "be able to",
    "meaning": "สามารถ...ได้ (มีความหมายเท่ากับ can)",
    "pos": "Semi-Modal Phrase",
    "note": "📌 ตามด้วย V.inf เสมอ สามารถผันได้ทุก Tense เช่น will be able to, was able to"
  },
  "looking forward to": {
    "word": "looking forward to",
    "meaning": "กำลังตั้งตารอคอยอย่างใจจดใจจ่อ (รูป -ing ของ look forward to)",
    "pos": "Phrasal Verb",
    "note": "💡 O-NET TRAP: ตามด้วย V-ing เช่น looking forward to going to school (O-NET 2566 ข้อ 26)"
  },
  "paid attention to": {
    "word": "paid attention to",
    "meaning": "ได้ให้ความสนใจ / ได้ตั้งใจฟัง (รูปอดีต V.2 ของ pay attention to)",
    "pos": "Collocation (Past)",
    "note": "💡 รูปอดีตของสำนวน pay attention to"
  },
  "well equipped with": {
    "word": "well equipped with",
    "meaning": "เพียบพร้อมไปด้วย... / ติดตั้งอุปกรณ์ครบครันไปด้วย...",
    "pos": "Adjective Phrase",
    "note": "💡 O-NET 2566 ข้อ 25: The computer lab is well equipped with..."
  },
  "come from": {
    "word": "come from",
    "meaning": "มีที่มาจาก... / กำเนิดมาจาก... / สืบเชื้อสายมาจาก...",
    "pos": "Phrasal Verb",
    "note": "💡 O-NET 2568 ข้อ 27: The increases in 2016 came from people aged 45 to 54."
  },
  "came from": {
    "word": "came from",
    "meaning": "มีที่มาจาก...ในอดีต (รูป V.2 ของ come from)",
    "pos": "Phrasal Verb (Past)",
    "note": "💡 O-NET 2568 ข้อ 27: ใช้รูป V.2 เพราะข้อมูลเป็นปี 2016 ในอดีต"
  },
  "stands out": {
    "word": "stands out",
    "meaning": "โดดเด่นสะดุดตา (ประธานเอกพจน์)",
    "pos": "Phrasal Verb",
    "note": "💡 O-NET 2567 ข้อ 31"
  },
  "more likely to": {
    "word": "more likely to",
    "meaning": "มีแนวโน้มที่จะ...มากกว่า / มีโอกาสเป็นไปได้มากกว่า",
    "pos": "Comparison Phrase",
    "note": "💡 O-NET 2568 ข้อ 25: The younger..., the more likely they were to own a smartphone."
  },
  "ran out of": {
    "word": "ran out of",
    "meaning": "ได้หมดเกลี้ยงแล้ว (รูปอดีต V.2 ของ run out of)",
    "pos": "Phrasal Verb (Past)",
    "note": "💡 รูปอดีตของ run out of"
  },
  "in spite of": {
    "word": "in spite of",
    "meaning": "ทั้งๆ ที่... / แม้ว่า... (มีความหมายเท่ากับ despite ตามด้วยคำนามหรือ V-ing)",
    "pos": "Preposition Phrase",
    "note": "💡 ห้ามตามด้วยประโยค S+V เด็ดขาด"
  },
  "as soon as": {
    "word": "as soon as",
    "meaning": "ทันทีที่... (บอกเหตุการณ์ที่เกิดขึ้นต่อกันทันที)",
    "pos": "Conjunction Phrase",
    "note": "💡 As soon as she arrived, the lesson started."
  },
  "in order to": {
    "word": "in order to",
    "meaning": "เพื่อที่จะ... (บอกวัตถุประสงค์ ตามด้วย V.inf เสมอ)",
    "pos": "Prepositional Infinitive",
    "note": "💡 in order to + V.inf"
  },
  "so that": {
    "word": "so that",
    "meaning": "เพื่อที่ว่า... (ตามด้วยประโยค S + can/could/may + V)",
    "pos": "Conjunction Phrase",
    "note": "💡 He studied hard so that he could pass the exam."
  },
  "at least": {
    "word": "at least",
    "meaning": "อย่างน้อยที่สุด / อย่างน้อย",
    "pos": "Adverbial Phrase",
    "note": "💡 You should sleep at least 7 hours."
  },
  "rely on": {
    "word": "rely on",
    "meaning": "พึ่งพา / ไว้ใจใน... (ความหมายเท่ากับ depend on)",
    "pos": "Phrasal Verb",
    "note": "💡 We rely on modern technology."
  },
  "interested in": {
    "word": "interested in",
    "meaning": "รู้สึกสนใจใน... (ประธานเป็นคน + interested in + Noun/V-ing)",
    "pos": "Adjective + Preposition",
    "note": "💡 I am interested in science. (ห้ามใช้ interesting in)"
  }
};



export const KNOWN_PHRASES: string[] = [
  "better late than never",
  "looking forward to",
  "well equipped with",
  "paid attention to",
  "on the other hand",
  "pay attention to",
  "look forward to",
  "more likely to",
  "make ends meet",
  "interested in",
  "worried about",
  "would rather",
  "leave a scar",
  "be going to",
  "am going to",
  "in spite of",
  "in order to",
  "had better",
  "be used to",
  "be able to",
  "all-in-one",
  "stands out",
  "in general",
  "run out of",
  "ran out of",
  "figure out",
  "take place",
  "because of",
  "as soon as",
  "as well as",
  "come from",
  "came from",
  "stand out",
  "turn down",
  "ought to",
  "at least",
  "have to",
  "used to",
  "so that",
  "give up",
  "rely on",
  "has to",
  "had to",
  "should",
  "could",
  "might",
  "would",
  "must",
  "will",
  "can",
  "may"
];

// Runtime client-side cache to avoid repeat fetches
const runtimeCache = new Map<string, WordDefinition>();

export function lookupWordLocally(rawWord: string): WordDefinition | null {
  if (!rawWord) return null;
  const clean = rawWord.toLowerCase().replace(/[^a-zA-Z-]/g, '').trim();
  if (!clean) return null;

  if (runtimeCache.has(clean)) {
    return runtimeCache.get(clean)!;
  }

  if (LOCAL_DICTIONARY[clean]) {
    const def = { ...LOCAL_DICTIONARY[clean], source: 'local' as const };
    runtimeCache.set(clean, def);
    return def;
  }

  // Try singularizing simple plurals (e.g., increases -> increase, scenes -> scene)
  if (clean.endsWith('s') && clean.length > 3) {
    const singular = clean.slice(0, -1);
    if (LOCAL_DICTIONARY[singular]) {
      const def = { ...LOCAL_DICTIONARY[singular], word: clean, source: 'local' as const };
      runtimeCache.set(clean, def);
      return def;
    }
  }

  // Try past tense -ed (e.g., increased -> increase)
  if (clean.endsWith('ed') && clean.length > 4) {
    const base = clean.slice(0, -2);
    if (LOCAL_DICTIONARY[base]) {
      const def = { ...LOCAL_DICTIONARY[base], word: clean, source: 'local' as const };
      runtimeCache.set(clean, def);
      return def;
    }
    const baseE = clean.slice(0, -1); // e.g. increased -> increase
    if (LOCAL_DICTIONARY[baseE]) {
      const def = { ...LOCAL_DICTIONARY[baseE], word: clean, source: 'local' as const };
      runtimeCache.set(clean, def);
      return def;
    }
  }

  // Try -ing (e.g., running -> run, spending -> spend)
  if (clean.endsWith('ing') && clean.length > 5) {
    const base = clean.slice(0, -3);
    if (LOCAL_DICTIONARY[base]) {
      const def = { ...LOCAL_DICTIONARY[base], word: clean, source: 'local' as const };
      runtimeCache.set(clean, def);
      return def;
    }
  }

  return null;
}

export async function translateWordOnline(rawWord: string): Promise<WordDefinition> {
  const clean = rawWord.toLowerCase().replace(/[^a-zA-Z-]/g, '').trim();
  if (!clean) {
    return { word: rawWord, meaning: 'ไม่สามารถแปลได้', source: 'online' };
  }

  // Check local cache first (< 1ms)
  const local = lookupWordLocally(clean);
  if (local) return local;

  // Query translation API
  try {
    const res = await fetch(`/api/translate?word=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      const def: WordDefinition = {
        word: clean,
        meaning: data.meaning || 'ไม่พบคำแปล',
        pos: data.pos,
        source: 'online',
      };
      runtimeCache.set(clean, def);
      return def;
    }
  } catch (err) {
    console.error('Translation fetch error:', err);
  }

  return {
    word: clean,
    meaning: 'ไม่พบคำแปล',
    source: 'online',
  };
}
