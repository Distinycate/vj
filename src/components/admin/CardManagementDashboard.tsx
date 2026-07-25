'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, BarChart3, CheckCircle2, ClipboardList, Gift, Home,
  LogOut, MinusCircle, Package, RefreshCw, Search, ShieldAlert, Sparkles,
  Ticket, Trash2, UserRound, X,
} from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import {
  adjustStudentCoins, adjustStudentTickets, BehaviorCategory, removeStudentCard,
} from '@/utils/cardBattle';
import CardWorkflowPanel from './CardWorkflowPanel';

type CardPageTab = 'overview' | 'cards' | 'behavior' | 'workflow' | 'history';

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
}

const BEHAVIOR_CATEGORIES: Array<{ value: BehaviorCategory; label: string }> = [
  { value: 'POSITIVE_BEHAVIOR', label: 'ความประพฤติเชิงบวก' },
  { value: 'RESPONSIBILITY', label: 'ความรับผิดชอบ' },
  { value: 'VOLUNTEER', label: 'จิตอาสา/ช่วยเหลือส่วนรวม' },
  { value: 'DISCIPLINE', label: 'วินัย' },
  { value: 'RULE_VIOLATION', label: 'ไม่ปฏิบัติตามข้อตกลง' },
  { value: 'OTHER', label: 'อื่น ๆ' },
];

function categoryLabel(value: string) {
  return BEHAVIOR_CATEGORIES.find((category) => category.value === value)?.label || 'อื่น ๆ';
}

