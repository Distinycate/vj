import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import bcrypt from 'bcryptjs';

const loginRoute = readFileSync('src/app/api/auth/login/route.ts', 'utf8');
const registerRoute = readFileSync('src/app/api/auth/register/route.ts', 'utf8');
const meRoute = readFileSync('src/app/api/auth/me/route.ts', 'utf8');
const adminStudentsRoute = readFileSync('src/app/api/admin/students/route.ts', 'utf8');

function isBcryptHash(val: string): boolean {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(val);
}

test('Password check: isBcryptHash correctly identifies standard bcrypt hashes and rejects plaintext', async () => {
  const password = 'studentPassword123';
  const realBcryptHash = await bcrypt.hash(password, 10);

  assert.equal(isBcryptHash(realBcryptHash), true, 'Real bcrypt hash must return true');
  assert.equal(isBcryptHash(password), false, 'Plaintext string must return false');
  assert.equal(isBcryptHash('123456'), false);
  assert.equal(isBcryptHash('admin'), false);
  assert.equal(isBcryptHash(''), false);
});

test('Legacy password login transparently upgrades to bcrypt hash', async () => {
  const plainPassword = 'legacyTeacherPassword!#';
  let databasePassword = plainPassword; // initially legacy plaintext
  let upgradeTriggered = false;

  async function mockLogin(candidate: string) {
    if (isBcryptHash(databasePassword)) {
      return await bcrypt.compare(candidate, databasePassword);
    } else {
      if (databasePassword === candidate) {
        // Upgrade
        databasePassword = await bcrypt.hash(candidate, 10);
        upgradeTriggered = true;
        return true;
      }
      return false;
    }
  }

  // 1. First login with legacy plaintext
  const login1 = await mockLogin(plainPassword);
  assert.equal(login1, true, 'Login with legacy plaintext must succeed');
  assert.equal(upgradeTriggered, true, 'Upgrade must be triggered on successful login');
  assert.ok(isBcryptHash(databasePassword), 'Database password must now be a bcrypt hash');

  // 2. Second login now uses bcrypt comparison branch
  upgradeTriggered = false;
  const login2 = await mockLogin(plainPassword);
  assert.equal(login2, true, 'Second login must succeed via bcrypt comparison');
  assert.equal(upgradeTriggered, false, 'No re-upgrade needed because hash is already bcrypt');

  // Confirm source code performs upgrade
  assert.match(loginRoute, /if \(isBcryptHash\(storedCred\)\) \{/);
  assert.match(loginRoute, /await bcrypt\.compare\(password, storedCred\)/);
  assert.match(loginRoute, /const newHash = await bcrypt\.hash\(password, 10\);/);
  assert.match(loginRoute, /\.update\(\{ password: newHash \}\)/);
});

test('Bcrypt accounts have ZERO plaintext fallback', async () => {
  const correctPassword = 'strongPassword2026';
  const realHash = await bcrypt.hash(correctPassword, 10);

  // An attacker tries sending the raw hash string as the password parameter
  // or sending an incorrect password
  const wrongPassword = 'wrongPassword';

  const compareResult = await bcrypt.compare(wrongPassword, realHash);
  assert.equal(compareResult, false, 'bcrypt.compare must reject wrong password');

  // Verify that login route contains no fallback that allows raw string equality when isBcryptHash is true
  assert.match(loginRoute, /if \(isBcryptHash\(storedCred\)\) \{\s*passwordValid = await bcrypt\.compare\(password, storedCred\);/);
  assert.doesNotMatch(loginRoute, /if \(isBcryptHash\(storedCred\)\) \{[^}]*storedCred === password/);
});

test('Student registration uses bcrypt immediately with zero plaintext fallback', async () => {
  assert.match(registerRoute, /const passwordHash = await bcrypt\.hash\(password, 10\);/);
  assert.match(registerRoute, /password: passwordHash,/);
  // Verify plain password is not written to database
  assert.doesNotMatch(registerRoute, /password: password,/);
});

test('Zero credential material leakage: sensitive fields (password, token_hash) are sanitized from all endpoints', () => {
  // Login response excludes password
  assert.match(loginRoute, /const sanitizedUser = \{/);
  assert.doesNotMatch(loginRoute, /password: account\.password/);

  // /api/auth/me excludes password
  assert.match(meRoute, /user: session\.user/);
  assert.doesNotMatch(meRoute, /token_hash/);
  assert.doesNotMatch(meRoute, /user\.password/);
  assert.doesNotMatch(meRoute, /account\.password/);

  // Admin student route sanitizes password
  assert.match(adminStudentsRoute, /const \{ password, \.\.\.rest \} = s;/);
  assert.match(adminStudentsRoute, /return rest;/);
});
