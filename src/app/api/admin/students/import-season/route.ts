import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { requireInternalTeacherRole } from '@/lib/server/session';
import { assertSameOrigin } from '@/lib/server/security';

const rosterSchema = z.array(z.object({
  nid: z.string().trim().regex(/^\d{13}$/), sid: z.string().trim().regex(/^\d{4}$/),
  grade: z.string().trim().min(1), room: z.string().trim().min(1),
  prefix: z.string().trim(), fname: z.string().trim().min(1), lname: z.string().trim().min(1),
})).min(1).max(150);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireInternalTeacherRole(['ADMIN']);
    const body = await request.json().catch(() => null);
    if (body?.action !== 'preview' && body?.action !== 'apply') {
      return NextResponse.json({ error: 'กรุณาตรวจรายชื่อก่อนนำเข้า' }, { status: 400 });
    }
    const configuredRoster = process.env.SEASON_ROSTER_JSON;
    if (!configuredRoster) return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่ารายชื่อส่วนตัวบนเซิร์ฟเวอร์ (SEASON_ROSTER_JSON)' }, { status: 503 });
    const roster = rosterSchema.safeParse(JSON.parse(configuredRoster));
    if (!roster.success) return NextResponse.json({ error: 'รูปแบบรายชื่อไม่ถูกต้อง กรุณาติดต่อผู้ดูแล' }, { status: 400 });

    const [byUsername, byId, rooms] = await Promise.all([
      supabaseAdmin.from('students').select('id,username,student_id,user_type').in('username', roster.data.map(s => s.nid)),
      supabaseAdmin.from('students').select('id,username,student_id,user_type').in('student_id', roster.data.map(s => s.sid)),
      supabaseAdmin.from('classrooms').select('id,grade_level,room_number'),
    ]);
    if (byUsername.error || byId.error || rooms.error) throw Error('ROSTER_LOOKUP_FAILED');
    const seenUsernames = new Set<string>(), seenIds = new Set<string>();
    const conflicts: number[] = [];
    const newRows: Array<{ student: typeof roster.data[number]; classroomId: string }> = [];
    let unchanged = 0;
    for (const [i, student] of roster.data.entries()) {
      const duplicate = seenUsernames.has(student.nid) || seenIds.has(student.sid);
      seenUsernames.add(student.nid); seenIds.add(student.sid);
      const usernames = (byUsername.data || []).filter(s => s.username === student.nid);
      const ids = (byId.data || []).filter(s => s.student_id === student.sid);
      if (!duplicate && usernames.length === 1 && ids.length === 1 &&
          usernames[0].id === ids[0].id && usernames[0].user_type === 'INTERNAL') {
        unchanged++;
        continue;
      }
      const matchingRooms = (rooms.data || []).filter(room => room.grade_level === student.grade && String(room.room_number) === student.room);
      if (duplicate || usernames.length || ids.length || matchingRooms.length !== 1) {
        conflicts.push(i + 1);
        continue;
      }
      newRows.push({ student, classroomId: matchingRooms[0].id });
    }
    const preview = { total: roster.data.length, newCount: newRows.length, unchanged, conflicts,
      revision: createHash('sha256').update(JSON.stringify({ newRows, unchanged, conflicts })).digest('hex') };
    if (body.action === 'preview') {
      return NextResponse.json({ success: true, preview }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (conflicts.length || body.revision !== preview.revision) {
      return NextResponse.json({ error: 'ข้อมูลเปลี่ยนหรือมีรายการขัดแย้ง กรุณาตรวจรายการใหม่ก่อนนำเข้า' }, { status: 409 });
    }

    const rows: Array<Record<string, string>> = [];
    for (const { student, classroomId } of newRows) {
      rows.push({ username: student.nid, student_id: student.sid, password: await bcrypt.hash(student.sid, 10),
        student_name: student.prefix + student.fname + ' ' + student.lname, first_name: student.fname, last_name: student.lname,
        grade_level: student.grade, room_number: student.room, classroom_id: classroomId });
    }
    if (rows.length) {
      const { error } = await supabaseAdmin.rpc('import_new_season_students', { p_rows: rows });
      if (error?.message.includes('ROSTER_CHANGED')) return NextResponse.json({ error: 'พบข้อมูลซ้ำระหว่างนำเข้า กรุณาตรวจรายการใหม่' }, { status: 409 });
      if (error) throw Error(error.code || 'ROSTER_IMPORT_FAILED');
    }
    return NextResponse.json({ success: true, message: 'เพิ่มบัญชีใหม่ ' + rows.length + ' คน · คงบัญชีเดิม ' + unchanged + ' คน' });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบ' }, { status: error.status });
    console.error('Season roster import failed:', error instanceof SyntaxError ? 'INVALID_ROSTER_JSON' : error?.message);
    return NextResponse.json({ error: 'นำเข้าไม่สำเร็จ กรุณาตรวจการตั้งค่ารายชื่อและฐานข้อมูล' }, { status: 500 });
  }
}
