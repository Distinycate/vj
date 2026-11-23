import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireInternalTeacherRole } from '@/lib/server/session';

const reportSchema = z.object({
  snapshotAt: z.string(),
  students: z.array(z.object({
    id: z.string(), studentCode: z.string().nullish(), name: z.string().nullish(),
    classroomId: z.string().nullish(), grade: z.string().nullish(), room: z.union([z.string(), z.number()]).nullish(),
    prePercent: z.number().nullable(), preCount: z.number().int().nonnegative(),
    postPercent: z.number().nullable(), gain: z.number().nullable(),
  })),
});

export async function GET() {
  try {
    await requireInternalTeacherRole(['ADMIN', 'TEACHER']);
    const payload = process.env.TERM_ONE_REPORT_JSON;
    if (!payload) return NextResponse.json({ error: 'ยังไม่ได้ติดตั้งคลังรายงานเทอม 1 แบบส่วนตัว' }, { status: 503 });
    const report = reportSchema.parse(JSON.parse(payload));
    return NextResponse.json({ success: true, ...report }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: error.status });
    console.error('Term one report could not be read');
    return NextResponse.json({ error: 'ไม่สามารถโหลดรายงานได้' }, { status: 500 });
  }
}
