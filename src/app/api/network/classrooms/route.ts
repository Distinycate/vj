import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireNetworkTeacher } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';

const createClassroomSchema = z.object({
  className: z.string().min(1, 'กรุณาระบุชื่อห้องเรียน').max(100),
  gradeLevel: z.string().min(1).max(20).optional(),
  roomNumber: z.string().min(1).max(20).optional(),
});

export async function GET() {
  try {
    const session = await requireNetworkTeacher();

    // Teacher can ONLY access classrooms they own
    const { data: classrooms, error } = await supabaseAdmin
      .from('classrooms')
      .select('*')
      .eq('teacher_id', session.subjectId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, classrooms: classrooms || [] });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Network classrooms GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireNetworkTeacher();

    const body = await request.json().catch(() => null);
    const parsed = createClassroomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid classroom details', details: parsed.error.issues }, { status: 400 });
    }

    const { className, gradeLevel, roomNumber } = parsed.data;

    const { data: newClassroom, error } = await supabaseAdmin
      .from('classrooms')
      .insert({
        class_name: className.trim(),
        teacher_id: session.subjectId,
        grade_level: gradeLevel?.trim() || null,
        room_number: roomNumber?.trim() || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Create classroom DB error:', error);
      return NextResponse.json({ error: 'Failed to create classroom' }, { status: 500 });
    }

    return NextResponse.json({ success: true, classroom: newClassroom });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Network classrooms POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireNetworkTeacher();

    const body = await request.json().catch(() => null);
    if (!body?.classroomId || !body?.className) {
      return NextResponse.json({ error: 'Missing classroomId or className' }, { status: 400 });
    }

    // Ownership check: Verify classroom belongs to this teacher
    const { data: existingClass } = await supabaseAdmin
      .from('classrooms')
      .select('id, teacher_id')
      .eq('id', body.classroomId)
      .maybeSingle();

    if (!existingClass || existingClass.teacher_id !== session.subjectId) {
      return NextResponse.json({ error: 'Forbidden: You do not own this classroom' }, { status: 403 });
    }

    const { data: updatedClassroom, error } = await supabaseAdmin
      .from('classrooms')
      .update({ class_name: String(body.className).trim() })
      .eq('id', body.classroomId)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, classroom: updatedClassroom });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Network classrooms PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
