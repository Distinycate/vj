import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { NATIONAL_BENCHMARKS } from '@/data/onet/onetData';

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    await requireRole(['ADMIN', 'TEACHER']);

    // 1. Fetch internal students
    const { data: students, error: sErr } = await supabaseAdmin
      .from('students')
      .select('id, student_id, student_name, grade_level, room_number, academic_year, is_skull')
      .eq('user_type', 'INTERNAL')
      .order('student_id', { ascending: true });

    if (sErr) {
      console.error('Failed to fetch students for ONET admin:', sErr);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    // 2. Fetch all ONET transactions from economy_transactions
    const { data: txs, error: txErr } = await supabaseAdmin
      .from('economy_transactions')
      .select('student_id, metadata, created_at')
      .eq('source', 'onet_challenge')
      .order('created_at', { ascending: true });

    if (txErr) {
      console.error('Failed to fetch ONET transactions:', txErr);
      return NextResponse.json({ error: 'Failed to fetch ONET records' }, { status: 500 });
    }

    // Group all attempts chronologically per student per year
    // Key: `${student_id}_${year}`
    const attemptsMap: Record<string, any[]> = {};

    (txs || []).forEach((tx) => {
      const meta = tx.metadata || {};
      const year = meta.year;
      if (!year || !tx.student_id) return;

      const key = `${tx.student_id}_${year}`;
      if (!attemptsMap[key]) {
        attemptsMap[key] = [];
      }

      attemptsMap[key].push({
        studentId: tx.student_id,
        year: Number(year),
        score100: Number(meta.score100 ?? 0),
        correctCount: Number(meta.correctCount ?? 0),
        totalQuestions: Number(meta.totalQuestions ?? 32),
        stars: Number(meta.stars ?? 0),
        isPassed: Boolean(meta.isPassed),
        durationSeconds: Number(meta.durationSeconds ?? 0),
        completedAt: tx.created_at,
      });
    });

    // Build rich submission summary with full attempt history and growth delta
    const submissionsMap: Record<string, any> = {};

    Object.entries(attemptsMap).forEach(([key, list]) => {
      // Sort oldest to newest
      list.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

      const numberedAttempts = list.map((item, idx) => ({
        ...item,
        attemptNumber: idx + 1,
      }));

      const firstAttempt = numberedAttempts[0];
      const latestAttempt = numberedAttempts[numberedAttempts.length - 1];
      const scores = numberedAttempts.map((a) => a.score100);
      const maxScore = Math.max(...scores);
      const growthDelta = Number((latestAttempt.score100 - firstAttempt.score100).toFixed(1));

      submissionsMap[key] = {
        ...latestAttempt, // latest attempt as primary
        attemptCount: numberedAttempts.length,
        firstScore: firstAttempt.score100,
        latestScore: latestAttempt.score100,
        maxScore,
        growthDelta,
        isImproved: growthDelta > 0,
        attempts: numberedAttempts,
      };
    });

    // Format classrooms
    const classroomsSet = new Set<string>();
    const formattedStudents = (students || []).map((s) => {
      let roomLabel = 'ไม่ระบุห้อง';
      if (s.grade_level && s.room_number) {
        roomLabel = `ม.${s.grade_level}/${s.room_number}`;
        classroomsSet.add(roomLabel);
      } else if (s.academic_year) {
        roomLabel = `ม.3/1`; // default fallback
        classroomsSet.add(roomLabel);
      }

      return {
        id: s.id,
        studentId: s.student_id,
        name: s.student_name,
        gradeLevel: s.grade_level,
        roomNumber: s.room_number,
        classroom: roomLabel,
        isSkull: Boolean(s.is_skull),
      };
    });

    const classrooms = Array.from(classroomsSet).sort();

    // 3. Fetch O-NET challenge settings from events table
    const { data: eventRow, error: eErr } = await supabaseAdmin
      .from('events')
      .select('settings')
      .eq('slug', 'onet-challenge')
      .maybeSingle();

    if (eErr) {
      console.warn('Failed to load onet-challenge event settings:', eErr);
    }

    const rawOpenYears = eventRow?.settings?.open_years || {
      '2568': { isOpen: true, is_open: true, allowedClassrooms: ['ม.3/1'], allowed_classrooms: ['ม.3/1'] },
    };

    const openYears: Record<string, { isOpen: boolean; is_open: boolean; allowedClassrooms: string[]; allowed_classrooms: string[] }> = {};
    Object.entries(rawOpenYears).forEach(([y, val]: [string, any]) => {
      const open = Boolean(val?.isOpen ?? val?.is_open);
      const rooms = Array.isArray(val?.allowedClassrooms)
        ? val.allowedClassrooms
        : Array.isArray(val?.allowed_classrooms)
        ? val.allowed_classrooms
        : [];
      openYears[y] = {
        isOpen: open,
        is_open: open,
        allowedClassrooms: rooms,
        allowed_classrooms: rooms,
      };
    });

    return NextResponse.json({
      success: true,
      classrooms,
      students: formattedStudents,
      submissions: submissionsMap,
      benchmarks: NATIONAL_BENCHMARKS,
      openYears,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Admin ONET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireRole(['ADMIN', 'TEACHER']);

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Missing request body' }, { status: 400 });
    }

    const { year, isOpen, allowedClassrooms } = body;
    if (!year || typeof isOpen !== 'boolean') {
      return NextResponse.json({ error: 'Invalid parameters: year and isOpen are required' }, { status: 400 });
    }

    // Load existing event settings
    const { data: existingEvent } = await supabaseAdmin
      .from('events')
      .select('settings')
      .eq('slug', 'onet-challenge')
      .maybeSingle();

    const existingOpenYears = existingEvent?.settings?.open_years || {};
    const updatedOpenYears = {
      ...existingOpenYears,
      [String(year)]: {
        isOpen: Boolean(isOpen),
        is_open: Boolean(isOpen),
        allowedClassrooms: Array.isArray(allowedClassrooms) ? allowedClassrooms : [],
        allowed_classrooms: Array.isArray(allowedClassrooms) ? allowedClassrooms : [],
      },
    };

    const { error: upsertErr } = await supabaseAdmin.from('events').upsert(
      {
        slug: 'onet-challenge',
        title: 'O-NET English Challenge (ม.3)',
        description: 'ฝึกทำข้อสอบ O-NET ภาษาอังกฤษ ม.3 ย้อนหลัง 10 ปี พร้อมตัดเกรดและเทียบค่าเฉลี่ยระดับประเทศ',
        event_type: 'challenge',
        status: 'active',
        settings: {
          ...(existingEvent?.settings || {}),
          open_years: updatedOpenYears,
        },
      },
      { onConflict: 'slug' }
    );

    if (upsertErr) {
      console.error('Failed to update onet-challenge settings:', upsertErr);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      year: Number(year),
      isOpen: Boolean(isOpen),
      allowedClassrooms: Array.isArray(allowedClassrooms) ? allowedClassrooms : [],
      openYears: updatedOpenYears,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Admin ONET POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

