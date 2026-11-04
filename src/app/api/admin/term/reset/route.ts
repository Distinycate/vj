import { NextResponse } from 'next/server';
import { requireInternalTeacherRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireInternalTeacherRole(['ADMIN']);
    const body = await request.json().catch(() => null);
    if (body?.confirmation !== '2569-T2-restart-1') {
      return NextResponse.json({ error: 'กรุณายืนยันการเก็บประวัติและเริ่มรอบใหม่' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin.rpc('restart_learning_campaign_v2', { p_actor_id: session.subjectId });
    if (error) throw error;
    return NextResponse.json({ ...data, message: data.alreadyReset
      ? 'เปิดรอบนี้แล้ว ไม่รีเซ็ตข้อมูลซ้ำ'
      : 'เก็บประวัติแล้ว นักเรียนภายในที่เปิดใช้งาน ' + data.studentCount + ' คนเริ่ม Pre-test ใหม่และด่าน 1' });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: error.status });
    console.error('Campaign reset failed:', error);
    return NextResponse.json({ error: 'เริ่มรอบใหม่ไม่สำเร็จ ไม่มีการรีเซ็ตบางส่วน กรุณาตรวจ migration และการเชื่อมต่อฐานข้อมูล' }, { status: 500 });
  }
}
