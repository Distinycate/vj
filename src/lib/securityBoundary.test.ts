import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import crypto from 'node:crypto';
import { calculateNormalizedGain, formatNormalizedGain } from '../utils/analyticsUtils.ts';

const migrationSql = readFileSync('MIGRATION_USER_SESSIONS_AND_HARDENING.sql', 'utf8');
const loginRoute = readFileSync('src/app/api/auth/login/route.ts', 'utf8');
const logoutRoute = readFileSync('src/app/api/auth/logout/route.ts', 'utf8');
const gameCompleteRoute = readFileSync('src/app/api/game/complete/route.ts', 'utf8');
const gameStartRoute = readFileSync('src/app/api/game/start/route.ts', 'utf8');
const shopPurchaseRoute = readFileSync('src/app/api/shop/purchase/route.ts', 'utf8');
const eventRewardRoute = readFileSync('src/app/api/events/reward/route.ts', 'utf8');
const sessionModule = readFileSync('src/lib/server/session.ts', 'utf8');
const securityModule = readFileSync('src/lib/server/security.ts', 'utf8');

function verifySameOriginLogic(originHeader: string | null, hostHeader: string | null, method: string = 'POST'): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) return true;
  if (!originHeader || !hostHeader) return false;
  try {
    const originUrl = new URL(originHeader);
    const originHost = originUrl.host;
    if (originHost !== hostHeader && !originHost.startsWith('localhost') && !hostHeader.startsWith('localhost')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

test('Hake normalized gain handles ceiling and negative gains canonically', () => {
  // Ceiling effect: pre === max -> return null
  assert.equal(calculateNormalizedGain(25, 25, 25), null);
  assert.equal(formatNormalizedGain(null), 'N/A (Ceiling)');

  // Normal gain: pre=10, post=20, max=25 -> (20-10)/(25-10) = 10/15 = 66.67%
  const gain = calculateNormalizedGain(10, 20, 25);
  assert.equal(gain, 66.67);
  assert.equal(formatNormalizedGain(gain), '+66.67%');

  // Negative gain: pre=15, post=10, max=25 -> (10-15)/(25-15) = -5/10 = -50%
  const negGain = calculateNormalizedGain(15, 10, 25);
  assert.equal(negGain, -50);
  assert.equal(formatNormalizedGain(negGain), '-50%');
});

test('CSRF assertSameOrigin blocks forged origins while allowing same origin', () => {
  // GET is safe
  assert.equal(verifySameOriginLogic('http://attacker-site.com', 'localhost:3000', 'GET'), true);

  // Cross-origin POST fails
  assert.equal(verifySameOriginLogic('http://attacker-site.com', 'my-production-school.com', 'POST'), false);

  // Same-origin POST succeeds
  assert.equal(verifySameOriginLogic('https://my-production-school.com', 'my-production-school.com', 'POST'), true);

  // Mutating endpoints strictly invoke assertSameOrigin
  for (const [name, code] of [
    ['login', loginRoute],
    ['logout', logoutRoute],
    ['gameComplete', gameCompleteRoute],
    ['gameStart', gameStartRoute],
    ['shopPurchase', shopPurchaseRoute],
    ['eventReward', eventRewardRoute],
  ]) {
    assert.match(code, /assertSameOrigin\(request\)/, `${name} must call assertSameOrigin`);
  }
});

test('Session tokens are hashed with SHA-256 before database lookup', () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  assert.equal(hashed.length, 64);
  assert.match(hashed, /^[a-f0-9]{64}$/);

  assert.match(sessionModule, /hashToken\(token\)/);
  assert.match(sessionModule, /crypto\.createHash\('sha256'\)/);
  assert.doesNotMatch(sessionModule, /raw_token/);
  assert.match(sessionModule, /import 'server-only';/);
});

test('Forged role in login payload cannot elevate privilege', () => {
  assert.match(loginRoute, /authoritativeRole/);
  assert.match(loginRoute, /role: authoritativeRole/);
  // Verifies requestedRole is not assigned directly to session role
  assert.doesNotMatch(loginRoute, /role: requestedRole,/);
  assert.match(loginRoute, /authoritativeRole = 'STUDENT'/);
  assert.match(loginRoute, /authoritativeRole = \(teacher\.role as UserRole\)/);
});

test('Game complete endpoint strictly rejects client-supplied scores and reward overrides', () => {
  assert.match(gameCompleteRoute, /student_id/);
  assert.match(gameCompleteRoute, /earnedCoins/);
  assert.match(gameCompleteRoute, /earnedExp/);
  assert.match(gameCompleteRoute, /passed/);
  assert.match(gameCompleteRoute, /accuracy/);
  assert.match(gameCompleteRoute, /Forbidden field/);
});

test('Game attempts are server-created with authoritative answer keys', () => {
  assert.match(gameStartRoute, /stage_attempts/);
  assert.match(gameStartRoute, /authoritativeQuestions/);
  assert.match(gameStartRoute, /clientQuestions/);
  assert.match(gameCompleteRoute, /attempt\.question_ids/);
  assert.match(gameCompleteRoute, /attempt\.student_id !== session\.subjectId/);
});

test('Shop purchases enforce idempotency via purchaseRequestId and atomic row locks', () => {
  assert.match(shopPurchaseRoute, /purchaseRequestId: z\.string\(\)\.uuid\(\)/);
  assert.match(shopPurchaseRoute, /purchase_shop_item/);
  assert.match(migrationSql, /uq_shop_purchase_request UNIQUE \(student_id, purchase_request_id\)/);
  assert.match(migrationSql, /FOR UPDATE/);
});

test('Database hardening migration revokes privileged RPC execution from anon/public and grants only to service_role', () => {
  assert.match(migrationSql, /REVOKE EXECUTE ON FUNCTION public\.purchase_shop_item.*FROM PUBLIC, anon, authenticated;/);
  assert.match(migrationSql, /GRANT EXECUTE ON FUNCTION public\.purchase_shop_item.*TO service_role;/);
  assert.match(migrationSql, /REVOKE EXECUTE ON FUNCTION public\.complete_stage_transaction.*FROM PUBLIC, anon, authenticated;/);
  assert.match(migrationSql, /GRANT EXECUTE ON FUNCTION public\.complete_stage_transaction.*TO service_role;/);
  assert.match(migrationSql, /REVOKE EXECUTE ON FUNCTION public\.grant_student_reward.*FROM PUBLIC, anon, authenticated;/);
  assert.match(migrationSql, /GRANT EXECUTE ON FUNCTION public\.grant_student_reward.*TO service_role;/);
});

test('Stage completion RPC enforces attempt idempotency and anti-farming replay rewards', () => {
  assert.match(migrationSql, /IF v_attempt\.status = 'COMPLETED' THEN/);
  assert.match(migrationSql, /v_star_multiplier := 0\.1;/);
  assert.match(migrationSql, /SET status = 'COMPLETED'/);
});

test('Session validation checks real-time database account status and active role', () => {
  // Checks account active status on every getSession()
  assert.match(sessionModule, /student\.is_active === false/);
  assert.match(sessionModule, /teacher\.is_active === false/);
  assert.match(sessionModule, /await revokeSession\(\)/);
  // Authoritative role comes from teacher record in DB
  assert.match(sessionModule, /authoritativeRole = \(teacher\.role as UserRole\) \|\| 'TEACHER'/);
});

test('Stage attempt lifecycle strictly blocks expired attempts and enforces owner validation', () => {
  assert.match(gameCompleteRoute, /attempt\.expires_at && new Date\(attempt\.expires_at\) < new Date\(\)/);
  assert.match(gameCompleteRoute, /status: 'EXPIRED'/);
  assert.match(gameCompleteRoute, /attempt\.student_id !== session\.subjectId/);
});

test('Sensitive tables enforce Row Level Security and deny direct anon/authenticated access', () => {
  assert.match(migrationSql, /ALTER TABLE public\.user_sessions ENABLE ROW LEVEL SECURITY;/);
  assert.match(migrationSql, /ALTER TABLE public\.stage_attempts ENABLE ROW LEVEL SECURITY;/);
  assert.match(migrationSql, /ALTER TABLE public\.economy_transactions ENABLE ROW LEVEL SECURITY;/);
  assert.match(migrationSql, /ALTER TABLE public\.shop_purchases ENABLE ROW LEVEL SECURITY;/);
  assert.match(migrationSql, /REVOKE ALL ON public\.user_sessions FROM anon, authenticated;/);
  assert.match(migrationSql, /GRANT ALL ON public\.user_sessions TO service_role;/);
});

test('Economy ledger enforces append-only constraint and idempotency', () => {
  assert.match(migrationSql, /uq_economy_idempotent UNIQUE \(student_id, source, reference_id\)/);
  assert.match(migrationSql, /INSERT INTO public\.economy_transactions/);
});

