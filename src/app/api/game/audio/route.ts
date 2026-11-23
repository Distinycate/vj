import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { getLiveGameQuestion } from '@/lib/server/liveGameAttempt';

const schema = z.object({ attemptId: z.uuid(), questionId: z.uuid() });

function recordedUrl(value: unknown) {
  if (typeof value !== 'string' || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const url = new URL(value);
    const storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (url.protocol === 'https:' && url.origin === storage.origin &&
        !url.username && !url.password && url.pathname.startsWith('/storage/v1/object/public/')) return url;
  } catch { /* Unusable recording: use the existing English speech provider. */ }
  return null;
}

export async function GET(request: Request) {
  try {
    const session = await requireRole(['STUDENT']);
    const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return new Response(null, { status: 400 });
    const question = await getLiveGameQuestion(parsed.data.attemptId, session.subjectId, parsed.data.questionId);
    if (!question || question.question_type !== 'listening_mc') return new Response(null, { status: 404 });
    const provider = new URL('https://dict.youdao.com/dictvoice');
    provider.searchParams.set('type', '0');
    provider.searchParams.set('audio', question.word);
    for (const url of [recordedUrl(question.audio_url), provider]) {
      if (!url) continue;
      try {
        const audio = await fetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(3500) });
        const type = audio.headers.get('content-type') || '';
        if (!audio.ok || !audio.body || !type.startsWith('audio/')) continue;
        return new Response(audio.body, { headers: { 'Content-Type': type, 'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff' } });
      } catch { /* Try the next provider if the first is unavailable. */ }
    }
    return new Response(null, { status: 502 });
  } catch (error: any) {
    return new Response(null, { status: error?.status === 401 || error?.status === 403 ? error.status : 503 });
  }
}
