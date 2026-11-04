// Uses ONLY browser-intercepted fixtures. Never submits a real student's assessment.
// Run a local Next server first; PLAYWRIGHT_MODULE may point to a bundled playwright/index.mjs.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3107';
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const vocab = Array.from({ length: 25 }, (_, i) => ({ id: uuid(i + 100), word: `word${i}`, meaning_th: `ความหมาย ${i}`, is_active: true, stage_number: 1 }));
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL });
try {
  for (const { width, scenario } of [{ width: 390, scenario: 'retry' }, { width: 1280, scenario: 'retry' }, { width: 390, scenario: 'stale' }, { width: 1280, scenario: 'fifth' }]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const requests = [];
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const progress = { student_id: uuid(1), current_stage: 1, current_rank: 1, pretest_date: null, coins: 500, free_pull_tickets: 3, exp: 0, total_exp: 0 };
    const history = scenario === 'fifth' ? [14, 13, 13, 15].map((score, i) => ({ id: uuid(30 + i), score, total_questions: 25, created_at: '2026-11-04' })) : [];
    let release;
    const held = new Promise(resolve => { release = resolve; });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname === '/api/auth/me') return json({ authenticated: true, role: 'STUDENT', user: { id: uuid(1), student_name: 'นักเรียนทดสอบ', user_type: 'INTERNAL' }, progress });
      if (url.pathname === '/api/student/assessment') {
        if (route.request().method() === 'GET') return json({ pretests: history, posttests: [], summary: { count: history.length, completed: false }, epoch: uuid(9), progress });
        requests.push(route.request().postDataJSON());
        if (scenario === 'fifth') return json({ success: true, count: 5, completedAll: true, newStage: 1, preScore: 12.8 });
        if (scenario === 'stale') return json({ error: 'เริ่มรอบใหม่แล้ว', reload: true }, 409);
        if (requests.length === 1) { await held; return json({ error: 'จำลองบันทึกไม่สำเร็จ' }, 500); }
        return json({ success: true, count: 1, completedAll: false, newStage: 1, preScore: requests[0].score });
      }
      // Block any unmocked production API/network request.
      if (url.hostname.endsWith('.supabase.co')) {
        if (url.pathname.endsWith('/vocabulary')) return json(vocab);
        if (url.pathname.endsWith('/schools')) return json({ is_registration_open: true });
        if (url.pathname.endsWith('/learning_paths')) return json(progress);
        return json([]);
      }
      if (url.pathname.startsWith('/api/')) return json({});
      if (url.origin !== base) return route.abort();
      return route.continue();
    });
    await page.goto(base);
    await page.locator('[data-demo-guide="pretest-start"]').waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `no horizontal overflow at ${width}px`);
    for (let i = 0; i < 25; i++) {
      await page.getByText(`ข้อ ${i + 1} / 25`, { exact: true }).waitFor();
      await page.getByRole('button', { name: /^ความหมาย/ }).first().click();
    }
    if (scenario === 'fifth') {
      await page.locator('[data-demo-guide="pretest-start"]').waitFor({ state: 'detached' });
      assert.equal(requests.length, 1);
      assert.equal(await page.getByText(/ประเมินรอบที่ 6/).count(), 0);
      console.log('PASS fifth saved round leaves the Pre-test gate without round six');
      await context.close();
      continue;
    }
    if (scenario === 'stale') {
      await page.getByRole('button', { name: 'โหลดสถานะปัจจุบันใหม่' }).waitFor();
      assert.equal(await page.getByText(/จบการประเมินรอบที่/).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'ลองบันทึกอีกครั้ง' }).count(), 0);
      console.log('PASS stale epoch requires reload and never shows successful completion');
      await context.close();
      continue;
    }
    await page.getByRole('heading', { name: 'กำลังบันทึกผลสอบ…' }).waitFor();
    assert.equal(await page.getByText(/จบการประเมินรอบที่/).count(), 0, 'must not show success before persistence');
    release();
    await page.getByText('จำลองบันทึกไม่สำเร็จ', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'ลองบันทึกอีกครั้ง' }).click();
    await page.getByRole('heading', { name: 'จบการประเมินรอบที่ 1', exact: true }).waitFor();
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0], requests[1], 'retry keeps ID, score, duration and epoch identical');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/tmp/vj-pretest-${width}.png`, fullPage: true });
    console.log(`PASS ${width}px: loading, failed save, idempotent retry, no premature result, no overflow`);
    await context.close();
  }
} finally { await browser.close(); }
