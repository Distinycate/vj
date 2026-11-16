export interface CheatSheetRow {
  label: string;
  rule: string;
  example: string;
  translation?: string;
  highlight?: string;
}

export interface CheatSheetSection {
  heading: string;
  description?: string;
  rows: CheatSheetRow[];
}

export interface CheatSheetTrap {
  wrong: string;
  right: string;
  why: string;
}

export interface QuickGrammarCheatSheet {
  id: string;
  title: string;
  shortTitle: string;
  icon: string;
  badge: string;
  summaryFormula: string;
  memoryTip: string;
  sections: CheatSheetSection[];
  examTraps: CheatSheetTrap[];
  relatedUnitNumber?: number;
}

export const QUICK_GRAMMAR_CHEAT_SHEETS: QuickGrammarCheatSheet[] = [
  {
    id: 'adjective-order',
    title: 'การเรียงลำดับคำคุณศัพท์ (Order of Adjectives — OSASCOMP)',
    shortTitle: 'เรียง Adjective',
    icon: '🎨',
    badge: 'สูตรจำ OSASCOMP',
    summaryFormula:
      'Determiner (a/an/the/my/two) ➔ Opinion ➔ Size ➔ Age ➔ Shape ➔ Color ➔ Origin ➔ Material ➔ Purpose + NOUN',
    memoryTip:
      'จำแม่นใน 5 วิ: “ความเห็น – ขนาด – อายุ – รูปร่าง – สี – สัญชาติ – วัสดุ – วัตถุประสงค์ + คำนามหลักอยู่ท้ายสุดเสมอ!” (ในข้อสอบจริงมักหยิบมาแค่ 3–4 ตัว ให้เช็กตัวหน้าสุดกับคำนามท้ายสุดก่อน)',
    relatedUnitNumber: 21,
    sections: [
      {
        heading: 'ลำดับการเรียง Adjective 8 ขั้น (จากซ้ายไปขวา ก่อนถึงคำนาม)',
        description: 'เรียงจาก “ความรู้สึกส่วนตัว” ไปหา “คุณสมบัติแท้จริงของสิ่งของ” และจบด้วยคำนามหลัก (Head Noun)',
        rows: [
          {
            label: '1. Opinion (ความเห็น)',
            rule: 'สวย ดี น่ารัก แพง น่าสนใจ',
            example: 'beautiful, nice, cute, expensive, interesting, delicious',
            translation: 'วางไว้หน้าสุด (หลัง a/an/the/ตัวเลข)',
          },
          {
            label: '2. Size (ขนาด)',
            rule: 'ใหญ่ เล็ก สูง ยาว กว้าง',
            example: 'big, small, large, little, tall, long, huge, tiny',
            translation: 'ขนาดมาก่อนอายุและสีเสมอ',
          },
          {
            label: '3. Age (อายุ/ความเก่าใหม่)',
            rule: 'เก่า ใหม่ หนุ่มสาว โบราณ',
            example: 'old, new, young, modern, ancient',
            translation: 'เช่น a big old house (บ้านหลังใหญ่ที่เก่า)',
          },
          {
            label: '4. Shape (รูปร่าง/รูปทรง)',
            rule: 'กลม เหลี่ยม แบน อ้วน ผอม',
            example: 'round, square, flat, oval, rectangular',
            translation: 'เช่น a small round table (โต๊ะกลมตัวเล็ก)',
          },
          {
            label: '5. Color (สี)',
            rule: 'สีต่างๆ',
            example: 'red, black, white, brown, dark blue, golden',
            translation: 'เช่น a cute little white cat',
          },
          {
            label: '6. Origin (สัญชาติ/ที่มา)',
            rule: 'ประเทศ เชื้อชาติ แหล่งที่มา',
            example: 'Thai, Japanese, Italian, American, Chinese, Korean',
            translation: 'ขึ้นต้นด้วยตัวพิมพ์ใหญ่เสมอ',
          },
          {
            label: '7. Material (วัสดุที่ทำ)',
            rule: 'ทำจากไม้ เหล็ก ผ้าไหม พลาสติก',
            example: 'wooden, silk, cotton, leather, plastic, glass, metal',
            translation: 'อยู่ติดหน้าคำนามหรือหน้าคำบอกวัตถุประสงค์',
          },
          {
            label: '8. Purpose + Noun (เพื่อใช้ทำอะไร + นามหลัก)',
            rule: 'คำขยายบอกการใช้งาน + คำนามหลัก',
            example: 'running shoes, sleeping bag, dining table, swimming pool',
            translation: 'คำนามหลักต้องอยู่ขวาสุดเสมอ!',
          },
        ],
      },
      {
        heading: 'ตัวอย่างชุดที่ออกข้อสอบ O-NET บ่อยที่สุด',
        rows: [
          {
            label: 'Opinion + Size + Color + Noun',
            rule: 'ความเห็น ➔ ขนาด ➔ สี ➔ นาม',
            example: 'a beautiful big white house',
            translation: 'บ้านสีขาวหลังใหญ่ที่สวยงาม',
          },
          {
            label: 'Size + Age + Origin + Noun',
            rule: 'ขนาด ➔ อายุ ➔ สัญชาติ ➔ นาม',
            example: 'a small old Japanese car',
            translation: 'รถยนต์ญี่ปุ่นคันเล็กๆ รุ่นเก่า',
          },
          {
            label: 'Opinion + Color + Material + Noun',
            rule: 'ความเห็น ➔ สี ➔ วัสดุ ➔ นาม',
            example: 'an expensive black leather bag',
            translation: 'กระเป๋าหนังสีดำราคาแพง',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ a leather black expensive bag',
        right: '✅ an expensive black leather bag',
        why: 'วัสดุ (leather) ต้องอยู่ใกล้คำนามหลัก (bag) ที่สุด และความเห็น (expensive) ต้องอยู่หน้าสุด',
      },
      {
        wrong: '❌ a wooden round small table',
        right: '✅ a small round wooden table',
        why: 'เรียงตามขนาด (small) ➔ รูปร่าง (round) ➔ วัสดุ (wooden) + คำนาม (table)',
      },
    ],
  },
  {
    id: 'sentence-structure',
    title: 'การวางโครงสร้างประโยค & ตำแหน่งคำ (Sentence Structure & Word Order)',
    shortTitle: 'การวางประโยค',
    icon: '🧱',
    badge: 'พื้นฐานสำคัญสุด',
    summaryFormula:
      'ประโยคบอกเล่า: Subject (ประธาน) + Verb (กริยา) + Object (กรรม) + Place (สถานที่) + Time (เวลา)',
    memoryTip:
      'จำตำแหน่งทอง: 1) Adj ขยายนาม (วางหน้านาม / หลัง V.to be) • 2) Adv (-ly) ขยายกริยา/ขยาย Adj • 3) ประโยคคำถามอ้อม (Indirect Question) ห้ามสลับกริยาช่วยขึ้นหน้าประธาน!',
    relatedUnitNumber: 105,
    sections: [
      {
        heading: '1. โครงสร้างประโยคพื้นฐาน & ลำดับส่วนขยาย',
        rows: [
          {
            label: 'โครงสร้างหลัก S + V + O + M + P + T',
            rule: 'ประธาน + กริยา + กรรม + วิธีทำ (Manner) + สถานที่ (Place) + เวลา (Time)',
            example: 'She read the book quietly in the library yesterday.',
            translation: 'สถานที่ (in the library) มาก่อนเวลา (yesterday) เสมอ',
          },
          {
            label: 'ลำดับในกลุ่มคำนาม (Noun Phrase)',
            rule: 'Article (a/an/the) + Adverb (-ly) + Adjective + Noun',
            example: 'a very important decision / an extremely difficult test',
            translation: 'Adv ขยาย Adj และ Adj ขยาย Noun ตัวท้ายสุด',
          },
          {
            label: 'ตำแหน่ง Adverb of Frequency (บอกความถี่)',
            rule: 'always, usually, often, sometimes, seldom, never ➔ วาง “หน้ากริยาแท้” แต่ “หลัง Verb to be”',
            example: 'He always wakes up early. / He is always on time.',
            translation: 'อยู่หน้า wakes (กริยาแท้) แต่อยู่หลัง is (V.to be)',
          },
        ],
      },
      {
        heading: '2. โครงสร้างประโยคคำถามตรง vs คำถามอ้อม (Direct vs Indirect Questions)',
        rows: [
          {
            label: 'คำถามตรง (Direct Question)',
            rule: 'WH-Word + กริยาช่วย (do/does/did/is/can/will) + S + V.แท้ ?',
            example: 'Where does she live? / What time does the train leave?',
            translation: 'มีกริยาช่วยคั่นหน้าประธาน',
          },
          {
            label: 'คำถามอ้อมสุภาพ (Indirect Question)',
            rule: 'Could you tell me / Do you know + WH-Word + S + V (เรียงแบบประโยคบอกเล่า!)',
            example: 'Could you tell me where she lives? / Do you know what time the train leaves?',
            translation: 'ห้ามใส่ do/does/did และห้ามสลับ is/am/are ขึ้นหน้าประธาน!',
          },
          {
            label: 'คำถามอ้อมแบบ Yes/No',
            rule: 'Do you know / I wonder + if / whether + S + V',
            example: 'Do you know if the bank is open today?',
            translation: 'ใช้ if หรือ whether แปลว่า “...หรือไม่”',
          },
        ],
      },
      {
        heading: '3. กริยาเชื่อมประสาทสัมผัส (Linking Verbs)',
        rows: [
          {
            label: 'look, feel, sound, smell, taste, seem, become + Adjective',
            rule: 'กริยากลุ่มนี้ตามด้วย Adjective เสมอ (ห้ามใช้ Adverb -ly)',
            example: 'The soup tastes delicious. / Your idea sounds great.',
            translation: 'ซุปรสชาติอร่อย / ไอเดียของคุณฟังดูยอดเยี่ยม',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ Could you tell me where is the restroom?',
        right: '✅ Could you tell me where the restroom is?',
        why: 'หลัง where ในประโยคคำถามอ้อม ต้องเรียง S + V (the restroom is) ห้ามเอา is ขึ้นก่อน',
      },
      {
        wrong: '❌ She speaks English very good.',
        right: '✅ She speaks English very well.',
        why: 'ขยายกริยาแท้ (speaks) ต้องใช้ Adverb (well) ส่วน good เป็น Adjective ใช้ขยายคำนาม',
      },
    ],
  },
  {
    id: 'prepositions',
    title: 'คำบุพบท เวลา & สถานที่ (Prepositions: in / on / at & คำบุพบทสำคัญ)',
    shortTitle: 'คำบุพบท (in/on/at)',
    icon: '📍',
    badge: 'สามเหลี่ยม IN-ON-AT',
    summaryFormula:
      'IN = กว้างใหญ่ (เดือน/ปี/ฤดู/ประเทศ/เมือง) ➔ ON = กลาง/วัน/พื้นผิว (วันทั้ง 7/วันที่/ถนน/ชั้นตึก) ➔ AT = จุดเจาะจง (เวลานาฬิกา/สถานที่เฉพาะจุด)',
    memoryTip:
      'จำกฎ “มีวันใช้ ON”: แม้จะมีเดือนหรือปีพ่วงท้าย แต่ถ้าเห็นคำว่า “วัน” หรือ “เลขวันที่” เมื่อไหร่ ให้ตอบ ON ทันที! (เช่น on Monday, on May 5th, on New Year’s Day)',
    relatedUnitNumber: 13,
    sections: [
      {
        heading: '1. คำบุพบทบอกเวลา (Prepositions of Time)',
        rows: [
          {
            label: 'IN (ช่วงเวลากว้างๆ)',
            rule: 'เดือน, ปี, ฤดูกาล, ทศวรรษ, ช่วงของวัน (the morning / afternoon / evening), in + เวลาที่จะเกิดในอนาคต',
            example: 'in May, in 2026, in summer, in the morning, in 10 minutes',
            translation: 'ในเดือนพ.ค., ในปี 2026, ในฤดูร้อน, ในอีก 10 นาที',
          },
          {
            label: 'ON (ระดับวัน & วันที่)',
            rule: 'วันทั้ง 7, วันที่ (มีตัวเลข), วันสำคัญที่มีคำว่า Day, วัน + ช่วงเวลา (on Friday morning)',
            example: 'on Monday, on 16th November, on Christmas Day, on my birthday, on weekdays',
            translation: 'เจอวันหรือเลขวันที่ ตอบ on เสมอ!',
          },
          {
            label: 'AT (จุดเวลาเจาะจง)',
            rule: 'เวลาตามนาฬิกา, จุดเวลาสั้นๆ, เทศกาลที่ไม่มีคำว่า Day',
            example: 'at 8:30 a.m., at noon, at night, at midnight, at the moment, at Christmas',
            translation: 'ตอน 8 โมงครึ่ง, ตอนเที่ยง, ตอนกลางคืน',
          },
        ],
      },
      {
        heading: '2. คำบุพบทบอกสถานที่ & ยานพาหนะ (Place & Transport)',
        rows: [
          {
            label: 'IN (พื้นที่ปิด / ขอบเขตใหญ่)',
            rule: 'ประเทศ, เมือง, จังหวัด, ในห้อง/กล่อง, ยานพาหนะที่ยืนเดินไม่ได้ (in a car / in a taxi)',
            example: 'in Thailand, in Bangkok, in the kitchen, in a taxi',
            translation: 'อยู่ในพื้นที่ล้อมรอบ หรือเมือง/ประเทศ',
          },
          {
            label: 'ON (บนพื้นผิว / เส้นถนน / ชั้นตึก / รถใหญ่)',
            rule: 'บนโต๊ะ/ผนัง, ชื่อถนน, ชั้นของตึก, ยานพาหนะที่ยืนเดินได้หรือขี่คร่อม (bus, train, plane, boat, bike, horse) + สื่อออนไลน์',
            example: 'on the table, on Sukhumvit Road, on the 2nd floor, on the bus, on the internet',
            translation: 'บนรถบัส/รถไฟ/เครื่องบิน และบนอินเทอร์เน็ตใช้ on',
          },
          {
            label: 'AT (จุดนัดหมาย / บ้านเลขที่)',
            rule: 'สถานที่เฉพาะจุด, บ้านเลขที่, กิจกรรม/งานเลี้ยง',
            example: 'at the bus stop, at school, at home, at the airport, at 123 Silom Road',
            translation: 'ถ้ามีบ้านเลขที่นำหน้าชื่อถนน ใช้ at',
          },
          {
            label: 'BY (วิธีการเดินทาง / สื่อสาร)',
            rule: 'by + ยานพาหนะล้วนๆ (ห้ามมี a/an/the/my คั่นกลาง!)',
            example: 'go by bus, travel by train, by plane, pay by credit card',
            translation: 'ถ้ามี a/the คั่น ต้องเปลี่ยนไปใช้ in a car หรือ on the bus',
          },
        ],
      },
      {
        heading: '3. คู่คำบุพบทที่ข้อสอบ O-NET ชอบเอามาหลอก',
        rows: [
          {
            label: 'since vs for vs during',
            rule: 'since + จุดเริ่มต้นเวลา  |  for + จำนวนระยะเวลา  |  during + คำนามเหตุการณ์',
            example: 'since 2020 / for 3 years / during the summer holiday',
            translation: 'ระวัง! during ตามด้วยคำนามชื่อช่วงเวลา ไม่ตามด้วยตัวเลขจำนวนปี',
          },
          {
            label: 'between vs among',
            rule: 'between A and B (ระหว่าง 2 สิ่ง)  |  among + พหูพจน์ (ท่ามกลาง 3 สิ่งขึ้นไป)',
            example: 'sit between John and Mary / popular among teenagers',
            translation: 'เห็น and ข้างหลังช่องว่าง มักตอบ between',
          },
          {
            label: 'until (จนกระทั่ง) vs by (ภายในเวลาไม่เกิน)',
            rule: 'until = ทำต่อเนื่องไปจนถึงเวลานั้น  |  by = ต้องเสร็จสิ้นก่อนหรือภายในเวลานั้น',
            example: 'Wait here until 5 p.m. / Please submit your work by Friday.',
            translation: 'ส่งงานภายในวันศุกร์ (เสร็จก่อนเส้นตาย) ใช้ by',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ I went to school by a bus.',
        right: '✅ I went to school by bus. (หรือ on a bus)',
        why: 'หลัง by บอกวิธีเดินทาง ห้ามมี a/an/the คั่น ถ้ามี a/the ต้องใช้ on a bus หรือ in a car',
      },
      {
        wrong: '❌ We have an exam in Monday morning.',
        right: '✅ We have an exam on Monday morning.',
        why: 'แม้จะมีคำว่า morning แต่ถ้ามีชื่อวัน (Monday) นำหน้า ต้องยึดที่ “วัน” จึงต้องใช้ on',
      },
    ],
  },
  {
    id: 'collocations-phrasals',
    title: 'คำที่ใช้คู่กัน & กริยาวลี (Collocations, Adj+Prep & Phrasal Verbs)',
    shortTitle: 'Collocation & กริยาวลี',
    icon: '🤝',
    badge: 'พาร์ท Cloze Test ฮิต',
    summaryFormula:
      'ฝรั่งบังคับใช้คู่กันตายตัว: Make (สร้าง/ตัดสินใจ) vs Do (งาน/หน้าที่) • Adj + Prep เฉพาะตัว • Phrasal Verb (กริยา + บุพบท = ความหมายใหม่)',
    memoryTip:
      'เวลาทำ Cloze Test ให้กวาดตาดู “คำข้างหลังช่องว่าง” ก่อนเสมอ! ถ้าเจอ Preposition (in, on, at, of, for, from, with) หรือคำนามคู่ขา จะตัดช้อยส์ได้ทันที 3 ข้อ!',
    relatedUnitNumber: 5,
    sections: [
      {
        heading: '1. Collocations ยอดฮิต: MAKE vs DO vs TAKE vs HAVE',
        rows: [
          {
            label: 'MAKE (สร้างขึ้นใหม่ / ตัดสินใจ / เสียง / เงิน)',
            rule: 'ใช้กับการสร้างสรรค์ การพูด หรือการตัดสินใจ',
            example:
              'make a decision (ตัดสินใจ), make a mistake (ทำผิดพลาด), make a noise (ส่งเสียงดัง), make money, make friends, make a phone call, make an effort (พยายาม), make progress (ก้าวหน้า)',
            translation: 'ออกสอบบ่อยสุด: make a decision / make a mistake',
          },
          {
            label: 'DO (ทำงาน / กิจวัตร / หน้าที่ / วิจัย)',
            rule: 'ใช้กับภารกิจ การบ้าน งานบ้าน การทดลอง',
            example:
              'do homework, do housework, do the dishes, do business, do research (ทำวิจัย), do a favor (ช่วยเหลือ), do your best (ทำดีที่สุด), do exercise',
            translation: 'ออกสอบบ่อยสุด: do research / do someone a favor',
          },
          {
            label: 'TAKE (ใช้เวลา / ถ่ายรูป / กินยา / สอบ / พัก)',
            rule: 'ใช้คู่กับโอกาส เวลา การเดินทาง การสอบ',
            example:
              'take a photo, take medicine (กินยา), take an exam (เข้าสอบ), take a break (พัก), take care of (ดูแล), take part in (= participate in เข้าร่วม), take place (= happen เกิดขึ้น)',
            translation: 'ออกสอบบ่อยสุด: take part in (เข้าร่วม) / take place (จัดขึ้น)',
          },
          {
            label: 'PAY / KEEP / CATCH / SAVE',
            rule: 'กลุ่มคำคู่ขาที่ออกข้อสอบ Writing Cloze ทุกปี',
            example:
              'pay attention to (ตั้งใจฟัง), keep in touch (ติดต่อกัน), keep a promise (รักษาสัญญา), catch a cold (เป็นหวัด), save money/time/energy',
            translation: 'จำแม่นๆ: pay attention ต้องคู่กับ to เสมอ!',
          },
        ],
      },
      {
        heading: '2. Adjective / Verb + Preposition ที่ออกสอบ O-NET ประจำ',
        rows: [
          {
            label: 'คู่กับ IN',
            rule: 'สนใจใน... / ประสบความสำเร็จใน... / มีส่วนร่วมใน...',
            example: 'interested in, succeed in, believe in, participate in (= take part in)',
            translation: 'หลัง in ถ้าเป็นกริยาต้องเติม -ing เสมอ (เช่น interested in learning)',
          },
          {
            label: 'คู่กับ AT / ON',
            rule: 'เก่ง/อ่อนวิชา... (AT)  |  พึ่งพา/ขึ้นอยู่กับ... (ON)',
            example: 'good at, bad at, surprised at/by  |  depend on (= rely on), keen on, focus on, Spend money/time on',
            translation: 'It depends on you. (มันขึ้นอยู่กับคุณ)',
          },
          {
            label: 'คู่กับ OF / FOR',
            rule: 'กลัว/ภูมิใจ/เต็มไปด้วย (OF)  |  มีชื่อเสียง/รับผิดชอบ/ขอโทษ (FOR)',
            example:
              'afraid of, proud of, full of, tired of, aware of, take care of  |  famous for, responsible for, sorry for, wait for, apply for',
            translation: 'Thailand is famous for its food. / responsible for (รับผิดชอบต่อ)',
          },
          {
            label: 'คู่กับ FROM / TO / WITH / ABOUT',
            rule: 'แตกต่างจาก / คล้ายกับ / พอใจกับ / กังวลเกี่ยวกับ',
            example:
              'different from, prevent from, suffer from  |  similar to, belong to, listen to, look forward to (+ V.ing!)  |  satisfied with, agree with, angry with  |  worried about, excited about',
            translation: '⚠️ ดอกจันล้านดวง: look forward to + V.ing (ตั้งตารอคอย)',
          },
        ],
      },
      {
        heading: '3. Phrasal Verbs (กริยาวลี) ที่ต้องรู้ก่อนเข้าห้องสอบ',
        rows: [
          {
            label: 'ตระกูล LOOK',
            rule: 'เปลี่ยนบุพบท ความหมายเปลี่ยนทันที',
            example:
              'look after (= take care of ดูแล), look for (มองหา), look up (ค้นคำศัพท์ในพจนานุกรม), look out! (= be careful ระวัง!), look forward to + V.ing (ตั้งตารอ)',
            translation: 'She looks after her little brother. (เธอดูแลน้องชาย)',
          },
          {
            label: 'ตระกูล GIVE / PUT / TURN / RUN',
            rule: 'ออกสอบทั้งพาร์ท Conversation และ Cloze Test',
            example:
              'give up (ยอมแพ้/เลิกทำ), put off (= postpone เลื่อนออกไป), put out (ดับไฟ), put on (สวมใส่), take off (ถอดออก/เครื่องบินขึ้น), turn on/off (เปิด/ปิดไฟ), turn up/down (เพิ่ม/ลดเสียง), run out of (หมดเกลี้ยง)',
            translation: 'We ran out of milk. (นมของพวกเราหมดเกลี้ยงแล้ว)',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ I look forward to meet you soon.',
        right: '✅ I look forward to meeting you soon.',
        why: 'คำว่า to ใน look forward to เป็นคำบุพบท (Preposition) ดังนั้นกริยาที่ตามมาต้องเป็น V.ing เสมอ!',
      },
      {
        wrong: '❌ My culture is different with yours.',
        right: '✅ My culture is different from yours. (แต่ similar คู่กับ to)',
        why: 'different ต้องคู่กับ from เสมอ ส่วน similar คู่กับ to',
      },
    ],
  },
  {
    id: 'tenses-overview',
    title: 'โครงสร้าง Tenses & คำบอกเวลา (Tenses & Time Signals)',
    shortTitle: 'โครงสร้าง Tenses',
    icon: '⏱️',
    badge: 'เช็กคำบอกเวลา = ตอบได้เลย',
    summaryFormula:
      '1. ขีดเส้นใต้คำบอกเวลา (Time Signal) ในโจทย์ ➔ 2. เช็กว่าประธานเป็นเอกพจน์หรือพหูพจน์ ➔ 3. จับคู่โครงสร้างกริยาให้ตรงเวลา',
    memoryTip:
      'เห็น yesterday / last / ago / in+ปีอดีต ➔ ตอบ V.2 ทันที! • เห็น since / for / already / yet / just / so far ➔ ตอบ have/has + V.3 ทันที!',
    relatedUnitNumber: 3,
    sections: [
      {
        heading: '1. ปัจจุบัน (Present Tenses — ความจริง กิจวัตร และสิ่งที่กำลังทำ)',
        rows: [
          {
            label: 'Present Simple',
            rule: 'S + V.1 (ประธานเอกพจน์ เติม s/es)  |  ปฏิเสธ/คำถามใช้ do/does + V.inf',
            example: 'always, usually, often, every day/week, once a week, ความจริงตามธรรมชาติ (Water boils at 100°C)',
            translation: 'ใช้กับกิจวัตรประจำวัน ความจริงเสมอ และตารางเวลาเดินรถ/เครื่องบิน',
          },
          {
            label: 'Present Continuous',
            rule: 'S + is / am / are + V.ing',
            example: 'now, right now, at the moment, at present, Look!, Listen!, Be quiet!',
            translation: 'กำลังเกิดขึ้นเดี๋ยวนี้ในขณะที่พูด (เช่น Look! It is raining.)',
          },
          {
            label: 'Present Perfect',
            rule: 'S + have / has + V.3',
            example: 'since (+จุดเริ่ม), for (+ระยะเวลา), just, already, yet (ท้ายประโยคปฏิเสธ/คำถาม), ever, never, recently, so far, many times',
            translation: 'ทำตั้งแต่อดีตต่อเนื่องมาถึงปัจจุบัน หรือเพิ่งทำเสร็จ/เคยทำ',
          },
        ],
      },
      {
        heading: '2. อดีต (Past Tenses — จบไปแล้ว / กำลังทำในอดีตแล้วมีเหตุการณ์แทรก)',
        rows: [
          {
            label: 'Past Simple',
            rule: 'S + V.2  |  ปฏิเสธ/คำถามใช้ did + V.inf (ระวัง! หลัง did กริยากลับเป็น V.1 เสมอ)',
            example: 'yesterday, last night/week/year, ...ago (two days ago), in 2022, when I was young',
            translation: 'เกิดและจบไปแล้วในอดีต มีเวลาอดีตระบุชัดเจน',
          },
          {
            label: 'Past Continuous คู่กับ Past Simple (เหตุการณ์แทรก!)',
            rule: 'กำลังทำอยู่ก่อน (ยาว) = was/were + V.ing  |  เข้ามาแทรก (สั้น) = V.2',
            example: 'While I was sleeping (ยาว), the phone rang (แทรก). / I was walking home when it started to rain.',
            translation: 'สูตรจำ: หลัง while + was/were V.ing  |  หลัง when + V.2',
          },
          {
            label: 'Past Perfect (เกิดก่อนอีกเหตุการณ์ในอดีต)',
            rule: 'เกิดก่อน = had + V.3  |  เกิดทีหลัง = V.2',
            example: 'The train had left before we arrived at the station.',
            translation: 'รถไฟออกไปเสร็จก่อนแล้ว (had left) พวกเราถึงเพิ่งมาถึง (arrived)',
          },
        ],
      },
      {
        heading: '3. อนาคต (Future Forms)',
        rows: [
          {
            label: 'Future Simple',
            rule: 'S + will + V.inf  |  S + is/am/are going to + V.inf (วางแผนไว้แล้ว/มีเค้าลางชัดเจน)',
            example: 'tomorrow, next week/month/year, soon, in the future, I think / I hope / I promise + will V.inf',
            translation: 'Look at those dark clouds! It is going to rain. (มีหลักฐานเห็นเมฆดำ)',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ She didn’t went to school yesterday.',
        right: '✅ She didn’t go to school yesterday.',
        why: 'เมื่อมีกริยาช่วย did / didn’t แล้ว กริยาแท้ข้างหลังต้องกลับเป็นรูปเดิม (V.inf = go) ห้ามใช้ V.2 ซ้ำ!',
      },
      {
        wrong: '❌ I lived here since 2019.',
        right: '✅ I have lived here since 2019.',
        why: 'เจอ since + จุดเริ่มต้น หรือ for + ระยะเวลา ที่ยังอยู่ต่อเนื่องถึงปัจจุบัน ต้องใช้ have/has + V.3 เสมอ',
      },
    ],
  },
  {
    id: 'connectors',
    title: 'คำเชื่อมประโยค (Connectors & Conjunctions)',
    shortTitle: 'คำเชื่อม (Connectors)',
    icon: '🔗',
    badge: 'ออกสอบทุกปี 100%',
    summaryFormula:
      'อ่านใจความ 2 ฝั่ง (เหตุผล / ผลลัพธ์ / ขัดแย้ง) + เช็กโครงสร้างหลังช่องว่างว่าเป็น “ประโยค (S + V)” หรือ “คำนาม (Noun / V.ing)”',
    memoryTip:
      'ถ้าหลังช่องว่างมีเครื่องหมาย Comma (,) เช่น “. ____, S + V” ➔ ตอบตระกูล However, / Therefore, / Moreover, ทันที! • ถ้าหลังช่องว่างเป็นแค่กลุ่มคำนาม (ไม่มีกริยา) ➔ ตอบ because of หรือ despite!',
    relatedUnitNumber: 101,
    sections: [
      {
        heading: 'ตารางเปรียบเทียบคำเชื่อม 4 ตระกูลหลัก',
        rows: [
          {
            label: '1. บอกเหตุผล (เพราะว่า...)',
            rule: 'because / since / as + ประโยค (S + V)  ↔  because of / due to + คำนาม (Noun / V.ing)',
            example: 'We stayed inside because it rained heavily. / We stayed inside because of the heavy rain.',
            translation: 'it rained มีกริยาใช้ because | the heavy rain เป็นคำนามใช้ because of',
          },
          {
            label: '2. บอกความขัดแย้ง (แม้ว่า... / แต่... / อย่างไรก็ตาม)',
            rule: 'although / even though + S + V  ↔  despite / in spite of + Noun / V.ing  |  . However, + S + V',
            example: 'Although he was tired, he kept working. / Despite his tiredness, he kept working.',
            translation: 'ห้ามใช้ despite ตามด้วย S + V และห้ามใส่ but ซ้ำในประโยคที่มี although แล้ว!',
          },
          {
            label: '3. บอกผลลัพธ์ (ดังนั้น...)',
            rule: ', so + S + V  |  . Therefore, / . As a result, + S + V',
            example: 'He woke up late, so he missed the bus. / He woke up late. Therefore, he missed the bus.',
            translation: 'Therefore มักขึ้นต้นประโยคใหม่และมี Comma (,) ตามหลังเสมอ',
          },
          {
            label: '4. บอกการเสริมข้อมูล & เงื่อนไข',
            rule: 'Moreover, / Furthermore, / In addition, (ยิ่งไปกว่านั้น)  |  unless + S + V (= if...not ถ้าไม่)',
            example: 'You will fail the test unless you study hard. (= if you don’t study hard)',
            translation: 'หลัง unless ห้ามใส่ not ซ้ำ เพราะตัวมันแปลว่า “ถ้า...ไม่” อยู่แล้ว',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ Despite the weather was bad, the flight took off.',
        right: '✅ Although the weather was bad, ... (หรือ Despite the bad weather, ...)',
        why: 'the weather was bad มีประธาน+กริยา (was) ต้องใช้ Although ส่วน Despite ตามด้วยคำนามเท่านั้น',
      },
    ],
  },
  {
    id: 'core-structures',
    title: 'โครงสร้างออกสอบทุกปี (Passive Voice, If-Clause, Gerund/Infinitive & การเปรียบเทียบ)',
    shortTitle: 'Passive • If • เปรียบเทียบ',
    icon: '⚙️',
    badge: '4 หัวใจไวยากรณ์ ม.3',
    summaryFormula:
      'Passive = be + V.3 (ถูกกระทำ)  |  If-Clause = จับคู่กริยา 2 ฝั่ง  |  Comparisons = as...as / -er than / the -est',
    memoryTip:
      'ประธานเป็นสิ่งของ/อาคาร/หนังสือ (ทำเองไม่ได้) ➔ ตอบ Passive (be + V.3) ทันที! • เจอ than ตอบขั้นกว่า (-er/more) • เจอ the ข้างหน้า + in/of ข้างหลัง ตอบขั้นสุด (-est/most)!',
    relatedUnitNumber: 103,
    sections: [
      {
        heading: '1. Passive Voice (ประธานถูกกระทำ: V.to be + V.3)',
        rows: [
          {
            label: 'Present Passive (ถูกทำในปัจจุบัน/ความจริง)',
            rule: 'S + is / am / are + V.3 (+ by...)',
            example: 'English is spoken all over the world. / Rice is grown in Thailand.',
            translation: 'ภาษาอังกฤษถูกพูด / ข้าวถูกปลูก',
          },
          {
            label: 'Past Passive (ถูกสร้าง/ถูกคิดค้น/ถูกเขียนในอดีต)',
            rule: 'S + was / were + V.3 (+ by... / in + ปีอดีต)',
            example: 'This temple was built 200 years ago. / The telephone was invented by Bell.',
            translation: 'ออกสอบ O-NET บ่อยที่สุด! (was/were + V.3)',
          },
          {
            label: 'Modal / Present Perfect Passive',
            rule: 'will / can / should / must + be + V.3  |  have / has + been + V.3',
            example: 'The rules must be followed. / The car has been repaired.',
            translation: 'กฎต้องถูกปฏิบัติตาม / รถได้รับการซ่อมแล้ว',
          },
        ],
      },
      {
        heading: '2. ประโยคเงื่อนไข If-Clause (ออกสอบ Type 1 & Type 2)',
        rows: [
          {
            label: 'Type 0 (ความจริงทางวิทยาศาสตร์/ธรรมชาติ)',
            rule: 'If + Present Simple (V.1), Present Simple (V.1)',
            example: 'If you heat ice, it melts.',
            translation: 'ถ้าคุณให้ความร้อนน้ำแข็ง มันจะละลาย',
          },
          {
            label: 'Type 1 (เป็นไปได้จริงในปัจจุบัน/อนาคต)',
            rule: 'If + Present Simple (V.1 เอกพจน์เติม s/es), S + will / can + V.inf (หรือประโยคคำสั่ง)',
            example: 'If it rains tomorrow, we will stay at home.',
            translation: 'ห้ามใส่ will ในฝั่งที่มีคำว่า If เด็ดขาด!',
          },
          {
            label: 'Type 2 (สมมติสิ่งที่เป็นไปไม่ได้ในปัจจุบัน)',
            rule: 'If + Past Simple (V.2 / ใช้ were กับทุกประธาน), S + would / could + V.inf',
            example: 'If I were you, I would apologize to her. / If I had a lot of money, I would buy a house.',
            translation: 'ถ้าฉันเป็นคุณ (ซึ่งเป็นไปไม่ได้) ฉันจะขอโทษเธอ',
          },
        ],
      },
      {
        heading: '3. การเปรียบเทียบ 3 ระดับ (Comparisons)',
        rows: [
          {
            label: 'ขั้นเท่ากัน (Positive)',
            rule: 'as + Adj/Adv รูปปกติ (ห้ามเติม -er/-est/more) + as',
            example: 'John is as tall as Peter. / This box is not as heavy as that one.',
            translation: 'เห็น as ____ as ต้องเลือกคำคุณศัพท์รูปธรรมดาเสมอ!',
          },
          {
            label: 'ขั้นกว่า (Comparative — เปรียบเทียบ 2 สิ่ง)',
            rule: 'คำสั้นเติม -er + than  |  คำยาวใช้ more + Adj/Adv + than  |  ขยายให้เข้มขึ้นใช้ much / far / a lot นำหน้าขั้นกว่า',
            example: 'cheaper than, more expensive than, much better than',
            translation: 'เปลี่ยนรูปพิเศษ: good/well ➔ better, bad ➔ worse, far ➔ farther/further',
          },
          {
            label: 'ขั้นสุด (Superlative — ที่สุดในกลุ่ม 3+)',
            rule: 'the + คำสั้นเติม -est  |  the most + คำยาว (มักมี in the world, in class, of all, I have ever seen)',
            example: 'the tallest boy in the class, the most interesting movie I have ever watched',
            translation: 'เปลี่ยนรูปพิเศษ: the best, the worst, the farthest/furthest, the least',
          },
        ],
      },
      {
        heading: '4. Gerund (V.ing) vs Infinitive (to + V.1 / V.inf)',
        rows: [
          {
            label: 'กริยาที่ตามด้วย V.ing เสมอ',
            rule: 'enjoy, finish, mind, avoid, keep, practice, suggest, give up, postpose + V.ing (รวมถึงหลังบุพบททุกตัว!)',
            example: 'I enjoy reading books. / Would you mind opening the window?',
            translation: 'หลัง mind / enjoy / finish ต้องเป็น V.ing เสมอ',
          },
          {
            label: 'กริยาที่ตามด้วย to + V.1 เสมอ',
            rule: 'want, decide, hope, plan, promise, agree, refuse, need, learn, offer + to V.1',
            example: 'She decided to study abroad. / He promised to help me.',
            translation: 'บอกความต้องการหรือแผนในอนาคต มักใช้ to + V.1',
          },
          {
            label: 'ตามด้วย V.inf (ไม่เติม to และไม่เติม -ing)',
            rule: 'หลัง Modal Verbs (can, could, will, would, should, must) และหลัง let / make / help + คน + V.inf',
            example: 'My mom made me clean my room. / Let me help you carry this.',
            translation: 'หลัง let / make + กรรม ต้องตามด้วยกริยาช่อง 1 ไม่ผัน!',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ If it will rain tomorrow, I will stay home.',
        right: '✅ If it rains tomorrow, I will stay home.',
        why: 'ในอนุประโยคหลัง If (If-Clause Type 1) ห้ามใช้ will ต้องใช้ Present Simple (rains) แทน',
      },
      {
        wrong: '❌ This exam is more easier than the last one.',
        right: '✅ This exam is much easier than the last one.',
        why: 'easier เป็นขั้นกว่าอยู่แล้ว ห้ามใส่ more ซ้ำ! ถ้าจะเน้นว่า “ง่ายกว่ามาก” ให้ใช้ much easier',
      },
    ],
  },
  {
    id: 'quantifiers-agreement',
    title: 'คำบอกปริมาณ & ความสอดคล้องประธาน-กริยา (Quantifiers & S-V Agreement)',
    shortTitle: 'คำบอกปริมาณ & S-V',
    icon: '📏',
    badge: 'ระวังนามนับไม่ได้!',
    summaryFormula:
      'นามนับได้พหูพจน์ = many / a few / fewer (+ V.พหูพจน์)  |  นามนับไม่ได้ = much / a little / less (+ V.เอกพจน์เสมอ!)',
    memoryTip:
      'ท่องนามนับไม่ได้ 8 คำปราบเซียน O-NET: “information (ข้อมูล), advice (คำแนะนำ), furniture (เฟอร์นิเจอร์), luggage/baggage (สัมภาระ), equipment (อุปกรณ์), news (ข่าว), homework, money” ➔ ห้ามเติม -s และใช้กริยาเอกพจน์ (is/was/has) เสมอ!',
    relatedUnitNumber: 22,
    sections: [
      {
        heading: '1. คำบอกปริมาณ (Quantifiers)',
        rows: [
          {
            label: 'ใช้กับ “นามนับได้พหูพจน์” (Countable Plural)',
            rule: 'many (มาก), a few (พอมีอยู่บ้าง = เชิงบวก), few (แทบไม่มีเลย = เชิงลบ), fewer (น้อยกว่า), several (หลาย)',
            example: 'many students, a few friends, fewer cars',
            translation: 'ตามด้วยคำนามเติม -s หรือพหูพจน์เปลี่ยนรูป (children, people, teeth)',
          },
          {
            label: 'ใช้กับ “นามนับไม่ได้” (Uncountable Noun)',
            rule: 'much (มาก), a little (พอมีอยู่บ้าง), little (แทบไม่มีเลย), less (น้อยกว่า), a great deal of',
            example: 'much water, a little time, less sugar, a piece of advice',
            translation: 'ตามด้วยคำนามที่ไม่เติม -s และถือเป็นเอกพจน์เสมอ',
          },
          {
            label: 'ใช้ได้ทั้งคู่ (ทั้งนับได้พหูพจน์ และ นับไม่ได้)',
            rule: 'some (ประโยคบอกเล่า / ยื่นข้อเสนอ Would you like some...?), any (ประโยคปฏิเสธ / คำถาม), a lot of / lots of, plenty of',
            example: 'some water / some books  |  Do you have any questions?',
            translation: 'ข้อยกเว้น: คำถามเชิญชวน (Would you like... / Can I have...) ใช้ some!',
          },
        ],
      },
      {
        heading: '2. กฎความสอดคล้องระหว่างประธานกับกริยา (Subject-Verb Agreement)',
        rows: [
          {
            label: 'Everyone / Somebody / Nobody / Anything + V.เอกพจน์',
            rule: 'คำสรรพนามไม่ชี้เฉพาะทุกตัว ถือเป็นเอกพจน์เสมอ!',
            example: 'Everyone in the room is happy. / Nobody knows the answer.',
            translation: 'แม้ความหมายจะแปลว่า “ทุกคน” แต่กริยาต้องใช้ is / was / has / V.เติม s',
          },
          {
            label: 'A number of vs The number of',
            rule: 'A number of + N.พหูพจน์ + V.พหูพจน์ (แปลว่า “จำนวนมาก”)  ↔  The number of + N.พหูพจน์ + V.เอกพจน์ (แปลว่า “ตัวเลขจำนวนของ...”)',
            example: 'A number of students are absent. / The number of students is 40.',
            translation: 'จำง่าย: A = พหูพจน์ (are/have)  |  The = เอกพจน์ (is/has)',
          },
          {
            label: 'ประธานที่มีส่วนขยายคั่นกลาง (with / along with / as well as / of)',
            rule: 'ให้ดูที่ “ประธานตัวหน้าสุด” เสมอ (ตัดส่วนขยายหลัง with / as well as / of ทิ้งก่อนเลือกกริยา)',
            example: 'The teacher, along with her students, is going to the museum.',
            translation: 'ประธานที่แท้จริงคือ The teacher (คนเดียว) จึงใช้ is',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ He gave me many good advices.',
        right: '✅ He gave me much good advice. (หรือ many good pieces of advice)',
        why: 'advice เป็นคำนามนับไม่ได้ ห้ามเติม -s และห้ามใช้คู่กับ many',
      },
      {
        wrong: '❌ The news about the accident are shocking.',
        right: '✅ The news about the accident is shocking.',
        why: 'news ลงท้ายด้วย s แต่เป็นคำนามนับไม่ได้เอกพจน์เสมอ (เหมือน mathematics, physics, economics)',
      },
    ],
  },
];
