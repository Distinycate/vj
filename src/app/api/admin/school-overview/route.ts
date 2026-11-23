import { NextResponse } from 'next/server';
import { requireInternalTeacherRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { enrichStudentsWithLiveMetrics } from '@/lib/server/adminAnalyticsEnricher';
import { bangkokMonth, reportingTerms, type ReportingTerm } from '@/lib/reportingTerms';
import { summarizePretests, type AssessmentRecord } from '@/lib/assessmentState';
import { calculateNormalizedGain } from '@/utils/analyticsUtils';

interface CachedSchoolOverview {
  data: any;
  timestamp: number;
}

const overviewCache = new Map<ReportingTerm, CachedSchoolOverview>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds in-memory cache

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

async function termTests(table: 'pre_tests' | 'post_tests', term: ReportingTerm) {
  const { start, end } = reportingTerms[term];
  const rows: Array<AssessmentRecord & { student_id: string }> = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabaseAdmin.from(table)
      .select('id, student_id, score, total_questions, created_at, students!inner(user_type)')
      .eq('students.user_type', 'INTERNAL').gte('created_at', start).lt('created_at', end)
      .order('created_at', { ascending: false }).order('id').range(offset, offset + 999);
    if (error) throw error;
    for (const row of data || []) {
      if (row.total_questions > 0 && row.score >= 0 && row.score <= row.total_questions) rows.push(row);
    }
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function GET(request: Request) {
  try {
    await requireInternalTeacherRole(['TEACHER', 'ADMIN', 'EXECUTIVE', 'CARD_TEACHER']);

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const term = searchParams.get('term') ?? '2';
    if (term !== '1' && term !== '2') return NextResponse.json({ error: 'กรุณาเลือกภาคเรียน' }, { status: 400 });
    const cache = overviewCache.get(term);

    if (!force && cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, ...cache.data, cached: true });
    }

    const [
      studentsRes,
      preTestsRes,
      postTestsRes,
      classroomsRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select('id, student_name, classroom_id, is_active, user_type, learning_paths(current_rank, rank_score, coins, total_exp, last_active_date), analytics_summary(pretest_score, posttest_score, success_rate, normalized_gain, learning_gain, attempt_count)')
        .eq('is_active', true)
        .eq('user_type', 'INTERNAL'),
      termTests('pre_tests', term),
      termTests('post_tests', term),
      supabaseAdmin
        .from('classrooms')
        .select('id, class_name')
        .order('class_name', { ascending: true }),
    ]);

    if (studentsRes.error || classroomsRes.error) throw studentsRes.error || classroomsRes.error;
    const students = await enrichStudentsWithLiveMetrics(studentsRes.data || []);
    const totalStudents = students.length;
    const validClassrooms = (classroomsRes.data || []).filter(
      (c: any) =>
        (c.class_name.includes('ม.1') || c.class_name.includes('ม.2') || c.class_name.includes('ม.3')) &&
        !c.class_name.includes('ทดลอง')
    );

    // 1. Calculate School-wide KPI averages
    let sumPre = 0, sumPost = 0, sumGain = 0, sumAcc = 0;
    let preCount = 0, postCount = 0, gainCount = 0, accCount = 0;
    const rankCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const preByStudent = new Map<string, AssessmentRecord[]>();
    const postByStudent = new Map<string, AssessmentRecord>();
    for (const row of preTestsRes) {
      const list = preByStudent.get(row.student_id) ?? [];
      if (list.length < 5) list.push(row);
      preByStudent.set(row.student_id, list);
    }
    for (const row of postTestsRes) if (!postByStudent.has(row.student_id)) postByStudent.set(row.student_id, row);
    for (const id of new Set([...preByStudent.keys(), ...postByStudent.keys()])) {
      const pre = summarizePretests(preByStudent.get(id) ?? []).score;
      const latestPost = postByStudent.get(id);
      const post = latestPost ? latestPost.score / latestPost.total_questions * 25 : null;
      const gain = pre !== null && post !== null ? calculateNormalizedGain(pre, post, 25) : null;

      if (pre !== null) {
        sumPre += pre;
        preCount++;
      }
      if (post !== null) {
        sumPost += post;
        postCount++;
      }
      if (gain !== null) { sumGain += gain; gainCount++; }
    }
    students.forEach((s: any) => {
      const stats = Array.isArray(s.analytics_summary) ? s.analytics_summary[0] : s.analytics_summary;
      const lp = Array.isArray(s.learning_paths) ? s.learning_paths[0] : s.learning_paths;
      const acc = Number(stats?.success_rate || 0);
      if (acc > 0 || stats?.attempt_count > 0) {
        sumAcc += acc;
        accCount++;
      }

      const rank = Math.min(5, Math.max(1, Number(lp?.current_rank || 1)));
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });

    const avgPre = preCount ? Math.round(sumPre / preCount) : null;
    const avgPost = postCount ? Math.round(sumPost / postCount) : null;
    const avgGain = gainCount ? Math.round(sumGain / gainCount) : null;
    const avgAcc = accCount ? Math.round(sumAcc / accCount) : null;

    // 2. Rank Distribution Summary
    const rankDistribution = [
      { rank: 1, name: 'Rank 1 (Novice)', title: 'นักผจญภัยมือใหม่', count: rankCounts[1], percent: totalStudents ? Math.round((rankCounts[1] / totalStudents) * 100) : 0, color: '#94a3b8' },
      { rank: 2, name: 'Rank 2 (Explorer)', title: 'นักสำรวจคำศัพท์', count: rankCounts[2], percent: totalStudents ? Math.round((rankCounts[2] / totalStudents) * 100) : 0, color: '#38bdf8' },
      { rank: 3, name: 'Rank 3 (Warrior)', title: 'นักรบพจนานุกรม', count: rankCounts[3], percent: totalStudents ? Math.round((rankCounts[3] / totalStudents) * 100) : 0, color: '#818cf8' },
      { rank: 4, name: 'Rank 4 (Master)', title: 'ปรมาจารย์ภาษา', count: rankCounts[4], percent: totalStudents ? Math.round((rankCounts[4] / totalStudents) * 100) : 0, color: '#f59e0b' },
      { rank: 5, name: 'Rank 5 (Legend)', title: 'ตำนานแห่งคำศัพท์', count: rankCounts[5], percent: totalStudents ? Math.round((rankCounts[5] / totalStudents) * 100) : 0, color: '#ec4899' },
    ];


    // 4. Monthly Learning Gain Trend (Pre vs Post normalized to 25-point scale)
    const normalizeScore25 = (score: any, total: any) => {
      const s = Number(score || 0);
      const t = Number(total) > 0 ? Number(total) : 25;
      return (s / t) * 25;
    };
    const monthMap: Record<string, { preSum: number; preCount: number; postSum: number; postCount: number }> = {};
    preTestsRes.forEach(row => {
      const key = bangkokMonth(row.created_at);
      if (!monthMap[key]) monthMap[key] = { preSum: 0, preCount: 0, postSum: 0, postCount: 0 };
      monthMap[key].preSum += normalizeScore25(row.score, row.total_questions);
      monthMap[key].preCount++;
    });

    postTestsRes.forEach(row => {
      const key = bangkokMonth(row.created_at);
      if (!monthMap[key]) monthMap[key] = { preSum: 0, preCount: 0, postSum: 0, postCount: 0 };
      monthMap[key].postSum += normalizeScore25(row.score, row.total_questions);
      monthMap[key].postCount++;
    });

    const monthlyTrend = Object.keys(monthMap)
      .sort()
      .map(key => {
        const parts = key.split('-');
        const monthIndex = parseInt(parts[1], 10) - 1;
        const year = parts[0].slice(2);
        const entry = monthMap[key];
        return {
          month: `${THAI_MONTHS[monthIndex]} ${year}`,
          preTest: entry.preCount > 0 ? Math.round(entry.preSum / entry.preCount) : null,
          postTest: entry.postCount > 0 ? Math.round(entry.postSum / entry.postCount) : null,
        };
      });

    // PDCA Status (uses Post-test gain when available, or live gameplay accuracy during ongoing term)
    const pdcaStatus = avgGain !== null
      ? (avgGain >= 15
          ? { label: 'High Growth', status: 'ดีเยี่ยม', color: 'text-emerald-400', badgeBg: 'bg-emerald-500/10 border-emerald-500/30' }
          : avgGain >= 5
          ? { label: 'On Track', status: 'ตามเป้าหมาย', color: 'text-indigo-400', badgeBg: 'bg-indigo-500/10 border-indigo-500/30' }
          : avgGain > 0
          ? { label: 'Progressing', status: 'กำลังพัฒนา', color: 'text-amber-400', badgeBg: 'bg-amber-500/10 border-amber-500/30' }
          : { label: 'Needs Support', status: 'ต้องติดตามใกล้ชิด', color: 'text-rose-400', badgeBg: 'bg-rose-500/10 border-rose-500/30' })
      : ((avgAcc ?? 0) >= 75
          ? { label: 'Active Learning', status: 'กำลังเรียนรู้ดีเยี่ยม', color: 'text-emerald-400', badgeBg: 'bg-emerald-500/10 border-emerald-500/30' }
          : (avgAcc ?? 0) >= 50 || preCount > 0
          ? { label: 'In Progress', status: 'กำลังดำเนินการตามแผน', color: 'text-indigo-400', badgeBg: 'bg-indigo-500/10 border-indigo-500/30' }
          : { label: 'Starting Term', status: 'เริ่มภาคเรียน', color: 'text-amber-400', badgeBg: 'bg-amber-500/10 border-amber-500/30' });

    const payload = {
      totalStudents,
      classroomsCount: validClassrooms.length,
      avgPre,
      avgPost,
      avgGain,
      avgAcc,
      pdcaStatus,
      rankDistribution,
      monthlyTrend,
      term,
    };

    overviewCache.set(term, { data: payload, timestamp: Date.now() });

    return NextResponse.json({ success: true, ...payload });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('School Overview API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
