'use client';
export default function AssessmentSaveStatus({ saving, error, reloadRequired, onRetry, mode = 'save' }: {
  saving: boolean; error: string; reloadRequired: boolean; onRetry: () => void;
  mode?: 'save' | 'load';
}) {
  return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
    <section className="glass-card p-6 w-full max-w-md space-y-4 text-center" aria-live="polite" aria-busy={saving}>
      <h1 className="text-xl font-bold">{saving ? 'กำลังบันทึกผลสอบ…' : mode === 'load' ? 'ยังโหลดข้อสอบไม่ได้' : 'ยังยืนยันการบันทึกไม่ได้'}</h1>
      <p className="text-slate-300">{saving ? 'กรุณารอสักครู่ อย่าเพิ่งปิดหน้านี้' : error}</p>
      {!saving && <>
        {mode === 'save' && !reloadRequired && <p className="text-sm text-slate-400">คำตอบยังอยู่ในหน้านี้ การกดลองบันทึกซ้ำจะไม่เพิ่มผลสอบซ้ำ</p>}
        <button className="premium-btn bg-primary text-slate-950 min-h-12 w-full px-4" onClick={reloadRequired ? () => window.location.reload() : onRetry}>
          {reloadRequired ? 'โหลดสถานะปัจจุบันใหม่' : mode === 'load' ? 'ลองโหลดอีกครั้ง' : 'ลองบันทึกอีกครั้ง'}
        </button>
      </>}
    </section>
  </div>;
}
