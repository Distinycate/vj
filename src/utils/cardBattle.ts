import { supabase } from './supabase/client';

export const GACHA_COIN_COST = 200;

export type CardEffectType = 'ATTACK' | 'DEFENSE' | 'REFLECT' | 'BUFF' | 'DUD';
export type CardLogStatus = 'PENDING' | 'COUNTER_PHASE' | 'RESOLVED' | 'REJECTED';
export type BehaviorCategory =
  | 'POSITIVE_BEHAVIOR'
  | 'RESPONSIBILITY'
  | 'VOLUNTEER'
  | 'DISCIPLINE'
  | 'RULE_VIOLATION'
  | 'OTHER';

export interface BattleCard {
  id: string;
  card_code: string;
  name: string;
  description: string | null;
  rarity: 'N' | 'R' | 'SR' | 'SSR' | 'UR';
  effect_type: CardEffectType;
  image_url: string | null;
}

export function getRpcErrorMessage(message?: string) {
  if (!message) return 'เกิดข้อผิดพลาด กรุณาลองใหม่';
  const known: Record<string, string> = {
    INSUFFICIENT_BALANCE: 'เหรียญหรือตั๋วสุ่มฟรีไม่เพียงพอ',
    CARD_NOT_AVAILABLE: 'การ์ดใบนี้ถูกใช้หรืออยู่ระหว่างรอครูอนุมัติ',
    COUNTER_CARD_NOT_AVAILABLE: 'ไม่มีการ์ดสวนกลับที่พร้อมใช้งาน',
    COUNTER_DEADLINE_EXPIRED: 'หมดเวลาสวนกลับแล้ว',
    COUNTER_PHASE_CLOSED: 'รายการนี้ไม่ได้อยู่ในช่วงสวนกลับ',
    TARGET_REQUIRED: 'กรุณาเลือกผู้รับการ์ด',
    SELF_TARGET_NOT_ALLOWED: 'ไม่สามารถใช้การ์ดโจมตีกับตัวเองได้',
    COUNTER_CARD_CANNOT_START_ACTION: 'การ์ดนี้ใช้ได้เฉพาะตอนสวนกลับ',
    DEFENSE_MUST_TARGET_SELF: 'การ์ดกันแบนใช้เป็นสิทธิ์ของตนเอง หรือใช้ตอนสวนกลับเท่านั้น',
    LOG_ALREADY_FINAL: 'รายการนี้ได้รับการตัดสินแล้ว',
    ACTION_NOT_ANNOUNCED: 'ต้องประกาศรายการก่อนจึงจะอนุมัติผลได้',
    REASON_REQUIRED: 'กรุณาระบุเหตุผล',
    INSUFFICIENT_TICKETS: 'ตั๋วของนักเรียนไม่เพียงพอ',
    INSUFFICIENT_AVAILABLE_CARDS: 'การ์ดพร้อมใช้ไม่เพียงพอ บางใบอาจถูกจองในคำขอ',
    CARD_NOT_FOUND_IN_INVENTORY: 'ไม่พบการ์ดนี้ในคลังของนักเรียน',
    INSUFFICIENT_COINS: 'เหรียญของนักเรียนไม่เพียงพอ',
    USERNAME_ALREADY_EXISTS: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว',
    SEASON_ALREADY_REWARDED: 'ฤดูกาลนี้แจกรางวัลแล้ว',
    NO_ELIGIBLE_TEAM: 'ไม่พบทีมที่เข้าเกณฑ์ในฤดูกาลนี้',
  };
  const key = Object.keys(known).find((code) => message.includes(code));
  return key ? known[key] : message;
}

export async function pullGachaCard(studentId: string) {
  const { data, error } = await supabase.rpc('pull_gacha_card', {
    p_student_id: studentId,
    p_coin_cost: GACHA_COIN_COST,
  });
  if (error) throw new Error(getRpcErrorMessage(error.message));
  return data;
}

export async function createCardAction(
  attackerId: string,
  cardId: string,
  targetId?: string | null,
  metadata?: any
) {
  const { data, error } = await supabase.rpc('create_card_action', {
    p_attacker_id: attackerId,
    p_card_id: cardId,
    p_target_id: targetId || null,
    p_metadata: metadata || {}
  });
  if (error) throw new Error(getRpcErrorMessage(error.message));
  return data;
}

export async function counterCardAction(logId: string, targetId: string, cardId: string) {
  const { data, error } = await supabase.rpc('counter_card_action', {
    p_log_id: logId,
    p_target_id: targetId,
    p_counter_card_id: cardId,
  });
  if (error) throw new Error(getRpcErrorMessage(error.message));
  return data;
}

export async function announceCardAction(logId: string, teacherId: string) {
  const { data, error } = await supabase.rpc('announce_card_action', {
    p_log_id: logId,
    p_teacher_id: teacherId,
    p_counter_seconds: 1800,
  });
  if (error) throw new Error(getRpcErrorMessage(error.message));
  return data;
}

export async function resolveCardAction(
  logId: string,
  teacherId: string,
  approve: boolean,
  resultText: string,
) {
  const { data, error } = await supabase.rpc('resolve_card_action', {
    p_log_id: logId,
    p_teacher_id: teacherId,
    p_approve: approve,
    p_final_result_text: resultText || null,
  });
  if (error) throw new Error(getRpcErrorMessage(error.message));
  return data;
}

export async function adjustStudentTickets(
  teacherId: string,
  studentId: string,
  amount: number,
  reason: string,
  category: BehaviorCategory = amount > 0 ? 'POSITIVE_BEHAVIOR' : 'DISCIPLINE',
) {
  const { data, error } = await supabase.rpc('teacher_adjust_student_tickets', {
    p_teacher_id: teacherId,
    p_student_id: studentId,
    p_amount: amount,
    p_reason: reason,
    p_behavior_category: category,
  });
  if (error) throw new Error(getRpcErrorMessage(error.message));
  return data;
}

export async function removeStudentCard(
  teacherId: string,
  studentId: string,
  cardId: string,
  amount = 1,
  reason = 'ครูริบการ์ดตามระเบียบ',
  category: BehaviorCategory = 'DISCIPLINE',
) {
  const { data, error } = await supabase.rpc('teacher_remove_student_card_categorized', {
    p_teacher_id: teacherId,
    p_student_id: studentId,
    p_card_id: cardId,
    p_amount: amount,
    p_reason: reason,
    p_behavior_category: category,
  });
  if (error) throw new Error(getRpcErrorMessage(error.message));
  return data;
}

export async function adjustStudentCoins(
  teacherId: string,
  studentId: string,
  amount: number,
  reason: string,
  category: BehaviorCategory,
) {
  const { data, error } = await supabase.rpc('teacher_adjust_student_coins', {
    p_teacher_id: teacherId,
    p_student_id: studentId,
    p_amount: amount,
    p_reason: reason,
    p_behavior_category: category,
  });
  if (error) throw new Error(getRpcErrorMessage(error.message));
  return data;
}

export async function registerCardTeacher(name: string, username: string, password: string) {
  const { data, error } = await supabase.rpc('register_card_teacher', {
    p_name: name,
    p_username: username,
    p_password: password,
  });
  if (error) throw new Error(getRpcErrorMessage(error.message));
  return data;
}
