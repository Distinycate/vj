import { NextResponse } from 'next/server';
import { requireInternalTeacherRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

interface CachedSchoolOverview {
  data: any;
  timestamp: number;
}

let cache: CachedSchoolOverview | null = null;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds in-memory cache

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export async function GET(request: Request) {
  try {
    await requireInternalTeacherRole(['TEACHER', 'ADMIN', 'EXECUTIVE', 'CARD_TEACHER']);

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    if (!force && cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, ...cache.data, cached: true });
    }

    const [
      studentsRes,
      wrongWordsRes,
      preTestsRes,
      postTestsRes,
      classroomsRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select('id, student_name, classroom_id, is_active, learning_paths(current_rank, rank_score, coins, total_exp, last_active_date), analytics_summary(pretest_score, posttest_score, success_rate, normalized_gain, learning_gain)')
        .eq('is_active', true),
      supabaseAdmin
        .from('wrong_words')
        .select('error_count, vocabulary(word, meaning_th, part_of_speech)')
        .limit(1000),
      supabaseAdmin
        .from('pre_tests')
        .select('score, created_at')
        .order('created_at', { ascending: true })
        .limit(2000),
      supabaseAdmin
        .from('post_tests')
        .select('score, created_at')
        .order('created_at', { ascending: true })
        .limit(2000),
      supabaseAdmin
        .from('classrooms')
        .select('id, class_name')
        .order('class_name', { ascending: true }),
    ]);

    const students = studentsRes.data || [];
    const totalStudents = students.length;

    // 1. Calculate School-wide KPI averages
    let sumPre = 0, sumPost = 0, sumGain = 0, sumAcc = 0;
    let prePostCount = 0, accCount = 0;
    const rankCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    students.forEach((s: any) => {
      const stats = Array.isArray(s.analytics_summary) ? s.analytics_summary[0] : s.analytics_summary;
      const lp = Array.isArray(s.learning_paths) ? s.learning_paths[0] : s.learning_paths;

      const pre = Number(stats?.pretest_score || 0);
      const post = Number(stats?.posttest_score || 0);
      const acc = Number(stats?.success_rate || 0);
      const gain = Number(stats?.normalized_gain ?? stats?.learning_gain ?? (post > pre ? post - pre : 0));

      if (pre > 0 || post > 0) {
        sumPre += pre;
        sumPost += post;
        sumGain += gain;
        prePostCount++;
      }
      if (acc > 0) {
        sumAcc += acc;
        accCount++;
      }

      const rank = Math.min(5, Math.max(1, Number(lp?.current_rank || 1)));
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });

    const avgPre = prePostCount ? Math.round(sumPre / prePostCount) : 0;
    const avgPost = prePostCount ? Math.round(sumPost / prePostCount) : 0;
    const avgGain = prePostCount ? Math.round(sumGain / prePostCount) : 0;
    const avgAcc = accCount ? Math.round(sumAcc / accCount) : 0;

    // 2. Rank Distribution Summary
    const rankDistribution = [
      { rank: 1, name: 'Rank 1 (Novice)', title: 'นักผจญภัยมือใหม่', count: rankCounts[1], percent: totalStudents ? Math.round((rankCounts[1] / totalStudents) * 100) : 0, color: '#94a3b8' },
      { rank: 2, name: 'Rank 2 (Explorer)', title: 'นักสำรวจคำศัพท์', count: rankCounts[2], percent: totalStudents ? Math.round((rankCounts[2] / totalStudents) * 100) : 0, color: '#38bdf8' },
      { rank: 3, name: 'Rank 3 (Warrior)', title: 'นักรบพจนานุกรม', count: rankCounts[3], percent: totalStudents ? Math.round((rankCounts[3] / totalStudents) * 100) : 0, color: '#818cf8' },
      { rank: 4, name: 'Rank 4 (Master)', title: 'ปรมาจารย์ภาษา', count: rankCounts[4], percent: totalStudents ? Math.round((rankCounts[4] / totalStudents) * 100) : 0, color: '#f59e0b' },
      { rank: 5, name: 'Rank 5 (Legend)', title: 'ตำนานแห่งคำศัพท์', count: rankCounts[5], percent: totalStudents ? Math.round((rankCounts[5] / totalStudents) * 100) : 0, color: '#ec4899' },
    ];

    // 3. Top 10 Frequent Wrong Words
    const wordCounts: Record<string, { count: number; meaning: string; partOfSpeech: string }> = {};
    (wrongWordsRes.data || []).forEach((row: any) => {
      const vocab = Array.isArray(row.vocabulary) ? row.vocabulary[0] : row.vocabulary;
      const word = vocab?.word || 'Unknown';
      const meaning = vocab?.meaning_th || vocab?.meaning || '';
      const partOfSpeech = vocab?.part_of_speech || '';
      if (!wordCounts[word]) {
        wordCounts[word] = { count: 0, meaning, partOfSpeech };
      }
      wordCounts[word].count += Number(row.error_count || 1);
    });

    const frequentWrongWords = Object.keys(wordCounts)
      .filter(w => w !== 'Unknown')
      .map(word => ({
        word,
        count: wordCounts[word].count,
        meaning: wordCounts[word].meaning,
        partOfSpeech: wordCounts[word].partOfSpeech,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. Monthly Learning Gain Trend (Pre vs Post)
    const monthMap: Record<string, { preSum: number; preCount: number; postSum: number; postCount: number }> = {};
    (preTestsRes.data || []).forEach((row: any) => {
      const date = new Date(row.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { preSum: 0, preCount: 0, postSum: 0, postCount: 0 };
      monthMap[key].preSum += Number(row.score || 0);
      monthMap[key].preCount++;
    });

    (postTestsRes.data || []).forEach((row: any) => {
      const date = new Date(row.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { preSum: 0, preCount: 0, postSum: 0, postCount: 0 };
      monthMap[key].postSum += Number(row.score || 0);
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

    // PDCA Status
    const pdcaStatus = avgGain >= 15
      ? { label: 'High Growth', status: 'ดีเยี่ยม', color: 'text-emerald-400', badgeBg: 'bg-emerald-500/10 border-emerald-500/30' }
      : avgGain >= 5
      ? { label: 'On Track', status: 'ตามเป้าหมาย', color: 'text-indigo-400', badgeBg: 'bg-indigo-500/10 border-indigo-500/30' }
      : avgGain > 0
      ? { label: 'Progressing', status: 'กำลังพัฒนา', color: 'text-amber-400', badgeBg: 'bg-amber-500/10 border-amber-500/30' }
      : { label: 'Needs Support', status: 'ต้องติดตามใกล้ชิด', color: 'text-rose-400', badgeBg: 'bg-rose-500/10 border-rose-500/30' };

    const payload = {
      totalStudents,
      classroomsCount: classroomsRes.data?.length || 0,
      avgPre,
      avgPost,
      avgGain,
      avgAcc,
      pdcaStatus,
      rankDistribution,
      frequentWrongWords,
      topWrongWord: frequentWrongWords[0]?.word || '-',
      topWrongCount: frequentWrongWords[0]?.count || 0,
      monthlyTrend,
    };

    cache = { data: payload, timestamp: Date.now() };

    return NextResponse.json({ success: true, ...payload });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('School Overview API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
