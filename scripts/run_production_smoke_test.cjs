#!/usr/bin/env node
/**
 * AUTOMATED PRODUCTION SMOKE & NEGATIVE SECURITY TEST RUNNER
 * This script automates Step 5 (Smoke Test) and Step 6 (Negative Tests)
 * so the user doesn't need to manually click through the application.
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body, json });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('AUTOMATED PRODUCTION SMOKE & NEGATIVE SECURITY TESTS');
  console.log('Target Server:', BASE_URL);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` ✔ [PASS] ${message}`);
      passed++;
    } else {
      console.error(` ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Check Homepage
    const home = await request('/');
    assert(home.status === 200, 'Landing page / loads successfully (HTTP 200)');

    // 2. Check Static Client Pages
    const demo = await request('/demo');
    assert(demo.status === 200, 'Demo page /demo loads (HTTP 200)');

    const cardTeacher = await request('/card-teacher');
    assert(cardTeacher.status === 200, 'Card Teacher login /card-teacher loads (HTTP 200)');

    // 3. Negative Test: /api/auth/me without cookie must return 401
    const unauthMe = await request('/api/auth/me');
    assert(unauthMe.status === 401, 'Unauthenticated /api/auth/me returns 401 Unauthorized');

    // 4. Negative Test: CSRF Foreign Origin Mutation Block
    const csrfBlocked = await request('/api/game/complete', {
      method: 'POST',
      headers: {
        'Origin': 'https://malicious-site.attacker.com',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ attemptId: '00000000-0000-0000-0000-000000000000' })
    });
    assert(csrfBlocked.status === 403 || csrfBlocked.status === 401, 'Cross-Origin / unauthenticated mutation rejected (HTTP 401/403)');

    // 5. Negative Test: Game Start without valid session
    const gameStartUnauth = await request('/api/game/start', {
      method: 'POST',
      headers: {
        'Origin': BASE_URL,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ stageNumber: 1 })
    });
    assert(gameStartUnauth.status === 401, 'Unauthenticated /api/game/start returns 401 Unauthorized');

    // 6. Negative Test: Shop Purchase without valid session
    const shopUnauth = await request('/api/shop/purchase', {
      method: 'POST',
      headers: {
        'Origin': BASE_URL,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ itemId: 'potion-1', purchaseRequestId: '11111111-1111-1111-1111-111111111111' })
    });
    assert(shopUnauth.status === 401, 'Unauthenticated /api/shop/purchase returns 401 Unauthorized');

    // 7. Negative Test: Event Reward without valid session
    const rewardUnauth = await request('/api/events/reward', {
      method: 'POST',
      headers: {
        'Origin': BASE_URL,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ source: 'CHRISTMAS_EVENT', coinsDelta: 50 })
    });
    assert(rewardUnauth.status === 401, 'Unauthenticated /api/events/reward returns 401 Unauthorized');

    // 8. Negative Test: Export Report without teacher/admin role
    const exportUnauth = await request('/api/export-report');
    assert(exportUnauth.status === 401, 'Unauthenticated /api/export-report returns 401 Unauthorized');

    // 9. Negative Test: AI Insight without teacher/admin role
    const aiUnauth = await request('/api/ai-insight', {
      method: 'POST',
      headers: {
        'Origin': BASE_URL,
        'Content-Type': 'application/json'
      }
    });
    assert(aiUnauth.status === 401 || aiUnauth.status === 403, 'Unauthenticated /api/ai-insight returns 401/403');

    // 10. Login with invalid credentials returns generic error
    const badLogin = await request('/api/auth/login', {
      method: 'POST',
      headers: {
        'Origin': BASE_URL,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'nonexistent_user', password: 'wrongpassword' })
    });
    assert(badLogin.status === 401, 'Invalid credentials returns 401 with generic error');

    console.log('\n====================================================');
    console.log(`SMOKE & SECURITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Smoke test connection error:', err.message);
    console.log('Note: Ensure the development server (npm run dev) or production server is running at', BASE_URL);
    process.exit(1);
  }
}

run();
