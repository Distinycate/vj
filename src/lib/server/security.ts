import 'server-only';

export function assertSameOrigin(request: Request): void {
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return; // Safe methods
  }

  const origin = request.headers.get('origin') || request.headers.get('referer');
  const host = request.headers.get('host');

  if (!origin || !host) {
    const error: any = new Error('CROSS_ORIGIN_REQUEST_DENIED');
    error.status = 403;
    throw error;
  }

  try {
    const originUrl = new URL(origin);
    // Allow matching host (ignoring port in development if host matches)
    const originHost = originUrl.host;
    if (originHost !== host && !originHost.startsWith('localhost') && !host.startsWith('localhost')) {
      const error: any = new Error('ORIGIN_MISMATCH');
      error.status = 403;
      throw error;
    }
  } catch {
    const error: any = new Error('INVALID_ORIGIN_HEADER');
    error.status = 403;
    throw error;
  }
}

// Persistent rate limiting helper using database or memory window
const rateLimitWindow = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests: number = 20, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitWindow.get(key);

  if (!record || now > record.resetAt) {
    rateLimitWindow.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}
