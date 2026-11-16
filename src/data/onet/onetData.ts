export interface OnetQuestion {
  number: number;
  type: 'single' | 'ordering';
  options?: ('A' | 'B' | 'C' | 'D')[];
  correctAnswer: string | string[]; // 'A' | 'B' | 'C' | 'D' or ['D', 'A', 'B', 'C', 'F', 'E']
  subLabels?: string[]; // for ordering: ['(1)', '(2)', '(3)', '(4)', '(5)', '(6)']
  points: number;
  explanation?: string;
}

export interface OnetYearConfig {
  year: number; // Thai year e.g. 2568
  yearAD: number; // 2025
  title: string;
  totalQuestions: number;
  totalScore: number;
  pdfCleanUrl: string;
  available: boolean;
  parts: {
    name: string;
    itemsRange: string;
  }[];
  questions: OnetQuestion[];
}

export interface NationalBenchmark {
  year: number;
  academicYearLabel?: string;
  nationalMean: number;
  nationalSd: number;
  nationalMax: number;
  examineesCount?: string;
  source: string;
}

export const NATIONAL_BENCHMARKS: Record<number, NationalBenchmark> = {
  2568: {
    year: 2568,
    academicYearLabel: 'ปีการศึกษา 2567 (สอบ ก.พ. 2568)',
    nationalMean: 30.93,
    nationalSd: 14.50,
    nationalMax: 100.0,
    examineesCount: '~385,000 คน',
    source: 'สทศ. (NIETS)',
  },
  2567: {
    year: 2567,
    academicYearLabel: 'ปีการศึกษา 2566 (สอบ ก.พ. 2567)',
    nationalMean: 31.76,
    nationalSd: 14.47,
    nationalMax: 100.0,
    examineesCount: '395,338 คน',
    source: 'สทศ. (NIETS)',
  },
  2566: {
    year: 2566,
    academicYearLabel: 'ปีการศึกษา 2565 (สอบ ก.พ. 2566)',
    nationalMean: 32.68,
    nationalSd: 14.89,
    nationalMax: 100.0,
    examineesCount: '386,412 คน',
    source: 'สทศ. (NIETS)',
  },
  2565: {
    year: 2565,
    academicYearLabel: 'ปีการศึกษา 2564 (สอบ ก.พ. 2565)',
    nationalMean: 31.11,
    nationalSd: 14.90,
    nationalMax: 100.0,
    examineesCount: '365,229 คน',
    source: 'สทศ. (NIETS)',
  },
  2564: {
    year: 2564,
    academicYearLabel: 'ปีการศึกษา 2563 (สอบ ก.พ. 2564)',
    nationalMean: 34.38,
    nationalSd: 16.20,
    nationalMax: 100.0,
    examineesCount: '372,810 คน',
    source: 'สทศ. (NIETS)',
  },
  2563: {
    year: 2563,
    academicYearLabel: 'ปีการศึกษา 2562 (สอบ ก.พ. 2563)',
    nationalMean: 31.00,
    nationalSd: 15.42,
    nationalMax: 100.0,
    examineesCount: '402,118 คน',
    source: 'สทศ. (NIETS)',
  },
  2562: {
    year: 2562,
    academicYearLabel: 'ปีการศึกษา 2561 (สอบ ก.พ. 2562)',
    nationalMean: 29.45,
    nationalSd: 14.12,
    nationalMax: 100.0,
    examineesCount: '450,210 คน',
    source: 'สทศ. (NIETS)',
  },
  2561: {
    year: 2561,
    academicYearLabel: 'ปีการศึกษา 2560 (สอบ ก.พ. 2561)',
    nationalMean: 30.45,
    nationalSd: 14.80,
    nationalMax: 100.0,
    examineesCount: '468,754 คน',
    source: 'สทศ. (NIETS)',
  },
  2560: {
    year: 2560,
    academicYearLabel: 'ปีการศึกษา 2559 (สอบ ก.พ. 2560)',
    nationalMean: 31.80,
    nationalSd: 15.10,
    nationalMax: 100.0,
    examineesCount: '480,120 คน',
    source: 'สทศ. (NIETS)',
  },
  2559: {
    year: 2559,
    academicYearLabel: 'ปีการศึกษา 2558 (สอบ ก.พ. 2559)',
    nationalMean: 30.62,
    nationalSd: 14.75,
    nationalMax: 100.0,
    examineesCount: '495,200 คน',
    source: 'สทศ. (NIETS)',
  },
};

