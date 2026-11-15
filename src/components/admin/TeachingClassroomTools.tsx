'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Eraser,
  Pen,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { GrammarTeachingUnit } from '@/data/grammar/grammarPresentationData';

export type AnnotationTool = 'none' | 'pen' | 'eraser';

export const PEN_COLORS = [
  { key: 'yellow', label: 'เหลือง', hex: '#facc15' },
  { key: 'rose', label: 'แดง', hex: '#fb7185' },
  { key: 'sky', label: 'ฟ้า', hex: '#38bdf8' },
] as const;

interface SlideAnnotationCanvasProps {
  tool: AnnotationTool;
  penColor: string;
  clearSignal: number;
}

/**
 * Transparent drawing overlay for circling clues and crossing out distractors live on slides.
 */
export function SlideAnnotationCanvas({
  tool,
  penColor,
  clearSignal,
}: SlideAnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.max(1, Math.floor(rect.width * dpr));
    const targetH = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      // Preserve existing drawing when resizing
      const temp = document.createElement('canvas');
      temp.width = canvas.width;
      temp.height = canvas.height;
      const tCtx = temp.getContext('2d');
      if (tCtx && canvas.width > 0 && canvas.height > 0) {
        tCtx.drawImage(canvas, 0, 0);
      }
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (temp.width > 0 && temp.height > 0) {
          ctx.drawImage(temp, 0, 0, rect.width, rect.height);
        }
      }
    }
  }, []);

  useEffect(() => {
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);
    return () => window.removeEventListener('resize', syncCanvasSize);
  }, [syncCanvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }, [clearSignal]);

  const getLocalPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'none') return;
    syncCanvasSize();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getLocalPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || tool === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = getLocalPoint(e);
    const prev = lastPointRef.current ?? pt;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 26;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 4;
      ctx.strokeStyle = penColor;
    }
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = pt;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: tool === 'none' ? 'auto' : 'none' }}
      className={`absolute inset-0 w-full h-full z-20 ${
        tool === 'none'
          ? 'pointer-events-none'
          : tool === 'eraser'
            ? 'pointer-events-auto cursor-cell'
            : 'pointer-events-auto cursor-crosshair'
      }`}
    />
  );
}

interface RandomStudentWheelModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Classroom random student picker modal (supports number range 1..N or custom names).
 */
