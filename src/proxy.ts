import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Coarse routing guard for UX & fast redirects.
// Note: Actual authorization boundary is enforced by requireSession() / requireRole() in Server APIs and Components.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPrefixes = ['/admin', '/executive', '/card-teacher/dashboard'];

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected) {
    const sessionCookie = request.cookies.get('vj_session');
    if (!sessionCookie || !sessionCookie.value) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/executive/:path*', '/card-teacher/dashboard/:path*'],
};