export const ONET_YEARS_SUMMARY = [
  { year: 2568, title: 'O-NET ภาษาอังกฤษ ม.3 ปีการศึกษา 2568', totalQuestions: 32, available: true, pdfUrl: '/pdf/onet/onet-m3-2568-clean.pdf' },
  { year: 2567, title: 'O-NET ภาษาอังกฤษ ม.3 ปีการศึกษา 2567', totalQuestions: 32, available: true, pdfUrl: '/pdf/onet/onet-m3-2567-clean.pdf' },
  { year: 2566, title: 'O-NET ภาษาอังกฤษ ม.3 ปีการศึกษา 2566', totalQuestions: 32, available: true, pdfUrl: '/pdf/onet/onet-m3-2566-clean.pdf' },
  { year: 2565, title: 'O-NET ภาษาอังกฤษ ม.3 ปีการศึกษา 2565', totalQuestions: 32, available: false, pdfUrl: '/pdf/onet/onet-m3-2565-clean.pdf' },
  { year: 2564, title: 'O-NET ภาษาอังกฤษ ม.3 ปีการศึกษา 2564', totalQuestions: 32, available: false, pdfUrl: '/pdf/onet/onet-m3-2564-clean.pdf' },
  { year: 2563, title: 'O-NET ภาษาอังกฤษ ม.3 ปีการศึกษา 2563', totalQuestions: 40, available: false, pdfUrl: '/pdf/onet/onet-m3-2563-clean.pdf' },
  { year: 2562, title: 'O-NET ภาษาอังกฤษ ม.3 ปีการศึกษา 2562', totalQuestions: 50, available: false, pdfUrl: '/pdf/onet/onet-m3-2562-clean.pdf' },
  { year: 2561, title: 'O-NET ภาษาอังกฤษ ม.3 ปีการศึกษา 2561', totalQuestions: 50, available: false, pdfUrl: '/pdf/onet/onet-m3-2561-clean.pdf' },
  { year: 2560, title: 'O-NET ภาษาอังกฤษ ม.3 ปีการศึกษา 2560', totalQuestions: 50, available: false, pdfUrl: '/pdf/onet/onet-m3-2560-clean.pdf' },
  { year: 2559, title: 'O-NET ภาษาอังกฤษ ม.3 ปีการศึกษา 2559', totalQuestions: 50, available: false, pdfUrl: '/pdf/onet/onet-m3-2559-clean.pdf' },
];