function getRelationObject(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function behaviorSignal(student: StudentSummary) {
  const positive = student.ticketsAwarded + student.coinsAwarded;
  const deductions = student.ticketsRemoved + student.cardsRemoved + student.coinsRemoved;
  if (positive === 0 && deductions === 0) {
    return { label: 'ยังไม่มีข้อมูล', style: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
  }
  if (deductions >= 2 && deductions > positive) {
    return { label: 'ควรติดตาม', style: 'bg-rose-500/10 text-rose-300 border-rose-500/20' };
  }
  if (positive > deductions) {
    return { label: 'ได้รับคำชมเชย', style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' };
  }
  return { label: 'ข้อมูลผสม', style: 'bg-amber-500/10 text-amber-300 border-amber-500/20' };
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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [ticketAmount, setTicketAmount] = useState(1);
  const [coinAmount, setCoinAmount] = useState(100);
  const [behaviorCategory, setBehaviorCategory] = useState<BehaviorCategory>('POSITIVE_BEHAVIOR');

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
    const studentsResult = await supabase
      .from('students')
      .select('id, student_id, student_name, classroom_id, learning_paths(free_pull_tickets, coins)')
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('student_name');
    if (studentsResult.error) {
      setMessage(studentsResult.error.message);
      setLoading(false);
      return;
    }

    const rawStudents = studentsResult.data || [];
    const studentIds = rawStudents.map((student) => student.id);
    if (studentIds.length === 0) {
      setStudents([]);
      setInventory([]);
      setActions([]);
      setLoading(false);
      return;
    }

    const [inventoryResult, pullsResult, actionsResult] = await Promise.all([
      supabase
        .from('card_inventory')
        .select('id, student_id, card_id, quantity, reserved_quantity, cards(*)')
        .in('student_id', studentIds)
        .gt('quantity', 0),
      supabase
        .from('gacha_pulls')
        .select('id, student_id')
        .in('student_id', studentIds),
      supabase
        .from('card_admin_actions')
        .select('*, cards(name, image_url, rarity), teachers(name), students(student_name)')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
        .limit(500),
    ]);
    const dataError = inventoryResult.error || pullsResult.error || actionsResult.error;
    if (dataError) {
      setMessage(`โหลดข้อมูลการ์ดไม่สำเร็จ: ${dataError.message}`);
      setLoading(false);
      return;
    }

    const inventoryRows = inventoryResult.data || [];
    const pullRows = pullsResult.data || [];
    const actionRows = actionsResult.data || [];
    setInventory(inventoryRows);
    setActions(actionRows);

    setStudents(rawStudents.map((student) => {
      const studentInventory = inventoryRows.filter((row) => row.student_id === student.id);
      const studentActions = actionRows.filter((action) => action.student_id === student.id);
      const sumAction = (type: string) => studentActions
        .filter((action) => action.action_type === type)
        .reduce((sum, action) => sum + Number(action.amount || 0), 0);
      return {
        ...student,
        tickets: getRelationObject(student.learning_paths)?.free_pull_tickets || 0,
        coins: getRelationObject(student.learning_paths)?.coins || 0,
        currentCards: studentInventory.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
        reservedCards: studentInventory.reduce((sum, row) => sum + Number(row.reserved_quantity || 0), 0),
        cardsReceived: pullRows.filter((pull) => pull.student_id === student.id).length,
        ticketsAwarded: sumAction('TICKET_AWARD'),
        ticketsRemoved: sumAction('TICKET_REMOVAL'),
        cardsRemoved: sumAction('CARD_REMOVAL'),
        coinsAwarded: sumAction('COIN_AWARD'),
        coinsRemoved: sumAction('COIN_REMOVAL'),
      };
    }));
    setLoading(false);
  }, [classroomId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = useMemo(() => students.reduce((summary, student) => ({
    currentCards: summary.currentCards + student.currentCards,
    cardsReceived: summary.cardsReceived + student.cardsReceived,
    ticketsAwarded: summary.ticketsAwarded + student.ticketsAwarded,
    deductions: summary.deductions + student.ticketsRemoved + student.cardsRemoved + student.coinsRemoved,
  }), { currentCards: 0, cardsReceived: 0, ticketsAwarded: 0, deductions: 0 }), [students]);

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');
    if (!keyword) return students;
    return students.filter((student) =>
      student.student_name.toLocaleLowerCase('th').includes(keyword) ||
      student.student_id.toLocaleLowerCase('th').includes(keyword)
    );
  }, [search, students]);

  const selectedInventory = selectedStudent
    ? inventory.filter((row) => row.student_id === selectedStudent.id)
    : [];

  const cardCatalog = useMemo(() => allCards.map((card) => {
    const inventoryRows = inventory.filter((row) => row.card_id === card.id);
    return {
      ...card,
      currentQuantity: inventoryRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
      reservedQuantity: inventoryRows.reduce((sum, row) => sum + Number(row.reserved_quantity || 0), 0),
      holders: new Set(inventoryRows.map((row) => row.student_id)).size,
    };
  }), [allCards, inventory]);

  async function adjustTickets(direction: 1 | -1) {
    if (!selectedStudent || !reason.trim() || ticketAmount < 1 || busy) return;
    setBusy(true);
    try {
      await adjustStudentTickets(
        teacher.id,
        selectedStudent.id,
        direction * ticketAmount,
        reason.trim(),
        behaviorCategory,
      );
      setReason('');
      setMessage(direction > 0 ? 'มอบตั๋วและบันทึกเหตุผลแล้ว' : 'หักตั๋วและบันทึกเหตุผลแล้ว');
      await loadData();
      setSelectedStudent(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ปรับตั๋วไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function adjustCoins(direction: 1 | -1) {
    if (!selectedStudent || !reason.trim() || coinAmount < 1 || busy) return;
    setBusy(true);
    try {
      await adjustStudentCoins(
        teacher.id,
        selectedStudent.id,
        direction * coinAmount,
        reason.trim(),
        behaviorCategory,
      );
      setReason('');
      setMessage(direction > 0 ? 'มอบเหรียญและบันทึกคุณลักษณะแล้ว' : 'หักเหรียญและบันทึกเหตุผลแล้ว');
      await loadData();
      setSelectedStudent(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ปรับเหรียญไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function removeCard(row: any) {
    if (!selectedStudent || !reason.trim() || busy) return;
    if (!window.confirm(`ยืนยันริบการ์ด “${row.cards?.name}” 1 ใบ?`)) return;
    setBusy(true);
    try {
      await removeStudentCard(
        teacher.id,
        selectedStudent.id,
        row.card_id,
        1,
        reason.trim(),
        behaviorCategory,
      );
      setReason('');
      setMessage('ริบการ์ดและบันทึกเหตุผลแล้ว');
      await loadData();
      setSelectedStudent(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ริบการ์ดไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-fuchsia-300 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> Card Game Administration
            </div>
            <h1 className="text-2xl font-black text-white mt-1">จัดการการ์ดและข้อมูลพฤติกรรม</h1>
            <p className="text-sm text-slate-400 mt-1">แยกจากผลการเรียนและสถิติการเล่นคำศัพท์</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {teacher.role !== 'CARD_TEACHER' && (
              <button onClick={() => window.location.href = '/admin'} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Analytics ครู
              </button>
            )}
            <button onClick={() => window.location.href = '/'} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold flex items-center gap-2">
              <Home className="w-4 h-4" /> หน้าเข้าใช้งาน
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('vocab_journey_teacher');
                localStorage.removeItem('vocab_journey_card_teacher');
                window.location.href = teacher.role === 'CARD_TEACHER' ? '/card-teacher' : '/';
              }}
              className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-sm font-bold flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 py-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-6">
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'overview', label: 'ภาพรวมและคลังรายบุคคล', icon: BarChart3 },
              { id: 'cards', label: 'การ์ดทั้งหมด', icon: Package },
              { id: 'behavior', label: 'สรุปคุณลักษณะ', icon: CheckCircle2 },
              { id: 'workflow', label: 'คำขอใช้การ์ด', icon: ClipboardList },
              { id: 'history', label: 'ประวัติครู', icon: ShieldAlert },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as CardPageTab)}
                className={`px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-bold flex items-center gap-2 ${
                  tab === item.id ? 'bg-fuchsia-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </button>
            ))}
          </nav>
          <div className="flex gap-2">
            <select value={classroomId} onChange={(event) => setClassroomId(event.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm font-bold">
              {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.class_name}</option>)}
            </select>
            <button onClick={loadData} className="p-2.5 bg-slate-800 rounded-xl"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        {message && <div className="mb-5 p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 rounded-2xl">{message}</div>}

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'การ์ดในคลัง', value: totals.currentCards, icon: Package, color: 'text-sky-300' },
                { label: 'การ์ดที่สุ่มได้ทั้งหมด', value: totals.cardsReceived, icon: Sparkles, color: 'text-fuchsia-300' },
                { label: 'ตั๋วที่ครูมอบ', value: totals.ticketsAwarded, icon: Gift, color: 'text-emerald-300' },
                { label: 'รายการหัก/ริบ', value: totals.deductions, icon: MinusCircle, color: 'text-rose-300' },
              ].map((card) => (
                <div key={card.label} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                  <div className="text-2xl font-black text-white mt-3">{card.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">นักเรียนและคลังการ์ด</h2>
                  <p className="text-xs text-slate-500 mt-1">ตัวบ่งชี้พฤติกรรมเป็นข้อมูลช่วยติดตาม ไม่ใช่คำตัดสินนักเรียน</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรือรหัส" className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950 text-slate-500 text-xs">
                    <tr>
                      <th className="text-left p-4">นักเรียน</th>
                      <th className="text-center p-4">สุ่มได้</th>
                      <th className="text-center p-4">คงเหลือ</th>
                      <th className="text-center p-4">ตั๋วปัจจุบัน</th>
                      <th className="text-center p-4">เหรียญ</th>
                      <th className="text-center p-4">ครูมอบ</th>
                      <th className="text-center p-4">หัก/ริบ</th>
                      <th className="text-center p-4">ข้อมูลติดตาม</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredStudents.map((student) => {
                      const signal = behaviorSignal(student);
                      return (
                        <tr key={student.id} className="hover:bg-slate-800/30">
                          <td className="p-4">
                            <div className="font-bold text-white">{student.student_name}</div>
                            <div className="text-xs text-slate-500">{student.student_id}</div>
                          </td>
                          <td className="text-center p-4">{student.cardsReceived}</td>
                          <td className="text-center p-4">{student.currentCards}{student.reservedCards > 0 && <span className="text-amber-400 text-xs"> ({student.reservedCards} จอง)</span>}</td>
                          <td className="text-center p-4 text-sky-300 font-bold">{student.tickets}</td>
                          <td className="text-center p-4 text-amber-300 font-bold">{student.coins}</td>
                          <td className="text-center p-4 text-emerald-300">{student.ticketsAwarded}</td>
                          <td className="text-center p-4 text-rose-300">{student.ticketsRemoved + student.cardsRemoved}</td>
                          <td className="text-center p-4"><span className={`px-2 py-1 border rounded-full text-[10px] font-bold ${signal.style}`}>{signal.label}</span></td>
                          <td className="p-4 text-right">
                            <button onClick={() => { setSelectedStudent(student); setReason(''); }} className="px-3 py-2 bg-fuchsia-500/15 text-fuchsia-300 rounded-xl font-bold text-xs">
                              จัดการ
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {loading && <div className="p-10 text-center text-slate-500">กำลังโหลดข้อมูล...</div>}
              {!loading && filteredStudents.length === 0 && <div className="p-10 text-center text-slate-500">ไม่พบนักเรียน</div>}
            </div>
          </div>
        )}

        {tab === 'cards' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h2 className="text-lg font-black text-white">รายการการ์ดทั้งหมดในระบบ</h2>
              <p className="text-xs text-slate-500 mt-1">
                ครูใช้หน้านี้ตรวจสอบว่าระบบมีการ์ดอะไรบ้าง ผลของการ์ด ระดับความหายาก และจำนวนที่นักเรียนในห้องที่เลือกถืออยู่
              </p>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 p-5">
              {cardCatalog.map((card) => (
                <div key={card.id} className={`bg-slate-950/60 border rounded-2xl p-5 ${card.is_active === false ? 'border-slate-800 opacity-60' : 'border-slate-700'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <span className="text-4xl">{card.image_url || '🃏'}</span>
                      <div>
                        <h3 className="font-black text-white">{card.name}</h3>
                        <div className="text-xs text-slate-500 mt-0.5">{card.card_code}</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 text-xs font-black">
                      {card.rarity}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-4 leading-relaxed">{card.description || 'ไม่มีคำอธิบาย'}</p>
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="bg-slate-900 rounded-xl p-2">
                      <div className="text-[10px] text-slate-500">ประเภท</div>
                      <div className="text-xs font-black text-white mt-1">{card.effect_type}</div>
                    </div>
                    <div className="bg-slate-900 rounded-xl p-2">
                      <div className="text-[10px] text-slate-500">ในห้องนี้</div>
                      <div className="text-xs font-black text-sky-300 mt-1">{card.currentQuantity} ใบ</div>
                    </div>
                    <div className="bg-slate-900 rounded-xl p-2">
                      <div className="text-[10px] text-slate-500">ผู้ถือ</div>
                      <div className="text-xs font-black text-emerald-300 mt-1">{card.holders} คน</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                    <span className="px-2 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                      เป้าหมาย: {card.effect_type === 'ATTACK' ? 'ข้ามห้อง/ทั้งโรงเรียน' : card.effect_type === 'BUFF' || card.effect_type === 'DEFENSE' ? 'ตนเองหรือสวนกลับ' : 'ไม่มีผล'}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                      Drop weight: {card.drop_weight ?? '-'}
                    </span>
                    {card.reservedQuantity > 0 && (
                      <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        จองอยู่ {card.reservedQuantity} ใบ
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {cardCatalog.length === 0 && (
                <div className="md:col-span-2 xl:col-span-3 p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  ยังไม่มีข้อมูลการ์ดในระบบ
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'behavior' && (
          <div className="space-y-5">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-sm text-indigo-200">
              สรุปนี้นับจากรายการที่ครูบันทึกในระบบการ์ดเท่านั้น ควรใช้ร่วมกับการสังเกตและหลักฐานอื่นก่อนประเมินคุณลักษณะอันพึงประสงค์
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {students.map((student) => {
                const studentActions = actions.filter((action) => action.student_id === student.id);
                const positiveActions = studentActions.filter((action) =>
                  ['COIN_AWARD', 'TICKET_AWARD'].includes(action.action_type)
                );
                const correctiveActions = studentActions.filter((action) =>
                  ['COIN_REMOVAL', 'TICKET_REMOVAL', 'CARD_REMOVAL'].includes(action.action_type)
                );
                return (
                  <div key={student.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                    <h3 className="font-black text-white">{student.student_name}</h3>
                    <p className="text-xs text-slate-500">{student.student_id}</p>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="bg-emerald-500/10 rounded-xl p-3"><div className="text-xs text-emerald-300">เชิงบวก</div><div className="text-2xl font-black">{positiveActions.length}</div></div>
                      <div className="bg-rose-500/10 rounded-xl p-3"><div className="text-xs text-rose-300">ควรติดตาม</div><div className="text-2xl font-black">{correctiveActions.length}</div></div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {BEHAVIOR_CATEGORIES.map((category) => {
                        const count = studentActions.filter((action) => action.behavior_category === category.value).length;
                        if (count === 0) return null;
                        return <div key={category.value} className="flex justify-between text-xs text-slate-400"><span>{category.label}</span><span>{count} ครั้ง</span></div>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'workflow' && <CardWorkflowPanel teacher={teacher} classroomId={classroomId} />}

        {tab === 'history' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h2 className="text-lg font-black">ประวัติการมอบและการลงโทษ</h2>
              <p className="text-xs text-slate-500 mt-1">ทุกการเปลี่ยนแปลงมีชื่อครู เหตุผล และยอดก่อน–หลัง</p>
            </div>
            <div className="divide-y divide-slate-800">
              {actions.map((action) => (
                <div key={action.id} className="p-4 grid md:grid-cols-[1.3fr_1fr_2fr_auto] gap-3 text-sm">
                  <div>
                    <div className="font-bold text-white">{action.students?.student_name}</div>
                    <div className="text-xs text-indigo-300 mt-0.5">โดยครู {action.teachers?.name || 'ไม่พบชื่อครู'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{new Date(action.created_at).toLocaleString('th-TH')}</div>
                  </div>
                  <div className={['TICKET_AWARD', 'COIN_AWARD'].includes(action.action_type) ? 'text-emerald-300' : 'text-rose-300'}>
                    {action.action_type === 'COIN_AWARD' ? `มอบเหรียญ +${action.amount}` :
                      action.action_type === 'COIN_REMOVAL' ? `หักเหรียญ -${action.amount}` :
                      action.action_type === 'TICKET_AWARD' ? `มอบตั๋ว +${action.amount}` :
                      action.action_type === 'TICKET_REMOVAL' ? `หักตั๋ว -${action.amount}` :
                      `ริบ ${action.cards?.name || 'การ์ด'} ${action.amount} ใบ`}
                  </div>
                  <div><div className="text-slate-300">{action.reason}</div><div className="text-xs text-slate-500 mt-1">{categoryLabel(action.behavior_category)}</div></div>
                  <div className="text-xs text-slate-500">{action.balance_before} → {action.balance_after}</div>
                </div>
              ))}
              {actions.length === 0 && <div className="p-12 text-center text-slate-500">ยังไม่มีประวัติ</div>}
            </div>
          </div>
        )}
      </main>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto my-8 bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserRound className="text-fuchsia-300" />
                <div><h2 className="text-xl font-black">{selectedStudent.student_name}</h2><p className="text-xs text-slate-500">{selectedStudent.student_id}</p></div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-2 bg-slate-800 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-400">หมวดคุณลักษณะ</label>
                <select value={behaviorCategory} onChange={(event) => setBehaviorCategory(event.target.value as BehaviorCategory)} className="w-full mt-2 bg-slate-950 border border-slate-700 rounded-xl p-3">
                  {BEHAVIOR_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400">เหตุผลที่มอบหรือหัก (จำเป็น)</label>
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="เช่น ช่วยงานส่วนรวม / ไม่ปฏิบัติตามข้อตกลงของชั้นเรียน" className="w-full mt-2 bg-slate-950 border border-slate-700 rounded-xl p-3 min-h-20" />
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <h3 className="font-black flex items-center gap-2">🪙 เหรียญ: {selectedStudent.coins}</h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  <input type="number" min={1} max={10000} value={coinAmount} onChange={(event) => setCoinAmount(Math.max(1, Number(event.target.value)))} className="w-28 bg-slate-900 border border-slate-700 rounded-xl px-3" />
                  <button disabled={busy || !reason.trim()} onClick={() => adjustCoins(1)} className="px-4 py-2 bg-amber-400 text-slate-950 disabled:opacity-40 rounded-xl font-bold">มอบเหรียญ</button>
                  <button disabled={busy || !reason.trim()} onClick={() => adjustCoins(-1)} className="px-4 py-2 bg-rose-500/15 text-rose-300 disabled:opacity-40 rounded-xl font-bold">หักเหรียญ</button>
                </div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <h3 className="font-black flex items-center gap-2"><Ticket className="w-4 h-4 text-sky-300" /> ตั๋วสุ่มฟรี: {selectedStudent.tickets}</h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  <input type="number" min={1} max={100} value={ticketAmount} onChange={(event) => setTicketAmount(Math.max(1, Number(event.target.value)))} className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3" />
                  <button disabled={busy || !reason.trim()} onClick={() => adjustTickets(1)} className="px-4 py-2 bg-emerald-500 text-slate-950 disabled:opacity-40 rounded-xl font-bold flex gap-2"><Gift className="w-4 h-4" /> มอบตั๋ว</button>
                  <button disabled={busy || !reason.trim()} onClick={() => adjustTickets(-1)} className="px-4 py-2 bg-rose-500/15 text-rose-300 disabled:opacity-40 rounded-xl font-bold flex gap-2"><MinusCircle className="w-4 h-4" /> หักตั๋ว</button>
                </div>
              </div>
              <div>
                <h3 className="font-black mb-3">คลังการ์ดรายบุคคล</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {selectedInventory.map((row) => (
                    <div key={row.id} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                      <div className="flex gap-3 items-center">
                        <span className="text-3xl">{row.cards?.image_url}</span>
                        <div><div className="font-bold text-white">{row.cards?.name}</div><div className="text-xs text-slate-500">มี {row.quantity} • พร้อมริบ {row.quantity - row.reserved_quantity}</div></div>
                      </div>
                      <button disabled={busy || !reason.trim() || row.quantity - row.reserved_quantity < 1} onClick={() => removeCard(row)} className="p-2 text-rose-300 bg-rose-500/10 disabled:opacity-30 rounded-xl" title="ริบการ์ด"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {selectedInventory.length === 0 && <div className="col-span-full p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">ไม่มีการ์ดในคลัง</div>}
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-950 p-3 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                การริบจะไม่แตะการ์ดที่ถูกจองในคำขอ และทุกการดำเนินการถูกบันทึกในประวัติ
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
