import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawWord = (searchParams.get('word') || searchParams.get('q') || searchParams.get('text'))?.trim() || '';

    if (!rawWord) {
      return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
    }

    const clean = rawWord.toLowerCase().replace(/[^a-zA-Z\s-]/g, '').trim();

    // Query Google Translate gtx endpoint
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=th&dt=t&q=${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
      next: { revalidate: 86400 }, // cache in Next.js for 24h
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Translation provider error' }, { status: 502 });
    }

    const data = await res.json();
    let meaning = '';
    if (Array.isArray(data) && Array.isArray(data[0])) {
      meaning = data[0]
        .map((item: any) => (Array.isArray(item) ? item[0] : ''))
        .filter(Boolean)
        .join('')
        .trim();
    }

    return NextResponse.json({
      word: clean,
      meaning: meaning || 'ไม่พบคำแปล',
      source: 'online',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
