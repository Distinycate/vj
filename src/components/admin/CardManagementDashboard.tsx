'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, BarChart3, CheckCircle2, ClipboardList, Gift, Home,
  LogOut, MinusCircle, Package, RefreshCw, Search, ShieldAlert, Sparkles,
  Ticket, Trash2, UserRound, X, Award, BookOpen, Copy, Printer, Check, Filter, Compass, FileText
} from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import {
  adjustStudentCoins, adjustStudentTickets, BehaviorCategory, removeStudentCard,
} from '@/utils/cardBattle';
import CardWorkflowPanel from './CardWorkflowPanel';

type CardPageTab = 'overview' | 'cards' | 'behavior' | 'pp5-traits' | 'pp5-reading' | 'workflow' | 'history';

interface StudentSummary {
  id: string;
  student_id: string;
  student_name: string;
  classroom_id: string;
  tickets: number;
  coins: number;
  currentCards: number;
  reservedCards: number;
  cardsReceived: number;
  ticketsAwarded: number;
  ticketsRemoved: number;
  cardsRemoved: number;
  coinsAwarded: number;
  coinsRemoved: number;
  pretestScore?: number;
  posttestScore?: number;
  accuracy?: number;
  learningGain?: number;
}

const BEHAVIOR_CATEGORIES: Array<{ value: BehaviorCategory; label: string }> = [
  { value: 'POSITIVE_BEHAVIOR', label: 'ความประพฤติเชิงบวก / ซื่อสัตย์' },
  { value: 'RESPONSIBILITY', label: 'ความรับผิดชอบ / มุ่งมั่นทำงาน' },
  { value: 'VOLUNTEER', label: 'จิตอาสา / ช่วยเหลือส่วนรวม' },
  { value: 'DISCIPLINE', label: 'วินัย / เคารพกฎกติกา' },
  { value: 'RULE_VIOLATION', label: 'ไม่ปฏิบัติตามข้อตกลง' },
  { value: 'OTHER', label: 'ใฝ่เรียนรู้ / อื่น ๆ' },
];

const DESIRABLE_8_TRAITS = [
  { id: 't1', name: '1. รักชาติ ศาสน์ กษัตริย์', short: 'รักชาติฯ' },
  { id: 't2', name: '2. ซื่อสัตย์สุจริต', short: 'ซื่อสัตย์' },
  { id: 't3', name: '3. มีวินัย', short: 'มีวินัย' },
  { id: 't4', name: '4. ใฝ่เรียนรู้', short: 'ใฝ่เรียนรู้' },
  { id: 't5', name: '5. อยู่อย่างพอเพียง', short: 'พอเพียง' },
  { id: 't6', name: '6. มุ่งมั่นในการทำงาน', short: 'มุ่งมั่น' },
  { id: 't7', name: '7. รักความเป็นไทย', short: 'รักไทย' },
  { id: 't8', name: '8. มีจิตสาธารณะ', short: 'จิตสาธารณะ' },
] as const;

const READING_5_INDICATORS = [
  { id: 'r1', name: '1. การจับใจความสำคัญ', short: 'จับใจความ' },
  { id: 'r2', name: '2. การระบุรายละเอียดสนับสนุน', short: 'รายละเอียด' },
  { id: 'r3', name: '3. การวิเคราะห์แยกแยะ/เชื่อมโยง', short: 'วิเคราะห์' },
  { id: 'r4', name: '4. การแสดงความคิดเห็นและให้เหตุผล', short: 'แสดงความเห็น' },
  { id: 'r5', name: '5. การสรุปความและเขียนถ่ายทอด', short: 'สรุปถ่ายทอด' },
] as const;

const QUICK_REASONS = {
  POSITIVE: [
    { text: '[ใฝ่เรียนรู้] ตั้งใจฝึกศัพท์', category: 'POSITIVE_BEHAVIOR' },
    { text: '[มุ่งมั่น] ส่งงานตรงเวลา', category: 'RESPONSIBILITY' },
    { text: '[มีวินัย] เข้าเรียนตรงเวลา', category: 'DISCIPLINE' },
    { text: '[จิตอาสา] ช่วยเหลือเพื่อน', category: 'VOLUNTEER' },
    { text: '[ซื่อสัตย์] ซื่อสัตย์ในการเล่น', category: 'POSITIVE_BEHAVIOR' },
    { text: '[พอเพียง] ดูแลของส่วนรวม', category: 'RESPONSIBILITY' },
    { text: '[รักไทย] มีสัมมาคารวะ', category: 'POSITIVE_BEHAVIOR' },
    { text: '[รักชาติ] ร่วมกิจกรรมสม่ำเสมอ', category: 'POSITIVE_BEHAVIOR' },
  ],
  NEGATIVE: [
    { text: '[ควรติดตาม] ส่งงานช้า', category: 'RESPONSIBILITY' },
    { text: '[ควรติดตาม] คุยรบกวนในห้อง', category: 'DISCIPLINE' },
    { text: '[ควรติดตาม] ไม่ทำเวร/ขาดความรับผิดชอบ', category: 'RULE_VIOLATION' },
  ]
} as const;

function categoryLabel(value: string) {
  return BEHAVIOR_CATEGORIES.find((category) => category.value === value)?.label || 'อื่น ๆ';
}

