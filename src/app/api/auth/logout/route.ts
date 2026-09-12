import { NextResponse } from 'next/server';
import { revokeSession } from '@/lib/server/session';
import { assertSameOrigin } from '@/lib/server/security';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await revokeSession();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'CROSS_ORIGIN_REQUEST_DENIED' || error?.message === 'ORIGIN_MISMATCH') {
      return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 });
    }
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
