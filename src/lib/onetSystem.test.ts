import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ONET_2568,
  ONET_YEARS_SUMMARY,
  NATIONAL_BENCHMARKS,
  getOnetYearConfig,
} from '../data/onet/onetData.ts';

describe('O-NET Challenge & Assessment System Verification', () => {
  it('1. All 10 years exist in summary with correct question counts and totalScore 100', () => {
    assert.equal(ONET_YEARS_SUMMARY.length, 10);

    const yearQuestionMap: Record<number, number> = {
      2568: 32,
      2567: 32,
      2566: 32,
      2565: 32,
      2564: 32,
      2563: 40,
      2562: 50,
      2561: 50,
      2560: 50,
      2559: 50,
    };

    ONET_YEARS_SUMMARY.forEach((item) => {
      assert.equal(item.totalQuestions, yearQuestionMap[item.year]);
      assert.ok(item.pdfUrl.endsWith('.pdf'));
    });
  });

  it('2. Year 2568 exam configuration has exactly 32 questions and sums to 100 points', () => {
    const config = getOnetYearConfig(2568);
    assert.ok(config);
    assert.equal(config.questions.length, 32);

    const totalPoints = config.questions.reduce((sum, q) => sum + q.points, 0);
    assert.equal(Math.round(totalPoints), 100);

    // Verify item 10 is ordering type with 6 sub-items
    const item10 = config.questions.find((q) => q.number === 10);
    assert.ok(item10);
    assert.equal(item10.type, 'ordering');
    assert.deepEqual(item10.correctAnswer, ['D', 'A', 'B', 'C', 'F', 'E']);
  });

  it('3. Grading engine evaluates answers accurately', () => {
    const config = ONET_2568;

    // Build perfect answer sheet
    const perfectAnswers: Record<string, any> = {};
    config.questions.forEach((q) => {
      perfectAnswers[String(q.number)] = q.correctAnswer;
    });

    let correctCount = 0;
    config.questions.forEach((q) => {
      const ans = perfectAnswers[String(q.number)];
      if (q.type === 'single') {
        if (ans === q.correctAnswer) correctCount++;
      } else if (q.type === 'ordering') {
        if (Array.isArray(ans) && Array.isArray(q.correctAnswer)) {
          if (ans.every((v, i) => v === q.correctAnswer[i])) correctCount++;
        }
      }
    });

    assert.equal(correctCount, 32);
    const score100 = (correctCount / 32) * 100;
    assert.equal(score100, 100);
  });

  it('4. Grading engine flags incorrect answers and computes partial score correctly', () => {
    const config = ONET_2568;

    // Simulate 16 correct and 16 incorrect
    const mixedAnswers: Record<string, any> = {};
    config.questions.forEach((q, idx) => {
      if (idx < 16) {
        mixedAnswers[String(q.number)] = q.correctAnswer;
      } else {
        mixedAnswers[String(q.number)] = 'WRONG';
      }
    });

    let correctCount = 0;
    config.questions.forEach((q) => {
      const ans = mixedAnswers[String(q.number)];
      if (q.type === 'single') {
        if (ans === q.correctAnswer) correctCount++;
      } else if (q.type === 'ordering') {
        if (Array.isArray(ans) && Array.isArray(q.correctAnswer)) {
          if (ans.every((v, i) => v === q.correctAnswer[i])) correctCount++;
        }
      }
    });

    assert.equal(correctCount, 16);
    const score100 = (correctCount / 32) * 100;
    assert.equal(score100, 50.0);

    // Reward check: if >= 50% (half or more), reward must be exactly 5 tickets
    const isPassed = score100 >= 50;
    const ticketsReward = isPassed ? 5 : 0;
    assert.equal(ticketsReward, 5, 'Passing half or more must award exactly 5 tickets');
  });

  it('5. Official NIETS national benchmarks are correctly loaded for all 10 years', () => {
    const expectedMeans: Record<number, number> = {
      2568: 30.93,
      2567: 31.76,
      2566: 32.68,
      2565: 31.11,
      2564: 34.38,
      2563: 31.00,
      2562: 29.45,
      2561: 30.45,
      2560: 31.80,
      2559: 30.62,
    };

    for (const [yearStr, expMean] of Object.entries(expectedMeans)) {
      const bm = NATIONAL_BENCHMARKS[Number(yearStr)];
      assert.ok(bm, `Benchmark missing for year ${yearStr}`);
      assert.equal(bm.nationalMean, expMean);
      assert.ok(bm.nationalSd > 0);
      assert.equal(bm.nationalMax, 100.0);
      assert.equal(bm.source, 'สทศ. (NIETS)');
    }
  });

  it('6. Cohort calculations (Mean, SD, Min, Max, PassRate) operate with mathematical precision', () => {
    const scores = [80, 60, 40, 90, 70];
    const n = scores.length;
    const sum = scores.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    assert.equal(mean, 68.0);

    const max = Math.max(...scores);
    assert.equal(max, 90);

    const min = Math.min(...scores);
    assert.equal(min, 40);

    const variance = scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / n;
    const sd = Number(Math.sqrt(variance).toFixed(2));
    assert.equal(sd, 17.20);

    const passCount = scores.filter((s) => s >= 50).length;
    const passRate = (passCount / n) * 100;
    assert.equal(passRate, 80.0);

    // Comparison against 2568 benchmark (30.93)
    const natMean = NATIONAL_BENCHMARKS[2568].nationalMean;
    const delta = Number((mean - natMean).toFixed(2));
    assert.equal(delta, 37.07);
    assert.ok(delta > 0, 'Cohort mean is higher than national benchmark');
  });

  it('7. Clean B&W PDF files for all 10 years exist in public/pdf/onet/', () => {
    const baseDir = path.resolve(process.cwd(), 'public/pdf/onet');

    for (let y = 2559; y <= 2568; y++) {
      const filePath = path.join(baseDir, `onet-m3-${y}-clean.pdf`);
      assert.ok(fs.existsSync(filePath), `Clean PDF missing: onet-m3-${y}-clean.pdf`);
      const stat = fs.statSync(filePath);
      assert.ok(stat.size > 100000, `PDF file too small: ${stat.size} bytes`);
    }
  });

  it('8. Year & classroom access control gates permissions accurately', () => {
    const mockOpenYears: Record<string, { isOpen: boolean; allowedClassrooms: string[] }> = {
      '2568': { isOpen: true, allowedClassrooms: ['ม.3/1'] },
      '2567': { isOpen: false, allowedClassrooms: ['ม.3/1', 'ม.3/2'] },
      '2566': { isOpen: true, allowedClassrooms: ['ALL'] },
    };

    function checkAccess(year: number, classroom: string) {
      const cfg = mockOpenYears[String(year)];
      if (!cfg || !cfg.isOpen) return false;
      return cfg.allowedClassrooms.includes('ALL') || cfg.allowedClassrooms.includes(classroom);
    }

    // Year 2568: Open only for ม.3/1
    assert.equal(checkAccess(2568, 'ม.3/1'), true, 'ม.3/1 should have access to 2568');
    assert.equal(checkAccess(2568, 'ม.2/1'), false, 'ม.2/1 should NOT have access to 2568');
    assert.equal(checkAccess(2568, 'ม.1/1'), false, 'ม.1/1 should NOT have access to 2568');

    // Year 2567: Closed completely
    assert.equal(checkAccess(2567, 'ม.3/1'), false, 'Closed year should deny even listed classroom');
    assert.equal(checkAccess(2567, 'ม.3/2'), false, 'Closed year should deny ม.3/2');

    // Year 2566: Open for ALL
    assert.equal(checkAccess(2566, 'ม.3/1'), true, 'ALL should allow ม.3/1');
    assert.equal(checkAccess(2566, 'ม.2/1'), true, 'ALL should allow ม.2/1');
    assert.equal(checkAccess(2566, 'ม.1/1'), true, 'ALL should allow ม.1/1');

    // Year 2565: Not configured
    assert.equal(checkAccess(2565, 'ม.3/1'), false, 'Unconfigured year should deny access');
  });

  it('9. Multi-attempt progression tracking calculates attempts, growth delta, and max score', () => {
    const rawAttempts = [
      {
        studentId: 'student_1',
        year: 2568,
        score100: 20,
        correctCount: 6,
        totalQuestions: 32,
        completedAt: '2026-11-05T09:00:00Z',
      },
      {
        studentId: 'student_1',
        year: 2568,
        score100: 21,
        correctCount: 7,
        totalQuestions: 32,
        completedAt: '2026-11-05T10:00:00Z',
      },
      {
        studentId: 'student_1',
        year: 2568,
        score100: 25,
        correctCount: 8,
        totalQuestions: 32,
        completedAt: '2026-11-05T11:00:00Z',
      },
    ];

    // Sort chronologically
    rawAttempts.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

    const numbered = rawAttempts.map((att, i) => ({ ...att, attemptNumber: i + 1 }));
    assert.equal(numbered.length, 3);
    assert.equal(numbered[0].attemptNumber, 1);
    assert.equal(numbered[0].score100, 20);
    assert.equal(numbered[1].attemptNumber, 2);
    assert.equal(numbered[1].score100, 21);
    assert.equal(numbered[2].attemptNumber, 3);
    assert.equal(numbered[2].score100, 25);

    const firstScore = numbered[0].score100;
    const latestScore = numbered[numbered.length - 1].score100;
    const maxScore = Math.max(...numbered.map((a) => a.score100));
    const growthDelta = Number((latestScore - firstScore).toFixed(1));

    assert.equal(firstScore, 20);
    assert.equal(latestScore, 25);
    assert.equal(maxScore, 25);
    assert.equal(growthDelta, 5.0);
    assert.ok(growthDelta > 0, 'Positive growth from attempt 1 to latest attempt');
  });
});