function getRelationObject(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

export default function CardManagementDashboard({ teacher }: { teacher: any }) {
  const [tab, setTab] = useState<CardPageTab>('overview');
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [classroomId, setClassroomId] = useState('');
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [allCards, setAllCards] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [behaviorFilter, setBehaviorFilter] = useState<'ALL' | 'POSITIVE' | 'ATTENTION'>('ALL');
  const [copiedNotification, setCopiedNotification] = useState('');
  
  // Custom teacher score overrides for P.P.5 (studentId -> record of scores)
  const [traitOverrides, setTraitOverrides] = useState<Record<string, Record<string, number>>>({});
  const [readingOverrides, setReadingOverrides] = useState<Record<string, Record<string, number>>>({});

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [ticketAmount, setTicketAmount] = useState(1);
  const [coinAmount, setCoinAmount] = useState(100);
  const [behaviorCategory, setBehaviorCategory] = useState<BehaviorCategory>('POSITIVE_BEHAVIOR');
  const [teacherMessage, setTeacherMessage] = useState('');
  const [bulkCardId, setBulkCardId] = useState('');
  const [bulkCardAmount, setBulkCardAmount] = useState(1);

  useEffect(() => {
    async function loadClassrooms() {
      const cardsResult = supabase
        .from('cards')
        .select('id, card_code, name, description, rarity, effect_type, image_url, drop_weight, is_active, target_scope')
        .order('rarity', { ascending: false })
        .order('name');
      let query = supabase.from('classrooms').select('id, class_name').order('class_name');
      if (teacher.role === 'TEACHER') query = query.eq('teacher_id', teacher.id);
      const [{ data, error }, { data: cardsData, error: cardsError }] = await Promise.all([query, cardsResult]);
      if (error || cardsError) {
        setMessage(error?.message || cardsError?.message || 'โหลดข้อมูลเริ่มต้นไม่สำเร็จ');
        setLoading(false);
        return;
      }
      setAllCards(cardsData || []);
      setClassrooms(data || []);
      if (data?.[0]) setClassroomId(data[0].id);
      else setLoading(false);
    }
    loadClassrooms();
  }, [teacher]);

  const loadData = useCallback(async () => {
    if (!classroomId) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/cards?classroomId=${classroomId}`);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to load card management data');
      }
      const data = await res.json();
      const rawStudents = data.students || [];
      if (rawStudents.length === 0) {
        setStudents([]);
        setInventory([]);
        setActions([]);
        setLoading(false);
        return;
      }

      const inventoryRows = data.inventory || [];
      const pullRows = data.pulls || [];
      const actionRows = data.actions || [];
      setInventory(inventoryRows);
      setActions(actionRows);

      setStudents(rawStudents.map((student: any) => {
        const studentInventory = inventoryRows.filter((row: any) => row.student_id === student.id);
        const studentActions = actionRows.filter((action: any) => action.student_id === student.id);
        const sumAction = (type: string) => studentActions
          .filter((action: any) => action.action_type === type)
          .reduce((sum: number, action: any) => sum + Number(action.amount || 0), 0);
        
        const stats = getRelationObject(student.analytics_summary);
        const lp = getRelationObject(student.learning_paths);

        return {
          ...student,
          tickets: lp?.free_pull_tickets || 0,
          coins: lp?.coins || 0,
          currentCards: studentInventory.reduce((sum: number, row: any) => sum + Number(row.quantity || 0), 0),
          reservedCards: studentInventory.reduce((sum: number, row: any) => sum + Number(row.reserved_quantity || 0), 0),
          cardsReceived: pullRows.filter((pull: any) => pull.student_id === student.id).length,
          ticketsAwarded: sumAction('TICKET_AWARD'),
          ticketsRemoved: sumAction('TICKET_REMOVAL'),
          cardsRemoved: sumAction('CARD_REMOVAL'),
          coinsAwarded: sumAction('COIN_AWARD'),
          coinsRemoved: sumAction('COIN_REMOVAL'),
          pretestScore: stats?.pretest_score || 0,
          posttestScore: stats?.posttest_score || 0,
          accuracy: stats?.success_rate || 0,
          learningGain: stats?.normalized_gain || stats?.learning_gain || 0,
        };
      }));
      setLoading(false);
    } catch (err: any) {
      setMessage(err.message || 'Failed to load');
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Rubric calculation functions with softened/growth-oriented thresholds
  const calculateStudentTrait = useCallback((student: StudentSummary, traitId: string) => {
    if (traitOverrides[student.id]?.[traitId] !== undefined) {
      return traitOverrides[student.id][traitId];
    }
    const positive = student.ticketsAwarded + student.coinsAwarded;
    const deductions = student.ticketsRemoved + student.cardsRemoved + student.coinsRemoved;
    
    // Softened rubric: 3 >= 60%, 2 >= 35%, 1 >= 1%, 0 = 0%
    const ratio = (positive + deductions) > 0 ? positive / (positive + deductions) : 0.8;
    if (positive >= 2 || ratio >= 0.6 || (student.learningGain || 0) > 20) return 3;
    if (positive >= 1 || ratio >= 0.35 || student.coins > 100) return 2;
    if (deductions > positive + 2) return 1;
    return 2; // Default encouraging grade for participation
  }, [traitOverrides]);

  const calculateStudentReading = useCallback((student: StudentSummary, indicatorId: string) => {
    if (readingOverrides[student.id]?.[indicatorId] !== undefined) {
      return readingOverrides[student.id][indicatorId];
    }
    const acc = student.accuracy || 0;
    const post = student.posttestScore || 0;
    const gain = student.learningGain || 0;

    // Softened rubric: Post >= 60% or Gain >= 30% or Acc >= 60% -> Level 3
    if (post >= 60 || gain >= 30 || acc >= 60) return 3;
    if (post >= 35 || gain >= 15 || acc >= 35) return 2;
    if (post > 0 || acc > 0 || student.coins > 0) return 1;
    return 1; // Default pass for participating
  }, [readingOverrides]);

  // Short diagnostic rationale generator
  const getStudentRationale = useCallback((student: StudentSummary) => {
    const positive = student.ticketsAwarded + student.coinsAwarded;
    const deductions = student.ticketsRemoved + student.cardsRemoved + student.coinsRemoved;
    const gain = student.learningGain || 0;
    const acc = student.accuracy || 0;

    if (positive >= 3 && gain > 25) {
      return 'ใฝ่เรียนรู้สูง มีพัฒนาการคำศัพท์โดดเด่น และมีความรับผิดชอบสม่ำเสมอ';
    }
    if (positive >= 2) {
      return 'มีความตั้งใจเรียน มีจิตสาธารณะและปฏิบัติตามกฎกติกาห้องเรียนได้ดี';
    }
    if (deductions >= 2 && deductions > positive) {
      return 'มีความพยายามร่วมกิจกรรม แนะนำให้เสริมสร้างวินัยและการส่งงานตรงเวลา';
    }
    if (acc < 40) {
      return 'มีความตั้งใจฝึกฝน พยายามผ่านด่านได้ดีแม้มีข้อจำกัดด้านอุปกรณ์/พื้นฐานเดิม';
    }
    return 'ปฏิบัติตนตามเกณฑ์ได้ดี มีความร่วมมือและพัฒนาการทางคำศัพท์ต่อเนื่อง';
  }, []);

  // Classroom P.P.5 Aggregates
  const classStats = useMemo(() => {
    if (!students.length) return null;
    const count = students.length;
    let l3 = 0, l2 = 0, l1 = 0, l0 = 0;
    let r3 = 0, r2 = 0, r1 = 0, r0 = 0;

    students.forEach((s) => {
      // Overall trait grade is mode/average of traits
      const tScore = calculateStudentTrait(s, 't4'); // based on diligence/learning
      if (tScore === 3) l3++;
      else if (tScore === 2) l2++;
      else if (tScore === 1) l1++;
      else l0++;

      const rScore = calculateStudentReading(s, 'r1');
      if (rScore === 3) r3++;
      else if (rScore === 2) r2++;
      else if (rScore === 1) r1++;
      else r0++;
    });

    const activeRoom = classrooms.find((c) => c.id === classroomId)?.class_name || 'ห้องเรียน';

    return {
      activeRoom,
      total: count,
      traits: {
        l3, l2, l1, l0,
        l3Pct: Math.round((l3 / count) * 100),
        l2Pct: Math.round((l2 / count) * 100),
        l1Pct: Math.round((l1 / count) * 100),
        l0Pct: Math.round((l0 / count) * 100),
      },
      reading: {
        r3, r2, r1, r0,
        r3Pct: Math.round((r3 / count) * 100),
        r2Pct: Math.round((r2 / count) * 100),
        r1Pct: Math.round((r1 / count) * 100),
        r0Pct: Math.round((r0 / count) * 100),
      },
      rationaleText: `นักเรียน ${count} คน ส่วนใหญ่ ${Math.round(((l3 + l2) / count) * 100)}% อยู่ในเกณฑ์ระดับดี-ดีเยี่ยม มีความกระตือรือร้นในการสะสมคำศัพท์และมีวินัยสูง แม้นักเรียนบางส่วนมีข้อจำกัดด้านอุปกรณ์แต่แสดงความพยายามสูง`,
    };
  }, [students, classrooms, classroomId, calculateStudentTrait, calculateStudentReading]);

  // Copy to Excel handler (TSV format for direct 1:1 paste into Excel)
  const handleCopyTraitsForExcel = () => {
    if (!students.length) return;
    const rows = students.map((s, idx) => {
      const traitScores = DESIRABLE_8_TRAITS.map(t => calculateStudentTrait(s, t.id));
      const overall = calculateStudentTrait(s, 't4');
      const rationale = getStudentRationale(s);
      return [idx + 1, s.student_id, s.student_name, ...traitScores, overall, rationale].join('\t');
    });
    const header = ['เลขที่', 'รหัสประจำตัว', 'ชื่อ-สกุล', ...DESIRABLE_8_TRAITS.map(t => t.short), 'สรุปผล', 'เหตุผลประกอบ'].join('\t');
    const tsv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedNotification('คัดลอกตารางคุณลักษณะ 8 ประการ (Excel Format) เรียบร้อยแล้ว!');
    setTimeout(() => setCopiedNotification(''), 3000);
  };

  const handleCopyReadingForExcel = () => {
    if (!students.length) return;
    const rows = students.map((s, idx) => {
      const readingScores = READING_5_INDICATORS.map(r => calculateStudentReading(s, r.id));
      const overall = calculateStudentReading(s, 'r1');
      const rationale = getStudentRationale(s);
      return [idx + 1, s.student_id, s.student_name, ...readingScores, overall, rationale].join('\t');
    });
    const header = ['เลขที่', 'รหัสประจำตัว', 'ชื่อ-สกุล', ...READING_5_INDICATORS.map(r => r.short), 'สรุปผล', 'หลักฐานเชิงประจักษ์'].join('\t');
    const tsv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedNotification('คัดลอกตารางการอ่านคิดวิเคราะห์ (Excel Format) เรียบร้อยแล้ว!');
    setTimeout(() => setCopiedNotification(''), 3000);
  };

  const filteredStudents = useMemo(() => {
    let list = students;
    if (search.trim()) {
      const keyword = search.trim().toLocaleLowerCase('th');
      list = list.filter((s) =>
        s.student_name.toLocaleLowerCase('th').includes(keyword) ||
        s.student_id.toLocaleLowerCase('th').includes(keyword)
      );
    }
    if (behaviorFilter === 'POSITIVE') {
      list = list.filter((s) => (s.ticketsAwarded + s.coinsAwarded) >= (s.ticketsRemoved + s.cardsRemoved + s.coinsRemoved));
    } else if (behaviorFilter === 'ATTENTION') {
      list = list.filter((s) => (s.ticketsRemoved + s.cardsRemoved + s.coinsRemoved) >= 1);
    }
    return list;
  }, [search, behaviorFilter, students]);

  async function adjustTickets(direction: 1 | -1, overrideAmount?: number) {
    const amountToUse = overrideAmount || ticketAmount;
    if (!selectedStudent || !reason.trim() || amountToUse < 1 || busy) return;
    setBusy(true);
    try {
      await adjustStudentTickets(
        teacher.id,
        selectedStudent.id,
        direction * amountToUse,
        reason.trim(),
        behaviorCategory,
      );
      setReason('');
      setMessage(direction > 0 ? `มอบตั๋ว +${amountToUse} ใบ สำเร็จ` : `หักตั๋ว -${amountToUse} ใบ สำเร็จ`);
      await loadData();
      setSelectedStudent(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ปรับตั๋วไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function adjustCoins(direction: 1 | -1, overrideAmount?: number) {
    const amountToUse = overrideAmount || coinAmount;
    if (!selectedStudent || !reason.trim() || amountToUse < 1 || busy) return;
    setBusy(true);
    try {
      await adjustStudentCoins(
        teacher.id,
        selectedStudent.id,
        direction * amountToUse,
        reason.trim(),
        behaviorCategory,
      );
      setReason('');
      setMessage(direction > 0 ? `มอบเหรียญ +${amountToUse} 🪙 สำเร็จ` : `หักเหรียญ -${amountToUse} 🪙 สำเร็จ`);
      await loadData();
      setSelectedStudent(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ปรับเหรียญไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function adjustBulkTickets(direction: 1 | -1) {
    if (selectedStudentIds.size === 0 || !reason.trim() || ticketAmount < 1 || busy) return;
    setBusy(true);
    try {
      const studentIdList = Array.from(selectedStudentIds);
      await Promise.all(
        studentIdList.map((sId) =>
          adjustStudentTickets(
            teacher.id,
            sId,
            direction * ticketAmount,
            reason.trim(),
            behaviorCategory,
          )
        )
      );
      setReason('');
      setMessage(direction > 0 ? `มอบตั๋ว +${ticketAmount} ใบ ให้นักเรียน ${studentIdList.length} คน เรียบร้อยแล้ว` : `หักตั๋ว -${ticketAmount} ใบ จากนักเรียน ${studentIdList.length} คน เรียบร้อยแล้ว`);
      setSelectedStudentIds(new Set());
      setIsBulkModalOpen(false);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function adjustBulkCoins(direction: 1 | -1) {
    if (selectedStudentIds.size === 0 || !reason.trim() || coinAmount < 1 || busy) return;
    setBusy(true);
    try {
      const studentIdList = Array.from(selectedStudentIds);
      await Promise.all(
        studentIdList.map((sId) =>
          adjustStudentCoins(
            teacher.id,
            sId,
            direction * coinAmount,
            reason.trim(),
            behaviorCategory,
          )
        )
      );
      setReason('');
      setMessage(direction > 0 ? `มอบเหรียญ +${coinAmount} 🪙 ให้นักเรียน ${studentIdList.length} คน เรียบร้อยแล้ว` : `หักเหรียญ -${coinAmount} 🪙 จากนักเรียน ${studentIdList.length} คน เรียบร้อยแล้ว`);
      setSelectedStudentIds(new Set());
      setIsBulkModalOpen(false);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  const toggleSelectStudent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFilteredStudents = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center">
              <Ticket className="w-6 h-6 text-fuchsia-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Teacher Card & P.P.5 Dashboard</h1>
              <p className="text-slate-400 text-xs">ครูผู้สอน: {teacher.name} • จัดการการ์ด ตั๋วรางวัล และประเมิน ปพ.5</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { localStorage.removeItem('vocab_journey_card_teacher'); window.location.href = '/'; }}
              className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl flex items-center gap-2 text-sm transition"
            >
              <LogOut className="w-4 h-4" /> ออกจากระบบ
            </button>
          </div>
        </header>

        {/* Classroom Selector & Search Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <div className="flex-1 flex gap-3">
            <select
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white font-bold rounded-xl px-4 py-2.5 text-sm focus:border-fuchsia-500 focus:outline-none"
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>{c.class_name}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-fuchsia-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
            </button>
          </div>
        </div>

        {/* Success / Info Alerts */}
        {copiedNotification && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 font-bold animate-pulse">
            <Check className="w-5 h-5" /> {copiedNotification}
          </div>
        )}
        {message && (
          <div className="bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Classroom Summary Header Card (For P.P.5 Reports) */}
        {classStats && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-fuchsia-500/20 text-fuchsia-300 font-bold px-3 py-1 rounded-full">สรุปผล ปพ.5 ประจำห้องเรียน</span>
                  <h2 className="text-xl font-black text-white">{classStats.activeRoom} (นักเรียน {classStats.total} คน)</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">{classStats.rationaleText}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyTraitsForExcel}
                  className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold rounded-xl text-xs flex items-center gap-2 transition"
                >
                  <Copy className="w-3.5 h-3.5" /> คัดลอกคุณลักษณะ 8 ข้อ (Excel)
                </button>
                <button
                  onClick={handleCopyReadingForExcel}
                  className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold rounded-xl text-xs flex items-center gap-2 transition"
                >
                  <Copy className="w-3.5 h-3.5" /> คัดลอกการอ่าน 5 ข้อ (Excel)
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> พิมพ์ ปพ.5
                </button>
              </div>
            </div>

            {/* Trait & Reading Mini Progress Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-xs font-bold text-slate-300 block mb-2">🏆 สัดส่วนคุณลักษณะอันพึงประสงค์ 8 ประการ:</span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                    <div className="text-emerald-400 font-black">{classStats.traits.l3} คน ({classStats.traits.l3Pct}%)</div>
                    <div className="text-[10px] text-slate-400">ระดับ 3 (ดีเยี่ยม)</div>
                  </div>
                  <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                    <div className="text-indigo-400 font-black">{classStats.traits.l2} คน ({classStats.traits.l2Pct}%)</div>
                    <div className="text-[10px] text-slate-400">ระดับ 2 (ดี)</div>
                  </div>
                  <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                    <div className="text-amber-400 font-black">{classStats.traits.l1} คน ({classStats.traits.l1Pct}%)</div>
                    <div className="text-[10px] text-slate-400">ระดับ 1 (ผ่าน)</div>
                  </div>
                  <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                    <div className="text-rose-400 font-black">{classStats.traits.l0} คน ({classStats.traits.l0Pct}%)</div>
                    <div className="text-[10px] text-slate-400">ระดับ 0 (ปรับปรุง)</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-xs font-bold text-slate-300 block mb-2">📚 สัดส่วนการอ่าน คิดวิเคราะห์ และเขียน:</span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                    <div className="text-emerald-400 font-black">{classStats.reading.r3} คน ({classStats.reading.r3Pct}%)</div>
                    <div className="text-[10px] text-slate-400">ระดับ 3 (ดีเยี่ยม)</div>
                  </div>
                  <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                    <div className="text-indigo-400 font-black">{classStats.reading.r2} คน ({classStats.reading.r2Pct}%)</div>
                    <div className="text-[10px] text-slate-400">ระดับ 2 (ดี)</div>
                  </div>
                  <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                    <div className="text-amber-400 font-black">{classStats.reading.r1} คน ({classStats.reading.r1Pct}%)</div>
                    <div className="text-[10px] text-slate-400">ระดับ 1 (ผ่าน)</div>
                  </div>
                  <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                    <div className="text-rose-400 font-black">{classStats.reading.r0} คน ({classStats.reading.r0Pct}%)</div>
                    <div className="text-[10px] text-slate-400">ระดับ 0 (ปรับปรุง)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Main Tabs */}
        <div className="flex flex-wrap gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              tab === 'overview' ? 'bg-fuchsia-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4" /> แจกตั๋ว & เหรียญ
          </button>
          <button
            onClick={() => setTab('cards')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              tab === 'cards' ? 'bg-fuchsia-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" /> คลังการ์ด
          </button>
          <button
            onClick={() => setTab('pp5-traits')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              tab === 'pp5-traits' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" /> ตาราง ปพ.5: คุณลักษณะ 8 ข้อ
          </button>
          <button
            onClick={() => setTab('pp5-reading')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              tab === 'pp5-reading' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" /> ตาราง ปพ.5: อ่านคิดวิเคราะห์ 5 ข้อ
          </button>
          <button
            onClick={() => setTab('behavior')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              tab === 'behavior' ? 'bg-fuchsia-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> สถิติเชิงบวก vs ควรติดตาม
          </button>
          <button
            onClick={() => setTab('workflow')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              tab === 'workflow' ? 'bg-fuchsia-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> คำขอใช้การ์ด
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              tab === 'history' ? 'bg-fuchsia-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" /> ประวัติการแจกตั๋ว/เหรียญ
          </button>
        </div>

        {/* Tab: Cards Catalog */}
        {tab === 'cards' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-black text-white mb-2">รายการการ์ดทั้งหมดในระบบ</h3>
            <p className="text-xs text-slate-400 mb-6">ภาพรวมการ์ด ความหายาก และน้ำหนักการสุ่ม</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allCards.map((card) => (
                <div key={card.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{card.name}</h4>
                      <p className="text-xs text-slate-400">{card.card_code}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-fuchsia-500/20 text-fuchsia-300 rounded text-[10px] font-bold">{card.rarity}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{card.description || 'ไม่มีคำอธิบาย'}</p>
                  <div className="text-[11px] text-indigo-300 mt-3 flex justify-between border-t border-slate-800 pt-2">
                    <span>เป้าหมาย: {card.effect_type === 'ATTACK' ? 'ข้ามห้อง/ทั้งโรงเรียน' : 'ตนเอง/เพื่อน'}</span>
                    <span>Drop weight: {card.drop_weight}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Overview (Give Tickets / Coins & Quick Actions) */}
        {tab === 'overview' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">รายชื่อนักเรียนและยอดคงเหลือ</h3>
                <p className="text-xs text-slate-400">คลิกที่นักเรียนเพื่อมอบ/หักตั๋วหรือเหรียญ หรือติ๊กเลือกหลายคนเพื่อจัดการพร้อมกัน</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={selectAllFilteredStudents}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-fuchsia-400" />
                  {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทุกคนในห้อง'}
                </button>
                <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button onClick={() => setBehaviorFilter('ALL')} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${behaviorFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>ทั้งหมด</button>
                  <button onClick={() => setBehaviorFilter('POSITIVE')} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${behaviorFilter === 'POSITIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'}`}>เชิงบวก</button>
                  <button onClick={() => setBehaviorFilter('ATTENTION')} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${behaviorFilter === 'ATTENTION' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-white'}`}>ควรติดตาม</button>
                </div>
              </div>
            </div>

            {/* Bulk Selection Sticky Action Bar */}
            {selectedStudentIds.size > 0 && (
              <div className="bg-gradient-to-r from-fuchsia-950/80 via-slate-900 to-indigo-950/80 border border-fuchsia-500/50 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xl animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-300 font-black text-sm">
                    {selectedStudentIds.size}
                  </span>
                  <span className="text-sm font-bold text-white">
                    เลือกนักเรียนอยู่ {selectedStudentIds.size} คน
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setIsBulkModalOpen(true)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-950/50 transition"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    ⚡ มอบ / หัก ตั๋ว & เหรียญ ({selectedStudentIds.size} คน)
                  </button>
                  <button
                    onClick={() => setSelectedStudentIds(new Set())}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                  >
                    ล้างการเลือก
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStudents.map((student) => {
                const isSelected = selectedStudentIds.has(student.id);
                return (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`bg-slate-950 border p-4 rounded-2xl cursor-pointer transition flex justify-between items-center group shadow-md relative ${
                      isSelected
                        ? 'border-fuchsia-500 ring-1 ring-fuchsia-500/50 bg-fuchsia-950/20'
                        : 'border-slate-800 hover:border-fuchsia-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => toggleSelectStudent(student.id, e)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-fuchsia-500 border-fuchsia-400 text-white shadow-sm'
                            : 'border-slate-700 bg-slate-900/80 hover:border-slate-500 text-transparent'
                        }`}
                        title="เลือกนักเรียนคนนี้เพื่อแจก/หักหลายคน"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      <div>
                        <div className="font-bold text-white group-hover:text-fuchsia-300 transition text-sm flex items-center gap-1.5">
                          {student.student_name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{student.student_id}</div>
                        <div className="text-[10px] text-slate-400 mt-1 max-w-[170px] truncate" title={getStudentRationale(student)}>
                          {getStudentRationale(student)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-xs font-black text-amber-300 flex items-center justify-end gap-1">
                          <Ticket className="w-3.5 h-3.5 text-amber-400" /> {student.tickets}
                        </div>
                        <div className="text-[11px] font-bold text-indigo-300 mt-0.5">{student.coins} 🪙</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: P.P.5 8 Desirable Characteristics Matrix */}
        {tab === 'pp5-traits' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" /> ตารางบันทึกคุณลักษณะอันพึงประสงค์ 8 ประการ (แบบตาราง ปพ.5)
                </h3>
                <p className="text-xs text-slate-400">ระบบถอดแบบคอลัมน์ 1:1 ตรงตามเล่ม ปพ.5 สามารถคลิกปรับระดับคะแนนรายคน หรือกด Copy ลง Excel ได้ทันที</p>
              </div>
              <button
                onClick={handleCopyTraitsForExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition"
              >
                <Copy className="w-4 h-4" /> คัดลอกไปวางลง Excel (Ctrl+V)
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40 custom-scrollbar shadow-inner">
              <table className="w-full min-w-[1300px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wider text-center">
                    <th className="p-3 w-12 min-w-[50px] text-center">เลขที่</th>
                    <th className="p-3 w-24 min-w-[90px] text-center">รหัสนักเรียน</th>
                    <th className="p-3 min-w-[180px] text-left">ชื่อ - นามสกุล</th>
                    {DESIRABLE_8_TRAITS.map((t, idx) => (
                      <th key={t.id} className="p-2.5 min-w-[80px] text-center" title={t.name}>
                        <div className="text-[10px] text-emerald-400 font-bold">ข้อ {idx + 1}</div>
                        <div className="text-xs font-black text-slate-200 mt-0.5">{t.short}</div>
                      </th>
                    ))}
                    <th className="p-3 min-w-[140px] text-center text-emerald-400 whitespace-nowrap">สรุปผล ปพ.5</th>
                    <th className="p-3 min-w-[280px] text-left">เหตุผลประกอบการวิเคราะห์ (สั้น)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {students.map((student, idx) => {
                    const overall = calculateStudentTrait(student, 't4');
                    const rationale = getStudentRationale(student);
                    return (
                      <tr key={student.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 text-center text-slate-400 font-bold align-middle">{idx + 1}</td>
                        <td className="p-3 text-center text-slate-400 font-mono text-[11px] align-middle">{student.student_id}</td>
                        <td className="p-3 font-bold text-white align-middle">{student.student_name}</td>
                        {DESIRABLE_8_TRAITS.map((t) => {
                          const val = calculateStudentTrait(student, t.id);
                          return (
                            <td key={t.id} className="p-2 text-center align-middle">
                              <div className="flex items-center justify-center">
                                <select
                                  value={val}
                                  onChange={(e) => {
                                    const newVal = Number(e.target.value);
                                    setTraitOverrides((prev) => ({
                                      ...prev,
                                      [student.id]: { ...(prev[student.id] || {}), [t.id]: newVal }
                                    }));
                                  }}
                                  className={`w-12 h-9 text-center font-black rounded-xl text-xs border transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none ${
                                    val === 3 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30' :
                                    val === 2 ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30' :
                                    val === 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' :
                                    'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                                  }`}
                                  style={{ textAlignLast: 'center' }}
                                  title={`${t.name}: ระดับ ${val}`}
                                >
                                  <option value={3} className="bg-slate-900 text-emerald-300 font-bold">3</option>
                                  <option value={2} className="bg-slate-900 text-indigo-300 font-bold">2</option>
                                  <option value={1} className="bg-slate-900 text-amber-300 font-bold">1</option>
                                  <option value={0} className="bg-slate-900 text-rose-300 font-bold">0</option>
                                </select>
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-3 text-center whitespace-nowrap align-middle">
                          <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border shadow-sm ${
                            overall === 3 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                            overall === 2 ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' :
                            overall === 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                            'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}>
                            <span className="text-sm font-extrabold">{overall}</span>
                            <span className="text-[11px] font-bold">({overall === 3 ? 'ดีเยี่ยม' : overall === 2 ? 'ดี' : overall === 1 ? 'ผ่าน' : 'ปรับปรุง'})</span>
                          </span>
                        </td>
                        <td className="p-3 text-slate-300 text-xs leading-relaxed align-middle">
                          {rationale}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: P.P.5 Reading, Analytical Thinking & Writing Matrix */}
        {tab === 'pp5-reading' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" /> ตารางบันทึกการอ่าน คิดวิเคราะห์ และเขียน (ปพ.5 ส่วนที่ 2)
                </h3>
                <p className="text-xs text-slate-400">ประเมิน 5 ตัวชี้วัดสำคัญ พร้อมระบุคะแนนผลสัมฤทธิ์และพัฒนาการ (Learning Gain) เป็นหลักฐานเชิงประจักษ์</p>
              </div>
              <button
                onClick={handleCopyReadingForExcel}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs flex items-center gap-2 transition"
              >
                <Copy className="w-4 h-4" /> คัดลอกไปวางลง Excel (Ctrl+V)
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40 custom-scrollbar shadow-inner">
              <table className="w-full min-w-[1250px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wider text-center">
                    <th className="p-3 w-12 min-w-[50px] text-center">เลขที่</th>
                    <th className="p-3 w-24 min-w-[90px] text-center">รหัสนักเรียน</th>
                    <th className="p-3 min-w-[180px] text-left">ชื่อ - นามสกุล</th>
                    {READING_5_INDICATORS.map((r, idx) => (
                      <th key={r.id} className="p-2.5 min-w-[90px] text-center" title={r.name}>
                        <div className="text-[10px] text-indigo-400 font-bold">ตัวชี้วัดที่ {idx + 1}</div>
                        <div className="text-xs font-black text-slate-200 mt-0.5">{r.short}</div>
                      </th>
                    ))}
                    <th className="p-3 min-w-[140px] text-center text-indigo-400 whitespace-nowrap">สรุปผล ปพ.5</th>
                    <th className="p-3 min-w-[300px] text-left">หลักฐานเชิงประจักษ์ & เหตุผลสรุป (Evidence)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {students.map((student, idx) => {
                    const overall = calculateStudentReading(student, 'r1');
                    const evidence = `Post-test ${student.posttestScore || 0}%, Gain +${Math.round(student.learningGain || 0)}%, Accuracy ${student.accuracy || 0}%`;
                    return (
                      <tr key={student.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 text-center text-slate-400 font-bold align-middle">{idx + 1}</td>
                        <td className="p-3 text-center text-slate-400 font-mono text-[11px] align-middle">{student.student_id}</td>
                        <td className="p-3 font-bold text-white align-middle">{student.student_name}</td>
                        {READING_5_INDICATORS.map((r) => {
                          const val = calculateStudentReading(student, r.id);
                          return (
                            <td key={r.id} className="p-2 text-center align-middle">
                              <div className="flex items-center justify-center">
                                <select
                                  value={val}
                                  onChange={(e) => {
                                    const newVal = Number(e.target.value);
                                    setReadingOverrides((prev) => ({
                                      ...prev,
                                      [student.id]: { ...(prev[student.id] || {}), [r.id]: newVal }
                                    }));
                                  }}
                                  className={`w-12 h-9 text-center font-black rounded-xl text-xs border transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none ${
                                    val === 3 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30' :
                                    val === 2 ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30' :
                                    val === 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' :
                                    'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                                  }`}
                                  style={{ textAlignLast: 'center' }}
                                  title={`${r.name}: ระดับ ${val}`}
                                >
                                  <option value={3} className="bg-slate-900 text-emerald-300 font-bold">3</option>
                                  <option value={2} className="bg-slate-900 text-indigo-300 font-bold">2</option>
                                  <option value={1} className="bg-slate-900 text-amber-300 font-bold">1</option>
                                  <option value={0} className="bg-slate-900 text-rose-300 font-bold">0</option>
                                </select>
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-3 text-center whitespace-nowrap align-middle">
                          <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border shadow-sm ${
                            overall === 3 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                            overall === 2 ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' :
                            overall === 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                            'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}>
                            <span className="text-sm font-extrabold">{overall}</span>
                            <span className="text-[11px] font-bold">({overall === 3 ? 'ดีเยี่ยม' : overall === 2 ? 'ดี' : overall === 1 ? 'ผ่าน' : 'ปรับปรุง'})</span>
                          </span>
                        </td>
                        <td className="p-3 text-slate-300 text-xs leading-relaxed align-middle">
                          <div className="text-indigo-300 font-mono text-[11px] font-bold">{evidence}</div>
                          <div className="text-slate-400 mt-0.5">{getStudentRationale(student)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Behavior Analytics (Top Positive vs Needs Attention) */}
        {tab === 'behavior' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-black text-white mb-4">สถิติพฤติกรรมเชิงบวก vs พฤติกรรมที่ต้องติดตาม</h3>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {students.map((student) => {
                const studentActions = actions.filter((a) => a.student_id === student.id);
                const positiveActions = studentActions.filter((a) => ['COIN_AWARD', 'TICKET_AWARD'].includes(a.action_type));
                const correctiveActions = studentActions.filter((a) => ['COIN_REMOVAL', 'TICKET_REMOVAL', 'CARD_REMOVAL'].includes(a.action_type));
                return (
                  <div key={student.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-sm">{student.student_name}</h4>
                        <p className="text-[11px] text-slate-500">{student.student_id}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        positiveActions.length >= correctiveActions.length
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                      }`}>
                        {positiveActions.length >= correctiveActions.length ? 'เชิงบวกเด่น' : 'ควรติดตาม'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="bg-emerald-500/10 rounded-xl p-2.5 text-center border border-emerald-500/20">
                        <div className="text-[10px] text-emerald-300 font-bold">เชิงบวก</div>
                        <div className="text-xl font-black text-emerald-400">{positiveActions.length} ครั้ง</div>
                      </div>
                      <div className="bg-rose-500/10 rounded-xl p-2.5 text-center border border-rose-500/20">
                        <div className="text-[10px] text-rose-300 font-bold">ควรติดตาม</div>
                        <div className="text-xl font-black text-rose-400">{correctiveActions.length} ครั้ง</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3 border-t border-slate-800/80 pt-2 leading-relaxed">
                      💡 {getStudentRationale(student)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Workflow */}
        {tab === 'workflow' && <CardWorkflowPanel teacher={teacher} classroomId={classroomId} />}

        {/* Tab: History */}
        {tab === 'history' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden p-6">
            <h3 className="text-lg font-black text-white mb-2">ประวัติการมอบตั๋วและเหรียญพฤติกรรม</h3>
            <div className="divide-y divide-slate-800">
              {actions.map((action) => (
                <div key={action.id} className="py-3 grid md:grid-cols-[1.3fr_1fr_2fr_auto] gap-3 text-xs">
                  <div>
                    <div className="font-bold text-white">{action.students?.student_name}</div>
                    <div className="text-slate-500 text-[10px]">{new Date(action.created_at).toLocaleString('th-TH')}</div>
                  </div>
                  <div className={['TICKET_AWARD', 'COIN_AWARD'].includes(action.action_type) ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>
                    {action.action_type === 'COIN_AWARD' ? `+${action.amount} 🪙` :
                     action.action_type === 'COIN_REMOVAL' ? `-${action.amount} 🪙` :
                     action.action_type === 'TICKET_AWARD' ? `+${action.amount} 🎟️` :
                     `-${action.amount} 🎟️`}
                  </div>
                  <div className="text-slate-300">{action.reason}</div>
                  <div className="text-slate-500 font-mono text-[10px]">{action.balance_before} → {action.balance_after}</div>
                </div>
              ))}
              {actions.length === 0 && <div className="p-8 text-center text-slate-500 text-xs">ยังไม่มีประวัติ</div>}
            </div>
          </div>
        )}

        {/* Modal: Give / Deduct Tickets or Coins for Single Student */}
        {selectedStudent && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center">
            <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
                    <UserRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">{selectedStudent.student_name}</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {selectedStudent.student_id} • 🎟️ ตั๋วคงเหลือ: <span className="text-amber-400 font-bold">{selectedStudent.tickets}</span> ใบ | 🪙 เหรียญ: <span className="text-indigo-300 font-bold">{selectedStudent.coins}</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
                  <X className="w-5 h-5 text-slate-300" />
                </button>
              </div>

              {/* Quick Tags 8 Desirable Characteristics (Positive) */}
              <div>
                <label className="text-xs font-bold text-emerald-400 block mb-2">🏷️ เลือกคุณลักษณะ 8 ประการ (เชิงบวก)</label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REASONS.POSITIVE.map((tag) => (
                    <button
                      key={tag.text}
                      type="button"
                      onClick={() => { setReason(tag.text); setBehaviorCategory(tag.category as BehaviorCategory); }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                        reason === tag.text ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {tag.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Tags (Negative) */}
              <div>
                <label className="text-xs font-bold text-rose-400 block mb-2">⚠️ หรือเลือกพฤติกรรมที่ควรติดตาม (เชิงลบ)</label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REASONS.NEGATIVE.map((tag) => (
                    <button
                      key={tag.text}
                      type="button"
                      onClick={() => { setReason(tag.text); setBehaviorCategory(tag.category as BehaviorCategory); }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                        reason === tag.text ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {tag.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  ระบุเหตุผลประกอบ <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="พิมพ์เหตุผลหรือกดเลือกจาก Tag ด้านบน..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              {/* Section 1: Ticket Controls (มอบตั๋ว / หักตั๋ว) */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-amber-400" /> จัดการตั๋วสุ่มการ์ด (Tickets)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold">จำนวน:</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={ticketAmount}
                      onChange={(e) => setTicketAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-3 py-1.5 bg-slate-900 border border-amber-500/40 rounded-xl text-center font-black text-amber-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <span className="text-xs text-slate-400 font-bold">ใบ</span>
                  </div>
                </div>

                {/* Ticket Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-semibold mr-1">กดเลือกด่วน:</span>
                  {[1, 2, 3, 5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTicketAmount(num)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        ticketAmount === num ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-900 border border-slate-800 text-amber-400/80 hover:bg-slate-800'
                      }`}
                    >
                      {num} ใบ
                    </button>
                  ))}
                </div>

                {/* Ticket Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    disabled={busy || !reason.trim()}
                    onClick={() => adjustTickets(1)}
                    className="py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition"
                  >
                    <Ticket className="w-4 h-4" /> + มอบตั๋ว ({ticketAmount} ใบ)
                  </button>
                  <button
                    disabled={busy || !reason.trim()}
                    onClick={() => adjustTickets(-1)}
                    className="py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 disabled:opacity-40 text-rose-300 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition"
                  >
                    <MinusCircle className="w-4 h-4 text-rose-400" /> - หักตั๋ว ({ticketAmount} ใบ)
                  </button>
                </div>
              </div>

              {/* Section 2: Coin Controls (มอบเหรียญ / หักเหรียญ) */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-indigo-400" /> จัดการเหรียญรางวัล (Coins)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold">จำนวน:</span>
                    <input
                      type="number"
                      min={1}
                      step={50}
                      max={99999}
                      value={coinAmount}
                      onChange={(e) => setCoinAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 px-3 py-1.5 bg-slate-900 border border-indigo-500/40 rounded-xl text-center font-black text-indigo-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="text-xs text-slate-400 font-bold">🪙</span>
                  </div>
                </div>

                {/* Coin Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-semibold mr-1">กดเลือกด่วน:</span>
                  {[50, 100, 200, 500, 1000].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCoinAmount(num)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        coinAmount === num ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-900 border border-slate-800 text-indigo-300/80 hover:bg-slate-800'
                      }`}
                    >
                      {num} 🪙
                    </button>
                  ))}
                </div>

                {/* Coin Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    disabled={busy || !reason.trim()}
                    onClick={() => adjustCoins(1)}
                    className="py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition"
                  >
                    <Gift className="w-4 h-4" /> + มอบเหรียญ ({coinAmount} 🪙)
                  </button>
                  <button
                    disabled={busy || !reason.trim()}
                    onClick={() => adjustCoins(-1)}
                    className="py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 disabled:opacity-40 text-rose-300 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition"
                  >
                    <MinusCircle className="w-4 h-4 text-rose-400" /> - หักเหรียญ ({coinAmount} 🪙)
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Modal: Bulk Manage Tickets / Coins for Multiple Selected Students */}
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center">
            <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-indigo-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">จัดการตั๋ว & เหรียญกลุ่ม ({selectedStudentIds.size} คน)</h3>
                    <p className="text-xs text-slate-400">
                      ดำเนินการพร้อมกันให้นักเรียนที่เลือกทั้งหมดในครั้งเดียว
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsBulkModalOpen(false)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
                  <X className="w-5 h-5 text-slate-300" />
                </button>
              </div>

              {/* Quick Tags 8 Desirable Characteristics (Positive) */}
              <div>
                <label className="text-xs font-bold text-emerald-400 block mb-2">🏷️ เลือกคุณลักษณะ 8 ประการ (เชิงบวก)</label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REASONS.POSITIVE.map((tag) => (
                    <button
                      key={tag.text}
                      type="button"
                      onClick={() => { setReason(tag.text); setBehaviorCategory(tag.category as BehaviorCategory); }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                        reason === tag.text ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {tag.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Tags (Negative) */}
              <div>
                <label className="text-xs font-bold text-rose-400 block mb-2">⚠️ หรือเลือกพฤติกรรมที่ควรติดตาม (เชิงลบ)</label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REASONS.NEGATIVE.map((tag) => (
                    <button
                      key={tag.text}
                      type="button"
                      onClick={() => { setReason(tag.text); setBehaviorCategory(tag.category as BehaviorCategory); }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                        reason === tag.text ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {tag.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  ระบุเหตุผลประกอบ <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="พิมพ์เหตุผลประกอบการมอบ/หักสำหรับกลุ่มนักเรียนนี้..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              {/* Bulk Section 1: Ticket Controls */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-amber-400" /> ตั๋วสุ่มการ์ดต่อคน
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold">จำนวน:</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={ticketAmount}
                      onChange={(e) => setTicketAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-3 py-1.5 bg-slate-900 border border-amber-500/40 rounded-xl text-center font-black text-amber-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <span className="text-xs text-slate-400 font-bold">ใบ</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-semibold mr-1">กดเลือกด่วน:</span>
                  {[1, 2, 3, 5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTicketAmount(num)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        ticketAmount === num ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-900 border border-slate-800 text-amber-400/80 hover:bg-slate-800'
                      }`}
                    >
                      {num} ใบ
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    disabled={busy || !reason.trim()}
                    onClick={() => adjustBulkTickets(1)}
                    className="py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition"
                  >
                    <Ticket className="w-4 h-4" /> + มอบตั๋ว ({ticketAmount} ใบ/คน)
                  </button>
                  <button
                    disabled={busy || !reason.trim()}
                    onClick={() => adjustBulkTickets(-1)}
                    className="py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 disabled:opacity-40 text-rose-300 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition"
                  >
                    <MinusCircle className="w-4 h-4 text-rose-400" /> - หักตั๋ว ({ticketAmount} ใบ/คน)
                  </button>
                </div>
              </div>

              {/* Bulk Section 2: Coin Controls */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-indigo-400" /> เหรียญรางวัลต่อคน
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold">จำนวน:</span>
                    <input
                      type="number"
                      min={1}
                      step={50}
                      max={99999}
                      value={coinAmount}
                      onChange={(e) => setCoinAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 px-3 py-1.5 bg-slate-900 border border-indigo-500/40 rounded-xl text-center font-black text-indigo-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="text-xs text-slate-400 font-bold">🪙</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-semibold mr-1">กดเลือกด่วน:</span>
                  {[50, 100, 200, 500, 1000].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCoinAmount(num)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        coinAmount === num ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-900 border border-slate-800 text-indigo-300/80 hover:bg-slate-800'
                      }`}
                    >
                      {num} 🪙
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    disabled={busy || !reason.trim()}
                    onClick={() => adjustBulkCoins(1)}
                    className="py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition"
                  >
                    <Gift className="w-4 h-4" /> + มอบเหรียญ ({coinAmount} 🪙/คน)
                  </button>
                  <button
                    disabled={busy || !reason.trim()}
                    onClick={() => adjustBulkCoins(-1)}
                    className="py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 disabled:opacity-40 text-rose-300 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition"
                  >
                    <MinusCircle className="w-4 h-4 text-rose-400" /> - หักเหรียญ ({coinAmount} 🪙/คน)
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
