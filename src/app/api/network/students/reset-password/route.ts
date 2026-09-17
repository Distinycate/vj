import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireNetworkTeacher } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';

const resetPasswordSchema = z.object({
  studentId: z.string().uuid('Invalid studentId'),
  newPassword: z.string().min(4, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร').max(100),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireNetworkTeacher();

    const body = await request.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid details', details: parsed.error.issues }, { status: 400 });
    }

    const { studentId, newPassword } = parsed.data;

    // Fetch student and verify classroom ownership
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, classroom_id, user_type')
      .eq('id', studentId)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (!student.classroom_id) {
      return NextResponse.json({ error: 'Forbidden: Student has no assigned classroom' }, { status: 403 });
    }

    const { data: classroom } = await supabaseAdmin
      .from('classrooms')
      .select('id, teacher_id')
      .eq('id', student.classroom_id)
      .maybeSingle();

    if (!classroom || classroom.teacher_id !== session.subjectId) {
      return NextResponse.json({ error: 'Forbidden: You do not own this student’s classroom' }, { status: 403 });
    }

    // Hash new password using standard bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({ password: passwordHash })
      .eq('id', studentId);

    if (updateError) throw updateError;

    // Revoke student's existing sessions
    await supabaseAdmin
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('subject_id', studentId)
      .is('revoked_at', null);

    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Reset student password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