export const ONET_2568: OnetYearConfig = {
  year: 2568,
  yearAD: 2025,
  title: 'O-NET ภาษาอังกฤษ ม.3 (ปีการศึกษา 2568)',
  totalQuestions: 32,
  totalScore: 100,
  pdfCleanUrl: '/pdf/onet/onet-m3-2568-clean.pdf',
  available: true,
  parts: [
    { name: 'Part 1: Listening & Speaking', itemsRange: 'ข้อ 1 - 9' },
    { name: 'Part 2: Reading & Ordering', itemsRange: 'ข้อ 10 - 23' },
    { name: 'Part 3: Writing & Language Use', itemsRange: 'ข้อ 24 - 32' },
  ],
  questions: [
    { number: 1, type: 'single', correctAnswer: 'A', points: 3.125 },
    { number: 2, type: 'single', correctAnswer: 'D', points: 3.125 },
    { number: 3, type: 'single', correctAnswer: 'A', points: 3.125 },
    { number: 4, type: 'single', correctAnswer: 'B', points: 3.125 },
    { number: 5, type: 'single', correctAnswer: 'A', points: 3.125 },
    { number: 6, type: 'single', correctAnswer: 'B', points: 3.125 },
    { number: 7, type: 'single', correctAnswer: 'B', points: 3.125 },
    { number: 8, type: 'single', correctAnswer: 'C', points: 3.125 },
    { number: 9, type: 'single', correctAnswer: 'C', points: 3.125 },
    {
      number: 10,
      type: 'ordering',
      correctAnswer: ['D', 'A', 'B', 'C', 'F', 'E'],
      subLabels: ['ภาพ (1)', 'ภาพ (2)', 'ภาพ (3)', 'ภาพ (4)', 'ภาพ (5)', 'ภาพ (6)'],
      points: 3.125,
      explanation: 'ลำดับขั้นตอนทำ Beef Burger: (1) ผสมซอส D -> (2) ผสมเนื้อ A -> (3) ปั้นก้อนเนื้อ B -> (4) ทอด C -> (5) ปิ้งขนมปังทาซอส F -> (6) ใส่ผักชีสประกบเบอร์เกอร์ E',
    },
    { number: 11, type: 'single', correctAnswer: 'B', points: 3.125 },
    { number: 12, type: 'single', correctAnswer: 'A', points: 3.125 },
    { number: 13, type: 'single', correctAnswer: 'D', points: 3.125 },
    { number: 14, type: 'single', correctAnswer: 'B', points: 3.125 },
    { number: 15, type: 'single', correctAnswer: 'B', points: 3.125 },
    { number: 16, type: 'single', correctAnswer: 'C', points: 3.125 },
    { number: 17, type: 'single', correctAnswer: 'D', points: 3.125 },
    { number: 18, type: 'single', correctAnswer: 'B', points: 3.125 },
    { number: 19, type: 'single', correctAnswer: 'C', points: 3.125 },
    { number: 20, type: 'single', correctAnswer: 'D', points: 3.125 },
    { number: 21, type: 'single', correctAnswer: 'B', points: 3.125 },
    { number: 22, type: 'single', correctAnswer: 'D', points: 3.125 },
    { number: 23, type: 'single', correctAnswer: 'C', points: 3.125 },
    { number: 24, type: 'single', correctAnswer: 'C', points: 3.125 },
    { number: 25, type: 'single', correctAnswer: 'B', points: 3.125 },
    { number: 26, type: 'single', correctAnswer: 'C', points: 3.125 },
    { number: 27, type: 'single', correctAnswer: 'D', points: 3.125 },
    { number: 28, type: 'single', correctAnswer: 'A', points: 3.125 },
    { number: 29, type: 'single', correctAnswer: 'B', points: 3.125 },
    { number: 30, type: 'single', correctAnswer: 'C', points: 3.125 },
    { number: 31, type: 'single', correctAnswer: 'D', points: 3.125 },
    { number: 32, type: 'single', correctAnswer: 'B', points: 3.125 },
  ],
};