export function RandomStudentWheelModal({
  open,
  onClose,
}: RandomStudentWheelModalProps) {
  const [maxStudents, setMaxStudents] = useState<number>(40);
  const [customNamesText, setCustomNamesText] = useState<string>('');
  const [avoidRepeat, setAvoidRepeat] = useState<boolean>(true);
  const [pickedHistory, setPickedHistory] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [displayItem, setDisplayItem] = useState<string>('?');
  const [finalWinner, setFinalWinner] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!open) return null;

  const customList = customNamesText
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pool: string[] =
    customList.length > 0
      ? customList
      : Array.from({ length: Math.max(2, Math.min(80, maxStudents)) }, (_, i) => `เลขที่ ${i + 1}`);

  const remaining = avoidRepeat
    ? pool.filter((item) => !pickedHistory.includes(item))
    : pool;

  const handleSpin = () => {
    if (isSpinning) return;
    const activePool = remaining.length > 0 ? remaining : pool;
    if (remaining.length === 0 && avoidRepeat) {
      setPickedHistory([]);
    }

    setIsSpinning(true);
    setFinalWinner(null);

    const winner = activePool[Math.floor(Math.random() * activePool.length)];
    let step = 0;
    const totalSteps = 18;

    const tick = () => {
      step += 1;
      if (step < totalSteps) {
        const randomPreview = activePool[Math.floor(Math.random() * activePool.length)];
        setDisplayItem(randomPreview);
        const delay = 45 + step * 12;
        timerRef.current = setTimeout(tick, delay);
      } else {
        setDisplayItem(winner);
        setFinalWinner(winner);
        setIsSpinning(false);
        setPickedHistory((prev) => (avoidRepeat ? [...prev, winner] : prev));
      }
    };

    tick();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎡</span>
            <div>
              <h3 className="text-base font-extrabold text-white">วงล้อสุ่มนักเรียนตอบคำถาม</h3>
              <p className="text-xs text-slate-400">สุ่มเลขที่หรือรายชื่อหน้าห้องได้ทันที</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Wheel Display */}
          <div
            className={`rounded-2xl p-6 text-center border-2 transition-all ${
              finalWinner
                ? 'bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-emerald-500/20 border-amber-400 shadow-lg shadow-amber-500/15'
                : 'bg-slate-950 border-slate-800'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              {isSpinning ? 'กำลังสุ่มผู้โชคดี...' : finalWinner ? '🎉 ผู้โชคดีรอบนี้คือ' : 'กดปุ่มเพื่อเริ่มสุ่ม'}
            </p>
            <div className="text-4xl md:text-5xl font-black text-amber-300 tracking-tight py-2">
              {displayItem}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              เหลือในรอบนี้ {remaining.length} / {pool.length} คน
            </p>
          </div>

          {/* Primary Spin Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSpin}
              disabled={isSpinning}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 disabled:opacity-60 text-slate-950 font-black text-sm shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isSpinning ? 'กำลังหมุนวงล้อ...' : 'หมุนวงล้อสุ่ม!'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPickedHistory([]);
                setFinalWinner(null);
                setDisplayItem('?');
              }}
              className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer flex items-center gap-1.5"
              title="ล้างประวัติการสุ่มรอบนี้"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              เริ่มรอบใหม่
            </button>
          </div>

          {/* Settings */}
          <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                จำนวนนักเรียนในห้อง (1 – N)
              </label>
              <input
                type="number"
                min={2}
                max={80}
                value={maxStudents}
                onChange={(e) => setMaxStudents(Number(e.target.value) || 40)}
                disabled={customList.length > 0}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={avoidRepeat}
                  onChange={(e) => setAvoidRepeat(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-950 text-amber-400"
                />
                ไม่สุ่มซ้ำคนเดิมจนกว่าจะครบห้อง
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              (ตัวเลือกเสริม) วางรายชื่อนักเรียนคั่นด้วย Enter หรือคอมม่า (ถ้าว่างจะสุ่มเป็นเลขที่ 1–{maxStudents})
            </label>
            <textarea
              rows={2}
              value={customNamesText}
              onChange={(e) => setCustomNamesText(e.target.value)}
              placeholder="เช่น ต้นกล้า, น้ำฝน, ภูมิ, พลอย..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          {pickedHistory.length > 0 && (
            <div className="text-xs text-slate-400 bg-slate-950/70 rounded-xl p-2.5 border border-slate-800">
              <span className="font-bold text-slate-300">สุ่มไปแล้ว ({pickedHistory.length}): </span>
              {pickedHistory.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PrintAndLineSummaryModalProps {
  open: boolean;
  unit: GrammarTeachingUnit;
  onClose: () => void;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildLineSummaryText(unit: GrammarTeachingUnit): string {
  const lines: string[] = [];
  lines.push(`📚 สรุปบทเรียน: ${unit.title}`);
  if (unit.gradeLabel) lines.push(`🎯 ระดับชั้น: ${unit.gradeLabel}`);
  lines.push(`⭐ GOLDEN TRICK: ${unit.goldenTrick}`);
  lines.push('');

  unit.conceptSlides.forEach((slide, idx) => {
    lines.push(`🔹 ${slide.slideTitle}`);
    lines.push(`สูตรจำ: ${slide.keyFormula}`);
    slide.bulletPoints.slice(0, 4).forEach((b) => lines.push(`  • ${b}`));
    if (slide.signalTable.length > 0) {
      lines.push(`📌 คำบอกใบ้ & ตัวอย่าง:`);
      slide.signalTable.slice(0, 3).forEach((row) => {
        lines.push(`  - ${row.signal}: ${row.ruleOrMeaning}`);
        lines.push(`    Ex: ${row.example} (${row.exampleTranslation})`);
      });
    }
    lines.push(`⚠️ ระวังจุดหลอก: ${slide.commonTrap.trap}`);
    lines.push(`✅ วิธีแก้: ${slide.commonTrap.howToFix}`);
    if (idx < unit.conceptSlides.length - 1) lines.push('');
  });

  if (unit.recommendedWorksheets && unit.recommendedWorksheets.length > 0) {
    lines.push('');
    lines.push(`📝 ใบงานแนะนำท้ายคาบ: ${unit.recommendedWorksheets.join(', ')}`);
  }
  lines.push('💡 ทบทวนบนมือถือได้ที่เมนู "คัมภีร์สูตรลัด (Grammar Guide)" ใน Vocab Journey!');
  return lines.join('\n');
}

/**
 * Modal for copying a clean LINE summary message or printing a light-mode A4 handout.
 */
export function PrintAndLineSummaryModal({
  open,
  unit,
  onClose,
}: PrintAndLineSummaryModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const lineText = buildLineSummaryText(unit);

  const handleCopyLine = async () => {
    try {
      await navigator.clipboard.writeText(lineText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for non-HTTPS contexts
      const area = document.createElement('textarea');
      area.value = lineText;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrintHandout = () => {
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;

    const slidesHtml = unit.conceptSlides
      .map(
        (slide) => `
      <section class="card">
        <h2>${escapeHtml(slide.slideTitle)}</h2>
        <div class="formula"><strong>สูตรจำไว:</strong> ${escapeHtml(slide.keyFormula)}</div>
        <ul>
          ${slide.bulletPoints.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}
        </ul>
        <table>
          <thead>
            <tr>
              <th>คำสำคัญ / รูปประโยค</th>
              <th>หลักการใช้</th>
              <th>ตัวอย่างประโยค &amp; คำแปล</th>
            </tr>
          </thead>
          <tbody>
            ${slide.signalTable
              .map(
                (r) => `
              <tr>
                <td><strong>${escapeHtml(r.signal)}</strong></td>
                <td>${escapeHtml(r.ruleOrMeaning)}</td>
                <td><div>${escapeHtml(r.example)}</div><div class="th">${escapeHtml(r.exampleTranslation)}</div></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
        <div class="trap">
          <strong>⚠️ จุดหลอกที่พบบ่อย:</strong> ${escapeHtml(slide.commonTrap.trap)}<br/>
          <strong>✅ วิธีแก้:</strong> ${escapeHtml(slide.commonTrap.howToFix)}
        </div>
      </section>`
      )
      .join('');

    const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(unit.title)} - ใบสรุปเนื้อหา Vocab Journey</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: 'Sarabun', 'Noto Sans Thai', system-ui, sans-serif; color: #0f172a; margin: 0; padding: 16px; line-height: 1.5; font-size: 13px; }
    header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
    h1 { font-size: 18px; margin: 0 0 4px 0; }
    .meta { font-size: 12px; color: #475569; }
    .trick { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; font-weight: 600; }
    .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; page-break-inside: avoid; }
    h2 { font-size: 15px; margin: 0 0 8px 0; color: #1e293b; }
    .formula { background: #eff6ff; border-left: 4px solid #2563eb; padding: 6px 10px; margin-bottom: 8px; }
    ul { margin: 6px 0 10px 18px; padding: 0; }
    li { margin-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; }
    .th { color: #475569; font-size: 11px; margin-top: 2px; }
    .trap { background: #fff1f2; border: 1px solid #fda4af; border-radius: 6px; padding: 6px 10px; font-size: 12px; }
    footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 12px; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(unit.title)}</h1>
    <div class="meta">${escapeHtml(unit.subtitle)} • ${escapeHtml(unit.gradeLabel || '')}</div>
  </header>
  <div class="trick">⭐ GOLDEN TRICK: ${escapeHtml(unit.goldenTrick)}</div>
  ${slidesHtml}
  <footer>ใบสรุปเนื้อหาประกอบการสอน — Vocab Journey (${escapeHtml(unit.recommendedWorksheets?.join(', ') || '')})</footer>
</body>
</html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-white">
              🖨️ พิมพ์สรุปสูตร &amp; คัดลอกส่งกลุ่ม LINE
            </h3>
            <p className="text-xs text-slate-400">{unit.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyLine}
              className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-[#06C755] hover:bg-[#05b34c] text-white shadow-lg'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'คัดลอกแล้ว! นำไปวางใน LINE ได้เลย' : 'คัดลอกข้อความสรุปส่ง LINE'}
            </button>

            <button
              type="button"
              onClick={handlePrintHandout}
              className="flex-1 min-w-[200px] py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ / บันทึกเป็น PDF (A4 พื้นขาว)
            </button>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 mb-1.5">
              ตัวอย่างข้อความที่จะส่งเข้ากลุ่ม LINE ห้องเรียน:
            </p>
            <pre className="whitespace-pre-wrap text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded-2xl p-4 font-sans leading-relaxed max-h-[340px] overflow-y-auto">
              {lineText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AnnotationToolbarProps {
  tool: AnnotationTool;
  penColor: string;
  onChangeTool: (tool: AnnotationTool) => void;
  onChangeColor: (hex: string) => void;
  onClear: () => void;
  onOpenWheel: () => void;
  onOpenSummary: () => void;
}

/**
 * Compact teacher classroom toolbar for Pen, Eraser, Clear, Lucky Wheel, and Print/LINE Summary.
 */
export function TeacherLiveToolsBar({
  tool,
  penColor,
  onChangeTool,
  onChangeColor,
  onClear,
  onOpenWheel,
  onOpenSummary,
}: AnnotationToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Pen toggle */}
      <button
        type="button"
        onClick={() => onChangeTool(tool === 'pen' ? 'none' : 'pen')}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
          tool === 'pen'
            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
        }`}
        title="ปากกาขีดเขียนวงกลมคำบอกใบ้บนสไลด์"
      >
        <Pen className="w-3.5 h-3.5" />
        ปากกา
      </button>

      {/* Pen Colors when pen is active */}
      {tool === 'pen' && (
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
          {PEN_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onChangeColor(c.hex)}
              title={`สี${c.label}`}
              style={{ backgroundColor: c.hex }}
              className={`w-4 h-4 rounded-full cursor-pointer transition ${
                penColor === c.hex ? 'ring-2 ring-white scale-110' : 'opacity-65 hover:opacity-100'
              }`}
            />
          ))}
        </div>
      )}

      {/* Eraser toggle */}
      <button
        type="button"
        onClick={() => onChangeTool(tool === 'eraser' ? 'none' : 'eraser')}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
          tool === 'eraser'
            ? 'bg-rose-400 text-slate-950 border-rose-300 shadow'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
        }`}
        title="ยางลบลบเส้นที่ขีดเขียน"
      >
        <Eraser className="w-3.5 h-3.5" />
        ยางลบ
      </button>

      {/* Clear all strokes */}
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
        title="ล้างเส้นที่ขีดเขียนทั้งหมดบนสไลด์นี้"
      >
        <Trash2 className="w-3.5 h-3.5" />
        ล้างเส้น
      </button>

      {/* Random Student Wheel */}
      <button
        type="button"
        onClick={onOpenWheel}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-400/40 transition cursor-pointer"
        title="เปิดวงล้อสุ่มเลขที่/ชื่อนักเรียน"
      >
        🎡 สุ่มนักเรียน
      </button>

      {/* Print / Copy for LINE */}
      <button
        type="button"
        onClick={onOpenSummary}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#06C755]/20 hover:bg-[#06C755]/30 text-emerald-200 border border-[#06C755]/40 transition cursor-pointer"
        title="พิมพ์สรุป A4 หรือคัดลอกข้อความส่งเข้ากลุ่ม LINE"
      >
        🖨️ พิมพ์ / ส่ง LINE
      </button>
    </div>
  );
}
