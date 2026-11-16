// QUICK GRAMMAR CHEAT SHEETS (คัมภีร์ข้างกาย — แยกหมวดหมู่ชัดเจน อ่านง่าย เปิดดูง่าย)

export type CheatSheetCategory = 'foundation' | 'verbs_tenses' | 'onet_core';

export interface CheatSheetRow {
  label: string;
  rule: string;
  example: string;
  translation?: string;
  highlight?: string;
}

export interface CheatSheetSection {
  heading: string;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose';
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
  category: CheatSheetCategory;
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

export const CHEAT_SHEET_CATEGORIES: { key: 'all' | CheatSheetCategory; label: string }[] = [
  { key: 'all', label: '🌟 ทั้งหมด (14 เรื่อง)' },
  { key: 'foundation', label: '📘 พื้นฐานคำ & นาม (4)' },
  { key: 'verbs_tenses', label: '⚡ กริยา • Modals • 12 Tenses (5)' },
  { key: 'onet_core', label: '🎯 พิชิตข้อสอบ O-NET (5)' },
];

export const QUICK_GRAMMAR_CHEAT_SHEETS: QuickGrammarCheatSheet[] = [
  // ═════════════════════════════════════════════════════════════════════════
  // หมวดที่ 1: พื้นฐานคำ, คำนาม, เอกพจน์-พหูพจน์, สรรพนาม (FOUNDATION)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'parts-of-speech',
    category: 'foundation',
    title: 'Parts of Speech ครบทั้ง 8 ชนิด (หน้าที่ + ตำแหน่ง + คำลงท้าย)',
    shortTitle: 'Parts of Speech (8 ชนิด)',
    icon: '🧩',
    badge: 'พื้นฐาน + O-NET Unit 4',
    summaryFormula: 'หลัง a/the/adj. = Noun | หน้า Noun หรือหลัง be/feel = Adj. | ขยายกริยา = Adv. (-ly)',
    memoryTip: 'จำคำลงท้าย (Suffix): -tion/-ment/-ness = Noun | -ful/-ive/-al/-ous = Adj. | -ly = Adv. | คนรู้สึก = -ed / สิ่งของน่า... = -ing',
    relatedUnitNumber: 104,
    sections: [
      {
        heading: '1–4. กลุ่มคำหลัก (Content Words: Noun, Pronoun, Verb, Adjective)',
        color: 'blue',
        rows: [
          {
            label: '1. Noun (คำนาม — คน สัตว์ สิ่งของ สถานที่ ความคิด)',
            rule: 'หน้าที่: ประธาน (Subject) หรือ กรรม (Object) • วางหลัง a/an/the/my/of/Adj.\n• Suffix: -tion, -sion, -ment, -ness, -ity, -er/-or',
            example: 'The spacious library provides great happiness.',
            translation: 'library (สถานที่) และ happiness (ความสุข) เป็นคำนาม',
          },
          {
            label: '2. Pronoun (คำสรรพนาม — ใช้แทนคำนาม)',
            rule: 'I, you, we, they, he, she, it / me, him, her / my, your / myself',
            example: 'They asked me to help them.',
            translation: 'ใช้แทนชื่อคนหรือสิ่งของเพื่อไม่ให้พูดซ้ำ',
          },
          {
            label: '3. Verb (คำกริยา — แสดงการกระทำหรือสถานะ)',
            rule: 'วางหลังประธาน (Subject) • เปลี่ยนรูปตาม Tense (V.1 / V.2 / V.3)\n• กริยาแท้ (walk, eat) vs กริยาเชื่อม (is/am/are, feel, seem, look)',
            example: 'The principal walked calmly into the hall.',
            translation: 'walked เป็นคำกริยาแสดงการกระทำ',
          },
          {
            label: '4. Adjective (คำคุณศัพท์ — ขยายคำนาม)',
            rule: 'วาง "หน้าคำนาม" หรือ "หลัง Linking Verb (be, feel, seem, look)"\n• Suffix: -ful, -less, -ous, -ive, -al, -able, -ic\n• คนรู้สึก = V-ed (excited) | สิ่งของน่า... = V-ing (exciting)',
            example: 'The documentary was deeply educational.',
            translation: 'educational (Adj.) วางหลัง was เพื่อบอกลักษณะของสารคดี',
          },
        ],
      },
      {
        heading: '5–8. กลุ่มคำขยายและคำเชื่อม (Adverb, Preposition, Conjunction, Interjection)',
        color: 'emerald',
        rows: [
          {
            label: '5. Adverb (คำกริยาวิเศษณ์ — ขยาย Verb / Adj. / Adv.)',
            rule: 'บอกอาการ (ลงท้าย -ly: calmly, clearly) • บอกความถี่ (always, rarely) • บอกเวลา/สถานที่',
            example: 'The teacher explained the rules very clearly.',
            translation: 'clearly ขยาย explained (อธิบายอย่างชัดเจน) / very ขยาย clearly',
          },
          {
            label: '6. Preposition (คำบุพบท — บอกตำแหน่ง เวลา ทิศทาง)',
            rule: 'วางหน้า Noun / V-ing: in, on, at, by, for, with, from, about, to, of',
            example: 'Worried about spending too much time on running.',
            translation: 'หลังบุพบท (about, on) ต้องเป็นคำนามหรือ V-ing เสมอ',
          },
          {
            label: '7. Conjunction (คำสันธาน — เชื่อมคำหรือประโยค)',
            rule: 'and, but, or, so, because, although, unless, while, when',
            example: 'Although he is 61, he runs fast.',
            translation: 'ใช้เชื่อม 2 อนุประโยคเข้าด้วยกัน',
          },
          {
            label: '8. Interjection (คำอุทาน — แสดงอารมณ์ความรู้สึก)',
            rule: 'วางต้นประโยค มีเครื่องหมายตกใจ (!) หรือลูกน้ำ (,): Wow!, Oh!, Ouch!, Hurray!',
            example: 'Wow! That movie was fantastic.',
            translation: 'ว้าว! หนังเรื่องนั้นยอดเยี่ยมมาก',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ The room is cleanly. / She felt happily.',
        right: '✅ The room is clean. / She felt happy.',
        why: 'หลัง Verb to be และ feel/seem/look ต้องเป็น Adjective ห้ามใช้ -ly!',
      },
    ],
  },

  {
    id: 'nouns-countable',
    category: 'foundation',
    title: '1. Countable & Uncountable Nouns (นามนับได้ / นับไม่ได้ & คำบอกปริมาณ)',
    shortTitle: 'นามนับได้ / ไม่ได้',
    icon: '🍎',
    badge: 'พื้นฐานสำคัญ',
    summaryFormula: 'นับได้ (พหูพจน์): many / a few / few | นับไม่ได้ (เอกพจน์เสมอ): much / a little / little | ใช้ได้ทั้งคู่: some / any / a lot of',
    memoryTip: 'นามนับไม่ได้ (water, money, information, advice, equipment, homework, news) ห้ามใส่ a/an และห้ามเติม -s เด็ดขาด! ใช้กริยาเอกพจน์ (is/was)',
    sections: [
      {
        heading: '1. ความแตกต่างระหว่าง Countable vs Uncountable Nouns',
        color: 'blue',
        rows: [
          {
            label: 'Countable Nouns (คำนามนับได้)',
            rule: 'นับเป็นชิ้น/อัน/คนได้ • มีทั้งรูปเอกพจน์ (a book) และพหูพจน์ (two books)',
            example: 'There are three books on the desk.',
            translation: 'เติม a/an นำหน้าเอกพจน์ได้ และเติม s/es เมื่อมีมากกว่า 1',
          },
          {
            label: 'Uncountable Nouns (คำนามนับไม่ได้)',
            rule: 'ของเหลว/ผง/มวลสาร/นามธรรม: water, milk, rice, sugar, money, time, information, advice, equipment, news, homework, furniture',
            example: 'The computer lab has modern equipment. (ห้าม equipments!)',
            translation: 'เป็นเอกพจน์เสมอ ใช้คู่กับ is / was / has (ห้ามเติม a/an หรือ -s)',
          },
        ],
      },
      {
        heading: '2. Quantifiers (คำบอกปริมาณที่ใช้คู่กัน)',
        color: 'emerald',
        rows: [
          {
            label: 'many / a few / few + นามนับได้พหูพจน์',
            rule: 'many (มาก) | a few (มีบ้างเล็กน้อย พอใช้) | few (น้อยมาก แทบไม่มี)',
            example: 'There are a few students in the library.',
            translation: 'students เติม s (นับได้พหูพจน์) จึงใช้ a few / many',
          },
          {
            label: 'much / a little / little + นามนับไม่ได้',
            rule: 'much (มาก) | a little (มีบ้างเล็กน้อย) | little (น้อยมาก แทบไม่มี)',
            example: 'I do not have much money left.',
            translation: 'money นับไม่ได้ จึงใช้ much / a little',
          },
          {
            label: 'some / any / a lot of (ใช้ได้ทั้งนับได้พหูพจน์และนับไม่ได้)',
            rule: 'some (บอกเล่า/ขอร้อง) | any (ปฏิเสธ/คำถาม) | a lot of (จำนวนมาก)',
            example: 'Do you have any advice? / Yes, I have some.',
            translation: 'advice นับไม่ได้ ใช้ any ในคำถาม และ some ในบอกเล่า',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ He gave me many advices / an information.',
        right: '✅ He gave me much advice / some information.',
        why: 'advice, information, news, equipment, homework เป็นนามนับไม่ได้ ห้ามใส่ a/an และห้ามเติม s',
      },
    ],
  },

  {
    id: 'nouns-plural',
    category: 'foundation',
    title: '2. Singular & Plural Nouns (เอกพจน์ ➔ พหูพจน์ ทั้งปกติและเปลี่ยนรูป)',
    shortTitle: 'เอกพจน์-พหูพจน์',
    icon: '📚',
    badge: 'พื้นฐานสำคัญ',
    summaryFormula: 'ทั่วไปเติม -s | ลงท้าย s,ss,sh,ch,x,z เติม -es | พยัญชนะ+y เปลี่ยนเป็น -ies | f/fe เปลี่ยนเป็น -ves | เปลี่ยนรูปพิเศษต้องจำ!',
    memoryTip: 'ระวังคำรูปคงเดิม (Singular = Plural): sheep, deer, fish (โดยทั่วไป), series, species และคำเปลี่ยนรูปที่ออกบ่อย: child ➔ children, person ➔ people',
    sections: [
      {
        heading: '1. กฎการเติม s / es / ies / ves (Regular Plurals)',
        color: 'blue',
        rows: [
          {
            label: 'เติม -s ได้เลย (ทั่วไป)',
            rule: 'คำนามทั่วไป และคำลงท้ายด้วย สระ (a,e,i,o,u) + y',
            example: 'book ➔ books  |  day ➔ days  |  boy ➔ boys',
            translation: 'boy หน้า y เป็นสระ o เติม s ได้เลย',
          },
          {
            label: 'เติม -es (ลงท้าย s, ss, sh, ch, x, z, และ o บางคำ)',
            rule: 'bus ➔ buses | class ➔ classes | dish ➔ dishes | watch ➔ watches | box ➔ boxes',
            example: 'tomato ➔ tomatoes  |  potato ➔ potatoes  |  hero ➔ heroes',
            translation: 'ยกเว้น photo ➔ photos, piano ➔ pianos',
          },
          {
            label: 'พยัญชนะ + y ➔ ตัด y เติม -ies',
            rule: 'city ➔ cities | baby ➔ babies | story ➔ stories | country ➔ countries',
            example: 'Bangkok is one of the largest cities.',
            translation: 'หลัง one of the... ต้องใช้คำนามพหูพจน์ (cities)',
          },
          {
            label: 'ลงท้าย f / fe ➔ เปลี่ยนเป็น -ves',
            rule: 'knife ➔ knives | leaf ➔ leaves | wife ➔ wives | life ➔ lives | thief ➔ thieves',
            example: 'Autumn leaves are falling.',
            translation: 'ยกเว้น roof ➔ roofs, safe ➔ safes',
          },
        ],
      },
      {
        heading: '2. คำนามเปลี่ยนรูปพิเศษ (Irregular Plurals) — ออกสอบบ่อย!',
        color: 'amber',
        rows: [
          {
            label: 'เปลี่ยนสระ / เปลี่ยนคำใหม่เลย',
            rule: 'man ➔ men | woman ➔ women | child ➔ children | person ➔ people | tooth ➔ teeth | foot ➔ feet | mouse ➔ mice',
            example: 'Many children are playing in the park.',
            translation: 'ห้ามเติม s เป็น childs หรือ peoples (ยกเว้นชนชาติ)',
          },
          {
            label: 'รูปเอกพจน์และพหูพจน์เหมือนกันเป๊ะ!',
            rule: 'sheep ➔ sheep | deer ➔ deer | fish ➔ fish | series ➔ series | aircraft ➔ aircraft',
            example: 'There are ten sheep on the farm.',
            translation: 'มีแกะ 10 ตัว แต่ sheep ห้ามเติม s',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ There are five childs and two mouses.',
        right: '✅ There are five children and two mice.',
        why: 'child และ mouse เป็นคำนามเปลี่ยนรูปพิเศษ (Irregular Plural) ห้ามเติม -s',
      },
    ],
  },

  {
    id: 'pronouns',
    category: 'foundation',
    title: '3. Pronouns ครบทั้ง 5 ช่อง (Subject, Object, Possessive, Reflexive)',
    shortTitle: 'Pronouns (5 ช่อง)',
    icon: '👥',
    badge: 'พื้นฐานสำคัญ',
    summaryFormula: 'หน้ากริยา = Subject (I, he, she, they) | หลังกริยา/บุพบท = Object (me, him, her, them) | หน้าคำนาม = Possessive Adj. (my, their)',
    memoryTip: 'หลังคำกริยา (give, ask, tell) และหลังคำบุพบท (about, for, with, to) ต้องใช้ Object Pronoun (me, us, him, her, them) เสมอ!',
    sections: [
      {
        heading: '1. ตารางเทียบสรรพนามครบทั้ง 7 ตัว × 5 รูป',
        color: 'purple',
        rows: [
          {
            label: 'Subject (ประธาน — วางหน้ากริยา)',
            rule: 'I  |  You  |  We  |  They  |  He  |  She  |  It',
            example: 'They asked me to study harder.',
            translation: 'อยู่หน้ากริยา (asked)',
          },
          {
            label: 'Object (กรรม — วางหลังกริยา / หลังบุพบท)',
            rule: 'me  |  you  |  us  |  them  |  him  |  her  |  it',
            example: 'Parents are worried about me spending time.',
            translation: 'วางหลังบุพบท about / between / for / with (O-NET 2565)',
          },
          {
            label: 'Possessive Adjective (แสดงความเป็นเจ้าของ + ต้องมีคำนามตามหลัง)',
            rule: 'my  |  your  |  our  |  their  |  his  |  her  |  its  (+ Noun)',
            example: 'I understand their concern.',
            translation: 'ต้องมีคำนาม (concern) ตามหลังเสมอ',
          },
          {
            label: 'Possessive Pronoun (แสดงความเป็นเจ้าของ — อยู่เดี่ยวๆ ไม่ต้องมีคำนาม)',
            rule: 'mine  |  yours  |  ours  |  theirs  |  his  |  hers  |  —',
            example: 'This pen is mine. (= my pen)',
            translation: 'วางท้ายประโยคได้เลย ไม่ต้องมีคำนามตามหลัง',
          },
          {
            label: 'Reflexive Pronoun (สะท้อนตัวเอง / ทำด้วยตัวเอง)',
            rule: 'myself | yourself/yourselves | ourselves | themselves | himself | herself | itself',
            example: 'Yesterday I prepared myself for the charity run.',
            translation: 'ประธานทำกับตัวเอง (I... myself — O-NET 2565 ข้อ 24)',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ Between you and I / This book is my.',
        right: '✅ Between you and me / This book is mine.',
        why: 'หลังบุพบท between ต้องใช้กรรม (me) และถ้าไม่มีคำนามตามหลังต้องใช้ mine',
      },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // หมวดที่ 2: กริยา, MODALS, 12 TENSES, IRREGULAR VERBS, VOICE (VERBS & TENSES)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'tenses',
    category: 'verbs_tenses',
    title: '12 Tenses ครบทุกโครงสร้าง (บอกเล่า • ปฏิเสธ • คำถาม + คำบอกเวลา)',
    shortTitle: '12 Tenses (ครบทุกโครงสร้าง)',
    icon: '⏱️',
    badge: 'ครบทั้ง 12 Tenses',
    summaryFormula: 'Simple = พื้นฐาน | Continuous = กำลังทำ (be + V-ing) | Perfect = ทำเสร็จแล้ว/ประสบการณ์ (have + V.3) | Perfect Cont. = ทำต่อเนื่อง (have + been + V-ing)',
    memoryTip: 'จำแกนหลัก: Present (V.1 / is,am,are / has,have) | Past (V.2 / was,were / had) | Future (will + V.inf)',
    sections: [
      {
        heading: '1. กลุ่ม PRESENT (ปัจจุบัน — 4 Tenses)',
        color: 'blue',
        rows: [
          {
            label: '1. Present Simple (กิจวัตร / ความจริง)',
            rule: 'บอกเล่า: S + V.1 (ประธานเอกพจน์เติม s/es)\nปฏิเสธ: S + do/does not + V.1  |  คำถาม: Do/Does + S + V.1?\nคำใบ้: always, usually, often, every day, these days',
            example: 'The film stands out. / They do not go.',
            translation: 'ปัจจุบันทั่วไป กริยาเอกพจน์เติม s',
          },
          {
            label: '2. Present Continuous (กำลังทำอยู่ตอนนี้)',
            rule: 'บอกเล่า: S + is/am/are + V-ing\nปฏิเสธ: S + is/am/are not + V-ing  |  คำถาม: Is/Am/Are + S + V-ing?\nคำใบ้: now, right now, at the moment, Look!',
            example: 'I am going to sleep now.',
            translation: 'กำลังเกิดขึ้น ณ ขณะที่พูด',
          },
          {
            label: '3. Present Perfect (อดีตถึงปัจจุบัน / ประสบการณ์)',
            rule: 'บอกเล่า: S + has/have + V.3\nปฏิเสธ: S + has/have not + V.3  |  คำถาม: Has/Have + S + V.3?\nคำใบ้: since, for, just, already, yet, ever, never, the best...',
            example: 'The best cinematography I have seen. (O-NET 2566)',
            translation: 'เท่าที่เคยเห็นมาจนถึงปัจจุบัน',
          },
          {
            label: '4. Present Perfect Continuous (ทำต่อเนื่องไม่หยุด)',
            rule: 'บอกเล่า: S + has/have + been + V-ing\nปฏิเสธ: S + has/have not + been + V-ing\nคำใบ้: for two hours, since morning, all day',
            example: 'She has been studying English for two hours.',
            translation: 'เรียนมาต่อเนื่อง 2 ชั่วโมงแล้วและยังเรียนอยู่',
          },
        ],
      },
      {
        heading: '2. กลุ่ม PAST (อดีต — 4 Tenses)',
        color: 'amber',
        rows: [
          {
            label: '5. Past Simple (จบไปแล้วในอดีต)',
            rule: 'บอกเล่า: S + V.2\nปฏิเสธ: S + did not + V.1  |  คำถาม: Did + S + V.1?\nคำใบ้: yesterday, last..., ago, in 2016, from 2011 to 2016',
            example: 'Smartphone ownership increased from 2011 to 2016.',
            translation: 'เหตุการณ์ในอดีตที่ระบุเวลาชัดเจน (O-NET 2568)',
          },
          {
            label: '6. Past Continuous (กำลังทำอยู่ในอดีต ณ เวลานั้น)',
            rule: 'บอกเล่า: S + was/were + V-ing\nปฏิเสธ: S + was/were not + V-ing  |  คำถาม: Was/Were + S + V-ing?\nคำใบ้: while / when (กำลังทำอยู่ แล้วมีอีกเหตุการณ์ V.2 มาแทรก)',
            example: 'I was sleeping when the phone rang.',
            translation: 'กำลังนอนอยู่ (ยาว) ตอนโทรศัพท์ดัง (แทรก)',
          },
          {
            label: '7. Past Perfect (เกิดก่อนเหตุการณ์อื่นในอดีต)',
            rule: 'บอกเล่า: S + had + V.3\nปฏิเสธ: S + had not + V.3  |  คำถาม: Had + S + V.3?\nคำใบ้: before, after, by the time (เกิดก่อน = had+V.3 / เกิดหลัง = V.2)',
            example: 'She stayed home because she had caught a fever.',
            translation: 'เป็นไข้ก่อน (had caught) แล้วจึงอยู่บ้าน (stayed)',
          },
          {
            label: '8. Past Perfect Continuous (ทำต่อเนื่องมาก่อนอีกเหตุการณ์ในอดีต)',
            rule: 'บอกเล่า: S + had + been + V-ing\nคำใบ้: for + เวลา + before + เหตุการณ์อดีต (V.2)',
            example: 'They had been waiting for an hour before the bus arrived.',
            translation: 'รอมาต่อเนื่อง 1 ชั่วโมงก่อนรถบัสจะมา',
          },
        ],
      },
      {
        heading: '3. กลุ่ม FUTURE (อนาคต — 4 Tenses)',
        color: 'emerald',
        rows: [
          {
            label: '9. Future Simple (จะเกิดขึ้นในอนาคต)',
            rule: 'บอกเล่า: S + will + V.1 (หรือ be going to + V.1)\nปฏิเสธ: S + will not (won\'t) + V.1  |  คำถาม: Will + S + V.1?\nคำใบ้: tomorrow, next week, soon, in the future',
            example: 'The sports complex will be opened next Monday.',
            translation: 'เหตุการณ์ที่จะเกิดในอนาคต',
          },
          {
            label: '10. Future Continuous (กำลังจะทำอยู่ ณ เวลานั้นในอนาคต)',
            rule: 'บอกเล่า: S + will + be + V-ing\nคำใบ้: at this time tomorrow, at 8 p.m. tonight',
            example: 'At 9 a.m. tomorrow, we will be taking the O-NET exam.',
            translation: 'พรุ่งนี้ตอน 9 โมงเช้า เรากำลังจะสอบอยู่',
          },
          {
            label: '11. Future Perfect (จะทำเสร็จสมบูรณ์ภายในเวลาในอนาคต)',
            rule: 'บอกเล่า: S + will + have + V.3\nคำใบ้: by + เวลาในอนาคต (by tomorrow, by next year)',
            example: 'By next month, she will have finished the course.',
            translation: 'ภายในเดือนหน้า เธอก็จะเรียนจบคอร์สแล้ว',
          },
          {
            label: '12. Future Perfect Continuous (จะทำต่อเนื่องครบเวลาในอนาคต)',
            rule: 'บอกเล่า: S + will + have + been + V-ing\nคำใบ้: by + เวลาในอนาคต + for + ระยะเวลา',
            example: 'By 2027, I will have been teaching here for 10 years.',
            translation: 'ถึงปี 2027 ฉันจะสอนที่นี่ครบ 10 ปีพอดี',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ Did he went home? / She didn\'t went.',
        right: '✅ Did he go home? / She didn\'t go.',
        why: 'เมื่อมี Did / didn\'t แล้ว กริยาแท้ต้องกลับเป็นรูป V.1 (ไม่ผัน) เสมอ!',
      },
    ],
  },

  {
    id: 'modals-sva',
    category: 'verbs_tenses',
    title: 'Modal Verbs ครบทุกตัว + กฎ Subject-Verb Agreement',
    shortTitle: 'Modal Verbs (ครบทุกตัว)',
    icon: '⚙️',
    badge: 'ครบทุกตัว + พื้นฐาน',
    summaryFormula: 'Modal Verb + V.inf (ไม่เติม s, ed, ing, to!) | Modal Passive: Modal + be + V.3',
    memoryTip: 'กฎเหล็ก 3 ข้อของ Modal: 1) ห้ามเติม -s ที่ Modal (ห้าม cans/musts) 2) ตามด้วย V.1 ไม่ผันเสมอ 3) ทำเป็นประโยคคำถาม/ปฏิเสธได้ด้วยตัวเอง (can\'t, mustn\'t)',
    sections: [
      {
        heading: '1. Modal Verbs แยกตามหน้าที่ (ครบทุกตัวที่ออกสอบ)',
        color: 'blue',
        rows: [
          {
            label: 'can / could / be able to (ความสามารถ & ขออนุญาต)',
            rule: 'can = สามารถ (ปัจจุบัน) | could = สามารถ (อดีต) หรือ ขออนุญาตอย่างสุภาพ',
            example: 'Participants can register from November 1st onward.',
            translation: 'ผู้เข้าร่วมสามารถลงทะเบียนได้ (can + V.1)',
          },
          {
            label: 'may / might (การขออนุญาต & การคาดเดาความเป็นไปได้)',
            rule: 'may = อาจจะ / ขออนุญาต (สุภาพ) | might = อาจจะ (มั่นใจน้อยกว่า may)',
            example: 'It might rain this afternoon, so take an umbrella.',
            translation: 'บ่ายนี้อาจจะฝนตก (ความเป็นไปได้)',
          },
          {
            label: 'must / have to (ความจำเป็น / ข้อบังคับ)',
            rule: 'must = ต้อง (บังคับเด็ดขาด) • mustn\'t = ห้ามทำ!\nhave to = จำเป็นต้อง (ปฏิเสธ don\'t have to = ไม่จำเป็นต้อง)',
            example: 'All forms must be returned. / I have to get up early.',
            translation: 'must + be + V.3 (Passive) / have to + V.1',
          },
          {
            label: 'should / ought to / had better (คำแนะนำ & เตือน)',
            rule: 'should / ought to = ควรจะ | had better = ควรจะ...ดีกว่า (เชิงเตือนว่าถ้าไม่ทำอาจเกิดผลเสีย)',
            example: 'You should review the notes. / You had better hurry.',
            translation: 'had better แม้หน้าตาเหมือนอดีต แต่ใช้พูดถึงปัจจุบัน/อนาคต + V.1',
          },
          {
            label: 'will / would / would rather (อนาคต / ความต้องการ)',
            rule: 'will = จะ | would = จะ (สุภาพ/อดีตของ will) | would rather = อยากจะ...มากกว่า (คู่กับ than)',
            example: 'I would rather stay home than go out.',
            translation: 'ฉันอยากอยู่บ้านมากกว่าออกไปข้างนอก',
          },
          {
            label: 'used to (เคยทำในอดีต — ปัจจุบันเลิกแล้ว)',
            rule: 'used to + V.1 = เคยทำในอดีต (ระวัง: be used to + V-ing = คุ้นเคยกับ)',
            example: 'He used to play games all night.',
            translation: 'เขาเคยเล่นเกมทั้งคืน (ตอนนี้ไม่เล่นแล้ว)',
          },
        ],
      },
      {
        heading: '2. Subject-Verb Agreement (ประธาน-กริยาต้องสอดคล้องกัน)',
        color: 'emerald',
        rows: [
          {
            label: 'ประธานเอกพจน์ (He, She, It, นามนับไม่ได้, Everyone/Each)',
            rule: 'ใช้กับ is / was / has / does / V.1 เติม s-es',
            example: 'Each actor\'s performance is believable. (O-NET 2565)',
            translation: 'performance เป็นเอกพจน์ จึงใช้ is',
          },
          {
            label: 'ประธานพหูพจน์ (We, They, You, นามเติม s/es, A and B)',
            rule: 'ใช้กับ are / were / have / do / V.1 ไม่เติม s',
            example: 'The library windows are cleaned every Friday.',
            translation: 'windows เติม s (พหูพจน์) จึงใช้ are',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ You must to go. / She shoulds study.',
        right: '✅ You must go. / She should study.',
        why: 'หลัง Modal Verb (must, should, can, will, might) ห้ามใส่ to และห้ามเติม s/ed/ing',
      },
    ],
  },

  {
    id: 'irregular-verbs',
    category: 'verbs_tenses',
    title: '5. Irregular Verbs (กริยา 3 ช่องที่ออกสอบบ่อย — แยกกลุ่มจำง่าย)',
    shortTitle: 'กริยา 3 ช่อง (Irregular)',
    icon: '🔤',
    badge: 'จำเป็นต่อ Tense & Passive',
    summaryFormula: 'Past Simple ใช้ V.2  |  Present Perfect (has/have) และ Passive Voice (be) ต้องใช้ V.3 เสมอ!',
    memoryTip: 'อย่าจำสลับ V.2 กับ V.3 เด็ดขาด! เช่น wrote (V.2) vs written (V.3), saw (V.2) vs seen (V.3), went (V.2) vs gone (V.3)',
    sections: [
      {
        heading: 'กลุ่ม 1: รูปเดิมทั้ง 3 ช่อง (A – A – A)',
        color: 'blue',
        rows: [
          {
            label: 'cut – cut – cut | put – put – put | hit – hit – hit',
            rule: 'let – let – let (อนุญาต) | set – set – set (ตั้งค่า) | read – read – read (อ่าน — ออกเสียง เรด)',
            example: 'The movie is set in Chiang Mai. (set = V.3)',
            translation: 'cost (ราคา), shut (ปิด), hurt (เจ็บ) ก็ใช้รูปเดิมทั้ง 3 ช่อง',
          },
        ],
      },
      {
        heading: 'กลุ่ม 2: ช่อง 2 และ ช่อง 3 เหมือนกัน (A – B – B)',
        color: 'emerald',
        rows: [
          {
            label: 'send – sent – sent | spend – spent – spent | build – built – built',
            rule: 'catch – caught – caught | teach – taught – taught | buy – bought – bought | bring – brought – brought',
            example: 'The email was sent yesterday. (Passive ใช้ V.3: sent)',
            translation: 'feel – felt – felt | keep – kept – kept | leave – left – left | lose – lost – lost',
          },
          {
            label: 'find – found – found | have – had – had | make – made – made',
            rule: 'pay – paid – paid | say – said – said | tell – told – told | win – won – won | stand – stood – stood',
            example: 'He has learned many skills.',
            translation: 'learn สามารถใช้ได้ทั้ง learned และ learnt',
          },
        ],
      },
      {
        heading: 'กลุ่ม 3: เปลี่ยนรูปทั้ง 3 ช่อง (A – B – C) — ตัวออกข้อสอบ!',
        color: 'rose',
        rows: [
          {
            label: 'write – wrote – written | give – gave – given | take – took – taken',
            rule: 'see – saw – seen | go – went – gone | do – did – done | eat – ate – eaten',
            example: 'The best film I have seen. / The letter was written.',
            translation: 'ห้ามใช้ was wrote หรือ have saw เด็ดขาด!',
          },
          {
            label: 'begin – began – begun | speak – spoke – spoken | break – broke – broken',
            rule: 'know – knew – known | grow – grew – grown | wear – wore – worn | choose – chose – chosen',
            example: 'English is spoken all over the world.',
            translation: 'Passive Voice ใช้ช่อง 3: spoken, known, worn, chosen',
          },
        ],
      },
      {
        heading: 'กลุ่ม 4: ช่อง 1 และ ช่อง 3 เหมือนกัน (A – B – A)',
        color: 'purple',
        rows: [
          {
            label: 'come – came – come | become – became – become | run – ran – run',
            rule: 'จำง่าย: ช่อง 1 กับ 3 หน้าตาเหมือนกัน ต่างแค่ช่อง 2',
            example: 'The increases came from people aged 45–54. (O-NET 2568)',
            translation: 'came เป็น V.2 (อดีตในปี 2016)',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ The letter was wrote. / I have saw it.',
        right: '✅ The letter was written. / I have seen it.',
        why: 'หลัง Verb to be (Passive) และหลัง has/have (Perfect) ต้องเป็น V.3 เท่านั้น',
      },
    ],
  },

  {
    id: 'passive-voice',
    category: 'verbs_tenses',
    title: '6. Active & Passive Voice (เทียบโครงสร้างทุก Tense + ลดรูป)',
    shortTitle: 'Active & Passive Voice',
    icon: '🛡️',
    badge: 'Unit 3 • O-NET 100%',
    summaryFormula: 'Active: ประธานทำเอง (S + V)  |  Passive: ประธานถูกกระทำ (S + be + V.3 + by...)  |  ลดรูปขยายนาม: Noun + V.3',
    memoryTip: 'ดูประธานก่อน: ถ้าเป็น สิ่งของ / จดหมาย / หนัง / วัด (ทำเองไม่ได้) ➔ เลือกที่มี be + V.3 ทันที!',
    relatedUnitNumber: 103,
    sections: [
      {
        heading: '1. ตารางเทียบ Active vs Passive Voice แยกตาม Tense',
        color: 'blue',
        rows: [
          {
            label: 'Present Simple (ปัจจุบัน)',
            rule: 'Active: S + V.1 (s/es)\nPassive: S + is / am / are + V.3',
            example: 'The windows are cleaned every Friday.',
            translation: 'หน้าต่าง (พหูพจน์) ถูกทำความสะอาดทุกวันศุกร์',
          },
          {
            label: 'Past Simple (อดีต)',
            rule: 'Active: S + V.2\nPassive: S + was / were + V.3',
            example: 'The email was sent yesterday morning.',
            translation: 'อีเมล (เอกพจน์) ถูกส่งเมื่อเช้าวานนี้',
          },
          {
            label: 'Future Simple & Modal Verbs (อนาคต & กริยาช่วย)',
            rule: 'Active: S + will / must / can / should + V.1\nPassive: S + will / must / can / should + be + V.3',
            example: 'Forms must be returned before five o\'clock.',
            translation: 'แบบฟอร์มต้องถูกส่งคืนก่อน 5 โมง',
          },
          {
            label: 'Present Continuous & Present Perfect',
            rule: 'Cont. Passive: is/am/are + being + V.3\nPerfect Passive: has/have + been + V.3',
            example: 'The bridge is being built. / The work has been finished.',
            translation: 'กำลังถูกสร้าง / ถูกทำเสร็จเรียบร้อยแล้ว',
          },
        ],
      },
      {
        heading: '2. ลดรูป Passive ขยายคำนาม (ออก O-NET 2568 ข้อ 32!)',
        color: 'purple',
        rows: [
          {
            label: 'Noun + V.3 (ตัด who/which + is/was ออก)',
            rule: 'ถ้าประโยคมีกริยาแท้แล้ว ใช้ V.3 วางหลังคำนามเพื่อแปลว่า "ที่ถูก..." ได้เลย',
            example: 'This is the best movie released in 2023.',
            translation: 'นี่คือหนังที่ดีที่สุด ที่ถูกปล่อยออกมาในปี 2023 (O-NET 2568 ข้อ 32)',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ Somchai praised by the teacher.',
        right: '✅ Somchai was praised by the teacher.',
        why: 'มี by the teacher (ถูกชม) ต้องมี Verb to be (was) นำหน้า V.3 เสมอ',
      },
    ],
  },

  {
    id: 'gerund-infinitive',
    category: 'verbs_tenses',
    title: 'Gerund (V-ing) vs Infinitive (to + V.1)',
    shortTitle: 'V-ing vs to + V.1',
    icon: '⚡',
    badge: 'O-NET 2565–2567',
    summaryFormula: 'หลัง Preposition (about, in, on, of, for, look forward to) ➔ V-ing เสมอ! | บอกจุดประสงค์ ("เพื่อที่จะ") ➔ to + V.1',
    memoryTip: 'ดอกจันล้านดวง: look forward to + V-ing (ห้ามตอบ V.1 เด็ดขาด! ออก O-NET 2566 ข้อ 26)',
    sections: [
      {
        heading: '1. กฎบังคับใช้ V-ing (Gerund)',
        color: 'emerald',
        rows: [
          {
            label: 'หลัง Preposition (about, of, in, on, at, for, by)',
            rule: 'คำบุพบททุกตัว ต้องตามด้วย V-ing',
            example: 'Parents are worried about me spending so much time.',
            translation: 'พ่อแม่กังวลเกี่ยวกับการที่ฉันใช้เวลามากเกินไป (O-NET 2565 ข้อ 25)',
          },
          {
            label: 'look forward to + V-ing / Noun',
            rule: 'แปลว่า "ตั้งตารอคอย" (to ตัวนี้เป็น Preposition ต้องตามด้วย V-ing!)',
            example: 'I\'m really looking forward to going to school tomorrow.',
            translation: 'ฉันตั้งตารอคอยที่จะไปโรงเรียนพรุ่งนี้มาก (O-NET 2566 ข้อ 26)',
          },
        ],
      },
      {
        heading: '2. กฎบังคับใช้ to + V.1 (Infinitive)',
        color: 'amber',
        rows: [
          {
            label: 'บอกวัตถุประสงค์ ("เพื่อที่จะ...") & หลัง want/decide/ask/send',
            rule: 'Verb + (กรรม) + to + V.1 (รูปไม่ผัน)',
            example: 'She is sent away to spend some time with her aunt.',
            translation: 'เธอถูกส่งตัวไปเพื่อใช้เวลากับครอบครัวป้า (O-NET 2567 ข้อ 29)',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ I look forward to go to school.',
        right: '✅ I look forward to going to school.',
        why: 'ในสำนวน look forward to คำว่า to เป็นคำบุพบท จึงต้องตามด้วย V-ing (going)',
      },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // หมวดที่ 3: พิชิตข้อสอบ O-NET WRITING & WORD ORDER (ONET CORE)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'connectors',
    category: 'onet_core',
    title: 'Connectors (คำเชื่อม 5 หมวด — คำไหนใช้แบบไหน)',
    shortTitle: 'Connectors (คำเชื่อม)',
    icon: '🔗',
    badge: 'Unit 1 • หน้า 1–2',
    summaryFormula: 'เช็กหลังช่องว่าง: S + V (ประโยค) หรือ Noun (คำนาม) | เห็น ". ____," ตอบ However, / Therefore,',
    memoryTip: 'มีจุดหน้า + ลูกน้ำหลัง (. ____,) ➔ ขัดแย้งตอบ However, | เป็นผลลัพธ์ตอบ Therefore,',
    relatedUnitNumber: 101,
    sections: [
      {
        heading: '1. บอกสาเหตุ (Reason = เพราะว่า)',
        color: 'blue',
        rows: [
          {
            label: 'because / since / as + S + V',
            rule: 'ตามด้วย "ประโยค (ประธาน + กริยา)"',
            example: 'She stayed home because she was sick.',
            translation: 'อยู่บ้าน เพราะว่า เธอป่วย (she was = S+V)',
          },
          {
            label: 'because of / due to + Noun / V-ing',
            rule: 'ตามด้วย "คำนาม / วลี" (ห้ามมีกริยาแท้)',
            example: 'Cancelled because of the blackout.',
            translation: 'ยกเลิก เพราะ ไฟดับ (the blackout = คำนาม)',
          },
        ],
      },
      {
        heading: '2. บอกผลลัพธ์ (Result = ดังนั้น)',
        color: 'emerald',
        rows: [
          {
            label: ', so + S + V',
            rule: 'วางหลังลูกน้ำ (,) เชื่อมผลลัพธ์',
            example: 'It rained heavily, so the match stopped.',
            translation: 'ฝนตกหนัก ดังนั้น การแข่งจึงหยุด',
          },
          {
            label: '. Therefore, / . As a result, + S + V',
            rule: 'ขึ้นประโยคใหม่ มีจุด (.) หน้า และลูกน้ำ (,) หลัง',
            example: 'He studied hard. Therefore, he passed.',
            translation: 'เขาขยัน ดังนั้น เขาจึงสอบผ่าน',
          },
        ],
      },
      {
        heading: '3. บอกความขัดแย้ง (Contrast = แต่ / แม้ว่า)',
        color: 'amber',
        rows: [
          {
            label: '. However, + S + V',
            rule: '"อย่างไรก็ตาม" • อยู่หน้าลูกน้ำ (. ____,)',
            example: 'It rained. However, they went camping.',
            translation: 'ฝนตก อย่างไรก็ตาม พวกเขายังไปแคมป์ (O-NET 2568)',
          },
          {
            label: 'although / even though + S + V',
            rule: '"แม้ว่า" + ประโยค S+V (ห้ามมี but ซ้ำ!)',
            example: 'Although he is 61, he runs fast.',
            translation: 'แม้ว่าเขาจะอายุ 61 แต่เขาก็วิ่งเร็ว (O-NET 2568)',
          },
          {
            label: 'despite / in spite of + Noun / V-ing',
            rule: '"แม้ว่า" + คำนาม/วลี (ไม่มี S+V)',
            example: 'Despite the heavy rain, we went out.',
            translation: 'แม้ว่าฝนจะตกหนัก พวกเราก็ออกไปข้างนอก',
          },
          {
            label: 'while / whereas + S + V',
            rule: '"ในขณะที่" • เทียบ 2 สิ่งที่ต่างกัน',
            example: 'Somchai likes math, while his brother likes art.',
            translation: 'สมชายชอบเลข ในขณะที่พี่ชายชอบศิลปะ',
          },
        ],
      },
      {
        heading: '4. เงื่อนไข & เวลา (Condition & Time)',
        color: 'purple',
        rows: [
          {
            label: 'unless + S + V (= if ... not)',
            rule: '"เว้นแต่ว่า / ถ้า...ไม่" (ห้ามซ้อน not)',
            example: 'You cannot enter unless you wear a coat.',
            translation: 'เข้าไม่ได้ เว้นแต่จะสวมเสื้อกาวน์',
          },
          {
            label: 'once / as soon as + S + V',
            rule: '"เมื่อ...แล้ว / ทันทีที่..."',
            example: 'Once you are registered, you get a link.',
            translation: 'เมื่อลงทะเบียนแล้ว จะได้รับลิงก์ (O-NET 2567)',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ Although it rained, but we went out.',
        right: '✅ Although it rained, we went out.',
        why: 'มี Although แล้ว ห้ามใส่ but ซ้ำ',
      },
    ],
  },

  {
    id: 'comparisons',
    category: 'onet_core',
    title: 'Comparisons (การเปรียบเทียบ 3 ระดับ + Double Comparative)',
    shortTitle: 'Comparisons (เปรียบเทียบ)',
    icon: '📊',
    badge: 'Unit 2 • หน้า 3–4',
    summaryFormula: 'as + ปกติ + as  |  -er / more + than  |  the + -est / most  |  The + ขั้นกว่า..., the + ขั้นกว่า...',
    memoryTip: 'เห็น than = ขั้นกว่า | เห็น as...as = รูปปกติ | เห็น The..., the... = ขั้นกว่าคู่',
    relatedUnitNumber: 102,
    sections: [
      {
        heading: '1. โครงสร้างเปรียบเทียบ 4 รูปแบบหลัก',
        color: 'blue',
        rows: [
          {
            label: 'as + Adj./Adv. (รูปปกติ) + as',
            rule: 'ขั้นเท่ากัน ("เท่ากับ") • ห้ามเติม -er/more',
            example: 'Riding a bike is not as safe as a train.',
            translation: 'ปั่นจักรยานไม่ปลอดภัยเท่ากับรถไฟ',
          },
          {
            label: 'Adj.-er / more Adj. + than',
            rule: 'ขั้นกว่า ("...กว่า") • สังเกตคำว่า than',
            example: 'This crate is much heavier than the box.',
            translation: 'ลังนี้หนักกว่ากล่องมาก (heavy ➔ heavier)',
          },
          {
            label: 'the + Adj.-est / the most Adj.',
            rule: 'ขั้นสุด ("...ที่สุด") • มี in..., of all, one of the...',
            example: 'One of the most densely populated cities.',
            translation: 'หนึ่งในเมืองที่หนาแน่นที่สุด',
          },
          {
            label: 'The + ขั้นกว่า ..., the + ขั้นกว่า ...',
            rule: 'ขั้นคู่ ("ยิ่ง... ก็ยิ่ง...") • ออกสอบ O-NET 2568!',
            example: 'The younger people were, the more likely they were.',
            translation: 'ยิ่งอายุน้อย ก็ยิ่งมีแนวโน้มมากขึ้น (O-NET 2568 ข้อ 25)',
          },
        ],
      },
      {
        heading: '2. คำขยายขั้นกว่า & คำเปลี่ยนรูปพิเศษ',
        color: 'emerald',
        rows: [
          {
            label: 'much / far + ขั้นกว่า',
            rule: 'แปลว่า "...กว่ามาก" (ห้ามใช้ more หรือ very นำหน้าขั้นกว่า!)',
            example: 'His English is much better now.',
            translation: 'ภาษาอังกฤษของเขาดีขึ้นกว่าเดิมมาก',
          },
          {
            label: 'good / well ➔ better ➔ best  |  bad ➔ worse ➔ worst',
            rule: 'ดี ➔ ดีกว่า ➔ ดีที่สุด  |  แย่ ➔ แย่กว่า ➔ แย่สุด  |  little ➔ less ➔ least',
            example: 'She feels much better today.',
            translation: 'ห้ามใช้ gooder / badder / littler',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ more easier / more heavier / more better',
        right: '✅ much easier / much heavier / much better',
        why: 'เป็นขั้นกว่าอยู่แล้ว ห้ามใส่ more ซ้ำ! ให้ใช้ much แทน',
      },
    ],
  },

  {
    id: 'adjective-order',
    category: 'onet_core',
    title: '4. Word Order & OSASCOMP (การจัดลำดับคำในประโยค)',
    shortTitle: 'Word Order & OSASCOMP',
    icon: '📐',
    badge: 'Unit 5 • หน้า 9–10',
    summaryFormula: 'Head Noun (คำนามหลัก) อยู่ขวาสุดเสมอ! | Place (สถานที่) มาก่อน Time (เวลา) | ความถี่อยู่หน้ากริยาแท้',
    memoryTip: 'หาคำนามหลักให้เจอแล้ววางไว้ท้ายสุด (เช่น scenes, models, bag) ตัดช้อยส์ผิดได้ทันที!',
    relatedUnitNumber: 105,
    sections: [
      {
        heading: '1. กฎเหล็ก Word Order 4 ข้อที่ออกสอบ O-NET',
        color: 'emerald',
        rows: [
          {
            label: '1) คำนามหลัก (Head Noun) อยู่ท้ายสุดเสมอ',
            rule: '[Adjective ความเห็น] + [คำนามขยาย] + [คำนามหลัก]',
            example: 'tense action scenes  |  latest all-in-one models',
            translation: 'ฉากแอ็กชันที่ตึงเครียด (O-NET 2568 ข้อ 31) | รุ่นล่าสุด',
          },
          {
            label: '2) สูตรเรียง Adjective: OSASCOMP + Noun',
            rule: 'Opinion (ความเห็น) ➔ Size ➔ Age ➔ Shape ➔ Color ➔ Origin (สัญชาติ) ➔ Material (วัสดุ) + Noun',
            example: 'an expensive Italian leather bag',
            translation: 'กระเป๋า (Noun) หนัง (Material) อิตาลี (Origin) ราคาแพง (Opinion)',
          },
          {
            label: '3) สถานที่ (Place) มาก่อน เวลา (Time)',
            rule: 'Verb + Place (ที่ไหน) + Time (เมื่อไหร่)',
            example: 'at the school auditorium last Friday',
            translation: 'ที่หอประชุมโรงเรียน (Place) เมื่อวันศุกร์ที่แล้ว (Time)',
          },
          {
            label: '4) คำบอกความถี่ (always, often, rarely, never)',
            rule: 'วาง "หน้ากริยาแท้" (แต่ "หลัง Verb to be")',
            example: 'He rarely drinks sugary soda.',
            translation: 'เขานานๆ ครั้งจะดื่มน้ำอัดลม (rarely อยู่หน้า drinks)',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ action scenes tense / last Friday at the hall',
        right: '✅ tense action scenes / at the hall last Friday',
        why: 'คำนามหลัก (scenes) ต้องอยู่ท้ายสุด และ Place ต้องมาก่อน Time เสมอ!',
      },
    ],
  },

  {
    id: 'relative-pronouns',
    category: 'onet_core',
    title: 'Relative Pronouns (who / which / whom / whose / that)',
    shortTitle: 'who / which / whose',
    icon: '🏷️',
    badge: 'O-NET 2565 & 2568',
    summaryFormula: 'คน + who + V. | คน + whom + S+V | คน + whose + คำนาม | สิ่งของ/สัตว์ + which | หลังบุพบท + which / whom เท่านั้น!',
    memoryTip: 'ถ้าข้างหน้าช่องว่างมี Preposition (เช่น against ___, in ___, for ___) ห้ามตอบ that เด็ดขาด! ใช้ได้แค่ which (สิ่งของ) หรือ whom (คน)',
    sections: [
      {
        heading: '1. ตารางเลือกใช้ตัวเชื่อมขยายคำนามให้ถูกใน 3 วิ',
        color: 'purple',
        rows: [
          {
            label: 'who (ใช้กับ "คน" ทำหน้าที่ประธาน)',
            rule: 'คน + who + กริยา (V.)',
            example: 'Tom Cruise, who plays Ethan Hunt, is on another mission.',
            translation: 'ทอม ครูซ ผู้ซึ่งรับบทอีธาน ฮันต์... (O-NET 2568 ข้อ 28)',
          },
          {
            label: 'which (ใช้กับ "สิ่งของ / สัตว์ / ความคิด")',
            rule: 'สิ่งของ + which (วางหลังบุพบท against/in/on ได้!)',
            example: 'This is the new standard against which I will judge all films.',
            translation: 'นี่คือมาตรฐานใหม่ ซึ่งฉันจะใช้ตัดสินหนังทุกเรื่อง (O-NET 2565 ข้อ 29)',
          },
          {
            label: 'whose (แสดงความเป็นเจ้าของ "...ของ...")',
            rule: 'คน/สิ่งของ + whose + คำนาม (Noun)',
            example: 'The boy whose bag was lost is crying.',
            translation: 'เด็กชายที่กระเป๋าของเขาหายกำลังร้องไห้',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ the standard against that I will judge',
        right: '✅ the standard against which I will judge',
        why: 'หลังคำบุพบท (against, in, on, with) ห้ามใช้ that หรือ who ให้ใช้ which (สิ่งของ) หรือ whom (คน) เท่านั้น!',
      },
    ],
  },

  {
    id: 'prepositions-collocations',
    category: 'onet_core',
    title: 'Prepositions & Collocations (คำบุพบท & คำคู่ฮิต O-NET)',
    shortTitle: 'คำคู่ & บุพบทฮิต',
    icon: '🎯',
    badge: 'O-NET 2565–2568',
    summaryFormula: 'pay attention to | provide ... with | stand out | come from | from ... onward | portrayal ... as',
    memoryTip: 'เวลาเจอข้อสอบเติมคำกริยาหรือบุพบทสั้นๆ ให้กวาดตาดู "คำข้างหลังช่องว่าง" ว่าเป็นคู่หูกับคำไหน!',
    sections: [
      {
        heading: '1. สำนวน & คำคู่ที่ออกข้อสอบจริง O-NET',
        color: 'blue',
        rows: [
          {
            label: 'pay attention to + Noun',
            rule: 'ให้ความสนใจ / ตั้งใจกับ... (O-NET 2565 ข้อ 26)',
            example: 'They asked me to pay more attention to my studies.',
            translation: 'พวกเขาขอให้ฉันตั้งใจเรียนให้มากขึ้น',
          },
          {
            label: 'provide [someone] with [something]',
            rule: 'จัดเตรียม / มอบ...ให้แก่... (O-NET 2567 ข้อ 24)',
            example: 'The goal is to provide participants with a space to practice.',
            translation: 'เป้าหมายคือมอบพื้นที่ฝึกฝนให้ผู้เข้าร่วม (สังเกตคำว่า with)',
          },
          {
            label: 'from [time] onward',
            rule: 'ตั้งแต่...เป็นต้นไป (O-NET 2567 ข้อ 26)',
            example: 'Participants can register from November 1st onward.',
            translation: 'ผู้เข้าร่วมลงทะเบียนได้ตั้งแต่วันที่ 1 พ.ย. เป็นต้นไป',
          },
          {
            label: 'stand out (among ...)  |  come from (came from)',
            rule: 'โดดเด่น (O-NET 2567 ข้อ 31)  |  มาจาก (O-NET 2568 ข้อ 27)',
            example: 'This film stands out. / Increases came from people aged 45–54.',
            translation: 'หนังเรื่องนี้โดดเด่น / การเพิ่มขึ้นมาจากกลุ่มอายุ 45–54',
          },
          {
            label: 'portrayal of [A] as [B]',
            rule: 'การถ่ายทอดบทบาทของ A ในฐานะ B (O-NET 2565 ข้อ 32)',
            example: 'The portrayal of Bruce Wayne as a troubled character.',
            translation: 'การถ่ายทอดบทบาทของบรูซ เวย์น ในฐานะตัวละครที่มีปมปัญหา',
          },
        ],
      },
    ],
    examTraps: [
      {
        wrong: '❌ take attention to / put attention to',
        right: '✅ pay attention to',
        why: 'คำนาม attention ต้องใช้คู่กับกริยา pay เสมอ (pay attention to)',
      },
    ],
  },
];
