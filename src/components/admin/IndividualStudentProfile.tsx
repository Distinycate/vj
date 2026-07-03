'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, AlertTriangle, BookOpen, CheckCircle2, Clock,
  RefreshCw, Target, User, X,
} from 'lucide-react';
import { supabase } from '@/utils/supabase/client';

interface IndividualStudentProfileProps {
  student: any;
  onClose: () => void;
}

function relationObject(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDuration(totalSeconds: number) {
  if (!totalSeconds) return '0 นาที';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} นาที ${seconds} วินาที` : `${seconds} วินาที`;
}

export default function IndividualStudentProfile({ student, onClose }: IndividualStudentProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [classAttempts, setClassAttempts] = useState<any[]>([]);
  const [wrongWords, setWrongWords] = useState<any[]>([]);
  const [classWrongWords, setClassWrongWords] = useState<any[]>([]);
  const [assessmentCounts, setAssessmentCounts] = useState({ pre: 0, post: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      if (!student?.id) return;
      setLoading(true);
      setLoadError('');

      const profileResult = await supabase
        .from('students')
        .select('*, classrooms(class_name), analytics_summary(*), learning_paths(*)')
        .eq('id', student.id)
        .single();
      if (profileResult.error) {
        setLoadError(profileResult.error.message);
        setLoading(false);
        return;
      }

      const classroomId = profileResult.data.classroom_id;
      const { data: classmates, error: classmatesError } = await supabase
        .from('students')
        .select('id')
        .eq('classroom_id', classroomId);
      if (classmatesError) {
        setLoadError(classmatesError.message);
        setLoading(false);
        return;
      }
      const classStudentIds = (classmates || []).map((item) => item.id);

      const [attemptResult, classAttemptResult, wrongResult, classWrongResult, pretestResult, posttestResult] = await Promise.all([
        supabase
          .from('attempts')
          .select('id, score, total_questions, time_spent_sec, error_count, is_passed, created_at, stages(stage_number, description)')
          .eq('student_id', student.id)
          .order('created_at', { ascending: true }),
        classStudentIds.length
          ? supabase
              .from('attempts')
              .select('student_id, score, total_questions')
              .in('student_id', classStudentIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('wrong_words')
          .select('id, error_count, last_attempt_at, vocabulary(word, meaning_th, part_of_speech)')
          .eq('student_id', student.id)
          .order('error_count', { ascending: false }),
        classStudentIds.length
          ? supabase
              .from('wrong_words')
              .select('student_id, error_count, vocabulary(part_of_speech)')
              .in('student_id', classStudentIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('pre_tests').select('id').eq('student_id', student.id),
        supabase.from('post_tests').select('id').eq('student_id', student.id),
      ]);

      const error = attemptResult.error || classAttemptResult.error || wrongResult.error || classWrongResult.error || pretestResult.error || posttestResult.error;
      if (error) setLoadError(error.message);
      setProfile(profileResult.data);
      setAttempts(attemptResult.data || []);
      setClassAttempts(classAttemptResult.data || []);
      setWrongWords(wrongResult.data || []);
      setClassWrongWords(classWrongResult.data || []);
      setAssessmentCounts({
        pre: pretestResult.data?.length || 0,
        post: posttestResult.data?.length || 0,
      });
      setLoading(false);
    }
    loadProfile();
  }, [student?.id]);

  const metrics = useMemo(() => {
    const totalQuestions = attempts.reduce((sum, attempt) => sum + Number(attempt.total_questions || 0), 0);
    const totalCorrect = attempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0);
    const totalTime = attempts.reduce((sum, attempt) => sum + Number(attempt.time_spent_sec || 0), 0);
    const passed = attempts.filter((attempt) => attempt.is_passed).length;
    return {
      attempts: attempts.length,
      accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null,
      passRate: attempts.length > 0 ? Math.round((passed / attempts.length) * 100) : null,
      totalTime,
      wrongWordCount: wrongWords.length,
      totalErrors: wrongWords.reduce((sum, row) => sum + Number(row.error_count || 0), 0),
    };
  }, [attempts, wrongWords]);

  const progressData = useMemo(() => attempts.slice(-30).map((attempt, index) => ({
    label: `ครั้ง ${Math.max(1, attempts.length - Math.min(30, attempts.length) + index + 1)}`,
    stage: relationObject(attempt.stages)?.stage_number || '-',
    accuracy: Number(attempt.total_questions) > 0
      ? Math.round((Number(attempt.score) / Number(attempt.total_questions)) * 100)
      : 0,
    classAverage: (() => {
      const total = classAttempts.reduce((sum, row) => sum + Number(row.total_questions || 0), 0);
      const correct = classAttempts.reduce((sum, row) => sum + Number(row.score || 0), 0);
      return total > 0 ? Math.round((correct / total) * 100) : 0;
    })(),
  })), [attempts, classAttempts]);

  const errorPatternData = useMemo(() => {
    const studentMap: Record<string, number> = {};
    const classMap: Record<string, number> = {};
    for (const row of wrongWords) {
      const key = relationObject(row.vocabulary)?.part_of_speech || 'Other';
      studentMap[key] = (studentMap[key] || 0) + Number(row.error_count || 0);
    }
    for (const row of classWrongWords) {
      const key = relationObject(row.vocabulary)?.part_of_speech || 'Other';
      classMap[key] = (classMap[key] || 0) + Number(row.error_count || 0);
    }
    const classSize = Math.max(1, new Set(classWrongWords.map((row) => row.student_id)).size);
    return [...new Set([...Object.keys(studentMap), ...Object.keys(classMap)])]
      .map((category) => ({
        category,
        studentErrors: studentMap[category] || 0,
        classAverage: Number(((classMap[category] || 0) / classSize).toFixed(1)),
      }))
      .sort((a, b) => b.studentErrors - a.studentErrors)
      .slice(0, 8);
  }, [wrongWords, classWrongWords]);

  const analytics = relationObject(profile?.analytics_summary) || {};
  const learningPath = relationObject(profile?.learning_paths) || {};
  const classroom = relationObject(profile?.classrooms);
  const pretest = Number(analytics.pretest_score || 0);
  const posttest = Number(analytics.posttest_score || 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="max-w-6xl mx-auto my-6 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/15 text-indigo-300 rounded-2xl flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">{profile?.student_name || student.student_name}</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {profile?.student_id || student.student_id} • {classroom?.class_name || 'ไม่พบข้อมูลห้อง'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-20 text-center text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" /> กำลังโหลดข้อมูลจริง...
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-6">
            {loadError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl">
                โหลดข้อมูลบางส่วนไม่สำเร็จ: {loadError}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {[
                { label: 'ด่านปัจจุบัน', value: learningPath.current_stage || 1, icon: Target, color: 'text-indigo-300' },
                { label: 'เล่นทั้งหมด', value: `${metrics.attempts} ครั้ง`, icon: Activity, color: 'text-sky-300' },
                { label: 'Accuracy จริง', value: metrics.accuracy === null ? 'ไม่มีข้อมูล' : `${metrics.accuracy}%`, icon: CheckCircle2, color: 'text-emerald-300' },
                { label: 'ผ่านด่าน', value: metrics.passRate === null ? 'ไม่มีข้อมูล' : `${metrics.passRate}%`, icon: Target, color: 'text-amber-300' },
                { label: 'เวลาเรียนรวม', value: formatDuration(metrics.totalTime), icon: Clock, color: 'text-violet-300' },
                { label: 'คำที่เคยผิด', value: `${metrics.wrongWordCount} คำ`, icon: BookOpen, color: 'text-rose-300' },
              ].map((card) => (
                <div key={card.label} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                  <div className="text-lg font-black text-white mt-3">{card.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-4 gap-3">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-500">Pre-test</div>
                <div className="text-2xl font-black mt-1">{assessmentCounts.pre > 0 ? pretest : 'ไม่มีข้อมูล'}</div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-500">Post-test</div>
                <div className="text-2xl font-black mt-1">{assessmentCounts.post > 0 ? posttest : 'ยังไม่มีผล'}</div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-500">Learning Gain</div>
                <div className="text-2xl font-black mt-1">{assessmentCounts.post > 0 ? `${Number(analytics.learning_gain || 0).toFixed(1)}%` : 'รอ Post-test'}</div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-500">ข้อผิดพลาดสะสม</div>
                <div className="text-2xl font-black mt-1">{metrics.totalErrors}</div>
              </div>
            </div>

            <div className="grid xl:grid-cols-2 gap-5">
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5">
                <h3 className="font-black text-white">Accuracy จากการเล่นจริง</h3>
                <p className="text-xs text-slate-500 mt-1">แสดงสูงสุด 30 ครั้งล่าสุดจากตาราง attempts</p>
                {progressData.length > 0 ? (
                  <div className="h-72 mt-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={progressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                        <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} unit="%" />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12 }} />
                        <Legend />
                        <Line type="monotone" dataKey="accuracy" name="นักเรียน" stroke="#10b981" strokeWidth={3} />
                        <Line type="monotone" dataKey="classAverage" name="เฉลี่ยห้อง" stroke="#64748b" strokeDasharray="5 5" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="h-72 flex items-center justify-center text-slate-500">ยังไม่มีประวัติการเล่น</div>}
              </div>

              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5">
                <h3 className="font-black text-white">รูปแบบคำตอบผิดตามชนิดคำ</h3>
                <p className="text-xs text-slate-500 mt-1">จำนวนผิดจริง เทียบกับค่าเฉลี่ยนักเรียนในห้อง</p>
                {errorPatternData.length > 0 ? (
                  <div className="h-72 mt-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={errorPatternData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="category" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12 }} />
                        <Legend />
                        <Bar dataKey="studentErrors" name="นักเรียน" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="classAverage" name="เฉลี่ยห้อง" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="h-72 flex items-center justify-center text-slate-500">ยังไม่มีคำตอบผิดที่บันทึกไว้</div>}
              </div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-black text-white">คำที่ผิดบ่อย</h3>
                  <p className="text-xs text-slate-500">เรียงจากจำนวนผิดสะสมจริง</p>
                </div>
              </div>
              <div className="divide-y divide-slate-800">
                {wrongWords.slice(0, 20).map((row) => {
                  const vocabulary = relationObject(row.vocabulary) || {};
                  return (
                    <div key={row.id} className="p-4 grid sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-center text-sm">
                      <div className="font-bold text-white">{vocabulary.word || '-'}</div>
                      <div className="text-slate-400">{vocabulary.meaning_th || '-'}</div>
                      <div className="text-rose-300 font-bold">ผิด {row.error_count || 0} ครั้ง</div>
                      <div className="text-xs text-slate-500">{row.last_attempt_at ? new Date(row.last_attempt_at).toLocaleDateString('th-TH') : '-'}</div>
                    </div>
                  );
                })}
                {wrongWords.length === 0 && <div className="p-10 text-center text-slate-500">ยังไม่มีคำตอบผิดที่บันทึกไว้</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
