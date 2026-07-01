'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { 
  ShieldAlert, CheckCircle, Database, 
  Download, RefreshCw, FileText
} from 'lucide-react';

interface AuditStats {
  totalWords: number;
  activeWords: number;
  duplicateWords: number;
  duplicateMeanings: number;
  rejectedLogsCount: number;
}

export default function QuestionAudit() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AuditStats>({
    totalWords: 0,
    activeWords: 0,
    duplicateWords: 0,
    duplicateMeanings: 0,
    rejectedLogsCount: 0,
  });
  
  const [rejectedLogs, setRejectedLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, []);

  async function fetchLogs() {
    const { data, error } = await supabase
      .from('question_validation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (data) setRejectedLogs(data);
    setLoading(false);
  }

  async function fetchStats() {
    const { data: allWords } = await supabase
      .from('vocabulary')
      .select('id, normalized_word, normalized_meaning_th, stage_number, is_active');
      
    const { count: totalLogs } = await supabase
      .from('question_validation_logs')
      .select('*', { count: 'exact', head: true });

    if (!allWords) return;

    const activeWords = allWords.filter(w => w.is_active !== false);
    
    // Calculate duplicate english words
    const wordCounts = new Map<string, number>();
    const meaningCounts = new Map<string, number>();
    
    activeWords.forEach(w => {
      if (w.normalized_word) {
        wordCounts.set(w.normalized_word, (wordCounts.get(w.normalized_word) || 0) + 1);
      }
      if (w.normalized_meaning_th) {
        meaningCounts.set(w.normalized_meaning_th, (meaningCounts.get(w.normalized_meaning_th) || 0) + 1);
      }
    });

    let duplicateWords = 0;
    wordCounts.forEach(count => { if (count > 1) duplicateWords++; });
    
    let duplicateMeanings = 0;
    meaningCounts.forEach(count => { if (count > 1) duplicateMeanings++; });

    setStats({
      totalWords: allWords.length,
      activeWords: activeWords.length,
      duplicateWords,
      duplicateMeanings,
      rejectedLogsCount: totalLogs || 0
    });
  }

  const exportToCSV = () => {
    if (rejectedLogs.length === 0) return;
    
    const headers = ['Log ID', 'Word ID', 'Question Type', 'Error Type', 'Error Message', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...rejectedLogs.map(log => 
        [
          log.id, 
          log.word_id, 
          log.question_type, 
          log.error_type, 
          `"${log.error_message}"`, 
          log.created_at
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'rejected_questions_audit.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-8 text-white">Loading Audit Logs...</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-rose-500" /> Auto-healing Monitoring Dashboard
            </h1>
            <p className="text-slate-400 mt-2">ศูนย์รายงานข้อผิดพลาดและเฝ้าระวังคำศัพท์ซ้ำอัตโนมัติ (ครูไม่ต้องแก้ไขเอง ระบบจัดการให้แล้ว)</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => { fetchStats(); fetchLogs(); }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-5 h-5" /> รีเฟรชข้อมูล
            </button>
            <button 
              onClick={exportToCSV}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold flex items-center gap-2 transition-colors"
            >
              <Download className="w-5 h-5" /> Export CSV
            </button>
          </div>
        </header>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-2">
            <p className="text-slate-400 font-bold text-sm">คำศัพท์ทั้งหมด (Active)</p>
            <p className="text-3xl font-black">{stats.activeWords} <span className="text-sm font-normal text-slate-500">/ {stats.totalWords}</span></p>
          </div>
          <div className="bg-amber-950/30 border border-amber-900/50 p-6 rounded-2xl flex flex-col gap-2">
            <p className="text-amber-400 font-bold text-sm">คำศัพท์อังกฤษซ้ำ</p>
            <p className="text-3xl font-black text-amber-400">{stats.duplicateWords} <span className="text-sm font-normal text-amber-600">คำ</span></p>
          </div>
          <div className="bg-amber-950/30 border border-amber-900/50 p-6 rounded-2xl flex flex-col gap-2">
            <p className="text-amber-400 font-bold text-sm">ความหมายไทยซ้ำ</p>
            <p className="text-3xl font-black text-amber-400">{stats.duplicateMeanings} <span className="text-sm font-normal text-amber-600">ความหมาย</span></p>
          </div>
          <div className="bg-rose-950/30 border border-rose-900/50 p-6 rounded-2xl flex flex-col gap-2">
            <p className="text-rose-400 font-bold text-sm">ข้อสอบที่ระบบ Reject อัตโนมัติ</p>
            <p className="text-3xl font-black text-rose-400">{stats.rejectedLogsCount} <span className="text-sm font-normal text-rose-600">ครั้ง</span></p>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" /> รายการข้อสอบ/คำศัพท์ที่ถูก Reject
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-bold">
                <tr>
                  <th className="p-4">วันที่ / เวลา</th>
                  <th className="p-4">ประเภทข้อสอบ</th>
                  <th className="p-4">ประเภท Error</th>
                  <th className="p-4">รายละเอียดข้อผิดพลาด (Reason)</th>
                  <th className="p-4">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                {rejectedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono text-xs">{new Date(log.created_at).toLocaleString('th-TH')}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-xs font-bold">
                        {log.question_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-xs font-bold">
                        {log.error_type}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-rose-300">
                      {log.error_message}
                    </td>
                    <td className="p-4">
                      <button className="text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1">
                        <Database className="w-3 h-3" /> ไปที่ฐานข้อมูล
                      </button>
                    </td>
                  </tr>
                ))}
                {rejectedLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-emerald-400 font-bold text-lg">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      ไม่มีข้อผิดพลาด! ระบบข้อสอบสมบูรณ์แบบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