export const ONET_2567: OnetYearConfig = {
  year: 2567,
  yearAD: 2024,
  title: 'O-NET ภาษาอังกฤษ ม.3 (ปีการศึกษา 2567)',
  totalQuestions: 32,
  totalScore: 100,
  pdfCleanUrl: '/pdf/onet/onet-m3-2567-clean.pdf',
  available: true,
  parts: [
    { name: 'Part 1: Listening & Speaking', itemsRange: 'ข้อ 1 - 9' },
    { name: 'Part 2: Reading & Instructions', itemsRange: 'ข้อ 10 - 23' },
    { name: 'Part 3: Writing & Language Use', itemsRange: 'ข้อ 24 - 32' },
  ],
  questions: [
    { number: 1, type: 'single', correctAnswer: 'D', points: 3.125, explanation: 'Emma ถามเวลานัดหมายที่ตกลงกันไว้ ("And when were we supposed to meet?") Claire ตอบ "Ten" สอดคล้องกับเวลา 10:00 แต่มาถึง 10:30' },
    { number: 2, type: 'single', correctAnswer: 'D', points: 3.125, explanation: 'Emma เตือนเรื่องการตรงต่อเวลา ("punctuality is very important in Western culture... Being on time shows respect")' },
    { number: 3, type: 'single', correctAnswer: 'B', points: 3.125, explanation: 'Claire ขอโทษและพูดสำนวนแก้เก้อ ("It\'s better late than never" = มาช้ายังดีกว่าไม่มา)' },
    { number: 4, type: 'single', correctAnswer: 'D', points: 3.125, explanation: 'Charles บอกว่า "That\'s just what I need" (นั่นคือสิ่งที่ฉันต้องการพอดี)' },
    { number: 5, type: 'single', correctAnswer: 'A', points: 3.125, explanation: 'Owen ฟังแล้วรู้สึกว่าวิธีคิดซับซ้อนเกินไป "That sounds complicated" (ฟังดูซับซ้อนจัง)' },
    { number: 6, type: 'single', correctAnswer: 'B', points: 3.125, explanation: 'Owen จึงบอกว่า "I give up" (ฉันยอมแพ้/ไม่เอาแล้วดีกว่า)' },
    { number: 7, type: 'single', correctAnswer: 'A', points: 3.125, explanation: 'John ตอบรับการขอร้องช่วยเหลืออย่างสุภาพด้วยคำว่า "Sure" (ได้แน่นอน)' },
    { number: 8, type: 'single', correctAnswer: 'B', points: 3.125, explanation: 'Andrew พูดขอบคุณล่วงหน้า "I\'d appreciate it" (ฉันจะขอบคุณมากเลย)' },
    { number: 9, type: 'single', correctAnswer: 'A', points: 3.125, explanation: 'Andrew บอกว่าถ้าให้ทำตามกฎการเงินทั้งหมดตนคงทำไม่ได้ "can\'t do that"' },
    { number: 10, type: 'single', correctAnswer: 'B', points: 3.125, explanation: 'เรียงลำดับขั้นตอนการใช้เครื่องล้างจาน: B-A-F-E-D-C (ล้างเศษอาหาร -> จัดภาชนะชั้นล่าง -> จัดแก้วชั้นบน -> ใส่น้ำยาล้าง -> เดินเครื่อง -> ผึ่งแห้ง)' },
    { number: 11, type: 'single', correctAnswer: 'B', points: 3.125, explanation: 'แผนภูมิที่ 2 สอดคล้องกับคำบรรยาย (แชท/ข้อความและอีเมลเป็นกิจกรรมหลักต่างกัน 3%, ธนาคารออนไลน์อันดับ 3)' },
    { number: 12, type: 'single', correctAnswer: 'C', points: 3.125, explanation: 'เหตุการณ์เกิดขึ้นที่โรงเรียนอนุบาล (At a kindergarten) จากการที่ Lisa ช่วยเด็กอนุบาล Danny ใส่รองเท้า' },
    { number: 13, type: 'single', correctAnswer: 'C', points: 3.125, explanation: 'รองเท้าคู่นี้เป็นของพี่ชาย Danny (Danny\'s brother used to wear these shoes)' },
    { number: 14, type: 'single', correctAnswer: 'D', points: 3.125, explanation: 'Danny สังเกตเห็นว่ารองเท้าใส่สลับข้างกัน (Danny realized that his shoes were on the wrong side)' },
    { number: 15, type: 'single', correctAnswer: 'C', points: 3.125, explanation: 'Lisa รู้สึกเห็นใจ/สงสาร Danny ที่พยายามช่วยตัวเองแต่รองเท้าคับและผิดข้าง' },
    { number: 16, type: 'single', correctAnswer: 'D', points: 3.125, explanation: 'ใจความหลักของบทความคือผลกระทบความเสียหายจากเหตุแผ่นดินไหวในโมร็อกโก (The destructive effects of an earthquake in Morocco)' },
    { number: 17, type: 'single', correctAnswer: 'A', points: 3.125, explanation: 'ยอดผู้เสียชีวิตมากกว่า 2,900 คน (Over 2,900)' },
    { number: 18, type: 'single', correctAnswer: 'B', points: 3.125, explanation: 'ผู้ประสบภัยส่วนใหญ่อาศัยอยู่ในหมู่บ้านบนภูเขาห่างไกล (Most of them live in remote mountain villages)' },
    { number: 19, type: 'single', correctAnswer: 'B', points: 3.125, explanation: 'ชาวบ้านในเทือกเขาไฮแอตลาสสร้างบ้านด้วยวัสดุธรรมชาติจากท้องถิ่น (mud brick, stone, rough wood)' },
    { number: 20, type: 'single', correctAnswer: 'A', points: 3.125, explanation: 'ย่อหน้าแรกอธิบายถึงต้นกำเนิดและที่มาของชื่อวัน Boxing Day (The origin of Boxing Day)' },
    { number: 21, type: 'single', correctAnswer: 'C', points: 3.125, explanation: 'ข้อได้เปรียบที่สุดสำหรับนักช้อปคือได้รับส่วนลดสินค้าจำนวนมากจากร้านค้า (They can get big discounts from retailers)' },
    { number: 22, type: 'single', correctAnswer: 'B', points: 3.125, explanation: 'ปัจจุบัน Boxing Day มีการเฉลิมฉลองต่างจากอดีต กลายเป็นวันรวมญาติและช้อปปิ้งเชิงพาณิชย์ (celebrated differently from the olden days)' },
    { number: 23, type: 'single', correctAnswer: 'A', points: 3.125, explanation: 'ชื่อเรื่องที่ครอบคลุมเนื้อหาทั้งประวัติในอดีตและธรรมเนียมในปัจจุบันคือ Boxing Day: Past and Present' },
    { number: 24, type: 'single', correctAnswer: 'C', points: 3.125, explanation: 'สำนวน provide someone with something แปลว่า จัดหา/มอบพื้นที่ให้ผู้เข้าร่วม จึงเลือก provide' },
    { number: 25, type: 'single', correctAnswer: 'C', points: 3.125, explanation: 'Present Perfect (have learned) บ่งบอกถึงทักษะที่ได้เรียนรู้สะสมมาตั้งแต่อดีตจนถึงปัจจุบัน' },
    { number: 26, type: 'single', correctAnswer: 'C', points: 3.125, explanation: 'สำนวน from ... onward แปลว่า ตั้งแต่วันที่... เป็นต้นไป (from November 1st onward)' },
    { number: 27, type: 'single', correctAnswer: 'A', points: 3.125, explanation: 'Once (ทันทีที่/เมื่อ) + Subject (you) + Verb (are registered)' },
    { number: 28, type: 'single', correctAnswer: 'B', points: 3.125, explanation: 'การเรียงคำคุณศัพท์ขยายคำนามหลัก: poor big rural family (คำนาม family อยู่ท้ายสุด)' },
    { number: 29, type: 'single', correctAnswer: 'D', points: 3.125, explanation: 'Infinitive of Purpose (to + V.1): ส่งตัวไปเพื่อที่จะใช้เวลาอยู่กับครอบครัวของป้า (to spend some time)' },
    { number: 30, type: 'single', correctAnswer: 'C', points: 3.125, explanation: 'As soon as (ทันทีที่... ก็...): ทันทีที่ Cait มาถึงบ้านใหม่ เธอก็เริ่มค้นพบความอบอุ่น' },
    { number: 31, type: 'single', correctAnswer: 'C', points: 3.125, explanation: 'กริยาวลี stand out (among...) แปลว่า โดดเด่นท่ามกลางภาพยนตร์ในปีนี้' },
    { number: 32, type: 'single', correctAnswer: 'D', points: 3.125, explanation: 'Past Simple Passive: ภาพยนตร์ถูกเสนอชื่อเข้าชิงรางวัลออสการ์ในปี 2022 (was nominated)' },
  ],
};

export function getOnetYearConfig(year: number | string): OnetYearConfig | null {
  const y = Number(year);
  if (y === 2568) return ONET_2568;
  if (y === 2567) return ONET_2567;
  return null;
}

