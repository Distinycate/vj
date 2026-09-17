'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, AlertTriangle, BookOpen, CheckCircle2, Clock,
  RefreshCw, Target, User, X, Info, TrendingUp, HelpCircle, Award, Sparkles
} from 'lucide-react';
import { getAdminStudentAttempts, getAdminClassAttempts, getAdminStudentWrongWords, getAdminClassWrongWords, getAdminStudentTests } from '@/app/admin/actions';

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

      try {
        let studentProfile = student;
        const profileRes = await fetch(`/api/student/profile?studentId=${student.id}`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.student) {
            studentProfile = {
              ...profileData.student,
              // Profile relations contract: analytics_summary(*) and learning_paths(*)
              analytics_summary: profileData.analyticsSummary,
              learning_paths: profileData.learningPath,
            };
          }
        }

        const classroomId = studentProfile.classroom_id;
        let classStudentIds: string[] = [];
        if (classroomId) {
          try {
            const classRes = await fetch(`/api/admin/students?classroomId=${classroomId}`);
            if (classRes.ok) {
              const classJson = await classRes.json();
              classStudentIds = (classJson.students || []).map((item: any) => item.id);
            }
          } catch {
            // Ignore optional class list fallback
          }
        }

        const [attemptResult, classAttemptResult, wrongResult, classWrongResult, testsResult] = await Promise.all([
          getAdminStudentAttempts(student.id)
            .then(data => ({ data, error: null }))
            .catch(error => ({ data: [], error })),
          classStudentIds.length
            ? getAdminClassAttempts(classStudentIds)
                .then(data => ({ data, error: null }))
                .catch(error => ({ data: [], error }))
            : Promise.resolve({ data: [], error: null }),
          getAdminStudentWrongWords(student.id)
            .then(data => ({ data, error: null }))
            .catch(error => ({ data: [], error })),
          classStudentIds.length
            ? getAdminClassWrongWords(classStudentIds)
                .then(data => ({ data, error: null }))
                .catch(error => ({ data: [], error }))
            : Promise.resolve({ data: [], error: null }),
          getAdminStudentTests(student.id)
            .then(data => ({ data, error: null }))
            .catch(error => ({ data: { pre: 0, post: 0 }, error })),
        ]);

        setProfile(studentProfile);
        setAttempts(attemptResult.data || []);
        setClassAttempts(classAttemptResult.data || []);
        setWrongWords(wrongResult.data || []);
        setClassWrongWords(classWrongResult.data || []);
        setAssessmentCounts(testsResult.data || { pre: 0, post: 0 });
      } catch (err: any) {
        console.error('Failed to load student details:', err);
        setProfile(student);
      } finally {
        setLoading(false);
      }
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

  const progressData = useMemo(() => attempts.slice(-25).map((attempt, index) => ({
    label: `ครั้ง ${Math.max(1, attempts.length - Math.min(25, attempts.length) + index + 1)}`,
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
      .slice(0, 6);
  }, [wrongWords, classWrongWords]);

  const analytics = relationObject(profile?.analytics_summary) || {};
  const learningPath = relationObject(profile?.learning_paths) || {};
  const classroom = relationObject(profile?.classrooms);
  const pretest = Number(analytics.pretest_score || 0);
  const posttest = Number(analytics.posttest_score || 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto flex items-start justify-center">
      <div className="max-w-6xl w-full my-4 sm:my-8 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-2xl flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">{profile?.student_name || student.student_name}</h2>
                <span className="text-[11px] bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full font-bold">
                  {classroom?.class_name || student.classroom?.class_name || 'ห้องเรียน'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                รหัส: {profile?.student_id || student.student_id} • บัญชี: {profile?.username || student.username}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-400" />
            <p className="font-bold text-sm">กำลังโหลดข้อมูลและประวัติการเรียนรู้ของนักเรียน...</p>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto max-h-[80vh]">
            
            {loadError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl text-xs">
                โหลดข้อมูลบางส่วนไม่สำเร็จ: {loadError}
              </div>
            )}

            {/* Top 6 KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <Target className="w-5 h-5 text-indigo-400 mb-2" />
                <div className="text-xl font-black text-white">ด่าน {learningPath.current_stage || 1}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">ด่านปัจจุบัน</div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <Activity className="w-5 h-5 text-sky-400 mb-2" />
                <div className="text-xl font-black text-white">{metrics.attempts} ครั้ง</div>
                <div className="text-[11px] text-slate-400 mt-0.5">เล่นทั้งหมด</div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
                <div className="text-xl font-black text-emerald-400">
                  {metrics.accuracy === null ? 'รอเล่น' : `${metrics.accuracy}%`}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">ความแม่นยำจริง</div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <Award className="w-5 h-5 text-amber-400 mb-2" />
                <div className="text-xl font-black text-amber-300">
                  {metrics.passRate === null ? 'รอเล่น' : `${metrics.passRate}%`}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">อัตราผ่านด่าน</div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <Clock className="w-5 h-5 text-violet-400 mb-2" />
                <div className="text-base font-black text-white truncate" title={formatDuration(metrics.totalTime)}>
                  {formatDuration(metrics.totalTime)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">เวลาเรียนสะสม</div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <BookOpen className="w-5 h-5 text-rose-400 mb-2" />
                <div className="text-xl font-black text-rose-400">{metrics.wrongWordCount} คำ</div>
                <div className="text-[11px] text-slate-400 mt-0.5">คำที่เคยตอบผิด</div>
              </div>
            </div>

            {/* Assessment & Gain Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400 font-bold">Pre-test (ก่อนเรียน)</div>
                <div className="text-2xl font-black text-white mt-1">
                  {assessmentCounts.pre > 0 ? `${pretest}/10` : 'รอทำข้อสอบ'}
                </div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400 font-bold">Post-test (หลังเรียน)</div>
                <div className="text-2xl font-black text-white mt-1">
                  {assessmentCounts.post > 0 ? `${posttest}/10` : 'รอทำข้อสอบ'}
                </div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-emerald-400 font-bold">Learning Gain (พัฒนาการ)</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {assessmentCounts.post > 0 ? `+${Number(analytics.learning_gain || 0).toFixed(1)}%` : 'รอ Post-test'}
                </div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-amber-400 font-bold">เหรียญ / ตั๋วสุ่มการ์ด</div>
                <div className="text-2xl font-black text-amber-300 mt-1">
                  {learningPath.coins || 0} 🪙 / {learningPath.free_pull_tickets || 0} 🎟️
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Accuracy History Line Chart */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white text-base">ประวัติ Accuracy จากการเล่นจริง</h3>
                      <p className="text-xs text-slate-400 mt-0.5">เปรียบเทียบผลการเล่นจริง 25 ครั้งล่าสุด กับค่าเฉลี่ยของเพื่อนในห้อง</p>
                    </div>
                  </div>

                  {progressData.length > 0 ? (
                    <div className="h-64 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={progressData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                          <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} unit="%" />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                          <Line type="monotone" dataKey="accuracy" name="นักเรียนคนนี้ (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="classAverage" name="เฉลี่ยห้องเรียน (%)" stroke="#64748b" strokeDasharray="5 5" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-slate-500 text-xs">ยังไม่มีประวัติการเล่นด่านคำศัพท์</div>
                  )}
                </div>

                {/* Friendly Chart Explanation */}
                <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-200 leading-relaxed">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-300 mb-1">
                    <Info className="w-4 h-4" /> คำอธิบายกราฟและการแปลผล:
                  </div>
                  • <strong>เส้นสีเขียว (นักเรียน)</strong>: ความแม่นยำในการตอบถูกของนักเรียนในแต่ละด่าน<br />
                  • <strong>เส้นประสีเทา (เฉลี่ยห้อง)</strong>: เกณฑ์เฉลี่ยของเพื่อนในห้องเรียนเดียวกัน<br />
                  💡 <em>การแปลผล</em>: หากเส้นสีเขียวอยู่สูงกว่าเส้นประ แสดงว่านักเรียนมีความสามารถด้านคำศัพท์สูงกว่าเกณฑ์เฉลี่ยห้อง หากเส้นมีแนวโน้มไต่ระดับสูงขึ้น แสดงว่านักเรียนมีพัฒนาการเชิงบวก
                </div>
              </div>

              {/* Chart 2: Error Pattern by Part of Speech */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">รูปแบบคำตอบผิดตามชนิดคำ (Part of Speech)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">จำนวนข้อที่ตอบผิดสะสมแยกตามประเภทคำ เทียบกับค่าเฉลี่ยห้อง</p>

                  {errorPatternData.length > 0 ? (
                    <div className="h-64 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={errorPatternData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="category" stroke="#64748b" fontSize={10} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                          <Bar dataKey="studentErrors" name="นักเรียนผิด (ครั้ง)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="classAverage" name="เฉลี่ยห้อง (ครั้ง)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-slate-500 text-xs">ยอดเยี่ยม! ยังไม่มีคำตอบผิดที่บันทึกไว้</div>
                  )}
                </div>

                {/* Friendly Chart Explanation */}
                <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-200 leading-relaxed">
                  <div className="font-bold flex items-center gap-1.5 text-rose-300 mb-1">
                    <Info className="w-4 h-4" /> คำอธิบายกราฟและการแปลผล:
                  </div>
                  • <strong>แท่งสีชมพู (นักเรียน)</strong>: จำนวนครั้งที่นักเรียนตอบผิดในหมวดคำนั้นๆ<br />
                  • <strong>แท่งสีฟ้า (เฉลี่ยห้อง)</strong>: จำนวนข้อผิดพลาดเฉลี่ยของเพื่อนในห้อง<br />
                  💡 <em>คำแนะนำสำหรับครู</em>: หมวดหมู่คำที่แท่งสีชมพูสูงที่สุดคือจุดที่นักเรียนสับสน ครูสามารถเน้นเสริมคำศัพท์ในหมวดนั้นๆ ให้เป็นพิเศษ
                </div>
              </div>

            </div>

            {/* Detailed Wrong Words Table */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-black text-white text-base">รายการคำศัพท์ที่ตอบผิดบ่อย (Weak Words Breakdown)</h3>
                  <p className="text-xs text-slate-400">เรียงตามจำนวนครั้งที่ตอบผิดสะสมจริง</p>
                </div>
              </div>
              <div className="divide-y divide-slate-800/60">
                {wrongWords.slice(0, 15).map((row) => {
                  const vocabulary = relationObject(row.vocabulary) || {};
                  return (
                    <div key={row.id} className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 items-center text-xs">
                      <div className="font-bold text-white text-sm">{vocabulary.word || '-'}</div>
                      <div className="text-slate-300">{vocabulary.meaning_th || '-'}</div>
                      <div className="text-rose-400 font-bold">ผิด {row.error_count || 0} ครั้ง</div>
                      <div className="text-slate-500 text-right font-mono">
                        {row.last_attempt_at ? new Date(row.last_attempt_at).toLocaleDateString('th-TH') : '-'}
                      </div>
                    </div>
                  );
                })}
                {wrongWords.length === 0 && (
                  <div className="p-8 text-center text-slate-500 text-xs">ยอดเยี่ยมมาก! นักเรียนยังไม่มีประวัติคำศัพท์ที่ตอบผิด</div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
