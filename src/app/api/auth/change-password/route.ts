import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

const changePasswordSchema = z.object({
  newPassword: z.string().min(6).max(200),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const { newPassword } = parsed.data;
    
    // Check if new password is one of the forbidden emergency passwords
    const p = newPassword.trim();
    const u = session.user.username?.trim();
    if (p === '1234' || p === '123456' || (u && p.toLowerCase() === u.toLowerCase())) {
      return NextResponse.json({ error: 'Cannot use emergency password as your new password' }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const table = session.subjectType === 'STUDENT' ? 'students' : 'teachers';
    
    const { error } = await supabaseAdmin
      .from(table)
      .update({ password: newHash })
      .eq('id', session.subjectId);

    if (error) {
      throw error;
    }

    // Clear the must_change cookie
    const cookieStore = await cookies();
    cookieStore.delete('vj_must_change_password');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
