'use client';
import { useRef, useState } from 'react';

interface Submission {
  type: 'PRE_TEST' | 'POST_TEST';
  score: number;
  totalQuestions: number;
  timeSpentSec: number;
  epoch: string;
}

export function useAssessmentSubmission() {
  const pending = useRef<(Submission & { submissionId: string }) | null>(null);
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reloadRequired, setReloadRequired] = useState(false);

  async function submit(input?: Submission) {
    if (inFlight.current) return null;
    if (!pending.current && input) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      const submissionId = [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
      pending.current = { ...input, submissionId };
    }
    if (!pending.current) return null;
    inFlight.current = true;
    setSaving(true);
    setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('/api/student/assessment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pending.current), signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setReloadRequired(Boolean(result.reload) || response.status === 401);
        throw new Error(result.error || 'บันทึกผลไม่สำเร็จ');
      }
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง');
      return null;
    } finally {
      clearTimeout(timeout);
      inFlight.current = false;
      setSaving(false);
    }
  }
  function reset() {
    pending.current = null;
    setError('');
    setReloadRequired(false);
  }
  return { submit, reset, saving, error, reloadRequired };
}
