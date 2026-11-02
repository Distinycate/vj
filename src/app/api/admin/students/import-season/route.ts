import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { requireInternalTeacherRole } from '@/lib/server/session';
import studentsData from '@/data/students_season2.json';

export async function POST(request: Request) {
  try {
    // Require authenticated teacher / admin session
    await requireInternalTeacherRole(['TEACHER', 'ADMIN', 'EXECUTIVE']);

    const results = {
      total: studentsData.length,
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    // Pre-hash distinct 4-digit passwords
    const passwordHashMap = new Map<string, string>();
    for (const s of studentsData) {
      if (!passwordHashMap.has(s.sid)) {
        const hash = await bcrypt.hash(s.sid, 10);
        passwordHashMap.set(s.sid, hash);
      }
    }

    // Cache classrooms
    const { data: classrooms } = await supabaseAdmin.from('classrooms').select('id, grade_level, room_number');
    const classMap = new Map<string, string>();
    (classrooms || []).forEach((c: any) => {
      classMap.set(`${c.grade_level}-${c.room_number}`, c.id);
    });

    for (const s of studentsData) {
      try {
        const cleanUsername = s.nid.trim();
        const studentId = s.sid.trim();
        const fullName = `${s.prefix}${s.fname} ${s.lname}`;
        const passwordHash = passwordHashMap.get(studentId)!;

        // Ensure classroom
        let classroomId = classMap.get(`${s.grade}-${s.room}`);
        if (!classroomId) {
          const { data: newClass } = await supabaseAdmin
            .from('classrooms')
            .insert({
              grade_level: s.grade,
              room_number: s.room,
              class_name: `${s.grade}/${s.room}`,
            })
            .select('id')
            .single();
          if (newClass) {
            classroomId = newClass.id;
            classMap.set(`${s.grade}-${s.room}`, newClass.id);
          }
        }

        // Check if student exists by username (NID) or student_id
        const { data: existing } = await supabaseAdmin
          .from('students')
          .select('id, username, student_id')
          .or(`username.eq.${cleanUsername},student_id.eq.${studentId}`)
          .limit(1)
          .maybeSingle();

        let sRecordId: string;

        if (existing) {
          sRecordId = existing.id;
          const { error: updErr } = await supabaseAdmin
            .from('students')
            .update({
              username: cleanUsername,
              student_id: studentId,
              password: passwordHash,
              student_name: fullName,
              first_name: s.fname,
              last_name: s.lname,
              grade_level: s.grade,
              room_number: s.room,
              classroom_id: classroomId || null,
              user_type: 'INTERNAL',
              is_active: true,
              is_verified: true,
            })
            .eq('id', existing.id);

          if (updErr) throw updErr;
          results.updated++;
        } else {
          sRecordId = crypto.randomUUID();
          const { error: insErr } = await supabaseAdmin
            .from('students')
            .insert({
              id: sRecordId,
              username: cleanUsername,
              student_id: studentId,
              password: passwordHash,
              student_name: fullName,
              first_name: s.fname,
              last_name: s.lname,
              grade_level: s.grade,
              room_number: s.room,
              classroom_id: classroomId || null,
              user_type: 'INTERNAL',
              is_active: true,
              is_verified: true,
            });

          if (insErr) throw insErr;
          results.created++;
        }

        // Ensure learning_paths exists with current_stage: 1
        const { data: lp } = await supabaseAdmin
          .from('learning_paths')
          .select('id')
          .eq('student_id', sRecordId)
          .maybeSingle();

        if (lp) {
          await supabaseAdmin
            .from('learning_paths')
            .update({ current_stage: 1, campaign_completed_at: null })
            .eq('id', lp.id);
        } else {
          await supabaseAdmin
            .from('learning_paths')
            .insert({
              student_id: sRecordId,
              current_stage: 1,
              current_rank: 1,
              coins: 0,
              exp: 0,
              total_exp: 0,
              free_pull_tickets: 0,
              study_streak: 0,
            });
        }
      } catch (err: any) {
        results.errors.push(`${s.grade} ${s.prefix}${s.fname}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `นำเข้ารหัสนักเรียนสำเร็จ: เพิ่มใหม่ ${results.created} คน, อัปเดต ${results.updated} คน`,
      results,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
